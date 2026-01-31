"""
Permission system for role-based access control.

This module defines all permissions and role-permission mappings
based on the EcoTribe V3 role structure from src/types/user.ts
"""

from enum import Enum
from typing import Set, Dict, List
from app.models.user import UserRole


class Permission(str, Enum):
    """
    All available permissions in the system.

    Organized by domain for clarity.
    """

    # Special permission
    ALL = "*"  # Super admin wildcard

    # Enterprise Management
    VIEW_ALL_ENTERPRISES = "view_all_enterprises"
    MANAGE_ENTERPRISES = "manage_enterprises"
    MANAGE_ENTERPRISE_APPLICATIONS = "manage_enterprise_applications"
    MANAGE_ENTERPRISE_SETTINGS = "manage_enterprise_settings"

    # Branch Management
    MANAGE_BRANCHES = "manage_branches"
    VIEW_BRANCH_ANALYTICS = "view_branch_analytics"

    # User Management
    USER_READ = "user_read"
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    MANAGE_REVIEWERS = "manage_reviewers"
    MANAGE_IT_ADMINS = "manage_it_admins"
    MANAGE_LOGISTICS_USERS = "manage_logistics_users"
    LOGISTICS_MANAGE = "logistics_manage"

    # Employee Management (formerly Sub-Users)
    EMPLOYEE_READ = "employee_read"
    EMPLOYEE_CREATE = "employee_create"
    EMPLOYEE_UPDATE = "employee_update"
    EMPLOYEE_DELETE = "employee_delete"
    MANAGE_EMPLOYEES = "manage_employees"  # Alias for backward compatibility

    # Asset Management (CRUD)
    ASSET_READ = "asset_read"
    ASSET_CREATE = "asset_create"
    ASSET_UPDATE = "asset_update"
    ASSET_DELETE = "asset_delete"
    MANAGE_ASSETS = "manage_assets"  # Legacy alias
    VIEW_ALL_ASSETS = "view_all_assets"
    VIEW_ASSIGNED_ASSETS = "view_assigned_assets"

    # Batch Management (CRUD)
    BATCH_READ = "batch_read"
    BATCH_CREATE = "batch_create"
    BATCH_UPDATE = "batch_update"
    BATCH_DELETE = "batch_delete"
    BATCH_APPROVE = "batch_approve"
    MANAGE_BATCHES = "manage_batches"  # Legacy alias
    SUBMIT_PICKUP_FOR_APPROVAL = "submit_pickup_for_approval"

    # Branch Management (CRUD)
    BRANCH_READ = "branch_read"
    BRANCH_CREATE = "branch_create"
    BRANCH_UPDATE = "branch_update"
    BRANCH_DELETE = "branch_delete"

    # Enterprise Management (CRUD)
    ENTERPRISE_READ = "enterprise_read"
    ENTERPRISE_CREATE = "enterprise_create"
    ENTERPRISE_UPDATE = "enterprise_update"
    ENTERPRISE_DELETE = "enterprise_delete"

    # Submission (CRUD)
    SUBMISSION_VIEW = "submission_view"
    SUBMISSION_CREATE = "submission_create"
    SUBMISSION_UPDATE = "submission_update"
    SUBMIT_DEVICE_EVALUATION = "submit_device_evaluation"  # Legacy alias
    VIEW_SUBMISSIONS = "view_submissions"  # Legacy alias

    # Review (CRUD)
    REVIEW_VIEW = "review_view"
    REVIEW_CREATE = "review_create"
    REVIEW_UPDATE = "review_update"
    REVIEW_SUBMISSIONS = "review_submissions"  # Legacy alias
    REMOTE_REVIEW = "remote_review"
    FACILITY_QC = "facility_qc"
    MANAGE_REMOTE_REVIEW_QUEUE = "manage_remote_review_queue"

    # Pickup (CRUD)
    PICKUP_VIEW = "pickup_view"
    PICKUP_CREATE = "pickup_create"
    PICKUP_UPDATE = "pickup_update"
    PICKUP_ASSIGN = "pickup_assign"
    APPROVE_PICKUPS = "approve_for_pickup"  # Legacy alias
    APPROVE_HIGH_VALUE = "approve_high_value"
    MANAGE_PICKUP_LOCATIONS = "manage_pickup_locations"
    VIEW_PICKUP_REQUESTS = "view_pickup_requests"  # Legacy alias
    ASSIGN_PICKUPS = "assign_pickups"  # Legacy alias
    VIEW_ASSIGNED_PICKUPS = "view_assigned_pickups"
    PERFORM_ONSITE_QC = "perform_onsite_qc"
    COLLECT_DEVICES = "collect_devices"
    UPLOAD_PICKUP_PROOF = "upload_pickup_proof"
    VIEW_PICKUP_ANALYTICS = "view_pickup_analytics"

    # Financial / Payouts (CRUD)
    PAYOUT_VIEW = "payout_view"
    PAYOUT_CREATE = "payout_create"
    PAYOUT_PROCESS = "payout_process"
    VIEW_PAYOUTS = "view_payouts"  # Legacy alias
    PROCESS_PAYOUTS = "process_payouts"  # Legacy alias
    VIEW_FINANCIAL_REPORTS = "view_financial_reports"
    VIEW_WALLET = "view_wallet"
    VIEW_ENTERPRISE_ANALYTICS = "view_enterprise_analytics"

    # Notifications (CRUD)
    NOTIFICATION_CREATE = "notification_create"

    # Disputes (CRUD)
    DISPUTE_VIEW = "dispute_view"
    DISPUTE_CREATE = "dispute_create"
    DISPUTE_MANAGE = "dispute_manage"
    SUBMIT_DISPUTES = "submit_disputes"  # Legacy alias
    HANDLE_DISPUTES = "handle_disputes"  # Legacy alias
    HANDLE_ESCALATIONS = "handle_escalations"
    OVERRIDE_DECISIONS = "override_decisions"

    # Reports & Analytics
    VIEW_REPORTS = "view_reports"
    VIEW_EPR_CERTIFICATES = "view_epr_certificates"

    # Pricing & Analytics
    PRICING_READ = "pricing_read"
    PRICING_MANAGE = "pricing_manage"
    ANALYTICS_READ = "analytics_read"


