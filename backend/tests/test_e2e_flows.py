"""
E2E Tests for EcoTribe Platform
Run against live services: python tests/test_e2e_flows.py

These tests use the actual running backend and test the complete flows.
"""

import asyncio
import httpx
import sys
from typing import Optional

# Use ASCII-safe symbols for Windows compatibility
PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

BASE_URL = "http://localhost:8000/api/v1"

# Test credentials (from seed_test_data.py)
TEST_USERS = {
    "super_admin": {"email": "superadmin@ecotribe.io", "password": "password123"},
    "ops_admin": {"email": "opsadmin@ecotribe.io", "password": "password123"},
    "org_admin": {"email": "orgadmin@techcorp.com", "password": "password123"},
    "it_admin": {"email": "itadmin@techcorp.com", "password": "password123"},
    "employee": {"email": "employee@techcorp.com", "password": "password123"},  # Uses OTP
    "logistics_admin": {"email": "logisticsadmin@express.com", "password": "password123"},
    "logistics_user": {"email": "driver@express.com", "password": "password123"},
}


class TestResult:
    def __init__(self, name: str, passed: bool, message: str = ""):
        self.name = name
        self.passed = passed
        self.message = message


class E2ETestRunner:
    def __init__(self):
        self.results: list[TestResult] = []
        self.tokens: dict[str, str] = {}

    async def run_all_tests(self):
        """Run all E2E tests."""
        print("\n" + "=" * 60)
        print("EcoTribe E2E Test Suite")
        print("=" * 60)

        # Health check
        await self.test_health_check()

        # Auth tests for all roles
        await self.test_auth_flows()

        # Role-specific tests
        await self.test_super_admin_flows()
        await self.test_ops_admin_flows()
        await self.test_org_admin_flows()
        await self.test_it_admin_flows()
        await self.test_logistics_admin_flows()
        await self.test_logistics_user_flows()

        # Print summary
        self.print_summary()

    async def test_health_check(self):
        """Test API health endpoint."""
        print("\n--- Health Check ---")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("http://localhost:8000/health")
                passed = response.status_code == 200 and response.json().get("status") == "healthy"
                self.results.append(TestResult(
                    "Health Check",
                    passed,
                    f"Status: {response.json().get('status', 'unknown')}"
                ))
                print(f"  {PASS if passed else FAIL} Health Check")
            except Exception as e:
                self.results.append(TestResult("Health Check", False, str(e)))
                print(f"  {FAIL} Health Check: {e}")

    async def test_auth_flows(self):
        """Test authentication for all roles."""
        print("\n--- Authentication Tests ---")

        async with httpx.AsyncClient() as client:
            # Test password login for admin roles
            for role in ["super_admin", "ops_admin", "org_admin", "it_admin", "logistics_admin", "logistics_user"]:
                creds = TEST_USERS[role]
                try:
                    response = await client.post(
                        f"{BASE_URL}/auth/login",
                        json={"email": creds["email"], "password": creds["password"]}
                    )
                    passed = response.status_code == 200 and "access_token" in response.json().get("data", {})

                    if passed:
                        self.tokens[role] = response.json()["data"]["access_token"]
                        user_role = response.json()["data"]["user"]["role"]
                        self.results.append(TestResult(
                            f"Login {role}",
                            True,
                            f"Role: {user_role}"
                        ))
                        print(f"  {PASS} Login {role}")
                    else:
                        self.results.append(TestResult(
                            f"Login {role}",
                            False,
                            response.json().get("message", "Unknown error")
                        ))
                        print(f"  {FAIL} Login {role}: {response.json().get('message', 'Failed')}")
                except Exception as e:
                    self.results.append(TestResult(f"Login {role}", False, str(e)))
                    print(f"  {FAIL} Login {role}: {e}")

            # Test employee requires OTP
            creds = TEST_USERS["employee"]
            try:
                response = await client.post(
                    f"{BASE_URL}/auth/login",
                    json={"email": creds["email"], "password": creds["password"]}
                )
                passed = response.status_code == 401 and "OTP" in response.json().get("message", "")
                self.results.append(TestResult(
                    "Employee requires OTP",
                    passed,
                    response.json().get("message", "")
                ))
                print(f"  {PASS if passed else FAIL} Employee requires OTP")
            except Exception as e:
                self.results.append(TestResult("Employee requires OTP", False, str(e)))
                print(f"  {FAIL} Employee requires OTP: {e}")

    async def test_super_admin_flows(self):
        """Test super admin specific flows."""
        print("\n--- Super Admin Tests ---")

        if "super_admin" not in self.tokens:
            print(f"  {WARN} Skipped (no token)")
            return

        headers = {"Authorization": f"Bearer {self.tokens['super_admin']}"}
        async with httpx.AsyncClient() as client:
            # Test get current user
            await self._test_endpoint(client, "GET", "/auth/me", headers, "Super Admin /me")

            # Test list enterprises
            await self._test_endpoint(client, "GET", "/enterprises", headers, "List Enterprises")

            # Test list users
            await self._test_endpoint(client, "GET", "/users", headers, "List Users")

    async def test_ops_admin_flows(self):
        """Test OPS admin specific flows."""
        print("\n--- OPS Admin Tests ---")

        if "ops_admin" not in self.tokens:
            print(f"  {WARN} Skipped (no token)")
            return

        headers = {"Authorization": f"Bearer {self.tokens['ops_admin']}"}
        async with httpx.AsyncClient() as client:
            # Test get current user
            await self._test_endpoint(client, "GET", "/auth/me", headers, "OPS Admin /me")

            # Test list enterprises
            await self._test_endpoint(client, "GET", "/enterprises", headers, "OPS List Enterprises")

            # Test list assets
            await self._test_endpoint(client, "GET", "/assets", headers, "OPS List Assets")

    async def test_org_admin_flows(self):
        """Test org admin specific flows."""
        print("\n--- Org Admin Tests ---")

        if "org_admin" not in self.tokens:
            print(f"  {WARN} Skipped (no token)")
            return

        headers = {"Authorization": f"Bearer {self.tokens['org_admin']}"}
        async with httpx.AsyncClient() as client:
            # Test get current user
            response = await self._test_endpoint(client, "GET", "/auth/me", headers, "Org Admin /me")

            if response and response.status_code == 200:
                enterprise_id = response.json()["data"].get("enterprise_id")
                if enterprise_id:
                    # Test list branches for enterprise
                    await self._test_endpoint(
                        client, "GET",
                        f"/enterprises/{enterprise_id}/branches",
                        headers,
                        "Org Admin List Branches",
                        expected_codes=[200, 404]
                    )

    async def test_it_admin_flows(self):
        """Test IT admin specific flows."""
        print("\n--- IT Admin Tests ---")

        if "it_admin" not in self.tokens:
            print(f"  {WARN} Skipped (no token)")
            return

        headers = {"Authorization": f"Bearer {self.tokens['it_admin']}"}
        async with httpx.AsyncClient() as client:
            # Test get current user
            await self._test_endpoint(client, "GET", "/auth/me", headers, "IT Admin /me")

            # Test list assets
            await self._test_endpoint(client, "GET", "/assets", headers, "IT Admin List Assets")

            # Test list batches
            await self._test_endpoint(
                client, "GET", "/batches", headers, "IT Admin List Batches",
                expected_codes=[200, 404]
            )

    async def test_logistics_admin_flows(self):
        """Test logistics admin specific flows."""
        print("\n--- Logistics Admin Tests ---")

        if "logistics_admin" not in self.tokens:
            print(f"  {WARN} Skipped (no token)")
            return

        headers = {"Authorization": f"Bearer {self.tokens['logistics_admin']}"}
        async with httpx.AsyncClient() as client:
            # Test get current user
            await self._test_endpoint(client, "GET", "/auth/me", headers, "Logistics Admin /me")

            # Test list pickup requests
            await self._test_endpoint(
                client, "GET", "/pickup-requests/", headers, "Logistics Admin List Pickups",
                expected_codes=[200, 404]
            )

    async def test_logistics_user_flows(self):
        """Test logistics user specific flows."""
        print("\n--- Logistics User Tests ---")

        if "logistics_user" not in self.tokens:
            print(f"  {WARN} Skipped (no token)")
            return

        headers = {"Authorization": f"Bearer {self.tokens['logistics_user']}"}
        async with httpx.AsyncClient() as client:
            # Test get current user
            await self._test_endpoint(client, "GET", "/auth/me", headers, "Logistics User /me")

            # Test list assigned pickups
            await self._test_endpoint(
                client, "GET", "/pickup-requests/my", headers, "Logistics User My Pickups",
                expected_codes=[200, 404]
            )

    async def _test_endpoint(
        self,
        client: httpx.AsyncClient,
        method: str,
        path: str,
        headers: dict,
        test_name: str,
        expected_codes: list[int] = None,
        json_data: dict = None
    ) -> Optional[httpx.Response]:
        """Test an API endpoint."""
        if expected_codes is None:
            expected_codes = [200]

        try:
            if method == "GET":
                response = await client.get(f"{BASE_URL}{path}", headers=headers)
            elif method == "POST":
                response = await client.post(f"{BASE_URL}{path}", headers=headers, json=json_data)
            else:
                response = await client.request(method, f"{BASE_URL}{path}", headers=headers, json=json_data)

            passed = response.status_code in expected_codes
            self.results.append(TestResult(
                test_name,
                passed,
                f"Status: {response.status_code}"
            ))
            print(f"  {PASS if passed else FAIL} {test_name} ({response.status_code})")
            return response
        except Exception as e:
            self.results.append(TestResult(test_name, False, str(e)))
            print(f"  {FAIL} {test_name}: {e}")
            return None

    def print_summary(self):
        """Print test summary."""
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)

        print(f"\nTotal: {total} | Passed: {passed} | Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")

        if failed > 0:
            print("\n--- Failed Tests ---")
            for r in self.results:
                if not r.passed:
                    print(f"  {FAIL} {r.name}: {r.message}")

        print("\n" + "=" * 60)

        # Return exit code
        return 0 if failed == 0 else 1


async def main():
    runner = E2ETestRunner()
    exit_code = await runner.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
