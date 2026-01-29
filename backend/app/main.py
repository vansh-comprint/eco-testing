"""FastAPI application entry point"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.database import init_db, close_db
from app.middleware.error_handler import error_handler_middleware
from app.middleware.logging import logging_middleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.utils.exceptions import EcoTribeException
from app.utils.response import error_response

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting EcoTribe API...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")

    # Initialize database (optional - Alembic handles migrations)
    # await init_db()

    yield

    # Shutdown
    logger.info("Shutting down EcoTribe API...")
    await close_db()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
# EcoTribe API

B2B IT Asset Lifecycle Management Platform for enterprise device trade-in workflows.

## Features

* **Multi-tenant Architecture**: Support for enterprises, branches, and role-based access
* **7 User Roles**: Super Admin, OPS Admin, Org Admin, IT Admin, Employee, Logistics Admin, Logistics User
* **Complete Asset Lifecycle**: From intake to payout
* **Approval Workflows**: Multi-level approval for batches and pickups
* **Real-time Notifications**: WebSocket support for live updates
* **File Management**: Support for photos, documents, and bulk uploads

## Authentication

All endpoints (except `/auth/login` and `/auth/register`) require JWT authentication.

Include the token in the `Authorization` header:
```
Authorization: Bearer <your_token>
```

## Roles & Permissions

- **Super Admin**: Platform-wide access, pricing configuration
- **OPS Admin**: Operations management, technician reviews
- **Org Admin**: Enterprise-level management, branch oversight, approvals
- **IT Admin**: Branch-level asset and batch management
- **Employee**: Device submission and tracking
- **Logistics Admin**: Partner company management
- **Logistics User**: Field operations, pickups, on-site QC
    """,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_tags=[
        {"name": "Authentication", "description": "Login, registration, and token management"},
        {"name": "Users", "description": "User management (admins, IT admins, employees)"},
        {"name": "Enterprises", "description": "Enterprise/organization management"},
        {"name": "Branches", "description": "Branch management within enterprises"},
        {"name": "Assets", "description": "IT asset tracking and management"},
        {"name": "Batches", "description": "Asset batch creation and approval workflow"},
        {"name": "Submissions", "description": "Employee device self-evaluation submissions"},
        {"name": "Reviews", "description": "Technician remote and facility QC reviews"},
        {"name": "Pickups", "description": "Logistics pickup requests and assignments"},
        {"name": "Payouts", "description": "Financial payouts and wallet management"},
        {"name": "Files", "description": "File upload and management"},
        {"name": "Notifications", "description": "Real-time notifications and alerts"},
        {"name": "Disputes", "description": "Dispute management and resolution"},
        {"name": "Health", "description": "Health check and monitoring"},
        {"name": "Root", "description": "API root and information"},
    ],
    contact={
        "name": "EcoTribe Support",
        "email": "support@ecotribe.io",
    },
    license_info={
        "name": "Proprietary",
    },
    lifespan=lifespan,
)

# Add Security Headers middleware (must be first to add headers to all responses)
app.add_middleware(SecurityHeadersMiddleware)

# Add Rate Limiting middleware
app.add_middleware(RateLimitMiddleware)

# Add CORS middleware with secure configuration
# SECURITY: When allow_credentials=True, allow_origins must be explicit (not "*")
# This prevents credential leakage to unauthorized domains
_cors_origins = settings.cors_origins_list
if settings.debug:
    # In development, allow all common local/network origins
    _dev_origins = [
        "http://localhost:3000", "http://localhost:3001", "http://localhost:5173",
        "http://172.20.0.25:3000", "http://172.20.0.25:3001",
        "http://172.27.32.1:3001", "http://172.19.224.1:3001",
    ]
    _cors_origins = list(set(_cors_origins + _dev_origins))
if settings.cors_allow_credentials:
    # When credentials are allowed, we must NOT use "*" for origins
    # Filter out any wildcards
    _cors_origins = [o for o in _cors_origins if o != "*"]
    if not _cors_origins:
        # Default to localhost if no explicit origins configured
        _cors_origins = ["http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Add custom middleware
app.middleware("http")(logging_middleware)
app.middleware("http")(error_handler_middleware)


# ============================================================================
# EXCEPTION HANDLERS - Standardize all error responses to {code, data, message}
# ============================================================================


@app.exception_handler(EcoTribeException)
async def ecotribe_exception_handler(request: Request, exc: EcoTribeException):
    """Handle custom EcoTribe exceptions with standardized format"""
    return JSONResponse(
        status_code=exc.code,
        content=error_response(message=exc.message, code=exc.code, data=exc.details),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with standardized format"""
    errors = exc.errors()
    # Format validation errors for better readability
    formatted_errors = []
    for err in errors:
        field = " -> ".join(str(loc) for loc in err["loc"] if loc != "body")
        formatted_errors.append({"field": field, "message": err["msg"], "type": err["type"]})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response(
            message="Validation error", code=422, data={"errors": formatted_errors}
        ),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions with standardized format"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response(message="An unexpected error occurred", code=500),
    )


# Health check endpoints (both /health and /api/v1/health for compatibility)
@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check endpoint - available at both /health and /api/v1/health"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to EcoTribe API",
        "version": settings.app_version,
        "docs": "/docs" if settings.debug else "Documentation disabled in production",
    }


# Import and include routers
from app.api.v1 import (
    auth,
    users,
    enterprises,
    branches,
    assets,
    batches,
    files,
    submissions,
    reviews,
    pickups,
    payouts,
    notifications,
    disputes,
    pricing,
    analytics,
)

app.include_router(auth.router, prefix=f"{settings.api_v1_prefix}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.api_v1_prefix}/users", tags=["Users"])
app.include_router(
    enterprises.router, prefix=f"{settings.api_v1_prefix}/enterprises", tags=["Enterprises"]
)
app.include_router(branches.router, prefix=f"{settings.api_v1_prefix}/branches", tags=["Branches"])
app.include_router(assets.router, prefix=f"{settings.api_v1_prefix}/assets", tags=["Assets"])
app.include_router(batches.router, prefix=f"{settings.api_v1_prefix}/batches", tags=["Batches"])
app.include_router(files.router, prefix=f"{settings.api_v1_prefix}/files", tags=["Files"])
app.include_router(
    submissions.router, prefix=f"{settings.api_v1_prefix}/submissions", tags=["Submissions"]
)
app.include_router(reviews.router, prefix=f"{settings.api_v1_prefix}/reviews", tags=["Reviews"])
app.include_router(pickups.router, prefix=f"{settings.api_v1_prefix}/pickups", tags=["Pickups"])
app.include_router(payouts.router, prefix=f"{settings.api_v1_prefix}/payouts", tags=["Payouts"])
app.include_router(
    notifications.router, prefix=f"{settings.api_v1_prefix}/notifications", tags=["Notifications"]
)
app.include_router(disputes.router, prefix=f"{settings.api_v1_prefix}/disputes", tags=["Disputes"])
app.include_router(pricing.router, prefix=f"{settings.api_v1_prefix}/pricing", tags=["Pricing"])
app.include_router(
    analytics.router, prefix=f"{settings.api_v1_prefix}/analytics", tags=["Analytics"]
)

# Mount static files for local storage (development only)
if settings.storage_type == "local":
    storage_path = Path(settings.local_storage_path)
    storage_path.mkdir(parents=True, exist_ok=True)
    app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")
    logger.info(f"Mounted local storage at /storage -> {storage_path}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
