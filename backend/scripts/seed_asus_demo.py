"""
ASUS Demo Data Seeder for EcoTribe Presentation.

Creates realistic demo data for ASUS India:
  - Enterprise: ASUS India Technology Pvt Ltd
  - 3 Branches: Mumbai HQ, Bangalore R&D, Delhi NCR
  - 8 ASUS users across org_admin, it_admin, employee roles
  - 20 ASUS assets (ZenBook, VivoBook, ExpertBook, ROG, ProArt, etc.)
  - Assets at every lifecycle stage for full flow demo
  - Batches, submissions, remote reviews, pickup requests, payouts
  - Reuses existing platform users (super_admin, ops_admin, logistics)

Password for ALL ASUS accounts: Asus@2024

Idempotent: safe to run multiple times.

Usage:
    cd backend
    python scripts/seed_asus_demo.py
"""

import asyncio
import sys
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import Enterprise, EnterpriseStatus, Branch, BranchStatus, PickupLocation
from app.models.asset import Asset, AssetStatus
from app.models.batch import Batch, BatchStatus
from app.models.financial import EnterpriseWallet, Payout
from app.models.submission import Submission
from app.models.review import RemoteReview, FacilityQC
from app.models.logistics import PickupRequest


# ── Config ────────────────────────────────────────────────────────────────────

ASUS_PASSWORD = "Asus@2026"
ASUS_GST = "29AABCA1234F1ZP"
ASUS_PAN = "AABCA1234F"

# ── Helpers ───────────────────────────────────────────────────────────────────

def uid():
    return str(uuid.uuid4())

def now():
    return datetime.now(timezone.utc)

def days_ago(n):
    return now() - timedelta(days=n)

