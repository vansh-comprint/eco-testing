"""API endpoints for Notifications"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.notification import NotificationCreate, NotificationBulkCreate
from app.services.notification_service import NotificationService
from app.utils.response import success_response, paginated_response

router = APIRouter()


def _to_dict(notification) -> dict:
    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "is_read": notification.is_read,
        "read_at": notification.read_at,
        "action_url": notification.action_url,
        "extra_data": notification.extra_data,
        "created_at": notification.created_at,
    }


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_read: bool = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for current user"""
    service = NotificationService(db)
    skip = (page - 1) * page_size

    try:
        notifications, total, unread_count = await service.list_notifications(
            user=current_user,
            is_read=is_read,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        # Use success_response with extra fields for unread_count
        from app.utils.response import PaginationMeta

        pagination = PaginationMeta(
            page=page,
            limit=page_size,
            total=total,
            total_pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
        )
        return {
            "code": 200,
            "data": [_to_dict(n) for n in notifications],
            "message": "Success",
            "pagination": pagination.model_dump(),
            "unread_count": unread_count,
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATION_CREATE)),
):
    """Create a notification (admin only)"""
    service = NotificationService(db)

    try:
        notification = await service.create_notification(data, current_user)
        await db.commit()
        return success_response(data=_to_dict(notification), message="Notification created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk")
async def create_bulk_notifications(
    data: NotificationBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATION_CREATE)),
):
    """Create notifications for multiple users (admin only)"""
    service = NotificationService(db)

    try:
        notifications = await service.create_bulk_notifications(data, current_user)
        await db.commit()
        return success_response(
            data={"count": len(notifications)},
            message=f"Created {len(notifications)} notifications",
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read"""
    service = NotificationService(db)

    try:
        notification = await service.mark_as_read(notification_id, current_user)
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        await db.commit()
        return success_response(data=_to_dict(notification), message="Marked as read")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for current user"""
    service = NotificationService(db)

    try:
        count = await service.mark_all_as_read(current_user)
        await db.commit()
        return success_response(
            data={"count": count}, message=f"Marked {count} notifications as read"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification"""
    service = NotificationService(db)

    try:
        deleted = await service.delete_notification(notification_id, current_user)
        if not deleted:
            raise HTTPException(status_code=404, detail="Notification not found")
        await db.commit()
        return success_response(message="Notification deleted")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=403, detail=str(e))
