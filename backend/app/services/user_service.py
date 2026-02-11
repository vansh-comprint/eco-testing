"""User service for unified user model"""

import secrets
from typing import Optional, List, Tuple, Dict, Any
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import Branch
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserBulkCreate
from app.utils.exceptions import NotFoundError, ValidationError, ConflictError
from app.utils.security import validate_user_modification
from app.core.security import get_password_hash


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
            initial_status = UserStatus.ACTIVE.value
        else:
            # All other roles require password
            if not user_data.password:
                raise ValidationError(f"Password is required for {user_data.role.value} role")
            password_hash = get_password_hash(user_data.password)
            initial_status = UserStatus.ACTIVE.value

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

        # Handle enum conversions
        if "role" in update_data and update_data["role"]:
            update_data["role"] = update_data["role"].value
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value

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

            await self.db.commit()

        return UserResponse.model_validate(user)

    async def delete_user(self, user_id: str, actor: Optional[User] = None) -> bool:
        """
        Delete a user with IDOR protection.

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
                target_status="deleted",  # Deletion is like setting status to deleted
            )

        success = await self.repository.delete(user_id)
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
        from app.core.security import session_limiter

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

        # Invalidate all existing sessions for security
        session_limiter.clear_all_sessions(user_id)

        user = await self.repository.update(user)
        return UserResponse.model_validate(user)

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
