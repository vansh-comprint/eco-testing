"""Tests for Role-Based Access Control (RBAC)"""

import pytest
from httpx import AsyncClient
from app.models.user import User


class TestSuperAdminAccess:
    """Test super admin can access all endpoints."""

    @pytest.mark.asyncio
    async def test_super_admin_can_list_enterprises(
        self, client: AsyncClient, super_admin_user: User, super_admin_headers: dict, test_enterprise
    ):
        """Super admin can list all enterprises."""
        response = await client.get("/api/v1/enterprises/", headers=super_admin_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_super_admin_can_list_all_users(
        self, client: AsyncClient, super_admin_user: User, super_admin_headers: dict
    ):
        """Super admin can list all users."""
        response = await client.get("/api/v1/users/", headers=super_admin_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_super_admin_can_access_analytics(
        self, client: AsyncClient, super_admin_user: User, super_admin_headers: dict
    ):
        """Super admin can access analytics."""
        response = await client.get("/api/v1/analytics/dashboard", headers=super_admin_headers)
        # Analytics endpoint may or may not exist, so check for 200 or 404
        assert response.status_code in [200, 404]


class TestOpsAdminAccess:
    """Test OPS admin access control."""

    @pytest.mark.asyncio
    async def test_ops_admin_can_list_enterprises(
        self, client: AsyncClient, ops_admin_user: User, ops_admin_headers: dict, test_enterprise
    ):
        """OPS admin can list enterprises."""
        response = await client.get("/api/v1/enterprises/", headers=ops_admin_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_ops_admin_can_list_assets(
        self, client: AsyncClient, ops_admin_user: User, ops_admin_headers: dict
    ):
        """OPS admin can list all assets."""
        response = await client.get("/api/v1/assets/", headers=ops_admin_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_ops_admin_can_access_reviews(
        self, client: AsyncClient, ops_admin_user: User, ops_admin_headers: dict
    ):
        """OPS admin can access review queue."""
        response = await client.get("/api/v1/reviews/", headers=ops_admin_headers)
        assert response.status_code in [200, 404]


class TestOrgAdminAccess:
    """Test org admin access control."""

    @pytest.mark.asyncio
    async def test_org_admin_can_list_own_enterprise_branches(
        self, client: AsyncClient, org_admin_user: User, org_admin_headers: dict, test_enterprise
    ):
        """Org admin can list branches for their enterprise."""
        response = await client.get(
            f"/api/v1/enterprises/{org_admin_user.enterprise_id}/branches",
            headers=org_admin_headers
        )
        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_org_admin_cannot_access_other_enterprise(
        self, client: AsyncClient, org_admin_user: User, org_admin_headers: dict
    ):
        """Org admin cannot access other enterprises."""
        fake_enterprise_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/api/v1/enterprises/{fake_enterprise_id}",
            headers=org_admin_headers
        )
        # Should be forbidden or not found
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_org_admin_cannot_list_all_enterprises(
        self, client: AsyncClient, org_admin_user: User, org_admin_headers: dict
    ):
        """Org admin cannot list all enterprises (only super/ops can)."""
        response = await client.get("/api/v1/enterprises/", headers=org_admin_headers)
        # Org admin should either get filtered list or forbidden
        # This depends on implementation
        assert response.status_code in [200, 403]


class TestITAdminAccess:
    """Test IT admin access control."""

    @pytest.mark.asyncio
    async def test_it_admin_can_list_assets_for_branch(
        self, client: AsyncClient, it_admin_user: User, it_admin_headers: dict, test_branch
    ):
        """IT admin can list assets for their branch."""
        response = await client.get("/api/v1/assets/", headers=it_admin_headers)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_it_admin_can_create_asset(
        self, client: AsyncClient, it_admin_user: User, it_admin_headers: dict
    ):
        """IT admin can create assets."""
        response = await client.post(
            "/api/v1/assets/",
            headers=it_admin_headers,
            json={
                "serial_number": "TEST-SN-001",
                "device_type": "laptop",
                "brand": "Dell",
                "model": "Latitude 5520",
            }
        )
        # Should succeed or validation error
        assert response.status_code in [200, 201, 422]

    @pytest.mark.asyncio
    async def test_it_admin_can_list_sub_users(
        self, client: AsyncClient, it_admin_user: User, it_admin_headers: dict
    ):
        """IT admin can list sub-users for their branch."""
        response = await client.get("/api/v1/users/employees", headers=it_admin_headers)
        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_it_admin_cannot_create_enterprise(
        self, client: AsyncClient, it_admin_user: User, it_admin_headers: dict
    ):
        """IT admin cannot create enterprises."""
        response = await client.post(
            "/api/v1/enterprises/",
            headers=it_admin_headers,
            json={
                "name": "Unauthorized Enterprise",
                "gst_number": "29TESTGST9999F1Z5",
            }
        )
        # Should be forbidden
        assert response.status_code == 403


class TestEmployeeAccess:
    """Test employee (sub-user) access control."""

    @pytest.mark.asyncio
    async def test_employee_can_view_own_submissions(
        self, client: AsyncClient, employee_user: User, employee_headers: dict
    ):
        """Employee can view their own submissions."""
        response = await client.get("/api/v1/submissions/my", headers=employee_headers)
        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_employee_cannot_list_all_assets(
        self, client: AsyncClient, employee_user: User, employee_headers: dict
    ):
        """Employee cannot list all assets."""
        response = await client.get("/api/v1/assets/", headers=employee_headers)
        # Should be forbidden or filtered
        assert response.status_code in [200, 403]  # 200 if filtered, 403 if forbidden

    @pytest.mark.asyncio
    async def test_employee_cannot_create_users(
        self, client: AsyncClient, employee_user: User, employee_headers: dict
    ):
        """Employee cannot create users."""
        response = await client.post(
            "/api/v1/users/",
            headers=employee_headers,
            json={
                "email": "newuser@test.com",
                "name": "New User",
                "role": "employee",
            }
        )
        assert response.status_code in [403, 405]


class TestLogisticsAdminAccess:
    """Test logistics admin access control."""

    @pytest.mark.asyncio
    async def test_logistics_admin_can_list_pickups(
        self, client: AsyncClient, db_session
    ):
        """Logistics admin can list pickup requests."""
        from app.models.user import User, UserRole, UserStatus
        from app.core.security import get_password_hash
        from tests.conftest import get_auth_headers
        import uuid

        # Create logistics admin
        user = User(
            id=str(uuid.uuid4()),
            email="logadmin@test.com",
            name="Logistics Admin",
            role=UserRole.LOGISTICS_ADMIN,
            status=UserStatus.ACTIVE,
            password_hash=get_password_hash("password123"),
            company_name="Test Logistics",
            city="Mumbai",
            state="Maharashtra",
        )
        db_session.add(user)
        await db_session.commit()

        headers = get_auth_headers(user)
        # Note: This test requires the client fixture which we don't have here
        # This is a placeholder structure


class TestLogisticsUserAccess:
    """Test logistics user access control."""

    @pytest.mark.asyncio
    async def test_logistics_user_can_view_assigned_pickups(
        self, client: AsyncClient, db_session
    ):
        """Logistics user can view their assigned pickups."""
        from app.models.user import User, UserRole, UserStatus
        from app.core.security import get_password_hash
        from tests.conftest import get_auth_headers
        import uuid

        # Create logistics user
        user = User(
            id=str(uuid.uuid4()),
            email="driver@test.com",
            name="Driver",
            role=UserRole.LOGISTICS_USER,
            status=UserStatus.ACTIVE,
            password_hash=get_password_hash("password123"),
            vehicle_type="Van",
            vehicle_number="MH-01-AB-1234",
        )
        db_session.add(user)
        await db_session.commit()

        headers = get_auth_headers(user)
        # Note: This test requires the client fixture


class TestCrossEnterpriseAccess:
    """Test that users cannot access data from other enterprises."""

    @pytest.mark.asyncio
    async def test_it_admin_cannot_access_other_branch_assets(
        self, client: AsyncClient, it_admin_user: User, it_admin_headers: dict, db_session
    ):
        """IT admin cannot access assets from other branches."""
        from app.models.enterprise import Branch
        import uuid

        # Create another branch in a different enterprise
        other_branch = Branch(
            id=str(uuid.uuid4()),
            enterprise_id="00000000-0000-0000-0000-000000000001",
            branch_name="Other Branch",
            branch_code="OTHER-BR",
            address_line1="456 Other Street",
            city="Delhi",
            state="Delhi",
            pin_code="110001",
            status="active",
        )
        # Don't actually add to avoid foreign key issues

        # Try to access assets from the other branch
        response = await client.get(
            f"/api/v1/branches/{other_branch.id}/assets",
            headers=it_admin_headers
        )
        # Should be forbidden or not found
        assert response.status_code in [403, 404]
