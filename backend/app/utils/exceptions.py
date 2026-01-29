"""Custom exception classes for the application"""

from typing import Any, Optional


class EcoTribeException(Exception):
    """Base exception class for all EcoTribe exceptions"""
    
    def __init__(
        self,
        message: str,
        code: int = 400,
        details: Optional[Any] = None
    ):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(self.message)


class AuthenticationError(EcoTribeException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication failed", details: Optional[Any] = None):
        super().__init__(message=message, code=401, details=details)


class AuthorizationError(EcoTribeException):
    """Raised when user doesn't have permission"""
    
    def __init__(
        self,
        message: str = "You don't have permission to perform this action",
        details: Optional[Any] = None
    ):
        super().__init__(message=message, code=403, details=details)


class NotFoundError(EcoTribeException):
    """Raised when a resource is not found"""
    
    def __init__(self, resource: str, identifier: Any = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with identifier '{identifier}' not found"
        super().__init__(message=message, code=404)


class ValidationError(EcoTribeException):
    """Raised when validation fails"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, code=400, details=details)


class ConflictError(EcoTribeException):
    """Raised when there's a conflict (e.g., duplicate entry)"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, code=409, details=details)


class BusinessLogicError(EcoTribeException):
    """Raised when business logic validation fails"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, code=422, details=details)


class DatabaseError(EcoTribeException):
    """Raised when database operation fails"""
    
    def __init__(self, message: str = "Database operation failed", details: Optional[Any] = None):
        super().__init__(message=message, code=500, details=details)


class ExternalServiceError(EcoTribeException):
    """Raised when external service call fails"""
    
    def __init__(self, service: str, message: Optional[str] = None):
        msg = f"External service '{service}' failed"
        if message:
            msg = f"{msg}: {message}"
        super().__init__(message=msg, code=503)

