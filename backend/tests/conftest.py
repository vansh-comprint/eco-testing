"""Pytest configuration and fixtures"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import Enterprise, EnterpriseStatus, Branch
import uuid


# Test database URL (use a separate test database)
# Convert PostgresDsn to string before replacing
TEST_DATABASE_URL = str(settings.database_url).replace("/ecotribe", "/ecotribe_test")

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    echo=False,
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async with TestSessionLocal() as session:
        yield session

    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with database session override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ==================== Test Data Fixtures ====================


@pytest_asyncio.fixture
async def test_enterprise(db_session: AsyncSession) -> Enterprise:
    """Create a test enterprise."""
    enterprise = Enterprise(
        id=str(uuid.uuid4()),
        name="Test Corp",
        legal_name="Test Corp Private Limited",
        gst_number="29TESTGST1234F1Z5",
        status=EnterpriseStatus.ACTIVE,
        contact_person="Test Contact",
        contact_email="contact@testcorp.com",
        contact_phone="+91-1234567890",
        created_by="system",
    )
    db_session.add(enterprise)
    await db_session.commit()
    await db_session.refresh(enterprise)
    return enterprise


@pytest_asyncio.fixture
async def test_branch(db_session: AsyncSession, test_enterprise: Enterprise) -> Branch:
    """Create a test branch."""
    branch = Branch(
        id=str(uuid.uuid4()),
        enterprise_id=test_enterprise.id,
        branch_name="Test Branch",
        branch_code="TEST-BR",
        address_line1="123 Test Street",
        city="Mumbai",
        state="Maharashtra",
        pin_code="400001",
        status="active",
        created_by="system",
    )
    db_session.add(branch)
    await db_session.commit()
    await db_session.refresh(branch)
    return branch


@pytest_asyncio.fixture
async def super_admin_user(db_session: AsyncSession) -> User:
    """Create a super admin user."""
    user = User(
        id=str(uuid.uuid4()),
        email="superadmin@test.com",
        name="Super Admin",
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        password_hash=get_password_hash("password123"),
        created_by="system",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def ops_admin_user(db_session: AsyncSession) -> User:
    """Create an OPS admin user."""
    user = User(
        id=str(uuid.uuid4()),
        email="opsadmin@test.com",
        name="OPS Admin",
        role=UserRole.OPS_ADMIN,
        status=UserStatus.ACTIVE,
        password_hash=get_password_hash("password123"),
        created_by="system",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def org_admin_user(db_session: AsyncSession, test_enterprise: Enterprise) -> User:
    """Create an org admin user."""
    user = User(
        id=str(uuid.uuid4()),
        email="orgadmin@test.com",
        name="Org Admin",
        role=UserRole.ORG_ADMIN,
        status=UserStatus.ACTIVE,
        enterprise_id=test_enterprise.id,
        password_hash=get_password_hash("password123"),
        created_by="system",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def it_admin_user(
    db_session: AsyncSession, test_enterprise: Enterprise, test_branch: Branch
) -> User:
    """Create an IT admin user."""
    user = User(
        id=str(uuid.uuid4()),
        email="itadmin@test.com",
        name="IT Admin",
        role=UserRole.IT_ADMIN,
        status=UserStatus.ACTIVE,
        enterprise_id=test_enterprise.id,
        branch_id=test_branch.id,
        password_hash=get_password_hash("password123"),
        created_by="system",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def employee_user(
    db_session: AsyncSession, test_enterprise: Enterprise, test_branch: Branch
) -> User:
    """Create an employee user."""
    user = User(
        id=str(uuid.uuid4()),
        email="employee@test.com",
        name="Test Employee",
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
        enterprise_id=test_enterprise.id,
        branch_id=test_branch.id,
        employee_id="EMP001",
        department="Engineering",
        designation="Software Engineer",
        password_hash=get_password_hash("password123"),
        created_by="system",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# ==================== Auth Helpers ====================


def get_auth_headers(user: User) -> dict:
    """Get authorization headers for a user."""
    # Note: auth middleware expects 'sub' to be the user_id, not email
    token = create_access_token(data={"sub": user.id, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def super_admin_headers(super_admin_user: User) -> dict:
    """Get auth headers for super admin."""
    return get_auth_headers(super_admin_user)


@pytest.fixture
def ops_admin_headers(ops_admin_user: User) -> dict:
    """Get auth headers for OPS admin."""
    return get_auth_headers(ops_admin_user)


@pytest.fixture
def org_admin_headers(org_admin_user: User) -> dict:
    """Get auth headers for org admin."""
    return get_auth_headers(org_admin_user)


@pytest.fixture
def it_admin_headers(it_admin_user: User) -> dict:
    """Get auth headers for IT admin."""
    return get_auth_headers(it_admin_user)


@pytest.fixture
def employee_headers(employee_user: User) -> dict:
    """Get auth headers for employee."""
    return get_auth_headers(employee_user)
