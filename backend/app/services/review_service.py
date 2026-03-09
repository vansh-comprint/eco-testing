"""Service layer for Review business logic"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RemoteReview, FacilityQC, AssetStatus, User, UserRole
from app.models.support import OnSiteQC, QCStatus
from app.models.logistics import PickupStatus
from app.models.review import ReviewDecision
from app.repositories.review_repository import (
    RemoteReviewRepository,
    FacilityQCRepository,
    OnSiteQCRepository,
)
from app.repositories.asset_repository import AssetRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.pickup_repository import PickupRepository
from app.schemas.review import (
    RemoteReviewCreate,
    RemoteReviewUpdate,
    FacilityQCCreate,
    OnSiteQCCreate,
)


class RemoteReviewService:
    """Service for handling remote review business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = RemoteReviewRepository(session)
        self.asset_repo = AssetRepository(session)
        self.submission_repo = SubmissionRepository(session)

    async def create_review(self, data: RemoteReviewCreate, reviewer: User) -> RemoteReview:
        """Create a remote review for a submission"""
        # Verify asset exists
        asset = await self.asset_repo.get_by_id(data.asset_id)
        if not asset:
            raise ValueError("Asset not found")

        # Check if review already exists
        existing = await self.repo.get_by_asset_id(data.asset_id)

        # Verify asset is in valid status for review
        valid_statuses = [AssetStatus.SUBMITTED.value, AssetStatus.REMOTE_REVIEW.value, AssetStatus.DISPUTED.value]
        if asset.status not in valid_statuses:
            raise ValueError(f"Asset must be in {valid_statuses} status for review")

        # For disputed assets, delete the old review to allow a fresh re-review
        if asset.status == AssetStatus.DISPUTED.value and existing:
            await self.session.delete(existing)
            await self.session.flush()
            existing = None

        if existing:
            raise ValueError("Remote review already exists for this asset")

        # Validate decision
        valid_decisions = [d.value for d in ReviewDecision]
        if data.decision not in valid_decisions:
            raise ValueError(f"Invalid decision. Must be one of: {valid_decisions}")

        # Auto-resolve submission_id from asset if not provided
        submission_id = data.submission_id
        if not submission_id:
            submission = await self.submission_repo.get_by_asset_id(data.asset_id)
            if submission:
                submission_id = submission.id

        review = RemoteReview(
            id=f"rr-{uuid.uuid4()}",
            asset_id=data.asset_id,
            submission_id=submission_id,
            reviewer_id=reviewer.id,
            decision=data.decision,
            grade=data.grade,
            estimated_value=data.estimated_value,
            notes=data.notes,
            rejection_reason=data.rejection_reason,
            checklist_results=data.checklist_results,
            reviewed_at=datetime.now(timezone.utc),
        )

        await self.repo.create(review)

        # Update asset status based on decision
        if data.decision == ReviewDecision.ACCEPTED.value:
            asset.status = AssetStatus.CONDITIONALLY_ACCEPTED.value
        elif data.decision == ReviewDecision.REJECTED.value:
            asset.status = AssetStatus.REMOTE_REJECTED.value
        elif data.decision == ReviewDecision.CONDITIONALLY_ACCEPTED.value:
            asset.status = AssetStatus.CONDITIONALLY_ACCEPTED.value
        elif data.decision == ReviewDecision.NEEDS_FACILITY_QC.value:
            asset.status = AssetStatus.REMOTE_REVIEW.value

        # Update estimated value on asset
        if data.estimated_value is not None:
            asset.base_price = data.estimated_value
        if data.grade:
            asset.grade = data.grade

        await self.session.flush()

        # Recalculate batch value now that asset has a price
        if asset.batch_id and data.estimated_value is not None:
            from app.services.batch_service import BatchService
            batch_service = BatchService(self.session)
            await batch_service.recalculate_batch_metrics(asset.batch_id)

        return review

    async def get_review(self, review_id: str) -> Optional[RemoteReview]:
        """Get a review by ID"""
        return await self.repo.get_by_id(review_id)

    async def get_by_asset(self, asset_id: str) -> Optional[RemoteReview]:
        """Get review for an asset"""
        return await self.repo.get_by_asset_id(asset_id)

    async def update_review(
        self, review_id: str, data: RemoteReviewUpdate, user: User
    ) -> Optional[RemoteReview]:
        """Update a remote review"""
        review = await self.repo.get_by_id(review_id)
        if not review:
            return None

        # Only the reviewer or admins can update
        if user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
            if review.reviewer_id != user.id:
                raise ValueError("You can only update your own reviews")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(review, key, value)

        await self.session.flush()
        return review

    async def list_reviews(
        self,
        user: User,
        enterprise_id: Optional[str] = None,
        decision: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[RemoteReview], int]:
        """List reviews with role-based filtering"""
        branch_ids = None

        # Apply role-based scoping
        if user.role == UserRole.IT_ADMIN.value:
            enterprise_id = user.enterprise_id
            from app.utils.scoping import get_it_admin_branch_ids
            branch_ids = await get_it_admin_branch_ids(self.session, user.id)
            if user.branch_id and user.branch_id not in branch_ids:
                branch_ids.append(user.branch_id)
        elif user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
            enterprise_id = user.enterprise_id

        return await self.repo.list_with_filters(
            enterprise_id=enterprise_id,
            branch_ids=branch_ids,
            decision=decision,
            skip=skip,
            limit=limit,
        )


