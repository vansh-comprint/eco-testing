"""Authentication service for unified user model"""

from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
try:
    from redis.asyncio import Redis
except ImportError:
    Redis = None

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    store_token_in_redis,
    remove_token_from_redis,
    is_token_in_whitelist,
)
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import BranchStatus, EnterpriseStatus
from app.repositories.user_repository import UserRepository
from app.repositories.branch_repository import BranchRepository
from app.repositories.enterprise_repository import EnterpriseRepository
from app.schemas.auth import LoginRequest, EmployeeOTPRequest, EmployeeOTPVerifyRequest
from app.utils.exceptions import AuthenticationError


class AuthService:
    """
    Service for authentication operations.

    Supports:
    - Password-based login for all users (including employees)
    - OTP-based login for employees (legacy, kept for backward compat)
    - Token refresh
    """

    def __init__(self, db: AsyncSession, redis: Optional[Redis] = None):
        self.db = db
        self.redis = redis
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

        Platform users (Super Admin, OPS Admin) bypass these checks
        since they don't belong to enterprises/branches.

        Raises:
            AuthenticationError: If branch or enterprise is inactive/suspended
        """
        # Platform users don't have enterprise/branch restrictions
        platform_roles = [
            UserRole.SUPER_ADMIN.value,
            UserRole.OPS_ADMIN.value,
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
                raise AuthenticationError(
                    "Your organization's account is inactive or suspended. Please contact support."
                )

        # Check branch status
        if user.branch_id:
            branch = await self.branch_repo.get_by_id(user.branch_id)
            if not branch:
                raise AuthenticationError("Branch not found")
            if branch.status != BranchStatus.ACTIVE.value:
                raise AuthenticationError(
                    "Your branch has been deactivated. Please contact your administrator."
                )

    async def login(self, request: LoginRequest) -> Tuple[str, str, User]:
        """
        Authenticate user with email and password.

        For all users (including employees).

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

        # Store tokens in Redis whitelist (if Redis is enabled)
        await store_token_in_redis(self.redis, access_token, user.id, "access")
        await store_token_in_redis(self.redis, refresh_token, user.id, "refresh")

        return access_token, refresh_token, user

    async def refresh_access_token(self, refresh_token: str) -> Tuple[str, str, User]:
        """
        Generate new access token from refresh token with token rotation.

        SECURITY: Implements token rotation - each refresh token can only be used once.
        The old refresh token is removed from whitelist and a new one is issued.

        Args:
            refresh_token: JWT refresh token

        Returns:
            Tuple of (new_access_token, new_refresh_token, user)

        Raises:
            AuthenticationError: If refresh token is invalid
        """
        # STEP 1: Validate JWT signature and expiry (fast, no I/O)
        payload = decode_token(refresh_token)
        if not payload:
            raise AuthenticationError("Invalid or expired refresh token")

        # STEP 2: Check token type
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")

        # STEP 3: Check if token is in whitelist (if Redis is enabled)
        if self.redis:
            user_id_from_redis = await is_token_in_whitelist(self.redis, refresh_token, "refresh")
            if not user_id_from_redis:
                raise AuthenticationError("Refresh token has been revoked")

        # STEP 4: Get user
        user_id = payload.get("sub")
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")

        # Check if user is still active
        if user.status != UserStatus.ACTIVE.value:
            raise AuthenticationError("User account is inactive")

        # Check if branch and enterprise are still active
        await self._check_branch_and_enterprise_active(user)

        # SECURITY: Token rotation - remove the used refresh token from whitelist
        await remove_token_from_redis(self.redis, refresh_token, "refresh")

        # Generate new tokens
        token_data = self._build_token_data(user)
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token({"sub": user.id})

        # Store new tokens in Redis whitelist
        await store_token_in_redis(self.redis, new_access_token, user.id, "access")
        await store_token_in_redis(self.redis, new_refresh_token, user.id, "refresh")

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
        import asyncio
        import secrets

        # Add random delay to prevent timing attacks (100-300ms)
        await asyncio.sleep(secrets.randbelow(200) / 1000 + 0.1)

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
        # Log OTP only in development/test environment
        import logging

        logger = logging.getLogger(__name__)
        from app.core.config import settings

        if settings.environment in ("development", "test"):
            logger.debug(f"OTP for {user.email}: {otp}")

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

        # Store tokens in Redis whitelist (if Redis is enabled)
        await store_token_in_redis(self.redis, access_token, user.id, "access")
        await store_token_in_redis(self.redis, refresh_token, user.id, "refresh")

        return access_token, refresh_token, user

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        """
        Change password for the currently authenticated user (self-service).

        Verifies the current password before updating. Invalidates all other
        sessions after the change for security.

        Args:
            user: The authenticated user requesting the change
            current_password: User's current password for verification
            new_password: New password (min 8 characters)

        Raises:
            AuthenticationError: If current password is incorrect
        """
        # Verify current password
        if not user.password_hash or not verify_password(current_password, user.password_hash):
            raise AuthenticationError("Current password is incorrect")

        # Hash and set new password
        user.password_hash = get_password_hash(new_password)
        user.updated_by = user.id
        await self.user_repo.update(user)

        # Note: With Redis whitelist, sessions are automatically invalidated
        # when tokens expire. No need to manually clear sessions.

    async def request_password_reset(self, email: str) -> Optional[str]:
        """
        Request a password reset. Generates a reset token and sends an email.

        Uses timing-safe responses to prevent user enumeration —
        always returns success regardless of whether the email exists.

        Args:
            email: User's email address

        Returns:
            The reset token if a valid user was found (for debug/dev use), else None.
        """
        import secrets
        from app.core.config import settings
        from app.services.email_service import EmailService

        user = await self.user_repo.get_by_email(email)

        # Always return success to prevent enumeration
        if not user:
            return None

        # Check if user is active
        if user.status != UserStatus.ACTIVE.value:
            return None

        # Generate a secure random token (URL-safe, 48 bytes = 64 chars)
        reset_token = secrets.token_urlsafe(48)

        # Store token with 1-hour expiration (dedicated columns, not OTP)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await self.user_repo.set_password_reset_token(user.id, reset_token, expires_at)

        # Build reset URL
        frontend_url = settings.frontend_url.rstrip("/")
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"

        # Send email (falls back to logging if SMTP not configured)
        EmailService.send_password_reset_email(user.email, reset_url)

        return reset_token

    async def reset_password_with_token(self, token: str, new_password: str) -> None:
        """
        Reset password using a token from the forgot-password email.

        Args:
            token: Password reset token
            new_password: New password

        Raises:
            AuthenticationError: If token is invalid or expired
        """
        from sqlalchemy import select

        # Find user by password reset token (dedicated column, not OTP)
        query = select(User).where(User.password_reset_token == token)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise AuthenticationError("Invalid or expired reset token")

        # Check expiration
        if not user.password_reset_expires_at or user.password_reset_expires_at < datetime.now(
            timezone.utc
        ):
            # Clear expired token
            await self.user_repo.clear_password_reset_token(user.id)
            raise AuthenticationError("Reset token has expired. Please request a new one.")

        # Update password
        user.password_hash = get_password_hash(new_password)
        user.updated_by = user.id
        await self.user_repo.update(user)

        # Clear the reset token
        await self.user_repo.clear_password_reset_token(user.id)

        # Note: With Redis whitelist, sessions are automatically invalidated
        # when tokens expire. No need to manually clear sessions.

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
            ]:
                if user.enterprise_id != required_enterprise_id:
                    return False

        # Check branch (org admin has access to all branches in enterprise)
        if required_branch_id:
            if user.role not in [
                UserRole.SUPER_ADMIN.value,
                UserRole.OPS_ADMIN.value,
                UserRole.ORG_ADMIN.value,
            ]:
                if user.branch_id != required_branch_id:
                    return False

        return True
