"""Dashboard service for badge/pending-count queries and dashboard stats."""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.asset import Asset, AssetStatus
from app.models.batch import Batch, BatchStatus
from app.models.logistics import PickupRequest, PickupStatus
from app.models.support import Dispute, DisputeStatus
from app.models.enterprise import (
    Enterprise,
    EnterpriseApplication,
    EnterpriseApplicationStatus,
    Branch,
    BranchStatus,
)


async def _count(db: AsyncSession, query) -> int:
    result = await db.execute(query)
    return result.scalar() or 0


async def _sum(db: AsyncSession, query) -> float:
    result = await db.execute(query)
    val = result.scalar()
    return float(val) if val else 0.0


async def _status_counts(db, model, status_col, *filters):
    """Return {status_value: count} dict via a single GROUP BY query."""
    q = select(status_col, func.count()).select_from(model)
    if filters:
        q = q.where(and_(*filters))
    q = q.group_by(status_col)
    result = await db.execute(q)
    return dict(result.all())


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
        # Multi-branch IT Admin scoping
        from app.utils.scoping import get_it_admin_branch_ids

        if branch_id:
            effective_branch_ids = [branch_id]
        else:
            effective_branch_ids = await get_it_admin_branch_ids(db, user.id)
            if user.branch_id and user.branch_id not in effective_branch_ids:
                effective_branch_ids.append(user.branch_id)

        # Draft batches in managed branches ready for submission
        if effective_branch_ids:
            q = select(func.count()).select_from(Batch).where(
                and_(
                    Batch.status == BatchStatus.DRAFT.value,
                    Batch.branch_id.in_(effective_branch_ids),
                )
            )
        else:
            q = select(func.count()).select_from(Batch).where(
                and_(
                    Batch.status == BatchStatus.DRAFT.value,
                    Batch.enterprise_id == user.enterprise_id,
                )
            )
        batches = await _count(db, q)
        if batches:
            badges["batches"] = batches

        # Assets pending assignment in managed branches
        if effective_branch_ids:
            q = select(func.count()).select_from(Asset).where(
                and_(
                    Asset.status == AssetStatus.PENDING_ASSIGNMENT.value,
                    Asset.branch_id.in_(effective_branch_ids),
                )
            )
        else:
            q = select(func.count()).select_from(Asset).where(
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


# ---------------------------------------------------------------------------
# Dashboard stats (aggregated counts + sums for dashboard stat cards)
# ---------------------------------------------------------------------------

# Status groups used by frontends
_ASSET_PENDING = [
    AssetStatus.PENDING_ASSIGNMENT.value,
    AssetStatus.ASSIGNED.value,
    AssetStatus.CHECK_IN_STARTED.value,
]
_ASSET_IN_REVIEW = [
    AssetStatus.SUBMITTED.value,
    AssetStatus.REMOTE_REVIEW.value,
    AssetStatus.FACILITY_QC.value,
]
_ASSET_ACCEPTED = [
    AssetStatus.CONDITIONALLY_ACCEPTED.value,
    AssetStatus.FINAL_ACCEPTED.value,
    AssetStatus.READY_FOR_PICKUP.value,
]
_ASSET_REJECTED = [
    AssetStatus.REMOTE_REJECTED.value,
    AssetStatus.FINAL_REJECTED.value,
]


async def get_dashboard_stats(
    user: User, db: AsyncSession, *, branch_id: Optional[str] = None,
    enterprise_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Return role-specific aggregated stats for dashboard stat cards.

    Uses efficient COUNT(*)/SUM() queries scoped by the user's role.
    When enterprise_id is provided for OPS Admin, returns enterprise-scoped stats.
    """
    stats: Dict[str, Any] = {}
    role = user.role

    if role == UserRole.ORG_ADMIN.value:
        eid = user.enterprise_id

        # -- Asset counts via GROUP BY --
        sc = await _status_counts(
            db, Asset, Asset.status, Asset.enterprise_id == eid
        )
        total = sum(sc.values())
        stats["asset_total"] = total
        stats["asset_completed"] = sc.get(AssetStatus.COMPLETED.value, 0)
        stats["asset_pending"] = sum(sc.get(s, 0) for s in _ASSET_PENDING)
        stats["asset_in_review"] = sum(sc.get(s, 0) for s in _ASSET_IN_REVIEW)
        stats["asset_accepted"] = sum(sc.get(s, 0) for s in _ASSET_ACCEPTED)
        stats["asset_rejected"] = sum(sc.get(s, 0) for s in _ASSET_REJECTED)

        # -- Financial sums --
        stats["total_payout_value"] = await _sum(
            db,
            select(func.sum(Asset.final_price)).where(
                and_(Asset.enterprise_id == eid, Asset.status == AssetStatus.COMPLETED.value)
            ),
        )
        stats["pending_payout_value"] = await _sum(
            db,
            select(func.sum(func.coalesce(Asset.final_price, Asset.base_price))).where(
                and_(
                    Asset.enterprise_id == eid,
                    Asset.status.in_([AssetStatus.FINAL_ACCEPTED.value, AssetStatus.PAYOUT_PENDING.value]),
                )
            ),
        )

        # -- Batch pipeline via GROUP BY --
        bc = await _status_counts(
            db, Batch, Batch.status, Batch.enterprise_id == eid
        )
        stats["batch_draft"] = bc.get(BatchStatus.DRAFT.value, 0)
        stats["batch_pending_approval"] = bc.get(BatchStatus.PENDING_APPROVAL.value, 0)
        stats["batch_approved"] = bc.get(BatchStatus.APPROVED.value, 0)
        stats["batch_pickup_in_progress"] = bc.get(BatchStatus.PICKUP_IN_PROGRESS.value, 0)
        stats["batch_completed"] = bc.get(BatchStatus.COMPLETED.value, 0)
        stats["batch_rejected"] = bc.get(BatchStatus.REJECTED.value, 0)

        # Pending approval value
        stats["pending_approval_value"] = await _sum(
            db,
            select(func.sum(Batch.estimated_value)).where(
                and_(
                    Batch.enterprise_id == eid,
                    Batch.status == BatchStatus.PENDING_APPROVAL.value,
                )
            ),
        )

        # Stalled batches (pending approval > 7 days)
        cutoff = datetime.utcnow() - timedelta(days=7)
        stats["stalled_batches"] = await _count(
            db,
            select(func.count()).select_from(Batch).where(
                and_(
                    Batch.enterprise_id == eid,
                    Batch.status == BatchStatus.PENDING_APPROVAL.value,
                    func.coalesce(Batch.submitted_for_approval_at, Batch.created_at) < cutoff,
                )
            ),
        )

        # -- Branch counts --
        stats["branch_total"] = await _count(
            db,
            select(func.count()).select_from(Branch).where(Branch.enterprise_id == eid),
        )
        stats["branch_active"] = await _count(
            db,
            select(func.count()).select_from(Branch).where(
                and_(Branch.enterprise_id == eid, Branch.status == BranchStatus.ACTIVE.value)
            ),
        )
        stats["branch_without_admin"] = await _count(
            db,
            select(func.count()).select_from(Branch).where(
                and_(Branch.enterprise_id == eid, Branch.it_admin_id.is_(None))
            ),
        )

        # -- IT Admin counts --
        stats["it_admin_total"] = await _count(
            db,
            select(func.count()).select_from(User).where(
                and_(User.enterprise_id == eid, User.role == UserRole.IT_ADMIN.value)
            ),
        )
        stats["it_admin_active"] = await _count(
            db,
            select(func.count()).select_from(User).where(
                and_(
                    User.enterprise_id == eid,
                    User.role == UserRole.IT_ADMIN.value,
                    User.status == "active",
                )
            ),
        )

        # -- Pickup active --
        stats["active_pickups"] = await _count(
            db,
            select(func.count()).select_from(PickupRequest).where(
                and_(
                    PickupRequest.enterprise_id == eid,
                    PickupRequest.status.in_([
                        PickupStatus.IN_PROGRESS.value,
                        PickupStatus.SCHEDULED.value,
                    ]),
                )
            ),
        )

        # -- Disputes pending --
        stats["pending_disputes"] = await _count(
            db,
            select(func.count()).select_from(Dispute).where(
                and_(
                    Dispute.status == DisputeStatus.OPEN.value,
                    Dispute.asset_id.in_(
                        select(Asset.id).where(Asset.enterprise_id == eid)
                    ),
                )
            ),
        )

    elif role == UserRole.IT_ADMIN.value:
        eid = user.enterprise_id

        # Resolve multi-branch scope for IT Admin
        from app.utils.scoping import get_it_admin_branch_ids

        if branch_id:
            # Specific branch selected in UI
            effective_branch_ids = [branch_id]
        else:
            # Get all managed branches
            effective_branch_ids = await get_it_admin_branch_ids(db, user.id)
            if user.branch_id and user.branch_id not in effective_branch_ids:
                effective_branch_ids.append(user.branch_id)

        # Build scope filter using IN clause for multiple branches
        if effective_branch_ids:
            scope = Asset.branch_id.in_(effective_branch_ids)
            batch_scope = Batch.branch_id.in_(effective_branch_ids)
        else:
            # Fallback to enterprise scope if no branches found
            scope = Asset.enterprise_id == eid
            batch_scope = Batch.enterprise_id == eid

        # Asset counts
        sc = await _status_counts(db, Asset, Asset.status, scope)
        total = sum(sc.values())
        stats["asset_total"] = total
        stats["asset_pending_assignment"] = sc.get(AssetStatus.PENDING_ASSIGNMENT.value, 0)
        stats["asset_in_review"] = sum(
            sc.get(s, 0) for s in [
                AssetStatus.ASSIGNED.value,
                AssetStatus.CHECK_IN_STARTED.value,
                AssetStatus.SUBMITTED.value,
                AssetStatus.REMOTE_REVIEW.value,
                AssetStatus.PICKUP_REQUESTED.value,
                AssetStatus.PICKUP_SCHEDULED.value,
                AssetStatus.PICKED_UP.value,
                AssetStatus.IN_TRANSIT.value,
                AssetStatus.FACILITY_QC.value,
            ]
        )
        stats["asset_accepted"] = sum(
            sc.get(s, 0) for s in [
                AssetStatus.CONDITIONALLY_ACCEPTED.value,
                AssetStatus.FINAL_ACCEPTED.value,
                AssetStatus.PAYOUT_PENDING.value,
                AssetStatus.COMPLETED.value,
            ]
        )
        stats["asset_rejected"] = sum(sc.get(s, 0) for s in _ASSET_REJECTED)
        stats["asset_completed"] = sc.get(AssetStatus.COMPLETED.value, 0)

        # Rates
        stats["acceptance_rate"] = round((stats["asset_accepted"] / total * 100) if total else 0, 1)
        stats["pending_rate"] = round((stats["asset_pending_assignment"] / total * 100) if total else 0, 1)
        stats["review_rate"] = round((stats["asset_in_review"] / total * 100) if total else 0, 1)

        # Batch counts
        bc = await _status_counts(db, Batch, Batch.status, batch_scope)
        batch_total = sum(bc.values())
        stats["batch_total"] = batch_total
        stats["batch_completed"] = bc.get(BatchStatus.COMPLETED.value, 0)
        stats["batch_active"] = batch_total - bc.get(BatchStatus.COMPLETED.value, 0) - bc.get(BatchStatus.CANCELLED.value, 0)
        stats["batch_completion_rate"] = round((stats["batch_completed"] / batch_total * 100) if batch_total else 0, 1)
        stats["batch_pending_approval"] = bc.get(BatchStatus.PENDING_APPROVAL.value, 0)
        stats["batch_draft"] = bc.get(BatchStatus.DRAFT.value, 0)

        # Batch total value
        stats["batch_total_value"] = await _sum(
            db, select(func.sum(Batch.estimated_value)).where(batch_scope),
        )

        # Stalled assets (pending_assignment or assigned > 7 days)
        cutoff = datetime.utcnow() - timedelta(days=7)
        stats["stalled_assets"] = await _count(
            db,
            select(func.count()).select_from(Asset).where(
                and_(
                    scope,
                    Asset.status.in_([AssetStatus.PENDING_ASSIGNMENT.value, AssetStatus.ASSIGNED.value]),
                    Asset.created_at < cutoff,
                )
            ),
        )

    elif role == UserRole.OPS_ADMIN.value:
        # When enterprise_id is provided, scope all stats to that enterprise
        eid = enterprise_id  # None means platform-wide

        if not eid:
            # Platform-wide enterprise counts
            stats["enterprise_total"] = await _count(
                db, select(func.count()).select_from(Enterprise),
            )
            stats["enterprise_active"] = await _count(
                db,
                select(func.count()).select_from(Enterprise).where(Enterprise.status == "active"),
            )

        # Asset counts (platform-wide or enterprise-scoped)
        asset_filters = [Asset.enterprise_id == eid] if eid else []
        sc = await _status_counts(db, Asset, Asset.status, *asset_filters)
        stats["asset_total"] = sum(sc.values())
        stats["pending_review"] = sum(
            sc.get(s, 0) for s in [AssetStatus.SUBMITTED.value, AssetStatus.REMOTE_REVIEW.value]
        )
        stats["pending_qc"] = sum(
            sc.get(s, 0) for s in [AssetStatus.IN_TRANSIT.value, AssetStatus.FACILITY_QC.value]
        )
        stats["pending_payout"] = sc.get(AssetStatus.PAYOUT_PENDING.value, 0)
        stats["asset_completed"] = sc.get(AssetStatus.COMPLETED.value, 0)
        stats["asset_accepted"] = sum(
            sc.get(s, 0) for s in [AssetStatus.FINAL_ACCEPTED.value, AssetStatus.COMPLETED.value]
        )
        stats["asset_rejected"] = sum(sc.get(s, 0) for s in _ASSET_REJECTED)
        stats["in_progress"] = stats["asset_total"] - stats["asset_accepted"] - stats["asset_rejected"]
        stats["asset_conditionally_accepted"] = sc.get(AssetStatus.CONDITIONALLY_ACCEPTED.value, 0)
        stats["asset_ready_for_pickup"] = sc.get(AssetStatus.READY_FOR_PICKUP.value, 0)

        # Financial (platform-wide or enterprise-scoped)
        fin_filter = and_(Asset.status == AssetStatus.COMPLETED.value, Asset.enterprise_id == eid) if eid else (Asset.status == AssetStatus.COMPLETED.value)
        stats["total_payout_value"] = await _sum(
            db,
            select(func.sum(Asset.final_price)).where(fin_filter),
        )

        # Disputes (platform-wide or enterprise-scoped)
        if eid:
            stats["pending_disputes"] = await _count(
                db,
                select(func.count()).select_from(Dispute).where(
                    and_(
                        Dispute.status == DisputeStatus.OPEN.value,
                        Dispute.asset_id.in_(
                            select(Asset.id).where(Asset.enterprise_id == eid)
                        ),
                    )
                ),
            )
        else:
            stats["pending_disputes"] = await _count(
                db,
                select(func.count()).select_from(Dispute).where(Dispute.status == DisputeStatus.OPEN.value),
            )

    elif role == UserRole.SUPER_ADMIN.value:
        # -- Enterprise status breakdown via GROUP BY --
        ec = await _status_counts(db, Enterprise, Enterprise.status)
        stats["enterprise_total"] = sum(ec.values())
        stats["enterprise_active"] = ec.get("active", 0)
        stats["enterprise_inactive"] = sum(ec.get(s, 0) for s in ["inactive", "suspended"])
        # Legacy aliases
        stats["enterprise_count"] = stats["enterprise_total"]

        # -- User counts by role via GROUP BY --
        uc = await _status_counts(db, User, User.role)
        stats["user_total"] = sum(uc.values())
        stats["user_count"] = stats["user_total"]
        stats["user_super_admin"] = uc.get(UserRole.SUPER_ADMIN.value, 0)
        stats["user_ops_admin"] = uc.get(UserRole.OPS_ADMIN.value, 0)
        stats["user_it_admin"] = uc.get(UserRole.IT_ADMIN.value, 0)
        stats["user_org_admin"] = uc.get(UserRole.ORG_ADMIN.value, 0)
        stats["user_logistics_admin"] = uc.get(UserRole.LOGISTICS_ADMIN.value, 0)
        stats["user_logistics_user"] = uc.get(UserRole.LOGISTICS_USER.value, 0)
        stats["user_logistics"] = stats["user_logistics_admin"] + stats["user_logistics_user"]
        stats["admin_count"] = stats["user_super_admin"] + stats["user_ops_admin"] + stats["user_logistics_admin"]

    elif role in (UserRole.EMPLOYEE.value, "sub_user"):
        # Employee: scoped to their assigned assets
        uid = user.id
        stats["my_assets"] = await _count(
            db,
            select(func.count()).select_from(Asset).where(Asset.assigned_to_user_id == uid),
        )
        stats["pending"] = await _count(
            db,
            select(func.count()).select_from(Asset).where(
                and_(
                    Asset.assigned_to_user_id == uid,
                    Asset.status.in_([AssetStatus.ASSIGNED.value, AssetStatus.CHECK_IN_STARTED.value]),
                )
            ),
        )
        stats["submitted"] = await _count(
            db,
            select(func.count()).select_from(Asset).where(
                and_(
                    Asset.assigned_to_user_id == uid,
                    Asset.status.notin_([
                        AssetStatus.PENDING_ASSIGNMENT.value,
                        AssetStatus.ASSIGNED.value,
                        AssetStatus.CHECK_IN_STARTED.value,
                    ]),
                )
            ),
        )

    elif role == UserRole.LOGISTICS_ADMIN.value:
        uid = user.id
        pc = await _status_counts(
            db, PickupRequest, PickupRequest.status, PickupRequest.logistics_admin_id == uid
        )
        stats["pickup_pending_assignment"] = sum(
            pc.get(s, 0) for s in [PickupStatus.PENDING.value, PickupStatus.ASSIGNED_TO_LOGISTICS_ADMIN.value]
        )
        stats["pickup_assigned"] = pc.get(PickupStatus.ASSIGNED_TO_LOGISTICS_USER.value, 0)
        stats["pickup_in_progress"] = pc.get(PickupStatus.IN_PROGRESS.value, 0)
        stats["pickup_completed"] = pc.get(PickupStatus.COMPLETED.value, 0)
        # Count field users belonging to this logistics admin
        stats["field_user_count"] = await _count(
            db, select(func.count()).select_from(User).where(
                User.parent_user_id == uid,
                User.role == UserRole.LOGISTICS_USER.value,
            ),
        )

    return stats
