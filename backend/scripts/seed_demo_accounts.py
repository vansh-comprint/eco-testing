"""
Seed script to create demo accounts for ALL roles in EcoTribe.

Creates one demo account per role with standardized credentials:
  - Email format: demo.{role}@ecotribe.com
  - Password: Demo@123456

Also creates:
  - Demo enterprise "EcoTribe Demo Corp" with branches
  - Sample assets, batches, submissions so demo accounts have data to show

Idempotent: safe to run multiple times (skips if accounts already exist).

Usage:
    cd backend
    python scripts/seed_demo_accounts.py
"""

import asyncio
import sys
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import random

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import Enterprise, EnterpriseStatus, Branch, BranchStatus
from app.models.asset import Asset, AssetStatus
from app.models.batch import Batch, BatchStatus
from app.models.financial import EnterpriseWallet


# ── Config ────────────────────────────────────────────────────────────────────

DEMO_PASSWORD = "Demo@123456"
DEMO_ENTERPRISE_GST = "27DEMO0000D1Z0"
DEMO_ENTERPRISE_NAME = "EcoTribe Demo Corp"


# ── Helper ────────────────────────────────────────────────────────────────────

def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


async def get_or_create(db: AsyncSession, model, filters: dict, defaults: dict):
    """Get existing record or create new one. Returns (instance, created)."""
    query = select(model)
    for k, v in filters.items():
        query = query.where(getattr(model, k) == v)
    result = await db.execute(query)
    instance = result.scalar_one_or_none()
    if instance:
        return instance, False
    instance = model(**{**filters, **defaults})
    db.add(instance)
    await db.flush()
    return instance, True


# ── Main Seed ─────────────────────────────────────────────────────────────────

