"""Security utilities for authentication and authorization"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
import hashlib
import logging

try:
    from redis.asyncio import Redis
    from redis.exceptions import RedisError
except ImportError:
    Redis = None
    RedisError = Exception

from app.core.config import settings

logger = logging.getLogger(__name__)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database

    Returns:
        bool: True if password matches, False otherwise
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        str: Hashed password
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Data to encode in the token (typically user_id, role, etc.)
        expires_delta: Optional custom expiration time

    Returns:
        str: Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_access_token_expire_minutes
        )

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token.

    Args:
        data: Data to encode in the token (typically user_id)

    Returns:
        str: Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token.

    Args:
        token: JWT token string

    Returns:
        Optional[Dict]: Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


def generate_otp() -> str:
    """
    Generate a 6-digit OTP for employee authentication.

    Returns:
        str: 6-digit OTP
    """
    import secrets

    return str(secrets.randbelow(900000) + 100000)


# =============================================================================
# TOKEN WHITELIST (Redis-based session storage)
# =============================================================================


def _hash_token(token: str) -> str:
    """Hash a token string to a 32-char hex prefix for storage."""
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def _token_expiry_seconds(token: str) -> int:
    """
    Extract TTL in seconds from a JWT token.

    Returns seconds until expiry, or default TTL if extraction fails.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False},
        )
        exp = payload.get("exp")
        if exp:
            expiry_time = datetime.fromtimestamp(exp, tz=timezone.utc)
            now = datetime.now(timezone.utc)
            ttl_seconds = int((expiry_time - now).total_seconds())
            return max(ttl_seconds, 0)  # Don't return negative TTL
    except JWTError:
        pass

    # Default: 8 hours for access tokens, 7 days for refresh tokens
    return 8 * 3600


async def store_token_in_redis(
    redis: Optional[Redis], token: str, user_id: str, token_type: str = "access"
) -> bool:
    """
    Store a token in Redis whitelist.

    Args:
        redis: Redis client (None if Redis is disabled)
        token: JWT token string
        user_id: User ID associated with the token
        token_type: "access" or "refresh"

    Returns:
        True if stored successfully, False if Redis is disabled or failed
    """
    if not redis or not settings.use_redis_sessions:
        logger.debug(f"[Whitelist] Redis disabled, skipping token storage ({token_type})")
        return False

    try:
        token_hash = _hash_token(token)
        ttl_seconds = _token_expiry_seconds(token)

        # Store token with TTL (auto-expires)
        await redis.setex(f"token:{token_type}:{token_hash}", ttl_seconds, user_id)

        logger.debug(
            f"[Whitelist] Stored {token_type} token for user {user_id} " f"(TTL: {ttl_seconds}s)"
        )
        return True

    except RedisError as e:
        logger.error(f"[Whitelist] Failed to store token in Redis: {e}")
        return False
    except Exception as e:
        logger.error(f"[Whitelist] Unexpected error storing token: {e}")
        return False


async def remove_token_from_redis(
    redis: Optional[Redis], token: str, token_type: str = "access"
) -> bool:
    """
    Remove a token from Redis whitelist (logout/revocation).

    Args:
        redis: Redis client (None if Redis is disabled)
        token: JWT token string
        token_type: "access" or "refresh"

    Returns:
        True if removed successfully, False if Redis is disabled or failed
    """
    if not redis or not settings.use_redis_sessions:
        logger.debug(f"[Whitelist] Redis disabled, skipping token removal ({token_type})")
        return False

    try:
        token_hash = _hash_token(token)

        # Delete token from Redis
        deleted = await redis.delete(f"token:{token_type}:{token_hash}")

        if deleted:
            logger.debug(f"[Whitelist] Removed {token_type} token from Redis")
        else:
            logger.debug(f"[Whitelist] Token not found in Redis ({token_type})")

        return bool(deleted)

    except RedisError as e:
        logger.error(f"[Whitelist] Failed to remove token from Redis: {e}")
        return False
    except Exception as e:
        logger.error(f"[Whitelist] Unexpected error removing token: {e}")
        return False


async def is_token_in_whitelist(
    redis: Optional[Redis], token: str, token_type: str = "access"
) -> Optional[str]:
    """
    Check if a token exists in Redis whitelist.

    Args:
        redis: Redis client (None if Redis is disabled)
        token: JWT token string
        token_type: "access" or "refresh"

    Returns:
        User ID if token is whitelisted, None if not found or Redis is disabled
    """
    if not redis or not settings.use_redis_sessions:
        # Redis disabled - return None (caller should fall back to stateless JWT validation)
        return None

    try:
        token_hash = _hash_token(token)

        # Check if token exists in Redis
        user_id = await redis.get(f"token:{token_type}:{token_hash}")

        if user_id:
            logger.debug(f"[Whitelist] Token found in Redis for user {user_id}")
        else:
            logger.debug(f"[Whitelist] Token not found in Redis ({token_type})")

        return user_id

    except RedisError as e:
        logger.error(f"[Whitelist] Failed to check token in Redis: {e}")
        return None
    except Exception as e:
        logger.error(f"[Whitelist] Unexpected error checking token: {e}")
        return None
