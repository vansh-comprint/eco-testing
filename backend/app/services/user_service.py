"""User service for unified user model"""

import logging
import secrets
from typing import Optional, List, Tuple, Dict, Any
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select, delete as sql_delete

from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import Branch, BranchStatus, Enterprise
from app.models.asset import Asset, AssetStatus
from app.models.logistics import PickupRequest, PickupStatus
from app.models.submission import Submission
from app.models.support import Dispute, DisputeStatus
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserBulkCreate
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError
from app.utils.security import validate_user_modification
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

# Role categories for update validation
ENTERPRISE_ROLES = {UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value, UserRole.EMPLOYEE.value}
PLATFORM_ROLES = {UserRole.SUPER_ADMIN.value, UserRole.OPS_ADMIN.value}

# Asset statuses that must be reverted when an employee is deactivated
EMPLOYEE_ACTIVE_ASSET_STATUSES = {
    AssetStatus.ASSIGNED.value,
    AssetStatus.CHECK_IN_STARTED.value,
}

# Pickup statuses that are terminal — do not touch them on deactivation
PICKUP_TERMINAL_STATUSES = {
    PickupStatus.COMPLETED.value,
    PickupStatus.CANCELLED.value,
    PickupStatus.FAILED.value,
    "in_progress",  # let in-progress pickups complete
}

# Pickup statuses owned by logistics_admin (revert to pending_assignment on admin deactivation)
LOGISTICS_ADMIN_PICKUP_STATUSES = {
    "assigned_to_logistics_admin",
    "assigned_to_logistics_user",
    "scheduled",
    "rescheduled",
}

# Pickup statuses owned by logistics_user (revert to assigned_to_logistics_admin)
LOGISTICS_USER_PICKUP_STATUSES = {
    "assigned_to_logistics_user",
    "scheduled",
    "rescheduled",
}


