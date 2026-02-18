"""Redis client for session storage (optional)"""

import logging
from typing import Optional
try:
    from redis.asyncio import Redis, ConnectionPool
    from redis.exceptions import RedisError
    HAS_REDIS = True
except ImportError:
    Redis = None
    ConnectionPool = None
    RedisError = Exception
    HAS_REDIS = False

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global Redis client instance
_redis_client: Optional[Redis] = None
_connection_pool: Optional[ConnectionPool] = None


async def init_redis() -> Optional[Redis]:
    """
    Initialize Redis connection pool.

    Only connects if USE_REDIS_SESSIONS=true in environment.
    Returns None if Redis is disabled.
    """
    global _redis_client, _connection_pool

    if not HAS_REDIS:
        logger.info("[Redis] redis package not installed, running in stateless mode")
        return None

    if not settings.use_redis_sessions:
        logger.info("[Redis] Session storage disabled (USE_REDIS_SESSIONS=false)")
        return None

    if _redis_client is not None:
        return _redis_client

    try:
        # Build connection pool kwargs
        pool_kwargs = {
            "host": settings.redis_host,
            "port": settings.redis_port,
            "db": settings.redis_db,
            "max_connections": settings.redis_max_connections,
            "decode_responses": True,  # Automatically decode bytes to strings
        }

        # Add password if provided
        if settings.redis_password:
            pool_kwargs["password"] = settings.redis_password

        # Add SSL configuration if enabled (redis-py 5.x uses connection_class instead of ssl param)
        if settings.redis_ssl:
            from redis.asyncio.connection import SSLConnection

            pool_kwargs["connection_class"] = SSLConnection

        # Create connection pool
        _connection_pool = ConnectionPool(**pool_kwargs)

        # Create Redis client
        _redis_client = Redis(connection_pool=_connection_pool)

        # Test connection
        await _redis_client.ping()

        logger.info(
            f"[Redis] Connected successfully to {settings.redis_host}:{settings.redis_port} (DB: {settings.redis_db})"
        )
        return _redis_client

    except RedisError as e:
        logger.error(f"[Redis] Connection failed: {e}")
        logger.warning("[Redis] Continuing without session storage (stateless mode)")
        _redis_client = None
        _connection_pool = None
        return None
    except Exception as e:
        logger.error(f"[Redis] Unexpected error during initialization: {e}")
        logger.warning("[Redis] Continuing without session storage (stateless mode)")
        _redis_client = None
        _connection_pool = None
        return None


async def close_redis() -> None:
    """Close Redis connection pool."""
    global _redis_client, _connection_pool

    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
        logger.info("[Redis] Connection closed")

    if _connection_pool is not None:
        await _connection_pool.disconnect()
        _connection_pool = None


async def get_redis() -> Optional[Redis]:
    """
    Dependency for FastAPI routes to get Redis client.

    Returns None if Redis is disabled or connection failed.
    Routes should handle None gracefully (fallback to stateless mode).

    Usage:
        async def my_route(redis: Optional[Redis] = Depends(get_redis)):
            if redis:
                # Use Redis for session storage
                await redis.set("key", "value")
            else:
                # Fallback to stateless mode
                pass
    """
    global _redis_client

    # Return existing client if available
    if _redis_client is not None:
        return _redis_client

    # Try to initialize if not done yet
    if settings.use_redis_sessions:
        return await init_redis()

    return None


def get_redis_sync() -> Optional[Redis]:
    """
    Synchronous getter for Redis client (for non-async contexts).

    Returns None if Redis is not initialized.
    """
    return _redis_client


async def is_redis_available() -> bool:
    """
    Check if Redis is available and responding.

    Returns:
        True if Redis is connected and responding, False otherwise
    """
    if not settings.use_redis_sessions:
        return False

    if _redis_client is None:
        return False

    try:
        await _redis_client.ping()
        return True
    except RedisError:
        return False
    except Exception:
        return False
