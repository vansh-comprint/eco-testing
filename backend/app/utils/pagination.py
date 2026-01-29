"""Pagination utilities"""

from typing import TypeVar, Generic, List, Any
from pydantic import BaseModel, Field
from sqlalchemy import Select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

T = TypeVar('T')


class PaginationParams(BaseModel):
    """
    Pagination query parameters.
    
    Use this as a dependency in FastAPI endpoints.
    
    Example:
        @router.get("/users")
        async def get_users(
            pagination: PaginationParams = Depends(),
            db: AsyncSession = Depends(get_db)
        ):
            ...
    """
    page: int = Field(default=1, ge=1, description="Page number (starts from 1)")
    limit: int = Field(
        default=settings.default_page_size,
        ge=1,
        le=settings.max_page_size,
        description=f"Items per page (max: {settings.max_page_size})"
    )

    @property
    def offset(self) -> int:
        """Calculate offset for database query"""
        return (self.page - 1) * self.limit


class PaginatedResult(BaseModel, Generic[T]):
    """
    Generic paginated result container.
    
    Contains the items and pagination metadata.
    """
    items: List[T]
    total: int
    page: int
    limit: int
    total_pages: int


async def paginate(
    db: AsyncSession,
    query: Select,
    page: int,
    limit: int
) -> tuple[List[Any], int]:
    """
    Execute a paginated query.
    
    Args:
        db: Database session
        query: SQLAlchemy select query
        page: Page number (1-indexed)
        limit: Items per page
        
    Returns:
        tuple: (items, total_count)
        
    Example:
        query = select(User).where(User.role == "it_admin")
        items, total = await paginate(db, query, page=1, limit=20)
    """
    # Get total count
    count_query = query.with_only_columns(func.count()).order_by(None)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get paginated items
    offset = (page - 1) * limit
    paginated_query = query.offset(offset).limit(limit)
    result = await db.execute(paginated_query)
    items = result.scalars().all()
    
    return list(items), total


def calculate_total_pages(total: int, limit: int) -> int:
    """
    Calculate total number of pages.
    
    Args:
        total: Total number of items
        limit: Items per page
        
    Returns:
        int: Total number of pages
    """
    if total == 0:
        return 0
    return (total + limit - 1) // limit  # Ceiling division

