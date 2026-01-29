"""Tests for enterprise endpoints"""

import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.enterprise import Enterprise


@pytest.mark.asyncio
async def test_list_enterprises_super_admin(
    client: AsyncClient,
    super_admin_user: User,
    super_admin_headers: dict,
    test_enterprise: Enterprise,
):
    """Test listing enterprises as super admin."""
    response = await client.get("/api/v1/enterprises", headers=super_admin_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert len(data["data"]) >= 1
    assert data["data"][0]["name"] == "Test Corp"


@pytest.mark.asyncio
async def test_list_enterprises_unauthorized(client: AsyncClient, test_enterprise: Enterprise):
    """Test listing enterprises without auth."""
    response = await client.get("/api/v1/enterprises")

    # FastAPI HTTPBearer returns 403 when no credentials provided
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_enterprises_it_admin_allowed(
    client: AsyncClient,
    it_admin_user: User,
    it_admin_headers: dict,
    test_enterprise: Enterprise,
):
    """Test listing enterprises as IT admin (allowed with limited access)."""
    response = await client.get("/api/v1/enterprises", headers=it_admin_headers)

    # IT admins can access enterprise list (their own enterprise)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_enterprise_by_id(
    client: AsyncClient,
    super_admin_user: User,
    super_admin_headers: dict,
    test_enterprise: Enterprise,
):
    """Test getting enterprise by ID."""
    response = await client.get(
        f"/api/v1/enterprises/{test_enterprise.id}",
        headers=super_admin_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["id"] == test_enterprise.id
    assert data["data"]["name"] == "Test Corp"


@pytest.mark.asyncio
async def test_get_enterprise_not_found(
    client: AsyncClient,
    super_admin_user: User,
    super_admin_headers: dict,
):
    """Test getting non-existent enterprise."""
    response = await client.get(
        "/api/v1/enterprises/00000000-0000-0000-0000-000000000000",
        headers=super_admin_headers,
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_enterprise(
    client: AsyncClient,
    super_admin_user: User,
    super_admin_headers: dict,
):
    """Test creating a new enterprise."""
    enterprise_data = {
        "name": "New Corp",
        "legal_name": "New Corp Private Limited",
        "gst_number": "29NEWCORP1234F1Z5",
        "contact_person": "New Contact",
        "contact_email": "contact@newcorp.com",
        "contact_phone": "+91-9876543210",
    }

    response = await client.post(
        "/api/v1/enterprises",
        json=enterprise_data,
        headers=super_admin_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["data"]["name"] == "New Corp"
    # New enterprises are created with 'active' status by super admins
    assert data["data"]["status"] == "active"


@pytest.mark.asyncio
async def test_update_enterprise(
    client: AsyncClient,
    super_admin_user: User,
    super_admin_headers: dict,
    test_enterprise: Enterprise,
):
    """Test updating an enterprise."""
    update_data = {
        "name": "Updated Corp",
        "contact_person": "Updated Contact",
    }

    response = await client.put(
        f"/api/v1/enterprises/{test_enterprise.id}",
        json=update_data,
        headers=super_admin_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert data["data"]["name"] == "Updated Corp"
    assert data["data"]["contact_person"] == "Updated Contact"


@pytest.mark.asyncio
async def test_delete_enterprise(
    client: AsyncClient,
    super_admin_user: User,
    super_admin_headers: dict,
    test_enterprise: Enterprise,
):
    """Test deleting an enterprise."""
    response = await client.delete(
        f"/api/v1/enterprises/{test_enterprise.id}",
        headers=super_admin_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200

    # Verify enterprise is deleted
    get_response = await client.get(
        f"/api/v1/enterprises/{test_enterprise.id}",
        headers=super_admin_headers,
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_create_enterprise_duplicate_gst(
    client: AsyncClient,
    super_admin_user: User,
    super_admin_headers: dict,
    test_enterprise: Enterprise,
):
    """Test creating enterprise with duplicate GST number."""
    enterprise_data = {
        "name": "Duplicate Corp",
        "legal_name": "Duplicate Corp Private Limited",
        "gst_number": test_enterprise.gst_number,  # Duplicate GST
        "contact_person": "Duplicate Contact",
        "contact_email": "contact@duplicate.com",
        "contact_phone": "+91-9876543210",
    }

    response = await client.post(
        "/api/v1/enterprises",
        json=enterprise_data,
        headers=super_admin_headers,
    )

    assert response.status_code == 400
