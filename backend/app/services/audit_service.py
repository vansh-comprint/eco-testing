"""Audit service for logging state transitions and important actions"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.models.support import AuditLog


class AuditService:
    """
    Service for creating and querying audit logs.

    Usage:
        audit = AuditService(db)
        await audit.log_status_change(
            entity_type="asset",
            entity_id=asset.id,
            old_status="pending_assignment",
            new_status="assigned",
            user=current_user,
            details=f"Asset assigned to employee {employee.email}"
        )
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        details: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Create a general audit log entry."""
        log_entry = AuditLog(
            id=str(uuid4()),
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            old_values=old_values,
            new_values=new_values,
            details=details,
            extra_data=extra_data,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.now(timezone.utc),
        )

        self.db.add(log_entry)
        await self.db.flush()
        return log_entry

    async def log_status_change(
        self,
        entity_type: str,
        entity_id: str,
        old_status: str,
        new_status: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        details: Optional[str] = None,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log a status/state change."""
        return await self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action="status_change",
            old_values={"status": old_status},
            new_values={"status": new_status},
            details=details or f"Status changed from '{old_status}' to '{new_status}'",
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            enterprise_id=enterprise_id,
            branch_id=branch_id,
            extra_data=metadata,
        )

    async def log_creation(
        self,
        entity_type: str,
        entity_id: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        details: Optional[str] = None,
        enterprise_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        new_values: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log entity creation."""
        return await self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action="created",
            new_values=new_values,
            details=details or f"{entity_type.title()} created",
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            enterprise_id=enterprise_id,
            branch_id=branch_id,
        )

    async def log_deletion(
        self,
        entity_type: str,
        entity_id: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        details: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log entity deletion."""
        return await self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action="deleted",
            old_values=old_values,
            details=details or f"{entity_type.title()} deleted",
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
        )

    async def get_entity_history(
        self,
        entity_type: str,
        entity_id: str,
        limit: int = 100,
    ) -> List[AuditLog]:
        """Get audit history for a specific entity."""
        query = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.entity_type == entity_type,
                    AuditLog.entity_id == entity_id,
                )
            )
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_user_actions(
        self,
        user_id: str,
        limit: int = 100,
    ) -> List[AuditLog]:
        """Get all actions by a specific user."""
        query = (
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_enterprise_audit(
        self,
        enterprise_id: str,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[AuditLog]:
        """Get audit logs for an enterprise."""
        conditions = [AuditLog.enterprise_id == enterprise_id]
        if action:
            conditions.append(AuditLog.action == action)
        if entity_type:
            conditions.append(AuditLog.entity_type == entity_type)

        query = (
            select(AuditLog)
            .where(and_(*conditions))
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
