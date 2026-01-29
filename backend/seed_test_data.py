"""
Seed script to create test data for all 7 user roles.
Run this script after database migrations to populate test users.
"""

import asyncio
import uuid
from datetime import datetime, timezone
import bcrypt
import json

# Database connection
import asyncpg

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ecotribe"


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def get_current_time():
    """Get current UTC time."""
    return datetime.now(timezone.utc)


async def seed_data():
    """Create test data for all roles."""

    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)

    print("Connected to database. Creating test data...")

    try:
        # ============================================
        # 1. Create Test Enterprise
        # ============================================
        enterprise_id = str(uuid.uuid4())
        print(f"\n1. Creating test enterprise: TechCorp (ID: {enterprise_id})")

        # Address as JSON
        address_json = json.dumps({
            "street": "123 Tech Park",
            "city": "Bangalore",
            "state": "Karnataka",
            "pincode": "560001",
            "country": "India"
        })

        # First check if enterprise exists by GST number
        existing = await conn.fetchrow(
            "SELECT id FROM enterprises WHERE gst_number = $1", "22AAAAA0000A1Z5"
        )
        if existing:
            enterprise_id = existing['id']
            print(f"   Using existing enterprise (ID: {enterprise_id})")
        else:
            await conn.execute("""
                INSERT INTO enterprises (id, name, gst_number, contact_email, contact_phone, contact_person, address, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7::json, $8, $9, $10)
            """, enterprise_id, "TechCorp Industries", "22AAAAA0000A1Z5", "contact@techcorp.com",
               "+91-9876543210", "John Smith", address_json, "active", get_current_time(), get_current_time())

        # ============================================
        # 2. Create Enterprise Wallet
        # ============================================
        existing_wallet = await conn.fetchrow(
            "SELECT id FROM enterprise_wallets WHERE enterprise_id = $1", enterprise_id
        )
        if existing_wallet:
            wallet_id = existing_wallet['id']
            print(f"2. Using existing wallet (ID: {wallet_id})")
        else:
            wallet_id = str(uuid.uuid4())
            print(f"2. Creating enterprise wallet (ID: {wallet_id})")
            await conn.execute("""
                INSERT INTO enterprise_wallets (id, enterprise_id, balance, currency, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, wallet_id, enterprise_id, 10000.00, "INR", get_current_time(), get_current_time())

        # ============================================
        # 3. Create Test Branch
        # ============================================
        existing_branch = await conn.fetchrow(
            "SELECT id FROM branches WHERE enterprise_id = $1 AND branch_code = $2",
            enterprise_id, "BLR-001"
        )
        if existing_branch:
            branch_id = existing_branch['id']
            print(f"3. Using existing branch: Bangalore HQ (ID: {branch_id})")
        else:
            branch_id = str(uuid.uuid4())
            print(f"3. Creating test branch: Bangalore HQ (ID: {branch_id})")
            await conn.execute("""
                INSERT INTO branches (id, enterprise_id, branch_name, branch_code, address_line1, city, state, pin_code, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """, branch_id, enterprise_id, "Bangalore HQ", "BLR-001", "123 Tech Park", "Bangalore",
               "Karnataka", "560001", "active", get_current_time(), get_current_time())

        # ============================================
        # 4. Create Users for All 7 Roles
        # ============================================
        password_hash = hash_password("password123")
        current_time = get_current_time()

        users = [
            # Platform Roles (no enterprise)
            {
                "id": str(uuid.uuid4()),
                "email": "superadmin@ecotribe.io",
                "name": "Super Admin",
                "phone": "+91-9000000001",
                "role": "super_admin",
                "enterprise_id": None,
                "branch_id": None,
            },
            {
                "id": str(uuid.uuid4()),
                "email": "opsadmin@ecotribe.io",
                "name": "OPS Admin",
                "phone": "+91-9000000002",
                "role": "ops_admin",
                "enterprise_id": None,
                "branch_id": None,
            },
            # Enterprise Roles
            {
                "id": str(uuid.uuid4()),
                "email": "orgadmin@techcorp.com",
                "name": "Org Admin",
                "phone": "+91-9000000003",
                "role": "org_admin",
                "enterprise_id": enterprise_id,
                "branch_id": None,
            },
            {
                "id": str(uuid.uuid4()),
                "email": "itadmin@techcorp.com",
                "name": "IT Admin",
                "phone": "+91-9000000004",
                "role": "it_admin",
                "enterprise_id": enterprise_id,
                "branch_id": branch_id,
            },
            {
                "id": str(uuid.uuid4()),
                "email": "employee@techcorp.com",
                "name": "John Employee",
                "phone": "+91-9000000005",
                "role": "employee",
                "enterprise_id": enterprise_id,
                "branch_id": branch_id,
                "employee_id": "EMP001",
                "department": "Engineering",
            },
            # Logistics Roles
            {
                "id": str(uuid.uuid4()),
                "email": "logisticsadmin@express.com",
                "name": "Logistics Admin",
                "phone": "+91-9000000006",
                "role": "logistics_admin",
                "enterprise_id": None,
                "branch_id": None,
                "company_name": "Express Logistics",
                "city": "Bangalore",
                "state": "Karnataka",
            },
            {
                "id": str(uuid.uuid4()),
                "email": "driver@express.com",
                "name": "Driver User",
                "phone": "+91-9000000007",
                "role": "logistics_user",
                "enterprise_id": None,
                "branch_id": None,
                "vehicle_type": "Van",
                "vehicle_number": "KA-01-AB-1234",
            },
        ]

        print(f"\n4. Creating {len(users)} test users:")

        for user in users:
            print(f"   - {user['role']}: {user['email']}")

            # Build the INSERT query based on role
            await conn.execute("""
                INSERT INTO users (
                    id, email, name, phone, role, status, password_hash,
                    enterprise_id, branch_id, employee_id, department,
                    company_name, city, state, vehicle_type, vehicle_number,
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                ON CONFLICT (email) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    updated_at = EXCLUDED.updated_at
            """,
                user["id"],
                user["email"],
                user["name"],
                user["phone"],
                user["role"],
                "active",
                password_hash,
                user.get("enterprise_id"),
                user.get("branch_id"),
                user.get("employee_id"),
                user.get("department"),
                user.get("company_name"),
                user.get("city"),
                user.get("state"),
                user.get("vehicle_type"),
                user.get("vehicle_number"),
                current_time,
                current_time,
            )

        # Update logistics_user parent_user_id to point to logistics_admin
        logistics_admin_id = await conn.fetchval(
            "SELECT id FROM users WHERE email = 'logisticsadmin@express.com'"
        )
        await conn.execute(
            "UPDATE users SET parent_user_id = $1 WHERE email = 'driver@express.com'",
            logistics_admin_id
        )

        print("\n" + "="*60)
        print("TEST DATA CREATED SUCCESSFULLY!")
        print("="*60)
        print("\nTest Credentials (password: password123):")
        print("-" * 60)
        print("| Role             | Email                        |")
        print("-" * 60)
        print("| Super Admin      | superadmin@ecotribe.io       |")
        print("| OPS Admin        | opsadmin@ecotribe.io         |")
        print("| Org Admin        | orgadmin@techcorp.com        |")
        print("| IT Admin         | itadmin@techcorp.com         |")
        print("| Employee         | employee@techcorp.com        |")
        print("| Logistics Admin  | logisticsadmin@express.com   |")
        print("| Logistics User   | driver@express.com           |")
        print("-" * 60)
        print("\nEnterprise: TechCorp Industries")
        print("Branch: Bangalore HQ")
        print("\n")

    except Exception as e:
        print(f"Error creating test data: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