# Role-Permission Mapping (from src/types/user.ts)
ROLE_PERMISSIONS: Dict[UserRole, Set[Permission]] = {
    UserRole.SUPER_ADMIN: {
        Permission.ALL,  # Wildcard - has all permissions
    },
    UserRole.OPS_ADMIN: {
        # OPS Admin has elevated permissions (was MAIN_ADMIN)
        Permission.REVIEW_SUBMISSIONS,
        Permission.APPROVE_PICKUPS,
        Permission.VIEW_ALL_ASSETS,
        Permission.MANAGE_REMOTE_REVIEW_QUEUE,
        Permission.MANAGE_ENTERPRISE_APPLICATIONS,
        Permission.USER_READ,
        Permission.USER_CREATE,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.LOGISTICS_MANAGE,
        Permission.EMPLOYEE_READ,
        Permission.EMPLOYEE_CREATE,
        Permission.EMPLOYEE_UPDATE,
        Permission.EMPLOYEE_DELETE,
        # Pricing & Analytics permissions
        Permission.PRICING_READ,
        Permission.ANALYTICS_READ,
        # CRUD permissions
        Permission.ASSET_READ,
        Permission.ASSET_CREATE,
        Permission.ASSET_UPDATE,
        Permission.ASSET_DELETE,
        Permission.BATCH_READ,
        Permission.BATCH_CREATE,
        Permission.BATCH_UPDATE,
        Permission.BATCH_DELETE,
        Permission.BATCH_APPROVE,
        Permission.BRANCH_READ,
        Permission.BRANCH_CREATE,
        Permission.BRANCH_UPDATE,
        Permission.BRANCH_DELETE,
        Permission.ENTERPRISE_READ,
        Permission.ENTERPRISE_CREATE,
        Permission.ENTERPRISE_UPDATE,
        Permission.ENTERPRISE_DELETE,
        # Submission, Review, Pickup permissions
        Permission.SUBMISSION_VIEW,
        Permission.SUBMISSION_CREATE,
        Permission.SUBMISSION_UPDATE,
        Permission.REVIEW_VIEW,
        Permission.REVIEW_CREATE,
        Permission.REVIEW_UPDATE,
        Permission.PICKUP_VIEW,
        Permission.PICKUP_CREATE,
        Permission.PICKUP_UPDATE,
        Permission.PICKUP_ASSIGN,
        # Payout, Notification, Dispute permissions
        Permission.PAYOUT_VIEW,
        Permission.PAYOUT_CREATE,
        Permission.PAYOUT_PROCESS,
        Permission.NOTIFICATION_CREATE,
        Permission.DISPUTE_VIEW,
        Permission.DISPUTE_MANAGE,
        # Review/QC permissions
        Permission.REMOTE_REVIEW,
        Permission.FACILITY_QC,
        Permission.HANDLE_DISPUTES,
    },
    UserRole.IT_ADMIN: {
        Permission.MANAGE_ASSETS,
        Permission.MANAGE_BATCHES,
        Permission.VIEW_PAYOUTS,
        Permission.SUBMIT_DISPUTES,
        Permission.MANAGE_ENTERPRISE_SETTINGS,
        Permission.MANAGE_PICKUP_LOCATIONS,
        Permission.SUBMIT_PICKUP_FOR_APPROVAL,
        Permission.EMPLOYEE_READ,
        Permission.EMPLOYEE_CREATE,
        Permission.EMPLOYEE_UPDATE,
        Permission.EMPLOYEE_DELETE,
        # CRUD permissions
        Permission.ASSET_READ,
        Permission.ASSET_CREATE,
        Permission.ASSET_UPDATE,
        Permission.ASSET_DELETE,
        Permission.BATCH_READ,
        Permission.BATCH_CREATE,
        Permission.BATCH_UPDATE,
        Permission.BATCH_DELETE,
        Permission.BRANCH_READ,
        Permission.BRANCH_CREATE,  # IT Admin can create branches (auto-assigned to them)
        Permission.ENTERPRISE_READ,
        # Submission, Pickup permissions
        Permission.SUBMISSION_VIEW,
        Permission.SUBMISSION_CREATE,  # IT Admin can submit self-evaluations
        Permission.SUBMISSION_UPDATE,
        Permission.PICKUP_VIEW,
        Permission.PICKUP_CREATE,
        # Payout, Dispute permissions
        Permission.PAYOUT_VIEW,
        Permission.DISPUTE_VIEW,
        Permission.DISPUTE_CREATE,
    },
    UserRole.ORG_ADMIN: {
        Permission.APPROVE_PICKUPS,
        Permission.MANAGE_BRANCHES,
        Permission.MANAGE_IT_ADMINS,
        Permission.VIEW_FINANCIAL_REPORTS,
        Permission.APPROVE_HIGH_VALUE,
        Permission.VIEW_ENTERPRISE_ANALYTICS,
        Permission.VIEW_EPR_CERTIFICATES,
        Permission.VIEW_WALLET,
        Permission.USER_READ,
        Permission.USER_CREATE,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.EMPLOYEE_READ,
        Permission.EMPLOYEE_CREATE,
        Permission.EMPLOYEE_UPDATE,
        Permission.EMPLOYEE_DELETE,
        # CRUD permissions
        Permission.ASSET_READ,
        Permission.ASSET_UPDATE,  # Org Admin sets asset prices during batch approval
        Permission.BATCH_READ,
        Permission.BATCH_APPROVE,
        Permission.BRANCH_READ,
        Permission.BRANCH_CREATE,
        Permission.BRANCH_UPDATE,
        Permission.BRANCH_DELETE,
        Permission.ENTERPRISE_READ,
        Permission.ENTERPRISE_UPDATE,
        # Submission, Pickup permissions
        Permission.SUBMISSION_VIEW,
        Permission.PICKUP_VIEW,
        Permission.PICKUP_CREATE,
        Permission.PICKUP_UPDATE,
        # Payout, Dispute permissions
        Permission.PAYOUT_VIEW,
        Permission.PAYOUT_CREATE,
        Permission.DISPUTE_VIEW,
        Permission.DISPUTE_MANAGE,
    },
    UserRole.EMPLOYEE: {
        Permission.VIEW_ASSIGNED_ASSETS,
        Permission.SUBMIT_DEVICE_EVALUATION,
        Permission.ASSET_READ,  # Can view their assigned assets
        Permission.DISPUTE_VIEW,
        Permission.DISPUTE_CREATE,
        # Submission permissions
        Permission.SUBMISSION_VIEW,
        Permission.SUBMISSION_CREATE,
        Permission.SUBMISSION_UPDATE,
    },
    UserRole.LOGISTICS_ADMIN: {
        Permission.VIEW_PICKUP_REQUESTS,
        Permission.ASSIGN_PICKUPS,
        Permission.MANAGE_LOGISTICS_USERS,
        Permission.VIEW_PICKUP_ANALYTICS,
        Permission.LOGISTICS_MANAGE,
        # Pickup permissions
        Permission.PICKUP_VIEW,
        Permission.PICKUP_ASSIGN,
    },
    UserRole.LOGISTICS_USER: {
        Permission.VIEW_ASSIGNED_PICKUPS,
        Permission.PERFORM_ONSITE_QC,
        Permission.COLLECT_DEVICES,
        Permission.UPLOAD_PICKUP_PROOF,
        # Pickup, Review permissions
        Permission.PICKUP_VIEW,
        Permission.PICKUP_UPDATE,
        Permission.REVIEW_CREATE,  # For on-site QC
    },
}


# Role Hierarchy (from src/types/user.ts)
ROLE_HIERARCHY: Dict[UserRole, int] = {
    UserRole.SUPER_ADMIN: 5,
    UserRole.OPS_ADMIN: 4,
    UserRole.ORG_ADMIN: 3,
    UserRole.IT_ADMIN: 2,
    UserRole.LOGISTICS_ADMIN: 2,
    UserRole.LOGISTICS_USER: 1,
    UserRole.EMPLOYEE: 0,
}


def require_permissions(permission: Permission):
    """
    Decorator to require a specific permission for an endpoint.

    This is a no-op decorator that marks the endpoint as requiring a permission.
    The actual permission check is done in the endpoint using the current_user.

    Usage:
        @router.get("/assets")
        @require_permissions(Permission.ASSET_READ)
        async def list_assets(current_user: User = Depends(get_current_user)):
            # Permission is checked via the current_user dependency
            pass
    """

    def decorator(func):
        # Store the required permission on the function for documentation
        func._required_permission = permission
        return func

    return decorator