class FacilityQCService:
    """Service for handling facility QC business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = FacilityQCRepository(session)
        self.asset_repo = AssetRepository(session)

    async def create_qc(self, data: FacilityQCCreate, reviewer: User) -> FacilityQC:
        """Create a facility QC record"""
        asset = await self.asset_repo.get_by_id(data.asset_id)
        if not asset:
            raise ValueError("Asset not found")

        if asset.status != AssetStatus.FACILITY_QC.value:
            raise ValueError(
                f"Asset must be in 'facility_qc' status for QC review, "
                f"currently in '{asset.status}'"
            )

        existing = await self.repo.get_by_asset_id(data.asset_id)
        if existing:
            raise ValueError("Facility QC already exists for this asset")

        qc = FacilityQC(
            id=f"fqc-{uuid.uuid4()}",
            asset_id=data.asset_id,
            reviewer_id=reviewer.id,
            decision=data.decision,
            grade=data.grade,
            final_value=data.final_value,
            functional_tests=data.functional_tests,
            cosmetic_assessment=data.cosmetic_assessment,
            hardware_tests=data.hardware_tests,
            photos=data.photos,
            notes=data.notes,
            rejection_reason=data.rejection_reason,
            qc_completed_at=datetime.now(timezone.utc),
        )

        await self.repo.create(qc)

        # Update asset status
        if data.decision == ReviewDecision.ACCEPTED.value:
            asset.status = AssetStatus.FINAL_ACCEPTED.value
        elif data.decision == ReviewDecision.REJECTED.value:
            asset.status = AssetStatus.FINAL_REJECTED.value

        if data.final_value is not None:
            asset.final_price = data.final_value
        if data.grade:
            asset.grade = data.grade

        await self.session.flush()

        # Recalculate batch value now that asset has a final price
        if asset.batch_id and data.final_value is not None:
            from app.services.batch_service import BatchService
            batch_service = BatchService(self.session)
            await batch_service.recalculate_batch_metrics(asset.batch_id)

        return qc

    async def get_qc(self, qc_id: str) -> Optional[FacilityQC]:
        """Get a QC record by ID"""
        return await self.repo.get_by_id(qc_id)

    async def list_qc(
        self,
        user: User,
        enterprise_id: Optional[str] = None,
        decision: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[FacilityQC], int]:
        """List QC records with role-based filtering"""
        branch_ids = None

        if user.role == UserRole.IT_ADMIN.value:
            enterprise_id = user.enterprise_id
            from app.utils.scoping import get_it_admin_branch_ids
            branch_ids = await get_it_admin_branch_ids(self.session, user.id)
            if user.branch_id and user.branch_id not in branch_ids:
                branch_ids.append(user.branch_id)
        elif user.role not in [UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value]:
            enterprise_id = user.enterprise_id

        return await self.repo.list_with_filters(
            enterprise_id=enterprise_id,
            branch_ids=branch_ids,
            decision=decision,
            skip=skip,
            limit=limit,
        )


class OnSiteQCService:
    """Service for handling on-site QC business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = OnSiteQCRepository(session)
        self.asset_repo = AssetRepository(session)
        self.pickup_repo = PickupRepository(session)

    async def create_qc(self, data: OnSiteQCCreate, user: User) -> OnSiteQC:
        """Create an on-site QC record (by logistics user)"""
        # Verify asset exists
        asset = await self.asset_repo.get_by_id(data.asset_id)
        if not asset:
            raise ValueError("Asset not found")

        # Verify pickup exists and is in progress
        pickup = await self.pickup_repo.get_by_id(data.pickup_request_id)
        if not pickup:
            raise ValueError("Pickup request not found")
        if pickup.status != PickupStatus.IN_PROGRESS.value:
            raise ValueError("QC can only be submitted when pickup is in progress")

        # Ownership check: logistics users can only submit QC for their own pickups
        if user.role == UserRole.LOGISTICS_USER.value:
            if pickup.logistics_user_id != user.id:
                raise ValueError("You can only submit QC records for pickups assigned to you")

        # Asset membership check: asset must belong to this pickup
        if data.asset_id not in (pickup.asset_ids or []):
            raise ValueError("Asset does not belong to this pickup")

        # Duplicate check: one QC record per (asset, pickup) pair
        existing = await self.repo.get_by_asset_and_pickup(data.asset_id, data.pickup_request_id)
        if existing:
            raise ValueError("QC record already exists for this asset in this pickup")

        # Auto-derive status from check results — never trust client-submitted status
        checks = [
            data.physical_condition_ok,
            data.powers_on,
            data.screen_ok,
            data.ports_ok,
        ]
        # keyboard_ok is optional (non-laptop devices may not have a keyboard)
        if data.keyboard_ok is not None:
            checks.append(data.keyboard_ok)

        derived_status = QCStatus.PASSED.value if all(checks) else QCStatus.FAILED.value

        qc = OnSiteQC(
            id=f"osqc-{uuid.uuid4()}",
            asset_id=data.asset_id,
            pickup_request_id=data.pickup_request_id,
            performed_by_user_id=user.id,
            status=derived_status,
            physical_condition_ok=data.physical_condition_ok,
            powers_on=data.powers_on,
            screen_ok=data.screen_ok,
            keyboard_ok=data.keyboard_ok,
            ports_ok=data.ports_ok,
            photo_urls=data.photo_urls,
            notes=data.notes,
            extra_data=data.extra_data,
            performed_at=datetime.now(timezone.utc),  # Always server-side
        )

        await self.repo.create(qc)
        await self.session.flush()
        return qc

    async def get_qc(self, qc_id: str) -> Optional[OnSiteQC]:
        """Get a QC record by ID"""
        return await self.repo.get_by_id(qc_id)

    async def get_by_pickup_request(self, pickup_request_id: str) -> List[OnSiteQC]:
        """Get all QC records for a pickup request"""
        return await self.repo.get_by_pickup_request(pickup_request_id)

    async def list_qc(
        self,
        user: User,
        enterprise_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[OnSiteQC], int]:
        """List QC records with role-based filtering"""
        performed_by = None
        if user.role == UserRole.LOGISTICS_USER.value:
            performed_by = user.id
        elif user.role not in [
            UserRole.SUPER_ADMIN.value,
            UserRole.OPS_ADMIN.value,
            UserRole.LOGISTICS_ADMIN.value,
        ]:
            enterprise_id = user.enterprise_id

        return await self.repo.list_with_filters(
            enterprise_id=enterprise_id,
            performed_by_user_id=performed_by,
            status=status,
            skip=skip,
            limit=limit,
        )
