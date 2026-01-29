"""Authentication service for unified user model"""

from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    session_limiter,
)
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import BranchStatus, EnterpriseStatus
from app.repositories.user_repository import UserRepository
from app.repositories.branch_repository import BranchRepository
from app.repositories.enterprise_repository import EnterpriseRepository
from app.schemas.auth import LoginRequest, EmployeeOTPRequest, EmployeeOTPVerifyRequest
from app.utils.exceptions import AuthenticationError, NotFoundError


class AuthService:
    """
    Service for authentication operations.

    Supports:
    - Password-based login for admin users
    - OTP-based login for employees
    - Token refresh
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.branch_repo = BranchRepository(db)
        self.enterprise_repo = EnterpriseRepository(db)

    def _build_token_data(self, user: User) -> dict:
        """Build JWT token payload from user"""
        return {
            "sub": user.id,
            "role": user.role,
            "enterprise_id": user.enterprise_id,
            "branch_id": user.branch_id,
            "parent_user_id": user.parent_user_id,
        }

    async def _check_branch_and_enterprise_active(self, user: User) -> None:
        """
        Check if user's branch and enterprise are active.
        
        Platform users (Super Admin, OPS Admin, Technician) bypass these checks
        since they don't belong to enterprises/branches.
        
        Raises:
            AuthenticationError: If branch or enterprise is inactive/suspended
        """
        # Platform users don't have enterprise/branch restrictions
        platform_roles = [
            UserRole.SUPER_ADMIN.value,
            UserRole.OPS_ADMIN.value,
            UserRole.TECHNICIAN.value,
            UserRole.LOGISTICS_ADMIN.value,
            UserRole.LOGISTICS_USER.value,
        ]
        if user.role in platform_roles:
            return
        
        # Check enterprise status
        if user.enterprise_id:
            enterprise = await self.enterprise_repo.get_by_id(user.enterprise_id)
            if not enterprise:
                raise AuthenticationError("Enterprise not found")
            if enterprise.status != EnterpriseStatus.ACTIVE.value:
                raise AuthenticationError("Your organization's account is inactive or suspended. Please contact support.")
        
        # Check branch status
        if user.branch_id:
            branch = await self.branch_repo.get_by_id(user.branch_id)
            if not branch:
                raise AuthenticationError("Branch not found")
            if branch.status != BranchStatus.ACTIVE.value:
                raise AuthenticationError("Your branch has been deactivated. Please contact your administrator.")

    async def login(self, request: LoginRequest) -> Tuple[str, str, User]:
        """
        Authenticate user with email and password.

        For admin users (all roles except EMPLOYEE).

        Args:
            request: Login request with email and password

        Returns:
            Tuple of (access_token, refresh_token, user)

        Raises:
            AuthenticationError: If credentials are invalid
        """
        # Get user by email
        user = await self.user_repo.get_by_email(request.email)
        if not user:
            raise AuthenticationError("Invalid email or password")

        # Employees should use OTP login
        if user.role == UserRole.EMPLOYEE.value:
            raise AuthenticationError("Employees must use OTP login")

        # Verify password
        if not user.password_hash or not verify_password(request.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")

        # Check if user is active
        if user.status != UserStatus.ACTIVE.value:
            raise AuthenticationError("User account is inactive")

        # Check if branch and enterprise are active (security: prevent deactivated branch login)
        await self._check_branch_and_enterprise_active(user)

        # Update last login
        await self.user_repo.update_last_login(user.id)

        # Generate tokens
        token_data = self._build_token_data(user)
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": user.id})

        # SECURITY: Track session and enforce concurrent session limit
        # If limit exceeded, oldest sessions are automatically invalidated
        session_limiter.add_session(user.id, refresh_token)

        return access_token, refresh_token, user

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, str, User]:
        """
        Generate new access token from refresh token with token rotation.

        SECURITY: Implements token rotation - each refresh token can only be used once.
        The old refresh token is blacklisted and a new one is issued.

        Args:
            refresh_token: JWT refresh token

        Returns:
            Tuple of (new_access_token, new_refresh_token, user)

        Raises:
            AuthenticationError: If refresh token is invalid
        """
        from app.core.security import blacklist_token

        # Decode refresh token
        payload = decode_token(refresh_token)
        if not payload:
            raise AuthenticationError("Invalid or expired refresh token")

        # Check token type
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")

        # Get user
        user_id = payload.get("sub")
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")

        # Check if user is still active
        if user.status != UserStatus.ACTIVE.value:
            raise AuthenticationError("User account is inactive")

        # Check if branch and enterprise are still active
        await self._check_branch_and_enterprise_active(user)

        # SECURITY: Token rotation - blacklist the used refresh token
        blacklist_token(refresh_token)

        # Generate new tokens
        token_data = self._build_token_data(user)
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token({"sub": user.id})

        return new_access_token, new_refresh_token, user

    async def send_employee_otp(self, request: EmployeeOTPRequest) -> User:
        """
        Generate and send OTP to employee.

        SECURITY: This endpoint uses timing-safe responses to prevent user enumeration.
        The same response is returned regardless of whether the user exists.

        Args:
            request: OTP request with email

        Returns:
            User with OTP token set (or dummy user for non-existent emails)

        Note:
            Returns same response for all cases to prevent user enumeration.
        """
        import time
        import random

        # Add random delay to prevent timing attacks (100-300ms)
        time.sleep(random.uniform(0.1, 0.3))

        # Get user by email
        user = await self.user_repo.get_by_email(request.email)

        # SECURITY: Always return success to prevent user enumeration
        # The actual OTP is only sent if the user exists and is valid
        if not user:
            # Create dummy response to prevent enumeration
            # We'll return a fake user object with just the email
            from app.models.user import User as UserModel
            dummy_user = UserModel(id="", email=request.email, name="", role="")
            return dummy_user

        # Only employees can use OTP login
        if user.role != UserRole.EMPLOYEE.value:
            # Return same response to prevent role enumeration
            from app.models.user import User as UserModel
            dummy_user = UserModel(id="", email=request.email, name="", role="")
            return dummy_user

        # Check if user is active or pending (first login)
        if user.status not in [UserStatus.ACTIVE.value, UserStatus.PENDING.value]:
            # Return same response to prevent status enumeration
            from app.models.user import User as UserModel
            dummy_user = UserModel(id="", email=request.email, name="", role="")
            return dummy_user

        # Check if branch and enterprise are active before sending OTP
        try:
            await self._check_branch_and_enterprise_active(user)
        except AuthenticationError:
            # Return same response to prevent enterprise status enumeration
            from app.models.user import User as UserModel
            dummy_user = UserModel(id="", email=request.email, name="", role="")
            return dummy_user

        # Generate OTP
        otp = generate_otp()

        # Set OTP and expiration (15 minutes)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        await self.user_repo.set_otp(user.id, otp, expires_at)

        # TODO: Send OTP via email/SMS
        # For now, log it for development
        print(f"OTP for {user.email}: {otp}")

        return user

    async def verify_employee_otp(self, request: EmployeeOTPVerifyRequest) -> Tuple[str, str, User]:
        """
        Verify OTP and generate tokens for employee.

        Args:
            request: OTP verification request with email and OTP

        Returns:
            Tuple of (access_token, refresh_token, user)

        Raises:
            AuthenticationError: If OTP is invalid or expired
        """
        # Get user by email
        user = await self.user_repo.get_by_email(request.email)

        if not user:
            raise AuthenticationError("Invalid credentials")

        # Only employees can use OTP login
        if user.role != UserRole.EMPLOYEE.value:
            raise AuthenticationError("Invalid credentials")

        # Check OTP
        if not user.otp_token or user.otp_token != request.otp:
            raise AuthenticationError("Invalid OTP")

        # Check expiration
        if not user.otp_expires_at or user.otp_expires_at < datetime.now(timezone.utc):
            raise AuthenticationError("OTP has expired")

        # Clear OTP and activate user if pending
        await self.user_repo.clear_otp(user.id)

        if user.status == UserStatus.PENDING.value:
            user.status = UserStatus.ACTIVE.value
            await self.user_repo.update(user)

        # Check if branch and enterprise are active (security: prevent deactivated branch login)
        await self._check_branch_and_enterprise_active(user)

        # Update last login
        await self.user_repo.update_last_login(user.id)

        # Generate tokens
        token_data = self._build_token_data(user)
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token({"sub": user.id})

        # SECURITY: Track session and enforce concurrent session limit
        session_limiter.add_session(user.id, refresh_token)

        return access_token, refresh_token, user

    async def get_current_user(self, token: str) -> Optional[User]:
        """
        Get current user from access token.

        Args:
            token: JWT access token

        Returns:
            User if token is valid, None otherwise
        """
        payload = decode_token(token)
        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        return await self.user_repo.get_by_id(user_id)

    async def validate_user_access(
        self,
        user: User,
        required_roles: Optional[list[UserRole]] = None,
        required_enterprise_id: Optional[str] = None,
        required_branch_id: Optional[str] = None,
    ) -> bool:
        """
        Validate user has required access.

        Args:
            user: User to validate
            required_roles: List of allowed roles
            required_enterprise_id: Required enterprise ID
            required_branch_id: Required branch ID

        Returns:
            True if user has access, False otherwise
        """
        # Check status
        if user.status != UserStatus.ACTIVE.value:
            return False

        # Check role
        if required_roles:
            if user.role not in [r.value for r in required_roles]:
                return False

        # Check enterprise (platform users have access to all)
        if required_enterprise_id:
            if user.role not in [
                UserRole.SUPER_ADMIN.value,
                UserRole.OPS_ADMIN.value,
                UserRole.TECHNICIAN.value,
            ]:
                if user.enterprise_id != required_enterprise_id:
                    return False

        # Check branch (org admin has access to all branches in enterprise)
        if required_branch_id:
            if user.role not in [
                UserRole.SUPER_ADMIN.value,
                UserRole.OPS_ADMIN.value,
                UserRole.TECHNICIAN.value,
                UserRole.ORG_ADMIN.value,
            ]:
                if user.branch_id != required_branch_id:
                    return False

        return True
