"""Pydantic schemas for Notification API"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from app.models.support import NotificationType


# ============================================================================
# Notification Schemas
# ============================================================================

class NotificationCreate(BaseModel):
    """Schema for creating a notification"""
    user_id: str = Field(..., description="User ID to notify")
    type: str = Field(default=NotificationType.INFO.value, description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    action_url: Optional[str] = Field(None, description="URL for action button")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional data")


class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""
    is_read: Optional[bool] = None


class NotificationResponse(BaseModel):
    """Schema for notification response"""
    id: str
    user_id: str
    type: str
    title: str
    message: str
    is_read: bool
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema for list of notifications"""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int


class NotificationBulkCreate(BaseModel):
    """Schema for creating notifications for multiple users"""
    user_ids: List[str] = Field(..., description="List of user IDs to notify")
    type: str = Field(default=NotificationType.INFO.value, description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    action_url: Optional[str] = Field(None, description="URL for action button")

