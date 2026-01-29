"""Standardized API response utilities"""

from typing import Any, Optional, Dict, TypeVar, Generic
from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Pagination metadata"""

    page: int
    limit: int
    total: int
    total_pages: int


class APIResponse(BaseModel, Generic[T]):
    """
    Standardized API response format.

    All API endpoints should return responses in this format for consistency.

    Example:
        {
            "code": 200,
            "data": {...},
            "message": "Success",
            "pagination": {
                "page": 1,
                "limit": 20,
                "total": 100,
                "total_pages": 5
            }
        }
    """

    code: int
    data: Optional[T] = None
    message: str
    pagination: Optional[PaginationMeta] = None


def success_response(
    data: Any = None,
    message: str = "Success",
    code: int = 200,
    pagination: Optional[PaginationMeta] = None,
) -> Dict[str, Any]:
    """
    Create a successful API response.

    Args:
        data: Response data
        message: Success message
        code: HTTP status code (default: 200)
        pagination: Optional pagination metadata

    Returns:
        Dict: Standardized response dictionary

    Example:
        return success_response(
            data={"user": user_data},
            message="User created successfully",
            code=201
        )
    """
    response = {"code": code, "data": data, "message": message}

    if pagination:
        response["pagination"] = pagination.model_dump()

    return response


def error_response(message: str, code: int = 400, data: Any = None) -> Dict[str, Any]:
    """
    Create an error API response.

    Args:
        message: Error message
        code: HTTP status code (default: 400)
        data: Optional error details

    Returns:
        Dict: Standardized error response dictionary

    Example:
        return error_response(
            message="User not found",
            code=404
        )
    """
    return {"code": code, "data": data, "message": message}


def paginated_response(
    data: Any,
    page: int,
    total: int,
    limit: Optional[int] = None,
    page_size: Optional[int] = None,
    message: str = "Success",
) -> Dict[str, Any]:
    """
    Create a paginated API response.

    Args:
        data: List of items for current page
        page: Current page number
        total: Total number of items
        limit: Items per page (alias: page_size)
        page_size: Items per page (alias for limit)
        message: Success message

    Returns:
        Dict: Standardized paginated response

    Example:
        return paginated_response(
            data=users,
            page=1,
            limit=20,
            total=100,
            message="Users retrieved successfully"
        )
    """
    # Support both 'limit' and 'page_size' as parameter names
    items_per_page = limit or page_size or 20
    total_pages = (total + items_per_page - 1) // items_per_page if items_per_page > 0 else 0

    pagination = PaginationMeta(
        page=page, limit=items_per_page, total=total, total_pages=total_pages
    )

    return success_response(data=data, message=message, pagination=pagination)