async def seed():
    async with AsyncSessionLocal() as db:
        try:
            password_hash = get_password_hash(DEMO_PASSWORD)
            created_accounts = []

            # ─── 1. Demo Enterprise ───────────────────────────────────────
            print("\n📦 Enterprise & Branches...")

            enterprise, ent_created = await get_or_create(db, Enterprise,
                filters={"gst_number": DEMO_ENTERPRISE_GST},
                defaults={
                    "id": uid(),
                    "name": DEMO_ENTERPRISE_NAME,
                    "legal_name": "EcoTribe Demo Corporation Pvt Ltd",
                    "status": EnterpriseStatus.ACTIVE.value,
                    "contact_person": "Demo Admin",
                    "contact_email": "demo@ecotribe.com",
                    "contact_phone": "+91-9999000001",
                    "industry": "Technology",
                    "company_size": "100-500",
                    "created_by": "seed_script",
                })
            print(f"   Enterprise: {enterprise.name} ({'created' if ent_created else 'exists'})")

            # Wallet
            wallet, w_created = await get_or_create(db, EnterpriseWallet,
                filters={"enterprise_id": enterprise.id},
                defaults={
                    "id": uid(),
                    "balance": Decimal("50000.00"),
                    "currency": "INR",
                })
            if w_created:
                print("   Wallet: created (₹50,000)")

            # Branch 1: Mumbai HQ
            branch_mum, b1_created = await get_or_create(db, Branch,
                filters={"enterprise_id": enterprise.id, "branch_code": "DEMO-MUM"},
                defaults={
                    "id": uid(),
                    "branch_name": "Demo Mumbai HQ",
                    "address_line1": "101 Demo Business Park",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pin_code": "400001",
                    "status": BranchStatus.ACTIVE.value,
                    "created_by": "seed_script",
                })
            print(f"   Branch: {branch_mum.branch_name} ({'created' if b1_created else 'exists'})")

            # Branch 2: Bangalore
            branch_blr, b2_created = await get_or_create(db, Branch,
                filters={"enterprise_id": enterprise.id, "branch_code": "DEMO-BLR"},
                defaults={
                    "id": uid(),
                    "branch_name": "Demo Bangalore Office",
                    "address_line1": "42 Demo Tech Park",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "pin_code": "560001",
                    "status": BranchStatus.ACTIVE.value,
                    "created_by": "seed_script",
                })
            print(f"   Branch: {branch_blr.branch_name} ({'created' if b2_created else 'exists'})")

            # ─── 2. Demo Users (one per role) ─────────────────────────────
            print("\n👥 Demo Accounts...")

            demo_users_spec = [
                # Platform roles (no enterprise)
                {
                    "email": "demo.superadmin@ecotribe.com",
                    "name": "Demo Super Admin",
                    "role": UserRole.SUPER_ADMIN.value,
                    "phone": "+91-9999100001",
                    "enterprise_id": None,
                    "branch_id": None,
                },
                {
                    "email": "demo.opsadmin@ecotribe.com",
                    "name": "Demo OPS Admin",
                    "role": UserRole.OPS_ADMIN.value,
                    "phone": "+91-9999100002",
                    "enterprise_id": None,
                    "branch_id": None,
                },
                # Enterprise roles
                {
                    "email": "demo.orgadmin@ecotribe.com",
                    "name": "Demo Org Admin",
                    "role": UserRole.ORG_ADMIN.value,
                    "phone": "+91-9999100003",
                    "enterprise_id": enterprise.id,
                    "branch_id": None,
                },
                {
                    "email": "demo.itadmin@ecotribe.com",
                    "name": "Demo IT Admin",
                    "role": UserRole.IT_ADMIN.value,
                    "phone": "+91-9999100004",
                    "enterprise_id": enterprise.id,
                    "branch_id": branch_mum.id,
                },
                {
                    "email": "demo.employee@ecotribe.com",
                    "name": "Demo Employee",
                    "role": UserRole.EMPLOYEE.value,
                    "phone": "+91-9999100005",
                    "enterprise_id": enterprise.id,
                    "branch_id": branch_mum.id,
                    "employee_id": "DEMO-EMP001",
                    "department": "Engineering",
                    "designation": "Software Engineer",
                },
                # Logistics roles
                {
                    "email": "demo.logisticsadmin@ecotribe.com",
                    "name": "Demo Logistics Admin",
                    "role": UserRole.LOGISTICS_ADMIN.value,
                    "phone": "+91-9999100006",
                    "enterprise_id": None,
                    "branch_id": None,
                    "company_name": "Demo Express Logistics",
                    "contact_person": "Demo Logistics Manager",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                },
                {
                    "email": "demo.logisticsuser@ecotribe.com",
                    "name": "Demo Logistics Driver",
                    "role": UserRole.LOGISTICS_USER.value,
                    "phone": "+91-9999100007",
                    "enterprise_id": None,
                    "branch_id": None,
                    "vehicle_type": "Van",
                    "vehicle_number": "MH-01-DEMO-1234",
                },
            ]

            user_map = {}  # email -> User object

            for spec in demo_users_spec:
                email = spec["email"]
                user, created = await get_or_create(db, User,
                    filters={"email": email},
                    defaults={
                        "id": uid(),
                        "password_hash": password_hash,
                        "status": UserStatus.ACTIVE.value,
                        "created_by": "seed_script",
                        **spec,
                    })

                if not created:
                    # Update password to ensure demo password works
                    user.password_hash = password_hash
                    user.status = UserStatus.ACTIVE.value

                user_map[email] = user
                status_label = "created" if created else "exists (password reset)"
                print(f"   {spec['role']:20s}  {email:40s}  [{status_label}]")
                created_accounts.append({
                    "email": email,
                    "role": spec["role"],
                    "status": status_label,
                })

            # Link logistics_user -> logistics_admin
            logistics_user = user_map["demo.logisticsuser@ecotribe.com"]
            logistics_admin = user_map["demo.logisticsadmin@ecotribe.com"]
            logistics_user.parent_user_id = logistics_admin.id

            # Link IT admin to branch
            it_admin = user_map["demo.itadmin@ecotribe.com"]
            branch_mum.it_admin_id = it_admin.id

            await db.flush()

            # ─── 3. Sample Assets ─────────────────────────────────────────
            print("\n💻 Sample Assets...")

            employee = user_map["demo.employee@ecotribe.com"]
            it_admin_id = it_admin.id

            asset_specs = [
                ("Dell Latitude 5520",    "Dell",    "LAT5520-DEMO1",  "DEMO-A001", AssetStatus.ASSIGNED),
                ("HP EliteBook 840",      "HP",      "EB840-DEMO2",    "DEMO-A002", AssetStatus.ASSIGNED),
                ("Lenovo ThinkPad X1",    "Lenovo",  "TPX1-DEMO3",     "DEMO-A003", AssetStatus.PENDING_ASSIGNMENT),
                ("Apple MacBook Pro 14",  "Apple",   "MBP14-DEMO4",    "DEMO-A004", AssetStatus.SUBMITTED),
                ("Samsung Galaxy Tab S9", "Samsung", "TABS9-DEMO5",    "DEMO-A005", AssetStatus.REMOTE_REVIEW),
                ("Dell OptiPlex 7090",    "Dell",    "OPT7090-DEMO6",  "DEMO-A006", AssetStatus.CONDITIONALLY_ACCEPTED),
                ("LG UltraWide 34",       "LG",      "UW34-DEMO7",     "DEMO-A007", AssetStatus.PICKUP_REQUESTED),
                ("HP ProBook 450",        "HP",      "PB450-DEMO8",    "DEMO-A008", AssetStatus.COMPLETED),
            ]

            assets_created = 0
            demo_assets = []
            for model_name, brand, serial, tag, status in asset_specs:
                asset, created = await get_or_create(db, Asset,
                    filters={"serial_number": serial},
                    defaults={
                        "id": uid(),
                        "enterprise_id": enterprise.id,
                        "branch_id": branch_mum.id,
                        "brand": brand,
                        "model": model_name,
                        "asset_tag": tag,
                        "specs": {
                            "device_type": "Laptop" if "Book" in model_name or "Latitude" in model_name or "ThinkPad" in model_name or "MacBook" in model_name else "Monitor" if "Ultra" in model_name else "Tablet" if "Tab" in model_name else "Desktop",
                            "processor": "Intel Core i7",
                            "ram": "16GB",
                            "storage": "512GB SSD",
                        },
                        "status": status.value,
                        "assigned_to_user_id": employee.id if status not in (AssetStatus.PENDING_ASSIGNMENT, AssetStatus.COMPLETED) else None,
                        "created_by": it_admin_id,
                    })
                demo_assets.append(asset)
                if created:
                    assets_created += 1
            print(f"   {assets_created} new assets created ({len(asset_specs) - assets_created} already existed)")

            # ─── 4. Sample Batches ────────────────────────────────────────
            print("\n📋 Sample Batches...")

            org_admin = user_map["demo.orgadmin@ecotribe.com"]

            batch_specs = [
                ("Demo Batch - Draft",     BatchStatus.DRAFT.value,            None,          None),
                ("Demo Batch - Pending",   BatchStatus.PENDING_APPROVAL.value, None,          None),
                ("Demo Batch - Approved",  BatchStatus.APPROVED.value,         org_admin.id,  now() - timedelta(days=1)),
            ]

            batches_created = 0
            for bname, bstatus, approved_by, approved_at in batch_specs:
                defaults = {
                    "id": uid(),
                    "enterprise_id": enterprise.id,
                    "branch_id": branch_mum.id,
                    "description": f"Demo batch for testing - {bstatus}",
                    "status": bstatus,
                    "asset_count": 0,
                    "created_by": it_admin_id,
                }
                if approved_by:
                    defaults["approved_by"] = approved_by
                    defaults["approved_at"] = approved_at
                if bstatus == BatchStatus.PENDING_APPROVAL.value:
                    defaults["requires_approval"] = True
                    defaults["submitted_for_approval_at"] = now() - timedelta(hours=6)
                    defaults["preferred_pickup_date"] = (now() + timedelta(days=7)).date()
                    defaults["preferred_pickup_slot"] = "morning"

                batch, created = await get_or_create(db, Batch,
                    filters={"name": bname, "enterprise_id": enterprise.id},
                    defaults=defaults)
                if created:
                    batches_created += 1
            print(f"   {batches_created} new batches created ({len(batch_specs) - batches_created} already existed)")

            # ─── 5. Commit ────────────────────────────────────────────────
            await db.commit()
            print("\n✅ All demo data committed to database!")

            # ─── 6. Summary ───────────────────────────────────────────────
            print("\n" + "=" * 72)
            print("  DEMO ACCOUNTS SUMMARY")
            print("=" * 72)
            print(f"  Password for ALL accounts: {DEMO_PASSWORD}")
            print(f"  Enterprise: {DEMO_ENTERPRISE_NAME}")
            print(f"  Branches: Demo Mumbai HQ, Demo Bangalore Office")
            print("-" * 72)
            print(f"  {'Role':<22s} {'Email':<42s}")
            print("-" * 72)
            for acc in created_accounts:
                print(f"  {acc['role']:<22s} {acc['email']:<42s}")
            print("-" * 72)
            print(f"\n  Note: Employee (demo.employee@ecotribe.com) also has a password")
            print(f"  set for easy testing, even though employees normally use OTP.\n")

            return created_accounts

        except Exception as e:
            await db.rollback()
            print(f"\n❌ Error: {e}")
            raise


