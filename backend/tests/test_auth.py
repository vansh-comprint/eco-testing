"""Tests for authentication endpoints - All 7 User Roles"""

import pytest
from httpx import AsyncClient
from app.models.user import User


# ==================== Login Tests ====================


@pytest.mark.asyncio
async def test_login_super_admin_success(client: AsyncClient, super_admin_user: User):
    """Test successful login for super admin."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin@test.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert "access_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"
    assert data["data"]["user"]["email"] == "superadmin@test.com"
    assert data["data"]["user"]["role"] == "super_admin"


@pytest.mark.asyncio
async def test_login_ops_admin_success(client: AsyncClient, ops_admin_user: User):
    """Test successful login for OPS admin."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "opsadmin@test.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["user"]["role"] == "ops_admin"


@pytest.mark.asyncio
async def test_login_org_admin_success(client: AsyncClient, org_admin_user: User):
    """Test successful login for org admin."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "orgadmin@test.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["user"]["role"] == "org_admin"
    assert data["data"]["user"]["enterprise_id"] is not None


@pytest.mark.asyncio
async def test_login_it_admin_success(client: AsyncClient, it_admin_user: User):
    """Test successful login for IT admin."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "itadmin@test.com", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["user"]["role"] == "it_admin"
    assert data["data"]["user"]["enterprise_id"] is not None
    assert data["data"]["user"]["branch_id"] is not None


@pytest.mark.asyncio
async def test_login_employee_requires_otp(client: AsyncClient, employee_user: User):
    """Test that employees must use OTP login, not password."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@test.com", "password": "password123"},
    )

    # Employees should be rejected for password login
    assert response.status_code == 401
    data = response.json()
    assert "OTP" in data["message"] or data["code"] == 401


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, super_admin_user: User):
    """Test login with invalid credentials."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin@test.com", "password": "wrongpassword"},
    )

    assert response.status_code == 401
    data = response.json()
    assert data["code"] == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent user."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@test.com", "password": "password123"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session, super_admin_user: User):
    """Test login with inactive user."""
    # Deactivate user
    super_admin_user.status = "inactive"
    db_session.add(super_admin_user)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin@test.com", "password": "password123"},
    )

    assert response.status_code == 401


# ==================== Get Current User Tests ====================


@pytest.mark.asyncio
async def test_get_current_user_super_admin(
    client: AsyncClient, super_admin_user: User, super_admin_headers: dict
):
    """Test getting current user info for super admin."""
    response = await client.get("/api/v1/auth/me", headers=super_admin_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["email"] == "superadmin@test.com"
    assert data["data"]["role"] == "super_admin"


@pytest.mark.asyncio
async def test_get_current_user_ops_admin(
    client: AsyncClient, ops_admin_user: User, ops_admin_headers: dict
):
    """Test getting current user info for OPS admin."""
    response = await client.get("/api/v1/auth/me", headers=ops_admin_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["role"] == "ops_admin"


@pytest.mark.asyncio
async def test_get_current_user_org_admin(
    client: AsyncClient, org_admin_user: User, org_admin_headers: dict
):
    """Test getting current user info for org admin."""
    response = await client.get("/api/v1/auth/me", headers=org_admin_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["role"] == "org_admin"
    assert data["data"]["enterprise_id"] is not None


@pytest.mark.asyncio
async def test_get_current_user_it_admin(
    client: AsyncClient, it_admin_user: User, it_admin_headers: dict
):
    """Test getting current user info for IT admin."""
    response = await client.get("/api/v1/auth/me", headers=it_admin_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["role"] == "it_admin"
    assert data["data"]["enterprise_id"] is not None
    assert data["data"]["branch_id"] is not None


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """Test getting current user without auth."""
    response = await client.get("/api/v1/auth/me")

    # FastAPI HTTPBearer returns 403 when no credentials provided
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: AsyncClient):
    """Test getting current user with invalid token."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == 401


# ==================== Token Refresh Tests ====================


@pytest.mark.asyncio
async def test_token_refresh_success(client: AsyncClient, super_admin_user: User):
    """Test token refresh flow."""
    # First login to get tokens
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin@test.com", "password": "password123"},
    )
    assert login_response.status_code == 200
    refresh_token = login_response.json()["data"]["refresh_token"]

    # Now refresh the token
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data["data"]


@pytest.mark.asyncio
async def test_token_refresh_invalid_token(client: AsyncClient):
    """Test token refresh with invalid token."""
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_refresh_token"},
    )

    assert response.status_code == 401


# ==================== OTP Login Tests ====================


@pytest.mark.asyncio
async def test_request_otp_for_employee(client: AsyncClient, employee_user: User):
    """Test OTP request for employee."""
    response = await client.post(
        "/api/v1/auth/request-otp",
        json={"email": "employee@test.com"},
    )

    # Should succeed or indicate OTP was sent
    assert response.status_code in [200, 202]


@pytest.mark.asyncio
async def test_request_otp_for_non_employee(client: AsyncClient, super_admin_user: User):
    """Test OTP request for non-employee should be rejected."""
    response = await client.post(
        "/api/v1/auth/request-otp",
        json={"email": "superadmin@test.com"},
    )

    # Non-employees should not use OTP
    assert response.status_code in [400, 401, 403]


# ==================== Logout Tests ====================


@pytest.mark.asyncio
async def test_logout_success(
    client: AsyncClient, super_admin_user: User, super_admin_headers: dict
):
    """Test logout."""
    response = await client.post("/api/v1/auth/logout", headers=super_admin_headers)

    # Logout should succeed
    assert response.status_code in [200, 204]
