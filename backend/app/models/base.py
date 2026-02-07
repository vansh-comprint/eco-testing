"""Base model with audit fields for all database tables"""

from typing import Optional
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import declared_attr

from app.core.database import Base


class AuditMixin:
    """
    Mixin to add audit fields to models.

    Adds created_at, updated_at, created_by, and updated_by fields.
    All tables should include these fields for audit trail.
    """

    @declared_attr
    def created_at(cls):
        """Timestamp when record was created"""
        return Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            comment="Timestamp when record was created",
        )

    @declared_attr
    def updated_at(cls):
        """Timestamp when record was last updated"""
        return Column(
            DateTime(timezone=True),
            nullable=True,
            onupdate=func.now(),
            comment="Timestamp when record was last updated",
        )

    @declared_attr
    def created_by(cls):
        """User ID who created the record"""
        return Column(
            String,
            nullable=True,  # Nullable for system-created records
            comment="User ID who created the record",
        )

    @declared_attr
    def updated_by(cls):
        """User ID who last updated the record"""
        return Column(String, nullable=True, comment="User ID who last updated the record")


class BaseModel(Base, AuditMixin):
    """
    Base model class for all database models.

    Includes:
    - Abstract base (not a table itself)
    - Audit fields (created_at, updated_at, created_by, updated_by)
    - Common utility methods
    """

    __abstract__ = True

    def to_dict(self) -> dict:
        """
        Convert model instance to dictionary.

        Returns:
            dict: Dictionary representation of the model
        """
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}

    def update_from_dict(self, data: dict, exclude: Optional[set] = None) -> None:
        """
        Update model instance from dictionary.

        Args:
            data: Dictionary with field values
            exclude: Set of field names to exclude from update
        """
        exclude = exclude or set()
        for key, value in data.items():
            if key not in exclude and hasattr(self, key):
                setattr(self, key, value)

    def __repr__(self) -> str:
        """String representation of the model"""
        class_name = self.__class__.__name__
        attrs = ", ".join(f"{k}={v!r}" for k, v in self.to_dict().items() if not k.startswith("_"))
        return f"{class_name}({attrs})"
