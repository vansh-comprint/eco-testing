"""
Security headers middleware.

Adds standard security headers to all responses to protect against:
- Clickjacking (X-Frame-Options)
- MIME type sniffing (X-Content-Type-Options)
- XSS attacks (X-XSS-Protection, CSP)
- Protocol downgrade attacks (HSTS)
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to all responses.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        # X-Frame-Options: Prevent clickjacking
        # DENY = never allow framing
        # SAMEORIGIN = only allow same-origin framing
        response.headers["X-Frame-Options"] = "DENY"

        # X-Content-Type-Options: Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-XSS-Protection: Enable browser XSS filter (legacy, but still useful)
        # 1; mode=block = Enable and block instead of sanitize
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy: Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy: Restrict browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=()"
        )

        # Content-Security-Policy: Prevent XSS and other code injection
        # Only add for HTML responses, not for API responses
        content_type = response.headers.get("content-type", "")
        if "text/html" in content_type:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none';"
            )

        # Strict-Transport-Security: Force HTTPS
        # Only add in production (not localhost)
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Cache-Control: Prevent caching of sensitive data
        # Only for API responses (not static assets)
        path = str(request.url.path)
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"

        return response
