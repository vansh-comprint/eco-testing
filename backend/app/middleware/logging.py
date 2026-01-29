"""Request/response logging middleware"""

import time
import logging
from typing import Callable
from fastapi import Request, Response
from uuid import uuid4

logger = logging.getLogger(__name__)


async def logging_middleware(request: Request, call_next: Callable) -> Response:
    """
    Log all incoming requests and outgoing responses.
    
    Logs:
    - Request ID (generated)
    - HTTP method and path
    - Client IP
    - Response status code
    - Request duration
    
    Args:
        request: FastAPI request object
        call_next: Next middleware/route handler
        
    Returns:
        Response: Response from the route handler
    """
    # Generate unique request ID
    request_id = str(uuid4())
    
    # Add request ID to request state for use in route handlers
    request.state.request_id = request_id
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Log request
    logger.info(
        f"Request started",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "client_ip": client_ip,
            "user_agent": request.headers.get("user-agent", "unknown")
        }
    )
    
    # Process request and measure time
    start_time = time.time()
    
    try:
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2)
            }
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
        
    except Exception as exc:
        # Log error
        duration = time.time() - start_time
        logger.error(
            f"Request failed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(duration * 1000, 2),
                "error": str(exc)
            },
            exc_info=True
        )
        raise

