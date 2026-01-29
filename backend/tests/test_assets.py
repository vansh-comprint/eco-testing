"""Tests for asset endpoints"""

import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.enterprise import Enterprise, Branch
from app.models.asset import Asset, AssetStatus
import uuid


@pytest.mark.asyncio
async def test_create_asset_it_admin(
    client: AsyncClient,
    it_admin_user: User,
    it_admin_headers: dict,
    test_enterprise: Enterprise,
    test_branch: Branch,
):
    """Test creating an asset as IT admin."""
    asset_data = {
        "brand": "Dell",
        "model": "Latitude 5520",
        "serial_number": "SN123456",
        "asset_tag": "ASSET-001",
    }

    response = await client.post(
        "/api/v1/assets",
        json=asset_data,
        headers=it_admin_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["data"]["brand"] == "Dell"
    assert data["data"]["status"] == "pending_assignment"
    assert data["data"]["enterprise_id"] == test_enterprise.id
    assert data["data"]["branch_id"] == test_branch.id


@pytest.mark.asyncio
async def test_list_assets_it_admin(
    client: AsyncClient,
    it_admin_user: User,
    it_admin_headers: dict,
    db_session,
    test_enterprise: Enterprise,
    test_branch: Branch,
):
    """Test listing assets as IT admin (should only see own branch)."""
    # Create an asset
    asset = Asset(
        id=str(uuid.uuid4()),
        enterprise_id=test_enterprise.id,
        branch_id=test_branch.id,
        brand="Dell",
        model="Latitude 5520",
        serial_number="SN123456",
        asset_tag="ASSET-001",
        status=AssetStatus.PENDING_ASSIGNMENT.value,
        created_by=it_admin_user.id,
    )
    db_session.add(asset)
    await db_session.commit()

    response = await client.get("/api/v1/assets", headers=it_admin_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) >= 1
    assert data["data"][0]["branch_id"] == test_branch.id


@pytest.mark.asyncio
async def test_get_asset_by_id(
    client: AsyncClient,
    it_admin_user: User,
    it_admin_headers: dict,
    db_session,
    test_enterprise: Enterprise,
    test_branch: Branch,
):
    """Test getting asset by ID."""
    asset = Asset(
        id=str(uuid.uuid4()),
        enterprise_id=test_enterprise.id,
        branch_id=test_branch.id,
        brand="Dell",
        model="Latitude 5520",
        serial_number="SN123457",
        asset_tag="ASSET-002",
        status=AssetStatus.PENDING_ASSIGNMENT.value,
        created_by=it_admin_user.id,
    )
    db_session.add(asset)
    await db_session.commit()

    response = await client.get(f"/api/v1/assets/{asset.id}", headers=it_admin_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["id"] == asset.id
    assert data["data"]["serial_number"] == "SN123457"


@pytest.mark.asyncio
async def test_assign_asset_to_employee(
    client: AsyncClient,
    it_admin_user: User,
    it_admin_headers: dict,
    employee_user: User,
    db_session,
    test_enterprise: Enterprise,
    test_branch: Branch,
):
    """Test assigning asset to employee via PUT update."""
    asset = Asset(
        id=str(uuid.uuid4()),
        enterprise_id=test_enterprise.id,
        branch_id=test_branch.id,
        brand="Dell",
        model="Latitude 5520",
        serial_number="SN123458",
        asset_tag="ASSET-003",
        status=AssetStatus.PENDING_ASSIGNMENT.value,
        created_by=it_admin_user.id,
    )
    db_session.add(asset)
    await db_session.commit()

    # Assign via update endpoint
    response = await client.put(
        f"/api/v1/assets/{asset.id}",
        json={"assigned_to_user_id": employee_user.id, "status": "assigned"},
        headers=it_admin_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["assigned_to_user_id"] == employee_user.id
    assert data["data"]["status"] == "assigned"


@pytest.mark.asyncio
async def test_update_asset(
    client: AsyncClient,
    it_admin_user: User,
    it_admin_headers: dict,
    db_session,
    test_enterprise: Enterprise,
    test_branch: Branch,
):
    """Test updating an asset."""
    asset = Asset(
        id=str(uuid.uuid4()),
        enterprise_id=test_enterprise.id,
        branch_id=test_branch.id,
        brand="Dell",
        model="Latitude 5520",
        serial_number="SN123459",
        asset_tag="ASSET-004",
        status=AssetStatus.PENDING_ASSIGNMENT.value,
        created_by=it_admin_user.id,
    )
    db_session.add(asset)
    await db_session.commit()

    update_data = {"model": "Latitude 7520", "asset_tag": "ASSET-005"}

    response = await client.put(
        f"/api/v1/assets/{asset.id}",
        json=update_data,
        headers=it_admin_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["model"] == "Latitude 7520"
    assert data["data"]["asset_tag"] == "ASSET-005"
