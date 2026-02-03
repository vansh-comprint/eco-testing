"""Global error handling middleware"""

import logging
from typing import Callable
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.utils.exceptions import EcoTribeException
from app.utils.response import error_response

logger = logging.getLogger(__name__)


async def error_handler_middleware(request: Request, call_next: Callable) -> Response:
    """
    Global error handling middleware.
    
    Catches all exceptions and returns standardized error responses.
    
    Args:
        request: FastAPI request object
        call_next: Next middleware/route handler
        
    Returns:
        Response: Standardized error response
    """
    try:
        response = await call_next(request)
        return response
        
    except EcoTribeException as exc:
        # Handle custom application exceptions
        logger.warning(
            f"EcoTribe exception: {exc.message}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "code": exc.code,
                "details": exc.details
            }
        )
        return JSONResponse(
            status_code=exc.code,
            content=error_response(
                message=exc.message,
                code=exc.code,
                data=exc.details
            )
        )
        
    except SQLAlchemyError as exc:
        # Handle database errors
        import traceback
        print(f"[DB ERROR] {request.method} {request.url.path}: {exc}", flush=True)
        traceback.print_exc()
        logger.error(
            f"Database error: {str(exc)}",
            extra={
                "path": request.url.path,
                "method": request.method
            },
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response(
                message="Database operation failed",
                code=500
            )
        )
        
    except ValueError as exc:
        # Handle validation errors
        logger.warning(
            f"Validation error: {str(exc)}",
            extra={
                "path": request.url.path,
                "method": request.method
            }
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_response(
                message=str(exc),
                code=400
            )
        )
        
    except Exception as exc:
        # Handle unexpected errors
        import traceback
        print(f"[ERROR] {request.method} {request.url.path}: {exc}", flush=True)
        traceback.print_exc()
        logger.error(
            f"Unexpected error: {str(exc)}",
            extra={
                "path": request.url.path,
                "method": request.method
            },
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response(
                message="An unexpected error occurred",
                code=500
            )
        )

