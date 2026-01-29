"""Security utilities for authentication and authorization"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Set
from jose import JWTError, jwt
import bcrypt
import hashlib
import threading

from app.core.config import settings


# =============================================================================
# TOKEN BLACKLIST (In-memory for simplicity, use Redis in production)
# =============================================================================

class TokenBlacklist:
    """
    In-memory token blacklist for logout functionality.

    In production, this should be replaced with Redis or database storage
    for horizontal scaling and persistence.

    Tokens are stored as hashes to minimize memory usage.
    Automatic cleanup of expired tokens happens on each operation.
    """

    def __init__(self):
        self._blacklist: Dict[str, datetime] = {}  # token_hash -> expiry
        self._lock = threading.Lock()

    def _hash_token(self, token: str) -> str:
        """Hash token for storage to reduce memory footprint."""
        return hashlib.sha256(token.encode()).hexdigest()[:32]

    def _cleanup_expired(self) -> None:
        """Remove expired tokens from blacklist."""
        now = datetime.utcnow()
        expired = [h for h, exp in self._blacklist.items() if exp < now]
        for h in expired:
            del self._blacklist[h]

    def add(self, token: str, expires_at: Optional[datetime] = None) -> None:
        """Add a token to the blacklist."""
        with self._lock:
            self._cleanup_expired()
            token_hash = self._hash_token(token)
            # Default expiry: 24 hours (covers max token lifetime)
            if expires_at is None:
                expires_at = datetime.utcnow() + timedelta(days=1)
            self._blacklist[token_hash] = expires_at

    def is_blacklisted(self, token: str) -> bool:
        """Check if a token is blacklisted."""
        with self._lock:
            self._cleanup_expired()
            token_hash = self._hash_token(token)
            return token_hash in self._blacklist

    def clear(self) -> None:
        """Clear all blacklisted tokens (for testing)."""
        with self._lock:
            self._blacklist.clear()


# Global token blacklist instance
token_blacklist = TokenBlacklist()


# =============================================================================
# SESSION LIMITER (Concurrent session control)
# =============================================================================

class SessionLimiter:
    """
    In-memory session tracking for concurrent session limits.

    Tracks active refresh tokens per user and enforces maximum concurrent sessions.
    When limit is exceeded, oldest sessions are invalidated.

    In production, this should be replaced with Redis for horizontal scaling.
    """

    MAX_SESSIONS_PER_USER = 5

    def __init__(self):
        # user_id -> list of (token_hash, created_at)
        self._sessions: Dict[str, list] = {}
        self._lock = threading.Lock()

    def _hash_token(self, token: str) -> str:
        """Hash token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()[:32]

    def add_session(self, user_id: str, refresh_token: str) -> list:
        """
        Add a new session for a user.

        Returns list of tokens that were invalidated due to limit.
        """
        with self._lock:
            token_hash = self._hash_token(refresh_token)
            now = datetime.utcnow()

            if user_id not in self._sessions:
                self._sessions[user_id] = []

            sessions = self._sessions[user_id]
            sessions.append((token_hash, now))

            # If over limit, invalidate oldest sessions
            invalidated_tokens = []
            while len(sessions) > self.MAX_SESSIONS_PER_USER:
                oldest = sessions.pop(0)
                invalidated_tokens.append(oldest[0])
                # Add to token blacklist
                token_blacklist.add(oldest[0])

            return invalidated_tokens

    def remove_session(self, user_id: str, refresh_token: str) -> bool:
        """Remove a specific session (on logout)."""
        with self._lock:
            token_hash = self._hash_token(refresh_token)

            if user_id not in self._sessions:
                return False

            sessions = self._sessions[user_id]
            for i, (th, _) in enumerate(sessions):
                if th == token_hash:
                    sessions.pop(i)
                    return True
            return False

    def get_session_count(self, user_id: str) -> int:
        """Get number of active sessions for a user."""
        with self._lock:
            if user_id not in self._sessions:
                return 0
            return len(self._sessions[user_id])

    def clear_all_sessions(self, user_id: str) -> int:
        """
        Clear all sessions for a user (e.g., on password change).

        Returns number of sessions cleared.
        """
        with self._lock:
            if user_id not in self._sessions:
                return 0
            count = len(self._sessions[user_id])
            # Blacklist all tokens
            for token_hash, _ in self._sessions[user_id]:
                token_blacklist.add(token_hash)
            del self._sessions[user_id]
            return count

    def clear(self) -> None:
        """Clear all session data (for testing)."""
        with self._lock:
            self._sessions.clear()


# Global session limiter instance
session_limiter = SessionLimiter()


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
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)

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
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_token(token: str, check_blacklist: bool = True) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token.

    Args:
        token: JWT token string
        check_blacklist: Whether to check if token is blacklisted (default True)

    Returns:
        Optional[Dict]: Decoded token payload or None if invalid/blacklisted
    """
    try:
        # Check blacklist first (fast operation)
        if check_blacklist and token_blacklist.is_blacklisted(token):
            return None

        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


def blacklist_token(token: str) -> None:
    """
    Add a token to the blacklist.

    Args:
        token: JWT token to blacklist
    """
    try:
        # Extract expiry from token to set blacklist TTL
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": False}  # Allow expired tokens to be blacklisted
        )
        exp = payload.get("exp")
        if exp:
            expires_at = datetime.fromtimestamp(exp)
        else:
            expires_at = None
        token_blacklist.add(token, expires_at)
    except JWTError:
        # Even if decode fails, add to blacklist with default expiry
        token_blacklist.add(token)


def generate_otp() -> str:
    """
    Generate a 6-digit OTP for sub-user authentication.

    Returns:
        str: 6-digit OTP
    """
    import random

    return str(random.randint(100000, 999999))