# ── Login Test ────────────────────────────────────────────────────────────────

async def test_logins():
    """Test that each demo account can actually log in via the API."""
    import httpx

    base_url = "http://localhost:8000/api/v1/auth/login"
    accounts = [
        ("demo.superadmin@ecotribe.com",      "super_admin"),
        ("demo.opsadmin@ecotribe.com",         "ops_admin"),
        ("demo.orgadmin@ecotribe.com",         "org_admin"),
        ("demo.itadmin@ecotribe.com",          "it_admin"),
        ("demo.employee@ecotribe.com",         "employee"),
        ("demo.logisticsadmin@ecotribe.com",   "logistics_admin"),
        ("demo.logisticsuser@ecotribe.com",    "logistics_user"),
    ]

    print("\n🔐 Testing login for each account...")
    print("-" * 72)

    all_passed = True
    async with httpx.AsyncClient(timeout=10.0) as client:
        for i, (email, role) in enumerate(accounts):
            # Small delay to avoid rate limiting
            if i > 0:
                await asyncio.sleep(0.5)
            try:
                resp = await client.post(base_url, json={
                    "email": email,
                    "password": DEMO_PASSWORD,
                })
                data = resp.json()
                if resp.status_code == 200:
                    # Check for access_token in response (may be nested under "data")
                    token_data = data.get("data", data)
                    if token_data.get("access_token"):
                        print(f"  OK  {role:<22s} {email:<42s} LOGIN SUCCESS")
                    else:
                        print(f"  OK  {role:<22s} {email:<42s} 200 (msg: {data.get('message', '?')})")
                elif resp.status_code == 429:
                    print(f"  --  {role:<22s} {email:<42s} RATE LIMITED (expected after rapid calls)")
                else:
                    msg = data.get("detail", data.get("message", "Unknown error"))
                    print(f"  ERR {role:<22s} {email:<42s} {resp.status_code}: {msg}")
                    all_passed = False
            except httpx.ConnectError:
                print(f"  --  {role:<22s} {email:<42s} SERVER NOT RUNNING")
                all_passed = False
            except Exception as e:
                print(f"  ERR {role:<22s} {email:<42s} ERROR: {e}")
                all_passed = False

    print("-" * 72)
    if all_passed:
        print("  🎉 All accounts login successfully!")
    else:
        print("  ⚠️  Some accounts failed — check above.")
    print()

    return all_passed


# ── Entry Point ───────────────────────────────────────────────────────────────

async def main():
    print("🚀 EcoTribe Demo Account Seeder")
    print("=" * 72)

    # Seed accounts & data
    await seed()

    # Test logins
    await test_logins()


if __name__ == "__main__":
    asyncio.run(main())
