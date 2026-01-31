"""Dashboard service for badge/pending-count queries."""

from typing import Dict, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.asset import Asset, AssetStatus
from app.models.batch import Batch, BatchStatus
from app.models.logistics import PickupRequest, PickupStatus
from app.models.support import Dispute, DisputeStatus
from app.models.enterprise import EnterpriseApplication, EnterpriseApplicationStatus


async def _count(db: AsyncSession, query) -> int:
    result = await db.execute(query)
    return result.scalar() or 0


async def get_badge_counts(
    user: User, db: AsyncSession, *, branch_id: Optional[str] = None
) -> Dict[str, int]:
    """
    Return role-specific pending/action-required counts for sidebar badges.

    Uses efficient COUNT(*) queries scoped by the user's role and context.
    If branch_id is provided, IT Admin badges are filtered to that branch.
    """
    badges: Dict[str, int] = {}
    role = user.role

    if role == UserRole.IT_ADMIN.value:
        # Use explicit branch_id filter if provided, else fall back to user's branch
        effective_branch_id = branch_id or user.branch_id

        # Draft batches in branch ready for submission
        q = select(func.count()).select_from(Batch).where(
            and_(
                Batch.status == BatchStatus.DRAFT.value,
                Batch.branch_id == effective_branch_id,
            )
        ) if effective_branch_id else select(func.count()).select_from(Batch).where(
            and_(
                Batch.status == BatchStatus.DRAFT.value,
                Batch.enterprise_id == user.enterprise_id,
            )
        )
        batches = await _count(db, q)
        if batches:
            badges["batches"] = batches

        # Assets pending assignment in branch
        q = select(func.count()).select_from(Asset).where(
            and_(
                Asset.status == AssetStatus.PENDING_ASSIGNMENT.value,
                Asset.branch_id == effective_branch_id,
            )
        ) if effective_branch_id else select(func.count()).select_from(Asset).where(
            and_(
                Asset.status == AssetStatus.PENDING_ASSIGNMENT.value,
                Asset.enterprise_id == user.enterprise_id,
            )
        )
        assets = await _count(db, q)
        if assets:
            badges["assets"] = assets

        # Pickup requests pending for IT Admin's enterprise
        q = select(func.count()).select_from(PickupRequest).where(
            and_(
                PickupRequest.status == PickupStatus.PENDING.value,
                PickupRequest.enterprise_id == user.enterprise_id,
            )
        )
        pickups = await _count(db, q)
        if pickups:
            badges["pickups"] = pickups

    elif role == UserRole.ORG_ADMIN.value:
        # Batches pending approval in user's enterprise
        q = select(func.count()).select_from(Batch).where(
            and_(
                Batch.status == BatchStatus.PENDING_APPROVAL.value,
                Batch.enterprise_id == user.enterprise_id,
            )
        )
        approvals = await _count(db, q)
        if approvals:
            badges["approvals"] = approvals

        # Open disputes in user's enterprise
        q = select(func.count()).select_from(Dispute).where(
            and_(
                Dispute.status == DisputeStatus.OPEN.value,
                Dispute.asset_id.in_(
                    select(Asset.id).where(Asset.enterprise_id == user.enterprise_id)
                ),
            )
        )
        disputes = await _count(db, q)
        if disputes:
            badges["disputes"] = disputes

        # Pickup requests pending in user's enterprise
        q = select(func.count()).select_from(PickupRequest).where(
            and_(
                PickupRequest.status == PickupStatus.PENDING.value,
                PickupRequest.enterprise_id == user.enterprise_id,
            )
        )
        pickups = await _count(db, q)
        if pickups:
            badges["pickups"] = pickups

    elif role == UserRole.OPS_ADMIN.value:
        # Pending enterprise applications
        q = select(func.count()).select_from(EnterpriseApplication).where(
            EnterpriseApplication.status == EnterpriseApplicationStatus.PENDING.value
        )
        applications = await _count(db, q)
        if applications:
            badges["applications"] = applications

        # Assets awaiting remote review
        q = select(func.count()).select_from(Asset).where(
            Asset.status == AssetStatus.REMOTE_REVIEW.value
        )
        reviews = await _count(db, q)
        if reviews:
            badges["reviews"] = reviews

        # Assets awaiting facility QC
        q = select(func.count()).select_from(Asset).where(
            Asset.status == AssetStatus.FACILITY_QC.value
        )
        qc = await _count(db, q)
        if qc:
            badges["qc"] = qc

        # Pickup requests pending assignment
        q = select(func.count()).select_from(PickupRequest).where(
            PickupRequest.status == PickupStatus.PENDING.value
        )
        pickups = await _count(db, q)
        if pickups:
            badges["opsPickups"] = pickups

        # Open disputes
        q = select(func.count()).select_from(Dispute).where(
            Dispute.status == DisputeStatus.OPEN.value
        )
        disputes = await _count(db, q)
        if disputes:
            badges["disputes"] = disputes

    elif role == UserRole.SUPER_ADMIN.value:
        # Pending enterprise applications
        q = select(func.count()).select_from(EnterpriseApplication).where(
            EnterpriseApplication.status == EnterpriseApplicationStatus.PENDING.value
        )
        applications = await _count(db, q)
        if applications:
            badges["applications"] = applications

        # Pickup requests pending assignment
        q = select(func.count()).select_from(PickupRequest).where(
            PickupRequest.status == PickupStatus.PENDING.value
        )
        pickups = await _count(db, q)
        if pickups:
            badges["opsPickups"] = pickups

    elif role == UserRole.LOGISTICS_ADMIN.value:
        # Pickups assigned to this logistics admin but not yet assigned to a field user
        q = select(func.count()).select_from(PickupRequest).where(
            and_(
                PickupRequest.logistics_admin_id == user.id,
                PickupRequest.status == PickupStatus.ASSIGNED_TO_LOGISTICS_ADMIN.value,
                PickupRequest.logistics_user_id.is_(None),
            )
        )
        assignments = await _count(db, q)
        if assignments:
            badges["assignments"] = assignments

    elif role == UserRole.LOGISTICS_USER.value:
        # Scheduled pickups assigned to this user
        q = select(func.count()).select_from(PickupRequest).where(
            and_(
                PickupRequest.logistics_user_id == user.id,
                PickupRequest.status.in_([
                    PickupStatus.ASSIGNED_TO_LOGISTICS_USER.value,
                    PickupStatus.SCHEDULED.value,
                ]),
            )
        )
        my_pickups = await _count(db, q)
        if my_pickups:
            badges["myPickups"] = my_pickups

    return badges
