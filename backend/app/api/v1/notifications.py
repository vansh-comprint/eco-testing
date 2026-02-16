"""API endpoints for Notifications"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user, require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.notification import NotificationCreate, NotificationBulkCreate
from app.services.notification_service import NotificationService
from app.utils.response import success_response

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
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    is_read: bool = Query(None, description="Filter by read status: true for read, false for unread, omit for all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List notifications for the current user.

    Returns paginated notifications with an additional `unread_count` field.
    Supports filtering by read/unread status. Notifications are ordered by
    creation date (newest first).
    """
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


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATION_CREATE)),
):
    """
    Create a notification for a specific user (admin only).

    Sends a notification with a title, message, optional action URL, and extra data.
    The target user will see this in their notification feed.

    **Required permission:** NOTIFICATION_CREATE
    """
    service = NotificationService(db)

    try:
        notification = await service.create_notification(data, current_user)
        await db.commit()
        return success_response(data=_to_dict(notification), message="Notification created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def create_bulk_notifications(
    data: NotificationBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATION_CREATE)),
):
    """
    Create notifications for multiple users at once (admin only).

    Sends the same notification to a list of user IDs. Returns the count
    of notifications created.

    **Required permission:** NOTIFICATION_CREATE
    """
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
    """
    Mark a notification as read.

    Sets the notification's `is_read` to true and records `read_at` timestamp.
    Users can only mark their own notifications as read.
    """
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
    """
    Mark all notifications as read for the current user.

    Bulk-marks all unread notifications as read. Returns the count of
    notifications updated.
    """
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


@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
async def delete_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a notification.

    Permanently removes a notification. Users can only delete their own notifications.
    """
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