def date_ago(n):
    return (now() - timedelta(days=n)).date()


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
            password_hash = get_password_hash(ASUS_PASSWORD)

            # ═══════════════════════════════════════════════════════════════
            # 1. ASUS ENTERPRISE
            # ═══════════════════════════════════════════════════════════════
            print("\n🏢 ASUS Enterprise...")

            enterprise, created = await get_or_create(db, Enterprise,
                filters={"gst_number": ASUS_GST},
                defaults={
                    "id": uid(),
                    "name": "ASUS India Technology Pvt Ltd",
                    "legal_name": "ASUSTeK Computer India Pvt Ltd",
                    "pan_number": ASUS_PAN,
                    "status": EnterpriseStatus.ACTIVE.value,
                    "contact_person": "Rahul Sharma",
                    "contact_email": "rahul.sharma@asus.com",
                    "contact_phone": "+91-22-6171-9000",
                    "industry": "Computer Hardware & Electronics",
                    "company_size": "1000-5000",
                    "address": {
                        "line1": "1st Floor, Tower B, Peninsula Business Park",
                        "line2": "Senapati Bapat Marg, Lower Parel",
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "pin_code": "400013",
                        "country": "India"
                    },
                    "created_by": "seed_asus_demo",
                })
            eid = enterprise.id
            print(f"   {enterprise.name} ({'created' if created else 'exists'})")

            # Wallet
            wallet, w_created = await get_or_create(db, EnterpriseWallet,
                filters={"enterprise_id": eid},
                defaults={
                    "id": uid(),
                    "balance": Decimal("275000.00"),
                    "currency": "INR",
                })
            if w_created:
                print("   Wallet: created (₹2,75,000)")

            # ═══════════════════════════════════════════════════════════════
            # 2. BRANCHES (3)
            # ═══════════════════════════════════════════════════════════════
            print("\n🏬 Branches...")

            branch_mum, _ = await get_or_create(db, Branch,
                filters={"enterprise_id": eid, "branch_code": "ASUS-MUM-HQ"},
                defaults={
                    "id": uid(),
                    "branch_name": "ASUS Mumbai HQ",
                    "address_line1": "Peninsula Business Park, Tower B",
                    "address_line2": "Lower Parel",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pin_code": "400013",
                    "status": BranchStatus.ACTIVE.value,
                    "site_contact_person": "Priya Nair",
                    "site_contact_phone": "+91-98201-45678",
                    "created_by": "seed_asus_demo",
                })
            print(f"   {branch_mum.branch_name}")

            branch_blr, _ = await get_or_create(db, Branch,
                filters={"enterprise_id": eid, "branch_code": "ASUS-BLR-RND"},
                defaults={
                    "id": uid(),
                    "branch_name": "ASUS Bangalore R&D Center",
                    "address_line1": "Block 4, Manyata Embassy Business Park",
                    "address_line2": "Hebbal, Outer Ring Road",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "pin_code": "560045",
                    "status": BranchStatus.ACTIVE.value,
                    "site_contact_person": "Arjun Reddy",
                    "site_contact_phone": "+91-99021-33456",
                    "created_by": "seed_asus_demo",
                })
            print(f"   {branch_blr.branch_name}")

            branch_del, _ = await get_or_create(db, Branch,
                filters={"enterprise_id": eid, "branch_code": "ASUS-DEL-NCR"},
                defaults={
                    "id": uid(),
                    "branch_name": "ASUS Delhi NCR Office",
                    "address_line1": "DLF Cyber City, Building 8",
                    "address_line2": "Phase 2, Sector 24",
                    "city": "Gurugram",
                    "state": "Haryana",
                    "pin_code": "122002",
                    "status": BranchStatus.ACTIVE.value,
                    "site_contact_person": "Meera Kapoor",
                    "site_contact_phone": "+91-98100-77890",
                    "created_by": "seed_asus_demo",
                })
            print(f"   {branch_del.branch_name}")

            # ═══════════════════════════════════════════════════════════════
            # 3. ASUS USERS (8)
            # ═══════════════════════════════════════════════════════════════
            print("\n👥 ASUS Users...")

            users_spec = [
                # Org Admin (short email for quick demo login)
                {
                    "email": "org@asus.com",
                    "name": "Rahul Sharma",
                    "role": UserRole.ORG_ADMIN.value,
                    "phone": "+91-98765-43211",
                    "enterprise_id": eid,
                    "branch_id": None,
                },
                # Org Admin (full name)
                {
                    "email": "rahul.sharma@asus.com",
                    "name": "Rahul Sharma",
                    "role": UserRole.ORG_ADMIN.value,
                    "phone": "+91-98765-43210",
                    "enterprise_id": eid,
                    "branch_id": None,
                },
                # IT Admin - Mumbai (short email for quick demo login)
                {
                    "email": "it@asus.com",
                    "name": "Priya Nair",
                    "role": UserRole.IT_ADMIN.value,
                    "phone": "+91-98201-45679",
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                },
                # IT Admin - Mumbai
                {
                    "email": "priya.nair@asus.com",
                    "name": "Priya Nair",
                    "role": UserRole.IT_ADMIN.value,
                    "phone": "+91-98201-45678",
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                },
                # IT Admin - Bangalore
                {
                    "email": "arjun.reddy@asus.com",
                    "name": "Arjun Reddy",
                    "role": UserRole.IT_ADMIN.value,
                    "phone": "+91-99021-33456",
                    "enterprise_id": eid,
                    "branch_id": branch_blr.id,
                },
                # Employees - Mumbai
                {
                    "email": "sneha.gupta@asus.com",
                    "name": "Sneha Gupta",
                    "role": UserRole.EMPLOYEE.value,
                    "phone": "+91-98765-11001",
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                    "employee_id": "ASUS-EMP-1001",
                    "department": "Product Engineering",
                    "designation": "Senior Hardware Engineer",
                },
                {
                    "email": "vikram.mehta@asus.com",
                    "name": "Vikram Mehta",
                    "role": UserRole.EMPLOYEE.value,
                    "phone": "+91-98765-11002",
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                    "employee_id": "ASUS-EMP-1002",
                    "department": "Marketing",
                    "designation": "Marketing Manager",
                },
                {
                    "email": "ananya.joshi@asus.com",
                    "name": "Ananya Joshi",
                    "role": UserRole.EMPLOYEE.value,
                    "phone": "+91-98765-11003",
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                    "employee_id": "ASUS-EMP-1003",
                    "department": "Finance",
                    "designation": "Financial Analyst",
                },
                # Employees - Bangalore
                {
                    "email": "karan.patel@asus.com",
                    "name": "Karan Patel",
                    "role": UserRole.EMPLOYEE.value,
                    "phone": "+91-98765-11004",
                    "enterprise_id": eid,
                    "branch_id": branch_blr.id,
                    "employee_id": "ASUS-EMP-2001",
                    "department": "R&D",
                    "designation": "Lead Software Developer",
                },
                {
                    "email": "deepa.krishnan@asus.com",
                    "name": "Deepa Krishnan",
                    "role": UserRole.EMPLOYEE.value,
                    "phone": "+91-98765-11005",
                    "enterprise_id": eid,
                    "branch_id": branch_blr.id,
                    "employee_id": "ASUS-EMP-2002",
                    "department": "Quality Assurance",
                    "designation": "QA Lead",
                },
            ]

            user_map = {}
            for spec in users_spec:
                email = spec["email"]
                user, created = await get_or_create(db, User,
                    filters={"email": email},
                    defaults={
                        "id": uid(),
                        "password_hash": password_hash,
                        "status": UserStatus.ACTIVE.value,
                        "created_by": "seed_asus_demo",
                        **spec,
                    })
                if not created:
                    user.password_hash = password_hash
                    user.status = UserStatus.ACTIVE.value
                user_map[email] = user
                print(f"   {spec['role']:18s} {email:35s} {'NEW' if created else 'exists'}")

            # Link IT admins to branches
            branch_mum.it_admin_id = user_map["priya.nair@asus.com"].id
            branch_blr.it_admin_id = user_map["arjun.reddy@asus.com"].id
            await db.flush()

            # Grab reference to existing platform users for reviews/pickups
            ops_result = await db.execute(
                select(User).where(User.role == UserRole.OPS_ADMIN.value).limit(1)
            )
            ops_admin = ops_result.scalar_one_or_none()

            logistics_admin_result = await db.execute(
                select(User).where(User.role == UserRole.LOGISTICS_ADMIN.value).limit(1)
            )
            logistics_admin = logistics_admin_result.scalar_one_or_none()

            logistics_user_result = await db.execute(
                select(User).where(User.role == UserRole.LOGISTICS_USER.value).limit(1)
            )
            logistics_user = logistics_user_result.scalar_one_or_none()

            if not ops_admin:
                print("\n   ⚠️  No OPS Admin found — creating one")
                ops_admin, _ = await get_or_create(db, User,
                    filters={"email": "opsadmin@ecotribe.io"},
                    defaults={
                        "id": uid(),
                        "name": "EcoTribe OPS Admin",
                        "role": UserRole.OPS_ADMIN.value,
                        "password_hash": password_hash,
                        "status": UserStatus.ACTIVE.value,
                        "created_by": "seed_asus_demo",
                    })

            if not logistics_admin:
                print("   ⚠️  No Logistics Admin found — creating one")
                logistics_admin, _ = await get_or_create(db, User,
                    filters={"email": "logistics@greenhaul.in"},
                    defaults={
                        "id": uid(),
                        "name": "Suresh Kumar",
                        "role": UserRole.LOGISTICS_ADMIN.value,
                        "phone": "+91-98333-44567",
                        "password_hash": password_hash,
                        "status": UserStatus.ACTIVE.value,
                        "company_name": "GreenHaul Logistics",
                        "contact_person": "Suresh Kumar",
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "service_areas": ["Mumbai", "Pune", "Bangalore", "Delhi NCR"],
                        "created_by": "seed_asus_demo",
                    })

            if not logistics_user:
                print("   ⚠️  No Logistics User found — creating one")
                logistics_user, _ = await get_or_create(db, User,
                    filters={"email": "driver@greenhaul.in"},
                    defaults={
                        "id": uid(),
                        "name": "Ravi Tiwari",
                        "role": UserRole.LOGISTICS_USER.value,
                        "phone": "+91-97777-88901",
                        "password_hash": password_hash,
                        "status": UserStatus.ACTIVE.value,
                        "parent_user_id": logistics_admin.id,
                        "vehicle_type": "Tempo",
                        "vehicle_number": "MH-04-EV-7721",
                        "created_by": "seed_asus_demo",
                    })

            await db.flush()

            # Shortcuts
            it_mum = user_map["priya.nair@asus.com"]
            it_blr = user_map["arjun.reddy@asus.com"]
            org_admin = user_map["rahul.sharma@asus.com"]
            emp_sneha = user_map["sneha.gupta@asus.com"]
            emp_vikram = user_map["vikram.mehta@asus.com"]
            emp_ananya = user_map["ananya.joshi@asus.com"]
            emp_karan = user_map["karan.patel@asus.com"]
            emp_deepa = user_map["deepa.krishnan@asus.com"]

            # ═══════════════════════════════════════════════════════════════
            # 4. ASSETS (20 — all ASUS products)
            # ═══════════════════════════════════════════════════════════════
            print("\n💻 ASUS Assets...")

            asset_data = [
                # ── Mumbai Branch ── (12 assets)
                # Group 1: Fresh / Early stage
                ("ASUS ZenBook 14 OLED", "ASUS", "G9NRCV02T231YA", "MUM-ZB-001", branch_mum, None,
                 AssetStatus.PENDING_ASSIGNMENT, "Laptop",
                 {"processor": "Intel Core i7-1360P", "ram": "16GB LPDDR5", "storage": "512GB NVMe SSD", "display": "14-inch 2.8K OLED"},
                 date_ago(800), None, None),

                ("ASUS VivoBook 15", "ASUS", "K1NR0X05R904AB", "MUM-VB-002", branch_mum, emp_sneha,
                 AssetStatus.ASSIGNED, "Laptop",
                 {"processor": "AMD Ryzen 5 7530U", "ram": "8GB DDR4", "storage": "512GB SSD", "display": "15.6-inch FHD"},
                 date_ago(730), days_ago(5), None),

                ("ASUS ExpertBook B5", "ASUS", "L3NRCV01M522BC", "MUM-EB-003", branch_mum, emp_vikram,
                 AssetStatus.CHECK_IN_STARTED, "Laptop",
                 {"processor": "Intel Core i7-1355U", "ram": "16GB LPDDR5", "storage": "512GB SSD", "display": "15.6-inch FHD"},
                 date_ago(900), days_ago(3), None),

                # Group 2: Submitted / Under Review
                ("ASUS ZenBook Pro 16X", "ASUS", "M2NRCV03P847CD", "MUM-ZBP-004", branch_mum, emp_sneha,
                 AssetStatus.SUBMITTED, "Laptop",
                 {"processor": "Intel Core i9-13905H", "ram": "32GB LPDDR5", "storage": "1TB NVMe SSD", "display": "16-inch 4K OLED Touch"},
                 date_ago(600), days_ago(10), None),

                ("ASUS ROG Strix G16", "ASUS", "H7NRCV04G193EF", "MUM-ROG-005", branch_mum, emp_vikram,
                 AssetStatus.REMOTE_REVIEW, "Laptop",
                 {"processor": "Intel Core i7-13650HX", "ram": "16GB DDR5", "storage": "1TB SSD", "display": "16-inch QHD+ 240Hz", "gpu": "NVIDIA RTX 4060"},
                 date_ago(550), days_ago(15), None),

                ("ASUS ProArt StudioBook 16", "ASUS", "J5NRCV05S621GH", "MUM-PA-006", branch_mum, emp_ananya,
                 AssetStatus.CONDITIONALLY_ACCEPTED, "Laptop",
                 {"processor": "Intel Core i9-13980HX", "ram": "64GB DDR5", "storage": "2TB NVMe SSD", "display": "16-inch 3.2K OLED", "gpu": "NVIDIA RTX 4070"},
                 date_ago(700), days_ago(20), "A"),

                # Group 3: Pickup flow
                ("ASUS ExpertBook B9", "ASUS", "N4NRCV06E930IJ", "MUM-EB9-007", branch_mum, emp_sneha,
                 AssetStatus.PICKUP_REQUESTED, "Laptop",
                 {"processor": "Intel Core i7-1365U", "ram": "16GB", "storage": "512GB SSD", "display": "14-inch FHD"},
                 date_ago(1000), days_ago(25), "B"),

                ("ASUS Chromebook Flip CX5", "ASUS", "P8NRCV07C412KL", "MUM-CB-008", branch_mum, emp_vikram,
                 AssetStatus.PICKUP_SCHEDULED, "Laptop",
                 {"processor": "Intel Core i5-1135G7", "ram": "8GB", "storage": "256GB SSD", "display": "14-inch FHD Touch"},
                 date_ago(850), days_ago(30), "B"),

                ("ASUS ZenBook Duo 14", "ASUS", "Q2NRCV08D567MN", "MUM-ZBD-009", branch_mum, emp_ananya,
                 AssetStatus.PICKED_UP, "Laptop",
                 {"processor": "Intel Core i7-1255U", "ram": "16GB", "storage": "512GB SSD", "display": "14-inch FHD + ScreenPad Plus"},
                 date_ago(950), days_ago(35), "B"),

                # Group 4: Facility & Completed
                ("ASUS ROG Zephyrus G14", "ASUS", "R6NRCV09Z789OP", "MUM-ROG2-010", branch_mum, emp_sneha,
                 AssetStatus.IN_TRANSIT, "Laptop",
                 {"processor": "AMD Ryzen 9 7940HS", "ram": "32GB DDR5", "storage": "1TB SSD", "display": "14-inch QHD+ 165Hz", "gpu": "NVIDIA RTX 4090"},
                 date_ago(500), days_ago(40), "A"),

                ("ASUS VivoBook Pro 15", "ASUS", "S1NRCV10V234QR", "MUM-VBP-011", branch_mum, None,
                 AssetStatus.FACILITY_QC, "Laptop",
                 {"processor": "Intel Core i7-12700H", "ram": "16GB DDR5", "storage": "512GB SSD", "display": "15.6-inch 2.8K OLED"},
                 date_ago(1100), days_ago(45), "A"),

                ("ASUS ExpertBook B1", "ASUS", "T9NRCV11E890ST", "MUM-EB1-012", branch_mum, None,
                 AssetStatus.COMPLETED, "Laptop",
                 {"processor": "Intel Core i5-1235U", "ram": "8GB DDR4", "storage": "256GB SSD", "display": "15.6-inch FHD"},
                 date_ago(1200), days_ago(60), "C"),

                # ── Bangalore Branch ── (8 assets)
                ("ASUS ROG Flow Z13", "ASUS", "U3NRCV12F345UV", "BLR-ROG3-013", branch_blr, emp_karan,
                 AssetStatus.ASSIGNED, "Tablet",
                 {"processor": "Intel Core i9-13900H", "ram": "16GB LPDDR5", "storage": "1TB SSD", "display": "13.4-inch QHD+ 165Hz Touch", "gpu": "NVIDIA RTX 4060"},
                 date_ago(400), days_ago(2), None),

                ("ASUS ProArt Display PA278QV", "ASUS", "V7NRCV13P678WX", "BLR-MON-014", branch_blr, emp_deepa,
                 AssetStatus.SUBMITTED, "Monitor",
                 {"display": "27-inch WQHD IPS", "resolution": "2560x1440", "color_accuracy": "100% sRGB, 100% Rec.709"},
                 date_ago(1050), days_ago(8), None),

                ("ASUS ZenBook S 13 OLED", "ASUS", "W5NRCV14Z901YZ", "BLR-ZBS-015", branch_blr, emp_karan,
                 AssetStatus.CONDITIONALLY_ACCEPTED, "Laptop",
                 {"processor": "AMD Ryzen 7 6800U", "ram": "16GB LPDDR5", "storage": "512GB SSD", "display": "13.3-inch 2.8K OLED"},
                 date_ago(800), days_ago(18), "A"),

                ("ASUS TUF Gaming F15", "ASUS", "X8NRCV15T234AB", "BLR-TUF-016", branch_blr, emp_deepa,
                 AssetStatus.REMOTE_REJECTED, "Laptop",
                 {"processor": "Intel Core i5-12500H", "ram": "8GB DDR5", "storage": "512GB SSD", "display": "15.6-inch FHD 144Hz", "gpu": "NVIDIA RTX 3050"},
                 date_ago(650), days_ago(12), None),

                ("ASUS ExpertCenter D7 Mini Tower", "ASUS", "Y2NRCV16D567CD", "BLR-DT-017", branch_blr, emp_karan,
                 AssetStatus.PICKUP_REQUESTED, "Desktop",
                 {"processor": "Intel Core i7-12700", "ram": "32GB DDR5", "storage": "1TB SSD + 2TB HDD"},
                 date_ago(900), days_ago(22), "B"),

                ("ASUS ProArt StudioBook Pro 16", "ASUS", "Z6NRCV17S890EF", "BLR-PAS-018", branch_blr, None,
                 AssetStatus.FINAL_ACCEPTED, "Laptop",
                 {"processor": "Intel Xeon W-11955M", "ram": "64GB ECC", "storage": "4TB NVMe RAID", "display": "16-inch 4K", "gpu": "NVIDIA RTX A5000"},
                 date_ago(1100), days_ago(50), "A"),

                ("ASUS VivoBook Go 15", "ASUS", "A4NRCV18V123GH", "BLR-VBG-019", branch_blr, None,
                 AssetStatus.PAYOUT_PENDING, "Laptop",
                 {"processor": "AMD Ryzen 5 7520U", "ram": "8GB", "storage": "256GB SSD", "display": "15.6-inch FHD"},
                 date_ago(1000), days_ago(55), "C"),

                ("ASUS Chromebook CX1", "ASUS", "B1NRCV19C456IJ", "BLR-CB2-020", branch_blr, None,
                 AssetStatus.COMPLETED, "Laptop",
                 {"processor": "Intel Celeron N4500", "ram": "4GB", "storage": "64GB eMMC", "display": "11.6-inch HD"},
                 date_ago(1300), days_ago(70), "D"),

                # ── Demo Walkthrough Batch (Mumbai) ── 5 assets: 4 completed, 1 pending_assignment
                ("ASUS ZenBook 14X OLED", "ASUS", "DW01-ZB14X-MUM", "DW-MUM-001", branch_mum, None,
                 AssetStatus.PENDING_ASSIGNMENT, "Laptop",
                 {"processor": "Intel Core Ultra 7 155H", "ram": "16GB LPDDR5X", "storage": "512GB NVMe SSD", "display": "14.5-inch 2.8K OLED 120Hz"},
                 date_ago(500), None, None),

                ("ASUS ExpertBook B5 Flip", "ASUS", "DW02-EB5F-MUM", "DW-MUM-002", branch_mum, None,
                 AssetStatus.COMPLETED, "Laptop",
                 {"processor": "Intel Core i7-1355U", "ram": "16GB DDR5", "storage": "512GB SSD", "display": "14-inch FHD Touch 360"},
                 date_ago(1100), days_ago(85), "A"),

                ("ASUS VivoBook S 14", "ASUS", "DW03-VBS14-MUM", "DW-MUM-003", branch_mum, None,
                 AssetStatus.COMPLETED, "Laptop",
                 {"processor": "AMD Ryzen 7 7735U", "ram": "16GB LPDDR5", "storage": "512GB SSD", "display": "14-inch 2.8K OLED"},
                 date_ago(950), days_ago(80), "B"),

                ("ASUS ProArt Display PA279CRV", "ASUS", "DW04-MON27-MUM", "DW-MUM-004", branch_mum, None,
                 AssetStatus.COMPLETED, "Monitor",
                 {"display": "27-inch 4K IPS", "resolution": "3840x2160", "color_accuracy": "99% DCI-P3, Delta E<2"},
                 date_ago(1200), days_ago(82), "A"),

                ("ASUS ROG Strix G15", "ASUS", "DW05-ROG15-MUM", "DW-MUM-005", branch_mum, None,
                 AssetStatus.COMPLETED, "Laptop",
                 {"processor": "AMD Ryzen 9 6900HX", "ram": "32GB DDR5", "storage": "1TB SSD", "display": "15.6-inch QHD 240Hz", "gpu": "NVIDIA RTX 3070 Ti"},
                 date_ago(1000), days_ago(78), "B"),
            ]

            assets = {}  # serial -> asset
            assets_created = 0

            for (model_name, brand, serial, tag, branch, assigned_user,
                 status, device_type, specs, purchase_dt, assigned_dt, grade) in asset_data:
                specs["device_type"] = device_type
                defaults = {
                    "id": uid(),
                    "enterprise_id": eid,
                    "branch_id": branch.id,
                    "brand": brand,
                    "model": model_name,
                    "asset_tag": tag,
                    "specs": specs,
                    "status": status.value,
                    "purchase_date": purchase_dt,
                    "created_by": "seed_asus_demo",
                }
                if assigned_user:
                    defaults["assigned_to_user_id"] = assigned_user.id
                    defaults["assigned_at"] = assigned_dt
                if grade:
                    defaults["grade"] = grade
                # Pricing based on grade
                if grade == "A":
                    defaults["base_price"] = Decimal("45000.00")
                    defaults["final_price"] = Decimal("42000.00")
                elif grade == "B":
                    defaults["base_price"] = Decimal("30000.00")
                    defaults["final_price"] = Decimal("27500.00")
                elif grade == "C":
                    defaults["base_price"] = Decimal("15000.00")
                    defaults["final_price"] = Decimal("12000.00")
                elif grade == "D":
                    defaults["base_price"] = Decimal("5000.00")
                    defaults["final_price"] = Decimal("3500.00")

                asset, created = await get_or_create(db, Asset,
                    filters={"enterprise_id": eid, "serial_number": serial},
                    defaults=defaults)
                assets[serial] = asset
                if created:
                    assets_created += 1

            print(f"   {assets_created} new assets created ({len(asset_data) - assets_created} existed)")
            await db.flush()

            # ═══════════════════════════════════════════════════════════════
            # 5. BATCHES (3)
            # ═══════════════════════════════════════════════════════════════
            print("\n📋 Batches...")

            # Batch 1: Draft (Mumbai) — has early-stage assets
            batch_draft, b1c = await get_or_create(db, Batch,
                filters={"name": "ASUS Mumbai Q1 2026 Refresh", "enterprise_id": eid},
                defaults={
                    "id": uid(),
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                    "description": "Q1 2026 device refresh — Mumbai office laptops due for replacement",
                    "status": BatchStatus.DRAFT.value,
                    "asset_count": 3,
                    "pending_count": 3,
                    "created_by": it_mum.id,
                })
            if b1c:
                # Assign some assets to this batch
                for serial in ["G9NRCV02T231YA", "K1NR0X05R904AB", "L3NRCV01M522BC"]:
                    if serial in assets:
                        assets[serial].batch_id = batch_draft.id
            print(f"   {batch_draft.name} (draft)")

            # Batch 2: Approved (Mumbai) — has mid/late-stage assets
            batch_approved, b2c = await get_or_create(db, Batch,
                filters={"name": "ASUS Mumbai FY25 EOL Batch", "enterprise_id": eid},
                defaults={
                    "id": uid(),
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                    "description": "End-of-life assets from FY2024-25 — approved for pickup and recycling",
                    "status": BatchStatus.APPROVED.value,
                    "asset_count": 6,
                    "pending_count": 6,
                    "estimated_value": Decimal("175000.00"),
                    "requires_approval": True,
                    "submitted_for_approval_at": days_ago(15),
                    "approved_by": org_admin.id,
                    "approved_at": days_ago(14),
                    "preferred_pickup_date": date_ago(-3),  # 3 days in future
                    "preferred_pickup_slot": "morning",
                    "created_by": it_mum.id,
                })
            if b2c:
                for serial in ["J5NRCV05S621GH", "N4NRCV06E930IJ", "P8NRCV07C412KL",
                                "Q2NRCV08D567MN", "R6NRCV09Z789OP", "S1NRCV10V234QR"]:
                    if serial in assets:
                        assets[serial].batch_id = batch_approved.id
            print(f"   {batch_approved.name} (approved)")

            # Batch 3: Completed (Bangalore)
            batch_completed, b3c = await get_or_create(db, Batch,
                filters={"name": "ASUS Bangalore FY24 Disposal", "enterprise_id": eid},
                defaults={
                    "id": uid(),
                    "enterprise_id": eid,
                    "branch_id": branch_blr.id,
                    "description": "FY2023-24 end-of-life devices from Bangalore R&D — fully processed",
                    "status": BatchStatus.COMPLETED.value,
                    "asset_count": 4,
                    "accepted_count": 3,
                    "rejected_count": 1,
                    "pending_count": 0,
                    "estimated_value": Decimal("85000.00"),
                    "total_payout": Decimal("57500.00"),
                    "requires_approval": True,
                    "submitted_for_approval_at": days_ago(65),
                    "approved_by": org_admin.id,
                    "approved_at": days_ago(63),
                    "created_by": it_blr.id,
                })
            if b3c:
                for serial in ["Z6NRCV17S890EF", "A4NRCV18V123GH", "B1NRCV19C456IJ", "X8NRCV15T234AB"]:
                    if serial in assets:
                        assets[serial].batch_id = batch_completed.id
            print(f"   {batch_completed.name} (completed)")

            # Batch 4: Demo Walkthrough (Mumbai) — 4 completed + 1 pending_assignment
            batch_walkthrough, b4c = await get_or_create(db, Batch,
                filters={"name": "ASUS Mumbai - Live Demo Walkthrough", "enterprise_id": eid},
                defaults={
                    "id": uid(),
                    "enterprise_id": eid,
                    "branch_id": branch_mum.id,
                    "description": "Live demo batch — 4 assets fully processed, 1 asset pending assignment for walkthrough",
                    "status": BatchStatus.APPROVED.value,
                    "asset_count": 5,
                    "accepted_count": 4,
                    "rejected_count": 0,
                    "pending_count": 1,
                    "estimated_value": Decimal("142000.00"),
                    "total_payout": Decimal("128000.00"),
                    "requires_approval": True,
                    "submitted_for_approval_at": days_ago(90),
                    "approved_by": org_admin.id,
                    "approved_at": days_ago(88),
                    "preferred_pickup_date": date_ago(-5),
                    "preferred_pickup_slot": "morning",
                    "created_by": it_mum.id,
                })
            if b4c:
                for serial in ["DW01-ZB14X-MUM", "DW02-EB5F-MUM", "DW03-VBS14-MUM",
                                "DW04-MON27-MUM", "DW05-ROG15-MUM"]:
                    if serial in assets:
                        assets[serial].batch_id = batch_walkthrough.id
            print(f"   {batch_walkthrough.name} (approved - demo walkthrough)")

            await db.flush()

            # ═══════════════════════════════════════════════════════════════
            # 6. SUBMISSIONS (for assets past 'submitted' stage)
            # ═══════════════════════════════════════════════════════════════
            print("\n📝 Submissions...")

            submission_serials = [
                # Mumbai: submitted, remote_review, conditionally_accepted, pickup stages, facility, completed
                ("M2NRCV03P847CD", emp_sneha, days_ago(9)),
                ("H7NRCV04G193EF", emp_vikram, days_ago(14)),
                ("J5NRCV05S621GH", emp_ananya, days_ago(19)),
                ("N4NRCV06E930IJ", emp_sneha, days_ago(24)),
                ("P8NRCV07C412KL", emp_vikram, days_ago(29)),
                ("Q2NRCV08D567MN", emp_ananya, days_ago(34)),
                ("R6NRCV09Z789OP", emp_sneha, days_ago(39)),
                ("S1NRCV10V234QR", emp_vikram, days_ago(44)),
                ("T9NRCV11E890ST", emp_ananya, days_ago(59)),
                # Bangalore
                ("V7NRCV13P678WX", emp_deepa, days_ago(7)),
                ("W5NRCV14Z901YZ", emp_karan, days_ago(17)),
                ("X8NRCV15T234AB", emp_deepa, days_ago(11)),
                ("Y2NRCV16D567CD", emp_karan, days_ago(21)),
                ("Z6NRCV17S890EF", emp_karan, days_ago(49)),
                ("A4NRCV18V123GH", emp_deepa, days_ago(54)),
                ("B1NRCV19C456IJ", emp_deepa, days_ago(69)),
                # Demo Walkthrough batch (4 completed assets)
                ("DW02-EB5F-MUM", emp_sneha, days_ago(84)),
                ("DW03-VBS14-MUM", emp_vikram, days_ago(79)),
                ("DW04-MON27-MUM", emp_ananya, days_ago(81)),
                ("DW05-ROG15-MUM", emp_sneha, days_ago(77)),
            ]

            subs_created = 0
            for serial, user, submitted_at in submission_serials:
                asset = assets.get(serial)
                if not asset:
                    continue
                sub, created = await get_or_create(db, Submission,
                    filters={"asset_id": asset.id},
                    defaults={
                        "id": uid(),
                        "user_id": user.id,
                        "device_confirmed": True,
                        "photos": {
                            "front": f"https://storage.ecotribe.co/submissions/{asset.id}/front.jpg",
                            "back": f"https://storage.ecotribe.co/submissions/{asset.id}/back.jpg",
                            "screen": f"https://storage.ecotribe.co/submissions/{asset.id}/screen.jpg",
                            "serial": f"https://storage.ecotribe.co/submissions/{asset.id}/serial.jpg",
                        },
                        "functional_checks": {
                            "powers_on": True,
                            "screen_works": True,
                            "keyboard_works": True,
                            "trackpad_works": True,
                            "ports_work": True,
                            "wifi_works": True,
                            "battery_holds_charge": True,
                            "speakers_work": True,
                        },
                        "cosmetic_checklist": {
                            "screen_scratches": "none",
                            "body_dents": "minor",
                            "keyboard_wear": "normal",
                            "hinge_condition": "good",
                        },
                        "accessories": {
                            "charger": True,
                            "box": False,
                            "mouse": False,
                            "bag": True,
                        },
                        "declaration": {
                            "data_backed_up": True,
                            "factory_reset": True,
                            "ownership_confirmed": True,
                            "signature": f"e-signed by {user.name}",
                        },
                        "submitted_at": submitted_at,
                    })
                if created:
                    subs_created += 1
            print(f"   {subs_created} submissions created")
            await db.flush()

            # ═══════════════════════════════════════════════════════════════
            # 7. REMOTE REVIEWS (for assets past remote_review stage)
            # ═══════════════════════════════════════════════════════════════
            print("\n🔍 Remote Reviews...")

            review_data = [
                # (serial, decision, grade, value, notes, reviewed_ago)
                ("J5NRCV05S621GH", "conditionally_accepted", "A", Decimal("42000"), "Excellent condition ProArt. Minimal wear.", 18),
                ("N4NRCV06E930IJ", "conditionally_accepted", "B", Decimal("27500"), "Good condition. Minor keyboard wear.", 23),
                ("P8NRCV07C412KL", "conditionally_accepted", "B", Decimal("15000"), "Chromebook in decent shape. Battery 78%.", 28),
                ("Q2NRCV08D567MN", "conditionally_accepted", "B", Decimal("27500"), "ZenBook Duo — both screens functional.", 33),
                ("R6NRCV09Z789OP", "conditionally_accepted", "A", Decimal("55000"), "ROG Zephyrus — premium condition, RTX 4090.", 38),
                ("S1NRCV10V234QR", "conditionally_accepted", "A", Decimal("35000"), "VivoBook Pro OLED — display excellent.", 43),
                ("T9NRCV11E890ST", "conditionally_accepted", "C", Decimal("12000"), "ExpertBook B1 — functional but aged.", 58),
                ("W5NRCV14Z901YZ", "conditionally_accepted", "A", Decimal("38000"), "ZenBook S 13 — almost new condition.", 16),
                ("X8NRCV15T234AB", "rejected", None, None, "TUF Gaming — cracked hinge, keyboard damage. Not economical to refurbish.", 10),
                ("Y2NRCV16D567CD", "conditionally_accepted", "B", Decimal("25000"), "ExpertCenter desktop — works well.", 20),
                ("Z6NRCV17S890EF", "conditionally_accepted", "A", Decimal("85000"), "ProArt StudioBook — professional grade, excellent.", 48),
                ("A4NRCV18V123GH", "conditionally_accepted", "C", Decimal("10000"), "VivoBook Go — budget model, functional.", 53),
                ("B1NRCV19C456IJ", "conditionally_accepted", "D", Decimal("3500"), "Chromebook CX1 — end of useful life.", 68),
                # Demo Walkthrough batch
                ("DW02-EB5F-MUM", "conditionally_accepted", "A", Decimal("40000"), "ExpertBook B5 Flip — excellent, 360 hinge smooth.", 82),
                ("DW03-VBS14-MUM", "conditionally_accepted", "B", Decimal("28000"), "VivoBook S 14 — good condition, OLED pristine.", 76),
                ("DW04-MON27-MUM", "conditionally_accepted", "A", Decimal("35000"), "ProArt Display 27 — color accuracy verified, panel perfect.", 78),
                ("DW05-ROG15-MUM", "conditionally_accepted", "B", Decimal("25000"), "ROG Strix G15 — gaming laptop, minor keyboard wear.", 74),
            ]

            reviews_created = 0
            for serial, decision, grade, value, notes, reviewed_ago in review_data:
                asset = assets.get(serial)
                if not asset:
                    continue

                # Get submission for this asset
                sub_result = await db.execute(
                    select(Submission).where(Submission.asset_id == asset.id)
                )
                submission = sub_result.scalar_one_or_none()

                defaults = {
                    "id": uid(),
                    "submission_id": submission.id if submission else None,
                    "reviewer_id": ops_admin.id if ops_admin else None,
                    "decision": decision,
                    "notes": notes,
                    "reviewed_at": days_ago(reviewed_ago),
                    "checklist_results": {
                        "photo_quality": "acceptable",
                        "serial_verified": True,
                        "functional_checks_consistent": True,
                        "cosmetic_assessment": grade or "N/A",
                    },
                }
                if grade:
                    defaults["grade"] = grade
                if value:
                    defaults["estimated_value"] = value
                if decision == "rejected":
                    defaults["rejection_reason"] = notes

                review, created = await get_or_create(db, RemoteReview,
                    filters={"asset_id": asset.id},
                    defaults=defaults)
                if created:
                    reviews_created += 1

            print(f"   {reviews_created} remote reviews created")
            await db.flush()

            # ═══════════════════════════════════════════════════════════════
            # 8. FACILITY QC (for final_accepted, payout_pending, completed)
            # ═══════════════════════════════════════════════════════════════
            print("\n🏭 Facility QC Reviews...")

            facility_data = [
                ("Z6NRCV17S890EF", "accepted", "A", Decimal("82000"), 42),
                ("A4NRCV18V123GH", "accepted", "C", Decimal("9500"), 47),
                ("B1NRCV19C456IJ", "accepted", "D", Decimal("3000"), 62),
                ("T9NRCV11E890ST", "accepted", "C", Decimal("11000"), 52),
                # Demo Walkthrough batch
                ("DW02-EB5F-MUM", "accepted", "A", Decimal("38000"), 72),
                ("DW03-VBS14-MUM", "accepted", "B", Decimal("26000"), 70),
                ("DW04-MON27-MUM", "accepted", "A", Decimal("33000"), 71),
                ("DW05-ROG15-MUM", "accepted", "B", Decimal("23500"), 68),
            ]

            fqc_created = 0
            for serial, decision, grade, value, qc_ago in facility_data:
                asset = assets.get(serial)
                if not asset:
                    continue

                fqc, created = await get_or_create(db, FacilityQC,
                    filters={"asset_id": asset.id},
                    defaults={
                        "id": uid(),
                        "reviewer_id": ops_admin.id if ops_admin else None,
                        "decision": decision,
                        "grade": grade,
                        "final_value": value,
                        "functional_tests": {
                            "boot_test": "pass",
                            "stress_test": "pass",
                            "battery_health": "72%" if grade in ("C", "D") else "89%",
                            "display_test": "pass",
                            "io_ports": "pass",
                        },
                        "cosmetic_assessment": {
                            "overall": grade,
                            "screen": "good" if grade in ("A", "B") else "fair",
                            "chassis": "good" if grade == "A" else "fair",
                            "keyboard": "good" if grade in ("A", "B") else "worn",
                        },
                        "photos": {
                            "front": f"https://storage.ecotribe.co/facility-qc/{asset.id}/front.jpg",
                            "back": f"https://storage.ecotribe.co/facility-qc/{asset.id}/back.jpg",
                        },
                        "qc_completed_at": days_ago(qc_ago),
                    })
                if created:
                    fqc_created += 1
            print(f"   {fqc_created} facility QC reviews created")
            await db.flush()

            # ═══════════════════════════════════════════════════════════════
            # 9. PICKUP LOCATIONS & REQUESTS
            # ═══════════════════════════════════════════════════════════════
            print("\n🚚 Pickup Locations & Requests...")

            # Pickup Location - Mumbai
            loc_mum, _ = await get_or_create(db, PickupLocation,
                filters={"enterprise_id": eid, "name": "ASUS Mumbai HQ - Loading Bay"},
                defaults={
                    "id": uid(),
                    "address": "Peninsula Business Park, Tower B, Ground Floor Loading Bay, Lower Parel",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pin_code": "400013",
                    "is_default": True,
                    "is_active": True,
                })

            # Pickup Location - Bangalore
            loc_blr, _ = await get_or_create(db, PickupLocation,
                filters={"enterprise_id": eid, "name": "ASUS Bangalore R&D - Dock"},
                defaults={
                    "id": uid(),
                    "address": "Manyata Embassy Business Park, Block 4, Rear Dock, Hebbal",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "pin_code": "560045",
                    "is_default": False,
                    "is_active": True,
                })

            # Pickup Request 1: Mumbai — active (for assets in pickup flow)
            mum_pickup_assets = [assets[s] for s in ["N4NRCV06E930IJ", "P8NRCV07C412KL", "Q2NRCV08D567MN"]
                                  if s in assets]
            if mum_pickup_assets:
                pr1, pr1c = await get_or_create(db, PickupRequest,
                    filters={"batch_id": batch_approved.id, "location_id": loc_mum.id},
                    defaults={
                        "id": f"pr-{uid()}",
                        "enterprise_id": eid,
                        "asset_ids": [a.id for a in mum_pickup_assets],
                        "assets": [{"id": a.id, "model": a.model, "serial_number": a.serial_number, "grade": a.grade or "B"} for a in mum_pickup_assets],
                        "preferred_date": date_ago(-2),  # 2 days from now
                        "preferred_time_slot": "morning",
                        "status": "assigned_to_logistics_user",
                        "logistics_admin_id": logistics_admin.id if logistics_admin else None,
                        "logistics_user_id": logistics_user.id if logistics_user else None,
                        "assigned_by_id": ops_admin.id if ops_admin else None,
                        "scheduled_date": days_ago(-2),
                    })
                if pr1c:
                    print(f"   Mumbai pickup request created (3 assets)")

            # Pickup Request 2: Bangalore — completed
            blr_pickup_assets = [assets[s] for s in ["Z6NRCV17S890EF", "A4NRCV18V123GH", "B1NRCV19C456IJ"]
                                  if s in assets]
            if blr_pickup_assets:
                pr2, pr2c = await get_or_create(db, PickupRequest,
                    filters={"batch_id": batch_completed.id, "location_id": loc_blr.id},
                    defaults={
                        "id": f"pr-{uid()}",
                        "enterprise_id": eid,
                        "asset_ids": [a.id for a in blr_pickup_assets],
                        "assets": [{"id": a.id, "model": a.model, "serial_number": a.serial_number, "grade": a.grade or "C"} for a in blr_pickup_assets],
                        "preferred_date": date_ago(55),
                        "preferred_time_slot": "afternoon",
                        "status": "completed",
                        "logistics_admin_id": logistics_admin.id if logistics_admin else None,
                        "logistics_user_id": logistics_user.id if logistics_user else None,
                        "assigned_by_id": ops_admin.id if ops_admin else None,
                        "scheduled_date": days_ago(53),
                        "picked_asset_ids": [a.id for a in blr_pickup_assets],
                        "proof_of_pickup": {
                            "photos": [f"https://storage.ecotribe.co/pickups/blr-batch/{a.id}.jpg" for a in blr_pickup_assets],
                            "signature": "e-signed by Ravi Tiwari",
                            "timestamp": days_ago(52).isoformat(),
                        },
                    })
                if pr2c:
                    print(f"   Bangalore pickup request created (3 assets, completed)")

            # Pickup Request 3: Demo Walkthrough — completed (4 done assets)
            dw_pickup_assets = [assets[s] for s in ["DW02-EB5F-MUM", "DW03-VBS14-MUM",
                                                     "DW04-MON27-MUM", "DW05-ROG15-MUM"]
                                 if s in assets]
            if dw_pickup_assets:
                pr3, pr3c = await get_or_create(db, PickupRequest,
                    filters={"batch_id": batch_walkthrough.id, "location_id": loc_mum.id},
                    defaults={
                        "id": f"pr-{uid()}",
                        "enterprise_id": eid,
                        "asset_ids": [a.id for a in dw_pickup_assets],
                        "assets": [{"id": a.id, "model": a.model, "serial_number": a.serial_number, "grade": a.grade or "B"} for a in dw_pickup_assets],
                        "preferred_date": date_ago(70),
                        "preferred_time_slot": "morning",
                        "status": "completed",
                        "logistics_admin_id": logistics_admin.id if logistics_admin else None,
                        "logistics_user_id": logistics_user.id if logistics_user else None,
                        "assigned_by_id": ops_admin.id if ops_admin else None,
                        "scheduled_date": days_ago(68),
                        "picked_asset_ids": [a.id for a in dw_pickup_assets],
                        "proof_of_pickup": {
                            "photos": [f"https://storage.ecotribe.co/pickups/dw-batch/{a.id}.jpg" for a in dw_pickup_assets],
                            "signature": "e-signed by Ravi Tiwari",
                            "timestamp": days_ago(67).isoformat(),
                        },
                    })
                if pr3c:
                    print(f"   Demo Walkthrough pickup created (4 assets, completed)")

            await db.flush()

            # ═══════════════════════════════════════════════════════════════
            # 10. PAYOUT (for completed batch)
            # ═══════════════════════════════════════════════════════════════
            print("\n💰 Payouts...")

            payout, p_created = await get_or_create(db, Payout,
                filters={"batch_id": batch_completed.id, "enterprise_id": eid},
                defaults={
                    "id": uid(),
                    "amount": Decimal("57500.00"),
                    "status": "completed",
                    "method": "bank_transfer",
                    "transaction_reference": f"ECO-PAY-ASUS-{batch_completed.id[:8].upper()}",
                    "bank_account_number": "XXXX-XXXX-4521",
                    "bank_ifsc_code": "ICIC0001234",
                    "created_by": "system",
                })
            if p_created:
                print(f"   Payout ₹57,500 (completed, bank transfer)")

            # Payout for walkthrough batch (4 completed assets)
            payout2, p2_created = await get_or_create(db, Payout,
                filters={"batch_id": batch_walkthrough.id, "enterprise_id": eid},
                defaults={
                    "id": uid(),
                    "amount": Decimal("120500.00"),
                    "status": "completed",
                    "method": "bank_transfer",
                    "transaction_reference": f"ECO-PAY-ASUS-DW-{batch_walkthrough.id[:8].upper()}",
                    "bank_account_number": "XXXX-XXXX-4521",
                    "bank_ifsc_code": "ICIC0001234",
                    "created_by": "system",
                })
            if p2_created:
                print(f"   Payout ₹1,20,500 (walkthrough batch, completed)")

            # ═══════════════════════════════════════════════════════════════
            # COMMIT
            # ═══════════════════════════════════════════════════════════════
            await db.commit()
            print("\n" + "=" * 72)
            print("  ✅ ASUS DEMO DATA SEEDED SUCCESSFULLY")
            print("=" * 72)

            print(f"\n  Enterprise: ASUS India Technology Pvt Ltd")
            print(f"  Password:   {ASUS_PASSWORD}")
            print(f"  Assets:     25 (across all lifecycle stages)")
            print(f"  Batches:    4 (draft, approved, completed, demo-walkthrough)")
            print(f"\n  {'Role':<18s} {'Email':<35s} {'Branch':<20s}")
            print("  " + "-" * 70)
            for spec in users_spec:
                branch_name = "—"
                if spec.get("branch_id") == branch_mum.id:
                    branch_name = "Mumbai HQ"
                elif spec.get("branch_id") == branch_blr.id:
                    branch_name = "Bangalore R&D"
                print(f"  {spec['role']:<18s} {spec['email']:<35s} {branch_name:<20s}")

            print("\n  Asset Lifecycle Coverage:")
            print("  " + "-" * 50)
            stages = {}
            for serial, asset in assets.items():
                s = asset.status
                stages[s] = stages.get(s, 0) + 1
            for status, count in sorted(stages.items()):
                print(f"    {status:<30s} {count} asset(s)")

            print("\n  " + "=" * 72)
            print()

        except Exception as e:
            await db.rollback()
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(seed())