class UserService:
    """
    Service for unified User business logic.

    Handles all user types through role-based differentiation:
    - Platform users (Super Admin, OPS Admin) - password-based
    - Enterprise users (Org Admin, IT Admin) - password-based
    - Employees - OTP-based (no password)
    - Logistics users (Logistics Admin, Logistics User) - password-based
    """

    def __init__(self, db: AsyncSession):
        self.repository = UserRepository(db)
        self.db = db

    # ==================== CRUD Operations ====================

    async def get_user(self, user_id: str) -> UserResponse:
        """Get user by ID"""
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return UserResponse.model_validate(user)

    async def get_user_by_email(self, email: str) -> Optional[UserResponse]:
        """Get user by email"""
        user = await self.repository.get_by_email(email)
        if not user:
            return None
        return UserResponse.model_validate(user)

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        role: Optional[UserRole] = None,
        roles: Optional[List[UserRole]] = None,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        branch_ids: Optional[List[str]] = None,
        parent_user_id: Optional[str] = None,
        status: Optional[UserStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[UserResponse], int]:
        """
        List users with filters and pagination.

        Use role filter to get specific user types:
        - role=employee for employees
        - role=it_admin for IT admins
        - role=logistics_admin for logistics admins
        """
        users, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            role=role,
            roles=roles,
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            branch_ids=branch_ids,
            parent_user_id=parent_user_id,
            status=status,
            search=search,
        )

        # Build responses with enterprise and branch names
        responses = []
        for user in users:
            response = UserResponse.model_validate(user)
            # Add enterprise name if user has enterprise relationship
            if user.enterprise:
                response.enterprise_name = user.enterprise.name
            # Add branch name if user has branch relationship
            if user.branch:
                response.branch_name = user.branch.branch_name
            responses.append(response)

        return responses, total

    async def create_user(self, user_data: UserCreate, created_by: str) -> UserResponse:
        """
        Create a new user.

        - For employees (role=EMPLOYEE): defaults to 'password123' if no password provided
        - For all other roles: password required
        """
        # Check if email already exists
        existing = await self.repository.get_by_email(user_data.email)
        if existing:
            raise ConflictError(f"User with email {user_data.email} already exists")

        # Validate role-specific requirements
        await self._validate_user_creation(user_data)

        # Determine password handling based on role
        is_employee = user_data.role == UserRole.EMPLOYEE

        if is_employee:
            # Employees get a default password for portal login
            password_hash = get_password_hash(user_data.password or "password123")
        else:
            # All other roles require password
            if not user_data.password:
                raise ValidationError(f"Password is required for {user_data.role.value} role")
            password_hash = get_password_hash(user_data.password)

        # Respect the requested status if provided, otherwise default to active
        initial_status = (
            user_data.status.value if user_data.status else UserStatus.ACTIVE.value
        )

        # Check employee_id uniqueness for employees
        if is_employee and user_data.employee_id and user_data.enterprise_id:
            exists = await self.repository.exists_by_employee_id(
                user_data.employee_id, user_data.enterprise_id
            )
            if exists:
                raise ConflictError(
                    f"Employee ID {user_data.employee_id} already exists in this enterprise"
                )

        # Create user model
        user = User(
            id=str(uuid4()),
            email=user_data.email,
            name=user_data.name,
            phone=user_data.phone,
            role=user_data.role.value,
            enterprise_id=user_data.enterprise_id,
            branch_id=user_data.branch_id,
            parent_user_id=user_data.parent_user_id,
            password_hash=password_hash,
            status=initial_status,
            # Employee-specific fields
            employee_id=user_data.employee_id,
            department=user_data.department,
            designation=user_data.designation,
            # Logistics-specific fields
            company_name=user_data.company_name,
            contact_person=user_data.contact_person,
            address=user_data.address,
            city=user_data.city,
            state=user_data.state,
            service_areas=user_data.service_areas,
            vehicle_type=user_data.vehicle_type,
            vehicle_number=user_data.vehicle_number,
            is_active=True,
            created_by=created_by,
            updated_by=created_by,
        )

        user = await self.repository.create(user)

        # If IT admin was assigned to a branch, also update the branch's it_admin_id
        if user_data.role == UserRole.IT_ADMIN and user_data.branch_id:
            result = await self.db.execute(select(Branch).where(Branch.id == user_data.branch_id))
            branch = result.scalar_one_or_none()
            if branch:
                branch.it_admin_id = user.id
                await self.db.commit()

        return UserResponse.model_validate(user)

    async def create_users_bulk(
        self, bulk_data: UserBulkCreate, created_by: str
    ) -> Tuple[List[UserResponse], List[str]]:
        """
        Create multiple users in bulk.

        Typically used for bulk employee imports.
        """
        created_users = []
        errors = []
        role = bulk_data.role
        is_employee = role == UserRole.EMPLOYEE

        for idx, user_item in enumerate(bulk_data.users):
            try:
                # Check if email already exists
                existing = await self.repository.get_by_email(user_item.email)
                if existing:
                    errors.append(
                        f"Row {idx + 1}: User with email {user_item.email} already exists"
                    )
                    continue

                # Check if employee_id already exists (for employees)
                if is_employee and user_item.employee_id:
                    exists = await self.repository.exists_by_employee_id(
                        user_item.employee_id, bulk_data.enterprise_id
                    )
                    if exists:
                        errors.append(
                            f"Row {idx + 1}: Employee ID {user_item.employee_id} already exists"
                        )
                        continue

                # Create user model
                user = User(
                    id=str(uuid4()),
                    email=user_item.email,
                    name=user_item.name,
                    phone=user_item.phone,
                    role=role.value,
                    enterprise_id=bulk_data.enterprise_id,
                    branch_id=bulk_data.branch_id or user_item.branch_id,
                    employee_id=user_item.employee_id,
                    department=user_item.department,
                    designation=user_item.designation,
                    password_hash=(
                        get_password_hash(user_item.password or "password123")
                        if (user_item.password or is_employee)
                        else None
                    ),
                    status=UserStatus.ACTIVE.value,
                    created_by=created_by,
                    updated_by=created_by,
                )
                created_users.append(user)

            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")

        # Bulk insert if we have any valid users
        if created_users:
            created_users = await self.repository.create_bulk(created_users)

        return [UserResponse.model_validate(u) for u in created_users], errors

    async def update_user(
        self, user_id: str, user_data: UserUpdate, updated_by: str, actor: Optional[User] = None
    ) -> UserResponse:
        """
        Update an existing user with IDOR protection.

        Args:
            user_id: ID of user to update
            user_data: Update data
            updated_by: ID of user making the update
            actor: User object of the actor (for IDOR validation)
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)

        # IDOR Protection: Validate actor can modify this user
        if actor:
            update_data_dict = user_data.model_dump(exclude_unset=True)
            new_status = update_data_dict.get("status")
            if new_status:
                new_status = new_status.value if hasattr(new_status, "value") else new_status

            validate_user_modification(
                actor=actor,
                target_user_id=user_id,
                target_role=user.role,
                target_enterprise_id=user.enterprise_id,
                target_status=new_status,
            )

        # Update only provided fields
        update_data = user_data.model_dump(exclude_unset=True)

        # Enterprise association is immutable — set at creation, never changed via edit.
        # To move a user to a different enterprise, deactivate and recreate.
        update_data.pop("enterprise_id", None)

        # Validate email uniqueness if email is being changed
        if "email" in update_data and update_data["email"] != user.email:
            existing = await self.repository.get_by_email(update_data["email"])
            if existing:
                raise ConflictError(f"User with email {update_data['email']} already exists")

        # Handle enum conversions
        if "role" in update_data and update_data["role"]:
            update_data["role"] = update_data["role"].value
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value

        # --- Role-change validation ---
        new_role = update_data.get("role")
        if new_role and new_role != user.role:
            await self._validate_role_change(user, update_data, new_role)

        # Track if branch_id is changing for an IT admin
        old_branch_id = user.branch_id
        new_branch_id = update_data.get("branch_id")
        is_it_admin = user.role == UserRole.IT_ADMIN.value

        for key, value in update_data.items():
            setattr(user, key, value)

        user.updated_by = updated_by
        user = await self.repository.update(user)

        # Sync branch.it_admin_id when IT admin's branch assignment changes
        if is_it_admin and "branch_id" in update_data and new_branch_id != old_branch_id:
            # Remove IT admin from old branch
            if old_branch_id:
                result = await self.db.execute(select(Branch).where(Branch.id == old_branch_id))
                old_branch = result.scalar_one_or_none()
                if old_branch and old_branch.it_admin_id == user.id:
                    old_branch.it_admin_id = None

            # Assign IT admin to new branch
            if new_branch_id:
                result = await self.db.execute(select(Branch).where(Branch.id == new_branch_id))
                new_branch = result.scalar_one_or_none()
                if new_branch:
                    new_branch.it_admin_id = user.id

        # --- Deactivation side-effects (BEFORE commit, inside same transaction) ---
        new_status = update_data.get("status")
        if new_status == UserStatus.INACTIVE.value:
            await self._handle_deactivation_side_effects(user)

        # Explicit commit to ensure all changes are persisted
        await self.db.commit()
        await self.db.refresh(user)

        return UserResponse.model_validate(user)

    async def delete_user(self, user_id: str, actor: Optional[User] = None) -> bool:
        """
        Delete a user with full side-effect cleanup.

        Runs the same side-effect cleanup as deactivation (unassign assets,
        clear branches, revert pickups, cascade child users, etc.) BEFORE
        removing the user record. Everything runs in a single transaction.

        Args:
            user_id: ID of user to delete
            actor: User object of the actor (for IDOR validation)
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)

        # IDOR Protection: Validate actor can delete this user
        if actor:
            validate_user_modification(
                actor=actor,
                target_user_id=user_id,
                target_role=user.role,
                target_enterprise_id=user.enterprise_id,
                target_status="deleted",
            )

        # BLOCK deletion of sole org admin (unlike deactivation which only warns)
        if user.role == UserRole.ORG_ADMIN.value and user.enterprise_id:
            other_result = await self.db.execute(
                select(User)
                .where(User.enterprise_id == user.enterprise_id)
                .where(User.role == UserRole.ORG_ADMIN.value)
                .where(User.status == UserStatus.ACTIVE.value)
                .where(User.id != user.id)
            )
            others = other_result.scalars().all()
            if len(others) == 0:
                raise ValidationError(
                    "Cannot delete the sole active Org Admin for this enterprise. "
                    "Assign another Org Admin first, or deactivate instead."
                )

        # Run all role-specific cleanup (assets, branches, pickups, child users, disputes)
        # before deleting the user record. Same transaction ensures atomicity.
        await self._handle_deactivation_side_effects(user)

        # Now delete the user record.
        # FK constraints (SET NULL) handle referential integrity for:
        # - asset.assigned_to_user_id, batch.created_by, review.reviewed_by, etc.
        # - submission.user_id uses CASCADE (auto-deleted with user)
        # Business logic cleanup (asset statuses, branch statuses, pickup reverts)
        # was already handled by _handle_deactivation_side_effects above.
        success = await self.repository.delete(user_id)

        # Explicit commit to persist both side-effects and deletion atomically
        await self.db.commit()

        return success

    async def update_last_login(self, user_id: str) -> Optional[UserResponse]:
        """Update user's last login timestamp"""
        user = await self.repository.update_last_login(user_id)
        if not user:
            return None
        return UserResponse.model_validate(user)

    # ==================== Validation ====================

    async def _validate_user_creation(self, user_data: UserCreate) -> None:
        """Validate user creation based on role"""
        role = user_data.role

        # Employee must have enterprise_id
        if role == UserRole.EMPLOYEE:
            if not user_data.enterprise_id:
                raise ValidationError("Employee must be assigned to an enterprise")

        # IT Admin must have enterprise_id (branch_id is optional - can be assigned later)
        elif role == UserRole.IT_ADMIN:
            if not user_data.enterprise_id:
                raise ValidationError("IT Admin must be assigned to an enterprise")

        # Org Admin must have enterprise_id
        elif role == UserRole.ORG_ADMIN:
            if not user_data.enterprise_id:
                raise ValidationError("Org Admin must be assigned to an enterprise")

        # Platform users should not have enterprise_id
        elif role in [UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN]:
            if user_data.enterprise_id:
                raise ValidationError(f"{role.value} should not be assigned to an enterprise")

        # Logistics User must have parent_user_id (Logistics Admin)
        elif role == UserRole.LOGISTICS_USER:
            if not user_data.parent_user_id:
                raise ValidationError("Logistics User must be assigned to a Logistics Admin")

    async def _validate_role_change(
        self, user: User, update_data: dict, new_role: str
    ) -> None:
        """
        Validate and adjust fields when a user's role is changing.

        - Enterprise roles require enterprise_id (from update or existing user).
        - Platform roles clear enterprise_id and branch_id.
        - Logistics user requires parent_user_id pointing to a logistics_admin.
        - Leaving logistics_user clears parent_user_id.
        """
        # Changing TO an enterprise role
        if new_role in ENTERPRISE_ROLES:
            enterprise_id = update_data.get("enterprise_id") or user.enterprise_id
            if not enterprise_id:
                raise ValidationError(
                    f"enterprise_id is required when assigning role '{new_role}'"
                )
            # Validate enterprise exists
            result = await self.db.execute(
                select(Enterprise).where(Enterprise.id == enterprise_id)
            )
            enterprise = result.scalar_one_or_none()
            if not enterprise:
                raise NotFoundError("Enterprise", enterprise_id)
            # Ensure enterprise_id is in update_data so it gets applied
            if "enterprise_id" not in update_data:
                update_data["enterprise_id"] = enterprise_id

        # Changing TO a platform role — clear enterprise/branch association
        elif new_role in PLATFORM_ROLES:
            update_data["enterprise_id"] = None
            update_data["branch_id"] = None

        # Changing TO logistics_user — require parent_user_id
        if new_role == UserRole.LOGISTICS_USER.value:
            parent_user_id = update_data.get("parent_user_id") or user.parent_user_id
            if not parent_user_id:
                raise ValidationError(
                    "parent_user_id is required when assigning role 'logistics_user'"
                )
            # Validate the parent is a logistics_admin
            parent = await self.repository.get_by_id(parent_user_id)
            if not parent:
                raise NotFoundError("Parent user", parent_user_id)
            if parent.role != UserRole.LOGISTICS_ADMIN.value:
                raise ValidationError(
                    f"Parent user '{parent_user_id}' is not a logistics_admin"
                )
            if "parent_user_id" not in update_data:
                update_data["parent_user_id"] = parent_user_id

        # Changing FROM logistics_user to something else — clear parent_user_id
        if (
            user.role == UserRole.LOGISTICS_USER.value
            and new_role != UserRole.LOGISTICS_USER.value
        ):
            update_data["parent_user_id"] = None

    # ==================== Password Management ====================

    async def reset_password(
        self, user_id: str, new_password: str, actor: Optional[User] = None
    ) -> UserResponse:
        """
        Reset a user's password (admin-initiated).

        Args:
            user_id: ID of user whose password to reset
            new_password: New password (min 8 characters)
            actor: User object of the actor (for IDOR validation)
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)

        # Employees don't have passwords (they use OTP)
        if user.role == UserRole.EMPLOYEE.value:
            raise ValidationError("Cannot reset password for employees (they use OTP-based auth)")

        # IDOR Protection: Validate actor can modify this user
        if actor:
            validate_user_modification(
                actor=actor,
                target_user_id=user_id,
                target_role=user.role,
                target_enterprise_id=user.enterprise_id,
            )

        # Hash the new password
        password_hash = get_password_hash(new_password)
        user.password_hash = password_hash
        user.updated_by = actor.id if actor else user_id

        user = await self.repository.update(user)
        # Explicit commit to ensure password change is persisted
        await self.db.commit()
        await self.db.refresh(user)
        return UserResponse.model_validate(user)

    async def toggle_logistics_company_status(
        self, admin_user_id: str, activate: bool, actor: User
    ) -> dict:
        """
        Toggle logistics admin + all their field users active/inactive.

        When deactivating (activate=False), also reverts all non-terminal pickups
        assigned to the admin or any of their child users back to pending status,
        matching the same cleanup as individual user deactivation.
        """
        admin_user = await self.repository.get_by_id(admin_user_id)
        if not admin_user:
            raise NotFoundError("User", admin_user_id)
        if admin_user.role != UserRole.LOGISTICS_ADMIN.value:
            raise ValidationError("User is not a logistics admin")

        new_status = UserStatus.ACTIVE.value if activate else UserStatus.INACTIVE.value
        new_is_active = activate

        # Update admin
        admin_user.status = new_status
        admin_user.is_active = new_is_active
        admin_user.updated_by = actor.id
        await self.repository.update(admin_user)

        # Update all child logistics users (status + is_active)
        from sqlalchemy import update as sql_update
        from app.models.user import User as UserModel
        stmt = (
            sql_update(UserModel)
            .where(UserModel.parent_user_id == admin_user_id)
            .where(UserModel.role == UserRole.LOGISTICS_USER.value)
            .values(status=new_status, is_active=new_is_active, updated_by=actor.id)
        )
        result = await self.db.execute(stmt)

        pickups_reverted = 0

        # When DEACTIVATING: revert all non-terminal pickups assigned to this company
        if not activate:
            # Revert pickups assigned to admin → back to pending
            admin_pickup_result = await self.db.execute(
                select(PickupRequest)
                .where(PickupRequest.logistics_admin_id == admin_user_id)
                .where(PickupRequest.status.in_(list(LOGISTICS_ADMIN_PICKUP_STATUSES)))
            )
            admin_pickups = admin_pickup_result.scalars().all()

            for pickup in admin_pickups:
                pickup.logistics_admin_id = None
                pickup.logistics_user_id = None
                pickup.status = PickupStatus.PENDING.value
                pickups_reverted += 1

            # Also revert pickups assigned to child users that may not be
            # covered above (e.g., if a child user was assigned a pickup from
            # a different logistics admin — unlikely but defensive)
            child_ids_result = await self.db.execute(
                select(UserModel.id)
                .where(UserModel.parent_user_id == admin_user_id)
                .where(UserModel.role == UserRole.LOGISTICS_USER.value)
            )
            child_ids = [r[0] for r in child_ids_result.all()]

            if child_ids:
                child_pickup_result = await self.db.execute(
                    select(PickupRequest)
                    .where(PickupRequest.logistics_user_id.in_(child_ids))
                    .where(PickupRequest.logistics_admin_id != admin_user_id)
                    .where(PickupRequest.status.in_(list(LOGISTICS_USER_PICKUP_STATUSES)))
                )
                child_pickups = child_pickup_result.scalars().all()

                for pickup in child_pickups:
                    pickup.logistics_user_id = None
                    pickup.status = "assigned_to_logistics_admin"
                    pickups_reverted += 1

            logger.info(
                "Logistics company %s deactivated: %d field users, %d pickups reverted",
                admin_user_id,
                result.rowcount,
                pickups_reverted,
            )

        await self.db.commit()

        # Refresh to avoid greenlet_spawn after commit
        await self.db.refresh(admin_user)

        return {
            "admin_id": admin_user_id,
            "new_status": new_status,
            "field_users_updated": result.rowcount,
            "pickups_reverted": pickups_reverted,
        }

    async def get_it_admins_with_branches(self, enterprise_id: str) -> List[Dict[str, Any]]:
        """
        Get IT admins for an enterprise with their assigned branch details.

        Args:
            enterprise_id: Enterprise ID to fetch IT admins for

        Returns:
            List of IT admin dictionaries with branch_count and branches array
        """
        # Query IT admins for this enterprise
        users_query = (
            select(User)
            .where(User.enterprise_id == enterprise_id)
            .where(User.role == UserRole.IT_ADMIN.value)
        )
        users_result = await self.db.execute(users_query)
        it_admins = users_result.scalars().all()

        # Query all branches for this enterprise to build the mapping
        branches_query = (
            select(Branch)
            .where(Branch.enterprise_id == enterprise_id)
            .where(Branch.it_admin_id.isnot(None))
        )
        branches_result = await self.db.execute(branches_query)
        branches = branches_result.scalars().all()

        # Build IT admin → branches map
        admin_branches: dict = {}
        for branch in branches:
            if branch.it_admin_id not in admin_branches:
                admin_branches[branch.it_admin_id] = []
            admin_branches[branch.it_admin_id].append(
                {
                    "id": branch.id,
                    "branch_name": branch.branch_name,
                    "branch_code": branch.branch_code,
                }
            )

        # Build response
        data = []
        for admin in it_admins:
            admin_data = UserResponse.model_validate(admin).model_dump()
            branch_list = admin_branches.get(admin.id, [])
            admin_data["branch_count"] = len(branch_list)
            admin_data["branches"] = branch_list
            data.append(admin_data)

        return data

    # ==================== Deactivation Side-Effects ====================

    async def preview_deactivation(self, user_id: str, actor: User) -> Dict[str, Any]:
        """
        Preview the side-effects of deactivating a user without applying them.

        Returns counts of entities that will be affected so the caller can
        display a confirmation prompt before committing the action.
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)

        role = user.role
        preview: Dict[str, Any] = {
            "user_id": user_id,
            "user_role": role,
            "assets_to_unassign": 0,
            "submissions_to_delete": 0,
            "branches_affected": 0,
            "pickups_to_unassign": 0,
            "child_users_to_deactivate": 0,
            "is_sole_org_admin": False,
            "open_disputes_to_unassign": 0,
        }

        if role == UserRole.EMPLOYEE.value:
            # Count assets in active states
            asset_result = await self.db.execute(
                select(Asset)
                .where(Asset.assigned_to_user_id == user_id)
                .where(Asset.status.in_(list(EMPLOYEE_ACTIVE_ASSET_STATUSES)))
            )
            assets = asset_result.scalars().all()
            preview["assets_to_unassign"] = len(assets)

            # Count partial submissions for check_in_started assets
            check_in_asset_ids = [
                a.id for a in assets if a.status == AssetStatus.CHECK_IN_STARTED.value
            ]
            if check_in_asset_ids:
                sub_result = await self.db.execute(
                    select(Submission).where(
                        Submission.asset_id.in_(check_in_asset_ids)
                    )
                )
                preview["submissions_to_delete"] = len(sub_result.scalars().all())

            # Count open disputes assigned to this user
            dispute_result = await self.db.execute(
                select(Dispute)
                .where(Dispute.assigned_to_user_id == user_id)
                .where(Dispute.status.in_([
                    DisputeStatus.OPEN.value,
                    DisputeStatus.UNDER_REVIEW.value,
                    DisputeStatus.ESCALATED.value,
                ]))
            )
            preview["open_disputes_to_unassign"] = len(dispute_result.scalars().all())

        elif role == UserRole.IT_ADMIN.value:
            # Count branches where this user is the IT admin
            branch_result = await self.db.execute(
                select(Branch).where(Branch.it_admin_id == user_id)
            )
            preview["branches_affected"] = len(branch_result.scalars().all())

        elif role == UserRole.ORG_ADMIN.value:
            if user.enterprise_id:
                # Check if this is the only active org admin for the enterprise
                other_admins_result = await self.db.execute(
                    select(User)
                    .where(User.enterprise_id == user.enterprise_id)
                    .where(User.role == UserRole.ORG_ADMIN.value)
                    .where(User.status == UserStatus.ACTIVE.value)
                    .where(User.id != user_id)
                )
                other_admins = other_admins_result.scalars().all()
                preview["is_sole_org_admin"] = len(other_admins) == 0

        elif role == UserRole.LOGISTICS_ADMIN.value:
            # Count active child logistics users
            child_result = await self.db.execute(
                select(User)
                .where(User.parent_user_id == user_id)
                .where(User.role == UserRole.LOGISTICS_USER.value)
                .where(User.status == UserStatus.ACTIVE.value)
            )
            preview["child_users_to_deactivate"] = len(child_result.scalars().all())

            # Count non-terminal pickups assigned to this admin
            pickup_result = await self.db.execute(
                select(PickupRequest)
                .where(PickupRequest.logistics_admin_id == user_id)
                .where(PickupRequest.status.in_(list(LOGISTICS_ADMIN_PICKUP_STATUSES)))
            )
            preview["pickups_to_unassign"] = len(pickup_result.scalars().all())

        elif role == UserRole.LOGISTICS_USER.value:
            # Count non-terminal pickups assigned to this user
            pickup_result = await self.db.execute(
                select(PickupRequest)
                .where(PickupRequest.logistics_user_id == user_id)
                .where(PickupRequest.status.in_(list(LOGISTICS_USER_PICKUP_STATUSES)))
            )
            preview["pickups_to_unassign"] = len(pickup_result.scalars().all())

        return preview

    async def _handle_deactivation_side_effects(self, user: User) -> Dict[str, Any]:
        """
        Dispatch to role-specific deactivation handlers.

        Must be called BEFORE the final db.commit() in update_user so that
        all changes are contained within the same transaction.

        Returns a summary dict of actions taken (for logging purposes).
        """
        role = user.role
        logger.info(
            "Handling deactivation side-effects for user %s (role=%s)",
            user.id,
            role,
        )

        if role == UserRole.EMPLOYEE.value:
            summary = await self._deactivate_employee(user.id)

        elif role == UserRole.IT_ADMIN.value:
            summary = await self._deactivate_it_admin(user)

        elif role == UserRole.ORG_ADMIN.value:
            summary = await self._deactivate_org_admin(user)

        elif role == UserRole.LOGISTICS_ADMIN.value:
            # Sync is_active alongside status
            user.is_active = False
            summary = await self._deactivate_logistics_admin(user)

        elif role == UserRole.LOGISTICS_USER.value:
            # Sync is_active alongside status
            user.is_active = False
            summary = await self._deactivate_logistics_user(user)

        else:
            # Platform roles (super_admin, ops_admin) — no side-effects needed
            summary = {"role": role, "actions": "none required"}

        logger.info(
            "Deactivation side-effects complete for user %s: %s",
            user.id,
            summary,
        )
        return summary

    async def _deactivate_employee(self, user_id: str) -> Dict[str, Any]:
        """
        Employee deactivation:
        1. Find assets in assigned/check_in_started status.
        2. For check_in_started assets: delete the partial submission first
           (unique constraint on asset_id requires this before status reset).
        3. Reset all active assets to pending_assignment and clear assignment.
        """
        asset_result = await self.db.execute(
            select(Asset)
            .where(Asset.assigned_to_user_id == user_id)
            .where(Asset.status.in_(list(EMPLOYEE_ACTIVE_ASSET_STATUSES)))
        )
        assets = asset_result.scalars().all()

        unassigned_count = 0
        deleted_submissions = 0

        for asset in assets:
            if asset.status == AssetStatus.CHECK_IN_STARTED.value:
                # Delete partial submission before resetting asset status
                # (Submission.asset_id has a unique constraint — must remove first)
                del_result = await self.db.execute(
                    sql_delete(Submission).where(Submission.asset_id == asset.id)
                )
                deleted_submissions += del_result.rowcount
                logger.debug(
                    "Deleted partial submission for asset %s (check_in_started → pending_assignment)",
                    asset.id,
                )

            asset.status = AssetStatus.PENDING_ASSIGNMENT.value
            asset.assigned_to_user_id = None
            asset.assigned_at = None
            unassigned_count += 1

        # Nullify open disputes assigned to this user
        disputes_result = await self.db.execute(
            select(Dispute)
            .where(Dispute.assigned_to_user_id == user_id)
            .where(Dispute.status.in_([
                DisputeStatus.OPEN.value,
                DisputeStatus.UNDER_REVIEW.value,
                DisputeStatus.ESCALATED.value,
            ]))
        )
        open_disputes = disputes_result.scalars().all()
        for dispute in open_disputes:
            dispute.assigned_to_user_id = None

        return {
            "role": UserRole.EMPLOYEE.value,
            "assets_unassigned": unassigned_count,
            "submissions_deleted": deleted_submissions,
            "disputes_unassigned": len(open_disputes),
        }

    async def _deactivate_it_admin(self, user: User) -> Dict[str, Any]:
        """
        IT Admin deactivation:
        1. Clear branch.it_admin_id for all branches this admin manages.
        2. Set branch status to NEEDS_ADMIN.
        """
        branch_result = await self.db.execute(
            select(Branch).where(Branch.it_admin_id == user.id)
        )
        branches = branch_result.scalars().all()

        for branch in branches:
            branch.it_admin_id = None
            branch.status = BranchStatus.NEEDS_ADMIN.value

        logger.info(
            "IT Admin %s deactivated: %d branches set to needs_admin",
            user.id,
            len(branches),
        )
        return {
            "role": UserRole.IT_ADMIN.value,
            "branches_cleared": len(branches),
        }

    async def _deactivate_org_admin(self, user: User) -> Dict[str, Any]:
        """
        Org Admin deactivation:
        Log a warning if this is the last active org admin for the enterprise.
        No hard block — admin may intentionally leave the enterprise without an admin.
        """
        is_sole = False
        if user.enterprise_id:
            other_result = await self.db.execute(
                select(User)
                .where(User.enterprise_id == user.enterprise_id)
                .where(User.role == UserRole.ORG_ADMIN.value)
                .where(User.status == UserStatus.ACTIVE.value)
                .where(User.id != user.id)
            )
            others = other_result.scalars().all()
            is_sole = len(others) == 0
            if is_sole:
                logger.warning(
                    "Deactivating sole Org Admin %s for enterprise %s. "
                    "Enterprise will have no active org admin.",
                    user.id,
                    user.enterprise_id,
                )

        return {
            "role": UserRole.ORG_ADMIN.value,
            "is_sole_org_admin": is_sole,
            "enterprise_id": user.enterprise_id,
        }

    async def _deactivate_logistics_admin(self, user: User) -> Dict[str, Any]:
        """
        Logistics Admin deactivation:
        1. Cascade deactivation to all active child logistics users.
        2. Revert all non-terminal pickups (assigned_to_logistics_admin, assigned_to_logistics_user,
           scheduled, rescheduled) back to pending_assignment, clearing both assignment fields.
        """
        from sqlalchemy import update as sql_update

        # 1. Cascade status to child logistics users
        child_update_stmt = (
            sql_update(User)
            .where(User.parent_user_id == user.id)
            .where(User.role == UserRole.LOGISTICS_USER.value)
            .where(User.status == UserStatus.ACTIVE.value)
            .values(
                status=UserStatus.INACTIVE.value,
                is_active=False,
            )
        )
        child_result = await self.db.execute(child_update_stmt)
        children_deactivated = child_result.rowcount

        # 2. Revert pickups assigned to this admin back to pending_assignment
        pickup_result = await self.db.execute(
            select(PickupRequest)
            .where(PickupRequest.logistics_admin_id == user.id)
            .where(PickupRequest.status.in_(list(LOGISTICS_ADMIN_PICKUP_STATUSES)))
        )
        pickups = pickup_result.scalars().all()

        for pickup in pickups:
            pickup.logistics_admin_id = None
            pickup.logistics_user_id = None
            pickup.status = PickupStatus.PENDING.value

        logger.info(
            "Logistics Admin %s deactivated: %d children deactivated, %d pickups reverted",
            user.id,
            children_deactivated,
            len(pickups),
        )
        return {
            "role": UserRole.LOGISTICS_ADMIN.value,
            "children_deactivated": children_deactivated,
            "pickups_reverted": len(pickups),
        }

    async def _deactivate_logistics_user(self, user: User) -> Dict[str, Any]:
        """
        Logistics User deactivation:
        Revert all non-terminal pickups (assigned_to_logistics_user, scheduled, rescheduled)
        back to assigned_to_logistics_admin, clearing only the logistics_user_id field.
        The logistics admin assignment is preserved so OPS admin can reassign a different driver.
        """
        pickup_result = await self.db.execute(
            select(PickupRequest)
            .where(PickupRequest.logistics_user_id == user.id)
            .where(PickupRequest.status.in_(list(LOGISTICS_USER_PICKUP_STATUSES)))
        )
        pickups = pickup_result.scalars().all()

        for pickup in pickups:
            pickup.logistics_user_id = None
            pickup.status = "assigned_to_logistics_admin"

        logger.info(
            "Logistics User %s deactivated: %d pickups reverted to assigned_to_logistics_admin",
            user.id,
            len(pickups),
        )
        return {
            "role": UserRole.LOGISTICS_USER.value,
            "pickups_reverted": len(pickups),
        }
