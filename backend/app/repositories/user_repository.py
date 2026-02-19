"""User repository for database operations - Unified User Model"""

from typing import Optional, List, Tuple
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from app.models.user import User, UserRole, UserStatus
from app.utils.exceptions import NotFoundError, ConflictError


class UserRepository:
    """
    Repository for unified User model database operations.

    Supports all user roles:
    - Platform: SUPER_ADMIN, OPS_ADMIN
    - Enterprise: ORG_ADMIN, IT_ADMIN, EMPLOYEE
    - Logistics: LOGISTICS_ADMIN, LOGISTICS_USER
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Basic CRUD Operations ====================

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_with_relations(self, user_id: str) -> Optional[User]:
        """Get user by ID with enterprise and branch loaded"""
        query = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.enterprise),
                selectinload(User.branch),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email (unique across all users)"""
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_otp_token(self, token: str) -> Optional[User]:
        """Get user by OTP token (for employee login)"""
        query = select(User).where(User.otp_token == token)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        """Create a new user"""
        existing = await self.get_by_email(user.email)
        if existing:
            raise ConflictError(f"User with email {user.email} already exists")

        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update(self, user: User) -> User:
        """Update an existing user"""
        user.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def delete(self, user_id: str) -> bool:
        """Delete a user by ID"""
        user = await self.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)

        await self.db.delete(user)
        await self.db.flush()
        return True

    async def create_bulk(self, users: List[User]) -> List[User]:
        """Create multiple users in bulk"""
        self.db.add_all(users)
        await self.db.flush()
        for user in users:
            await self.db.refresh(user)
        return users

    # ==================== Query Operations ====================

    async def get_all(
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
    ) -> Tuple[List[User], int]:
        """
        Get all users with optional filters and pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum records to return
            role: Filter by single role
            roles: Filter by multiple roles
            enterprise_id: Filter by enterprise
            branch_id: Filter by branch
            parent_user_id: Filter by parent user (for logistics hierarchy)
            status: Filter by status
            search: Search in name, email, phone, employee_id

        Returns:
            Tuple of (users list, total count)
        """
        query = select(User)

        # Apply filters
        if role:
            query = query.where(User.role == role.value)
        if roles:
            query = query.where(User.role.in_([r.value for r in roles]))
        if enterprise_id:
            query = query.where(User.enterprise_id == enterprise_id)
        if branch_id:
            query = query.where(User.branch_id == branch_id)
        if branch_ids:
            query = query.where(User.branch_id.in_(branch_ids))
        if parent_user_id:
            query = query.where(User.parent_user_id == parent_user_id)
        if status:
            query = query.where(User.status == status.value)
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.phone.ilike(search_pattern),
                    User.employee_id.ilike(search_pattern),
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering, eager load relationships
        # Use created_at DESC as primary sort, id DESC as tiebreaker for stable ordering
        query = (
            query.options(selectinload(User.enterprise), selectinload(User.branch))
            .order_by(User.created_at.desc(), User.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        users = result.scalars().all()

        return list(users), total

    # ==================== Role-Specific Queries ====================

    async def get_employees_by_enterprise(
        self, enterprise_id: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[User], int]:
        """Get all employees for an enterprise"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            role=UserRole.EMPLOYEE,
            enterprise_id=enterprise_id,
        )

    async def get_employees_by_branch(
        self, branch_id: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[User], int]:
        """Get all employees for a branch"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            role=UserRole.EMPLOYEE,
            branch_id=branch_id,
        )

    async def get_it_admins_by_enterprise(
        self, enterprise_id: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[User], int]:
        """Get all IT admins for an enterprise"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            role=UserRole.IT_ADMIN,
            enterprise_id=enterprise_id,
        )

    async def get_it_admins_by_branch(self, branch_id: str) -> List[User]:
        """Get all IT admins for a branch"""
        query = (
            select(User)
            .where(User.branch_id == branch_id)
            .where(User.role == UserRole.IT_ADMIN.value)
            .order_by(User.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_org_admin_by_enterprise(self, enterprise_id: str) -> Optional[User]:
        """Get the org admin for an enterprise"""
        query = (
            select(User)
            .where(User.enterprise_id == enterprise_id)
            .where(User.role == UserRole.ORG_ADMIN.value)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_logistics_users_by_admin(
        self, logistics_admin_id: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[User], int]:
        """Get all logistics users under a logistics admin"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            role=UserRole.LOGISTICS_USER,
            parent_user_id=logistics_admin_id,
        )

    async def get_platform_users(self, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        """Get all platform-level users (Super Admin, OPS Admin)"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            roles=[UserRole.SUPER_ADMIN, UserRole.OPS_ADMIN],
        )

    async def get_logistics_admins(self, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        """Get all logistics admin users"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            role=UserRole.LOGISTICS_ADMIN,
        )

    # ==================== Utility Methods ====================

    async def update_last_login(self, user_id: str) -> Optional[User]:
        """Update user's last login timestamp"""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def set_otp(self, user_id: str, otp_token: str, expires_at: datetime) -> Optional[User]:
        """Set OTP token for a user (employee login)"""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        user.otp_token = otp_token
        user.otp_expires_at = expires_at
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def clear_otp(self, user_id: str) -> Optional[User]:
        """Clear OTP token after successful login"""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        user.otp_token = None
        user.otp_expires_at = None
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def set_password_reset_token(
        self, user_id: str, token: str, expires_at: datetime
    ) -> Optional[User]:
        """Set password reset token (separate from OTP)"""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        user.password_reset_token = token
        user.password_reset_expires_at = expires_at
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def clear_password_reset_token(self, user_id: str) -> Optional[User]:
        """Clear password reset token after use"""
        user = await self.get_by_id(user_id)
        if not user:
            return None

        user.password_reset_token = None
        user.password_reset_expires_at = None
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def count_by_role(self, role: UserRole) -> int:
        """Count users by role"""
        query = select(func.count(User.id)).where(User.role == role.value)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def count_by_enterprise(self, enterprise_id: str) -> int:
        """Count all users in an enterprise"""
        query = select(func.count(User.id)).where(User.enterprise_id == enterprise_id)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def count_employees_by_enterprise(self, enterprise_id: str) -> int:
        """Count employees in an enterprise"""
        query = (
            select(func.count(User.id))
            .where(User.enterprise_id == enterprise_id)
            .where(User.role == UserRole.EMPLOYEE.value)
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def exists_by_email(self, email: str, exclude_id: Optional[str] = None) -> bool:
        """Check if user exists by email (optionally excluding a specific user ID)"""
        query = select(User).where(User.email == email)
        if exclude_id:
            query = query.where(User.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def exists_by_employee_id(
        self, employee_id: str, enterprise_id: str, exclude_id: Optional[str] = None
    ) -> bool:
        """Check if employee ID exists within an enterprise"""
        query = (
            select(User)
            .where(User.employee_id == employee_id)
            .where(User.enterprise_id == enterprise_id)
        )
        if exclude_id:
            query = query.where(User.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
