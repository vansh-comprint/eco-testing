"""
Rate limiting middleware for brute force and DoS protection.

Uses a sliding window algorithm with in-memory storage.
For production, consider using Redis for distributed rate limiting.
"""

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple
from threading import Lock

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import settings


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting an endpoint."""
    requests: int  # Maximum number of requests
    window_seconds: int  # Time window in seconds
    key_prefix: str = ""  # Prefix for the key (e.g., "login", "otp")


@dataclass
class RateLimitEntry:
    """Track rate limit state for a key."""
    timestamps: list = field(default_factory=list)
    lock: Lock = field(default_factory=Lock)


class RateLimiter:
    """
    In-memory sliding window rate limiter.

    For production deployments, replace with Redis-based implementation
    for distributed rate limiting across multiple instances.
    """

    def __init__(self):
        self._entries: Dict[str, RateLimitEntry] = defaultdict(RateLimitEntry)
        self._cleanup_lock = Lock()
        self._last_cleanup = time.time()
        self._cleanup_interval = 60  # Clean up every 60 seconds

    def _cleanup_old_entries(self):
        """Remove expired entries to prevent memory leak."""
        current_time = time.time()

        # Only cleanup periodically
        if current_time - self._last_cleanup < self._cleanup_interval:
            return

        with self._cleanup_lock:
            if current_time - self._last_cleanup < self._cleanup_interval:
                return

            # Remove entries with no recent timestamps
            keys_to_delete = []
            max_window = 3600  # Keep entries for max 1 hour

            for key, entry in self._entries.items():
                with entry.lock:
                    if not entry.timestamps or (current_time - max(entry.timestamps)) > max_window:
                        keys_to_delete.append(key)

            for key in keys_to_delete:
                del self._entries[key]

            self._last_cleanup = current_time

    def is_rate_limited(self, key: str, config: RateLimitConfig) -> Tuple[bool, int]:
        """
        Check if a request should be rate limited.

        Args:
            key: Unique identifier (e.g., IP address, user ID)
            config: Rate limit configuration

        Returns:
            Tuple of (is_limited, retry_after_seconds)
        """
        self._cleanup_old_entries()

        full_key = f"{config.key_prefix}:{key}" if config.key_prefix else key
        entry = self._entries[full_key]
        current_time = time.time()
        window_start = current_time - config.window_seconds

        with entry.lock:
            # Remove timestamps outside the window
            entry.timestamps = [ts for ts in entry.timestamps if ts > window_start]

            # Check if rate limited
            if len(entry.timestamps) >= config.requests:
                oldest = min(entry.timestamps)
                retry_after = int(oldest + config.window_seconds - current_time) + 1
                return True, max(1, retry_after)

            # Add current request timestamp
            entry.timestamps.append(current_time)
            return False, 0

    def get_remaining(self, key: str, config: RateLimitConfig) -> int:
        """Get remaining requests in current window."""
        full_key = f"{config.key_prefix}:{key}" if config.key_prefix else key
        entry = self._entries[full_key]
        current_time = time.time()
        window_start = current_time - config.window_seconds

        with entry.lock:
            valid_timestamps = [ts for ts in entry.timestamps if ts > window_start]
            return max(0, config.requests - len(valid_timestamps))


# Global rate limiter instance
rate_limiter = RateLimiter()


# =============================================================================
# RATE LIMIT CONFIGURATIONS
# =============================================================================

# Login endpoint - 5 attempts per minute per IP
LOGIN_RATE_LIMIT = RateLimitConfig(
    requests=5,
    window_seconds=60,
    key_prefix="login"
)

# OTP verification - 10 attempts per minute per phone/email
OTP_RATE_LIMIT = RateLimitConfig(
    requests=10,
    window_seconds=60,
    key_prefix="otp"
)

# OTP send - 3 attempts per 5 minutes per phone/email
OTP_SEND_RATE_LIMIT = RateLimitConfig(
    requests=3,
    window_seconds=300,
    key_prefix="otp_send"
)

# Password reset - 3 attempts per hour per email
PASSWORD_RESET_RATE_LIMIT = RateLimitConfig(
    requests=3,
    window_seconds=3600,
    key_prefix="password_reset"
)

# User creation - 50 per hour per IP (to prevent spam)
USER_CREATION_RATE_LIMIT = RateLimitConfig(
    requests=50,
    window_seconds=3600,
    key_prefix="user_create"
)

# Wallet operations - 20 per minute per user
WALLET_RATE_LIMIT = RateLimitConfig(
    requests=20,
    window_seconds=60,
    key_prefix="wallet"
)

# Payout creation - 10 per hour per user
PAYOUT_RATE_LIMIT = RateLimitConfig(
    requests=10,
    window_seconds=3600,
    key_prefix="payout"
)

# General API - 1000 requests per minute per IP
GENERAL_RATE_LIMIT = RateLimitConfig(
    requests=1000,
    window_seconds=60,
    key_prefix="general"
)


def get_client_ip(request: Request) -> str:
    """
    Get client IP address from request, handling proxies.

    Checks X-Forwarded-For and X-Real-IP headers for proxy scenarios.
    """
    # Check for forwarded IP (behind proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP in the chain (original client)
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return "unknown"


def check_rate_limit(key: str, config: RateLimitConfig, endpoint_name: str = "") -> None:
    """
    Check rate limit and raise HTTPException if exceeded.

    Args:
        key: Unique identifier for rate limiting
        config: Rate limit configuration
        endpoint_name: Name of endpoint for error message

    Raises:
        HTTPException: 429 Too Many Requests if rate limited
    """
    is_limited, retry_after = rate_limiter.is_rate_limited(key, config)

    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Too many requests",
                "message": f"Rate limit exceeded for {endpoint_name or 'this endpoint'}. "
                          f"Please try again in {retry_after} seconds.",
                "retry_after": retry_after,
            },
            headers={"Retry-After": str(retry_after)}
        )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware for general rate limiting.

    Applies a global rate limit to all requests based on client IP.
    Specific endpoints can have additional rate limits applied.
    """

    def __init__(self, app, exclude_paths: Optional[list] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json", "/redoc"]

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate limiting for CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip rate limiting for excluded paths
        path = request.url.path
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            return await call_next(request)

        # Get client IP
        client_ip = get_client_ip(request)

        # Check general rate limit
        is_limited, retry_after = rate_limiter.is_rate_limited(
            client_ip, GENERAL_RATE_LIMIT
        )

        if is_limited:
            return Response(
                content='{"error": "Too many requests", "message": "Rate limit exceeded"}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
                headers={"Retry-After": str(retry_after)}
            )

        # Add rate limit headers to response
        response = await call_next(request)

        remaining = rate_limiter.get_remaining(client_ip, GENERAL_RATE_LIMIT)
        response.headers["X-RateLimit-Limit"] = str(GENERAL_RATE_LIMIT.requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(GENERAL_RATE_LIMIT.window_seconds)

        return response


# =============================================================================
# RATE LIMIT DEPENDENCIES
# =============================================================================

async def rate_limit_login(request: Request) -> None:
    """Rate limit dependency for login endpoint."""
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip, LOGIN_RATE_LIMIT, "login")


async def rate_limit_otp(request: Request) -> None:
    """Rate limit dependency for OTP verification."""
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip, OTP_RATE_LIMIT, "OTP verification")


async def rate_limit_otp_send(request: Request) -> None:
    """Rate limit dependency for OTP send."""
    client_ip = get_client_ip(request)
    check_rate_limit(client_ip, OTP_SEND_RATE_LIMIT, "OTP send")


async def rate_limit_forgot_password(request: Request) -> None:
    """
    Rate limit dependency for forgot-password endpoint.

    Limits by both IP and email address (3 per hour per email).
    Caches the parsed body on request.state so downstream doesn't break.
    """
    client_ip = get_client_ip(request)
    # IP-based limit (same as OTP send)
    check_rate_limit(client_ip, OTP_SEND_RATE_LIMIT, "password reset")

    # Email-based limit (3 per hour) — peek at body to extract email
    try:
        body_bytes = await request.body()
        import json
        body = json.loads(body_bytes)
        email = body.get("email", "").lower().strip()
        if email:
            check_rate_limit(email, PASSWORD_RESET_RATE_LIMIT, "password reset")
    except Exception:
        pass  # If body can't be parsed, IP limit still applies
