"""Comprehensive seed data for testing all scenarios"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import Enterprise, EnterpriseStatus, Branch
from app.models.asset import Asset, AssetStatus
from app.models.batch import Batch, BatchStatus
from app.models.submission import Submission
from app.models.review import RemoteReview, ReviewDecision
from app.models.logistics import PickupRequest, PickupStatus
from app.models.financial import Payout, PayoutStatus, PayoutMethod
import uuid


async def clear_existing_data():
    """Clear existing data (for development only)"""
    async with AsyncSessionLocal() as db:
        try:
            # Delete in reverse order of dependencies
            await db.execute(text("DELETE FROM payouts"))
            await db.execute(text("DELETE FROM pickup_requests"))
            await db.execute(text("DELETE FROM remote_reviews"))
            await db.execute(text("DELETE FROM submissions"))
            await db.execute(text("DELETE FROM batches"))
            await db.execute(text("DELETE FROM assets"))
            await db.execute(text("DELETE FROM users"))
            await db.execute(text("DELETE FROM branches"))
            await db.execute(text("DELETE FROM enterprises"))
            await db.commit()
            print("✅ Existing data cleared")
        except Exception as e:
            await db.rollback()
            print(f"❌ Error clearing data: {e}")
            raise


async def create_users_and_enterprises():
    """Create all user roles and enterprise structure"""
    async with AsyncSessionLocal() as db:
        try:
            # ==================== Platform Roles ====================

            super_admin = User(
                id=str(uuid.uuid4()),
                email="superadmin@ecotribe.io",
                name="Super Admin",
                role=UserRole.SUPER_ADMIN,
                status=UserStatus.ACTIVE,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(super_admin)

            ops_admin = User(
                id=str(uuid.uuid4()),
                email="admin@ecotribe.io",
                name="OPS Admin",
                role=UserRole.OPS_ADMIN,
                status=UserStatus.ACTIVE,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(ops_admin)

            technician = User(
                id=str(uuid.uuid4()),
                email="tech@ecotribe.io",
                name="Tech Reviewer",
                role=UserRole.TECHNICIAN,
                status=UserStatus.ACTIVE,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(technician)

            # ==================== Logistics ====================

            logistics_admin = User(
                id=str(uuid.uuid4()),
                email="logistics-admin@ecotribe.io",
                name="Logistics Admin",
                role=UserRole.LOGISTICS_ADMIN,
                status=UserStatus.ACTIVE,
                company_name="FastShip Logistics",
                contact_person="Logistics Manager",
                city="Mumbai",
                state="Maharashtra",
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(logistics_admin)
            await db.flush()

            logistics_user = User(
                id=str(uuid.uuid4()),
                email="logistics-user@ecotribe.io",
                name="Logistics Driver",
                role=UserRole.LOGISTICS_USER,
                status=UserStatus.ACTIVE,
                parent_user_id=logistics_admin.id,
                vehicle_type="Van",
                vehicle_number="MH-01-AB-1234",
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(logistics_user)

            # ==================== Enterprise 1: TechCorp ====================

            enterprise1 = Enterprise(
                id=str(uuid.uuid4()),
                name="TechCorp India",
                legal_name="TechCorp India Private Limited",
                gst_number="29ABCDE1234F1Z5",
                status=EnterpriseStatus.ACTIVE,
                contact_person="John Doe",
                contact_email="contact@techcorp.com",
                contact_phone="+91-9876543210",
                created_by="system",
            )
            db.add(enterprise1)
            await db.flush()

            # Branch 1: Mumbai HQ
            branch1 = Branch(
                id=str(uuid.uuid4()),
                enterprise_id=enterprise1.id,
                branch_name="Mumbai HQ",
                branch_code="MUM-HQ",
                address_line1="123 Business Park",
                city="Mumbai",
                state="Maharashtra",
                pin_code="400001",
                status="active",
                created_by="system",
            )
            db.add(branch1)

            # Branch 2: Bangalore Office
            branch2 = Branch(
                id=str(uuid.uuid4()),
                enterprise_id=enterprise1.id,
                branch_name="Bangalore Office",
                branch_code="BLR-OFF",
                address_line1="456 Tech Park",
                city="Bangalore",
                state="Karnataka",
                pin_code="560001",
                status="active",
                created_by="system",
            )
            db.add(branch2)
            await db.flush()

            # Org Admin for TechCorp
            org_admin1 = User(
                id=str(uuid.uuid4()),
                email="orgadmin@techcorp.com",
                name="Org Admin",
                role=UserRole.ORG_ADMIN,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise1.id,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(org_admin1)

            # IT Admin for Mumbai branch
            it_admin1 = User(
                id=str(uuid.uuid4()),
                email="it@techcorp.com",
                name="IT Admin Mumbai",
                role=UserRole.IT_ADMIN,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise1.id,
                branch_id=branch1.id,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(it_admin1)

            # IT Admin for Bangalore branch
            it_admin2 = User(
                id=str(uuid.uuid4()),
                email="it-blr@techcorp.com",
                name="IT Admin Bangalore",
                role=UserRole.IT_ADMIN,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise1.id,
                branch_id=branch2.id,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(it_admin2)

            # Employees for Mumbai branch
            employee1 = User(
                id=str(uuid.uuid4()),
                email="employee@techcorp.com",
                name="John Employee",
                role=UserRole.EMPLOYEE,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise1.id,
                branch_id=branch1.id,
                employee_id="EMP001",
                department="Engineering",
                designation="Software Engineer",
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(employee1)

            employee2 = User(
                id=str(uuid.uuid4()),
                email="employee2@techcorp.com",
                name="Jane Smith",
                role=UserRole.EMPLOYEE,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise1.id,
                branch_id=branch1.id,
                employee_id="EMP002",
                department="Marketing",
                designation="Marketing Manager",
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(employee2)

            await db.commit()

            return {
                "super_admin": super_admin,
                "ops_admin": ops_admin,
                "technician": technician,
                "logistics_admin": logistics_admin,
                "logistics_user": logistics_user,
                "enterprise1": enterprise1,
                "branch1": branch1,
                "branch2": branch2,
                "org_admin1": org_admin1,
                "it_admin1": it_admin1,
                "it_admin2": it_admin2,
                "employee1": employee1,
                "employee2": employee2,
            }

        except Exception as e:
            await db.rollback()
            print(f"❌ Error creating users and enterprises: {e}")
            raise


async def create_assets_and_batches(context: dict):
    """Create assets in various states and batches"""
    async with AsyncSessionLocal() as db:
        try:
            assets = []

            # Device types and brands
            device_types = ["Laptop", "Desktop", "Monitor", "Tablet", "Phone"]
            brands = {
                "Laptop": ["Dell", "HP", "Lenovo", "Apple"],
                "Desktop": ["Dell", "HP", "Lenovo"],
                "Monitor": ["Dell", "LG", "Samsung"],
                "Tablet": ["Apple", "Samsung"],
                "Phone": ["Apple", "Samsung", "OnePlus"],
            }

            # Create 20 assets in various states
            for i in range(20):
                device_type = random.choice(device_types)
                brand = random.choice(brands[device_type])

                # Distribute assets across different statuses
                if i < 5:
                    status = AssetStatus.PENDING_ASSIGNMENT
                elif i < 10:
                    status = AssetStatus.ASSIGNED
                elif i < 12:
                    status = AssetStatus.SUBMITTED
                elif i < 14:
                    status = AssetStatus.REMOTE_REVIEW
                elif i < 16:
                    status = AssetStatus.CONDITIONALLY_ACCEPTED
                elif i < 18:
                    status = AssetStatus.PICKUP_REQUESTED
                else:
                    status = AssetStatus.COMPLETED

                # Assign to branch
                branch_id = context["branch1"].id if i % 2 == 0 else context["branch2"].id
                assigned_to = context["employee1"].id if i % 2 == 0 else context["employee2"].id

                asset = Asset(
                    id=str(uuid.uuid4()),
                    enterprise_id=context["enterprise1"].id,
                    branch_id=branch_id,
                    brand=brand,
                    model=f"{brand} Model {i+1}",
                    serial_number=f"SN{1000+i}",
                    asset_tag=f"ASSET-{1000+i}",
                    specs={
                        "device_type": device_type,
                        "processor": (
                            "Intel Core i5" if device_type == "Laptop" else "Intel Core i7"
                        ),
                        "ram": "16GB",
                        "storage": "512GB SSD",
                    },
                    status=status.value,
                    assigned_to_user_id=(
                        assigned_to if status != AssetStatus.PENDING_ASSIGNMENT else None
                    ),
                    created_by=context["it_admin1"].id if i % 2 == 0 else context["it_admin2"].id,
                )
                db.add(asset)
                assets.append(asset)

            await db.flush()

            # Create batches
            batches = []

            # Batch 1: Draft batch with 3 assets
            batch1 = Batch(
                id=str(uuid.uuid4()),
                enterprise_id=context["enterprise1"].id,
                branch_id=context["branch1"].id,
                name="Batch Q1 2024",
                description="Q1 2024 device retirement batch",
                status=BatchStatus.DRAFT.value,
                asset_count=0,
                created_by=context["it_admin1"].id,
            )
            db.add(batch1)
            batches.append(batch1)

            # Batch 2: Pending approval
            batch2 = Batch(
                id=str(uuid.uuid4()),
                enterprise_id=context["enterprise1"].id,
                branch_id=context["branch1"].id,
                name="Batch Q2 2024",
                description="Q2 2024 device retirement batch",
                status=BatchStatus.PENDING_APPROVAL.value,
                asset_count=0,
                pickup_location_override="Mumbai HQ, 123 Business Park",
                preferred_pickup_date=(datetime.now() + timedelta(days=7)).date(),
                preferred_pickup_slot="morning",
                requires_approval=True,
                submitted_for_approval_at=datetime.now() - timedelta(hours=2),
                created_by=context["it_admin1"].id,
            )
            db.add(batch2)
            batches.append(batch2)

            # Batch 3: Approved
            batch3 = Batch(
                id=str(uuid.uuid4()),
                enterprise_id=context["enterprise1"].id,
                branch_id=context["branch2"].id,
                name="Batch Q3 2024",
                description="Q3 2024 device retirement batch",
                status=BatchStatus.APPROVED.value,
                asset_count=0,
                pickup_location_override="Bangalore Office, 456 Tech Park",
                preferred_pickup_date=(datetime.now() + timedelta(days=14)).date(),
                preferred_pickup_slot="afternoon",
                requires_approval=True,
                approved_by=context["org_admin1"].id,
                approved_at=datetime.now() - timedelta(days=1),
                created_by=context["it_admin2"].id,
            )
            db.add(batch3)
            batches.append(batch3)

            await db.commit()

            return {"assets": assets, "batches": batches}

        except Exception as e:
            await db.rollback()
            print(f"❌ Error creating assets and batches: {e}")
            raise


async def create_submissions_and_reviews(context: dict, assets: list):
    """Create submissions and reviews for submitted assets"""
    async with AsyncSessionLocal() as db:
        try:
            submissions = []
            reviews = []

            # Create submissions for assets in submitted/review states
            submitted_assets = [
                a
                for a in assets
                if a.status
                in [
                    AssetStatus.SUBMITTED,
                    AssetStatus.REMOTE_REVIEW,
                    AssetStatus.CONDITIONALLY_ACCEPTED,
                ]
            ]

            for asset in submitted_assets[:5]:
                submission = Submission(
                    id=str(uuid.uuid4()),
                    asset_id=asset.id,
                    user_id=asset.assigned_to_user_id,
                    device_confirmed=True,
                    photos={
                        "front": "https://example.com/photos/front.jpg",
                        "back": "https://example.com/photos/back.jpg",
                        "screen": "https://example.com/photos/screen.jpg",
                        "serial": "https://example.com/photos/serial.jpg",
                    },
                    functional_checks={
                        "power_on": True,
                        "display_working": True,
                        "keyboard_working": True,
                        "trackpad_working": True,
                        "ports_working": True,
                        "wifi_working": True,
                        "battery_health": "good",
                    },
                    cosmetic_checklist={
                        "scratches": "minor",
                        "dents": "none",
                        "screen_condition": "excellent",
                    },
                    accessories={
                        "charger": True,
                        "bag": False,
                        "mouse": False,
                    },
                    location={
                        "latitude": 19.0760,
                        "longitude": 72.8777,
                        "address": "Mumbai, India",
                    },
                    declaration={
                        "data_backed_up": True,
                        "factory_reset": True,
                        "ownership_confirmed": True,
                        "signature": "Employee Signature",
                    },
                    submitted_at=datetime.now() - timedelta(days=random.randint(1, 10)),
                )
                db.add(submission)
                submissions.append(submission)

            # Flush submissions before creating reviews
            await db.flush()

            # Create reviews for submitted assets
            for asset in submitted_assets[:5]:
                # Create review for some submissions
                if asset.status in [AssetStatus.REMOTE_REVIEW, AssetStatus.CONDITIONALLY_ACCEPTED]:
                    # Find the submission for this asset
                    submission = next((s for s in submissions if s.asset_id == asset.id), None)
                    if not submission:
                        continue
                    review = RemoteReview(
                        id=str(uuid.uuid4()),
                        submission_id=submission.id,
                        asset_id=asset.id,
                        reviewer_id=context["technician"].id,
                        decision=(
                            ReviewDecision.CONDITIONALLY_ACCEPTED.value
                            if asset.status == AssetStatus.CONDITIONALLY_ACCEPTED
                            else ReviewDecision.NEEDS_FACILITY_QC.value
                        ),
                        grade="B" if asset.status == AssetStatus.CONDITIONALLY_ACCEPTED else None,
                        estimated_value=(
                            Decimal("15000.00")
                            if asset.status == AssetStatus.CONDITIONALLY_ACCEPTED
                            else None
                        ),
                        notes="Pending physical inspection at facility",
                        checklist_results={
                            "power_verified": True,
                            "display_verified": True,
                            "physical_condition": "good",
                        },
                        reviewed_at=datetime.now() - timedelta(hours=random.randint(1, 24)),
                    )
                    db.add(review)
                    reviews.append(review)

            await db.commit()

            return {"submissions": submissions, "reviews": reviews}

        except Exception as e:
            await db.rollback()
            print(f"❌ Error creating submissions and reviews: {e}")
            raise


async def create_pickups_and_payouts(context: dict, batches: list):
    """Create pickup requests and payouts"""
    async with AsyncSessionLocal() as db:
        try:
            pickups = []
            payouts = []

            # Skip pickup creation for now - requires pickup_locations table
            # TODO: Add pickup_locations table and create pickups

            # Create a completed payout
            payout = Payout(
                id=str(uuid.uuid4()),
                enterprise_id=context["enterprise1"].id,
                batch_id=None,  # Not linked to a specific batch
                amount=Decimal("125000.00"),
                status=PayoutStatus.COMPLETED.value,
                method=PayoutMethod.BANK_TRANSFER.value,
                bank_account_number="1234567890",
                bank_ifsc_code="HDFC0001234",
                transaction_reference="TXN123456",
                initiated_at=datetime.now() - timedelta(days=5),
                completed_at=datetime.now() - timedelta(days=5),
                notes="Payout for completed assets",
            )
            db.add(payout)
            payouts.append(payout)

            await db.commit()

            return {"pickups": pickups, "payouts": payouts}

        except Exception as e:
            await db.rollback()
            print(f"❌ Error creating pickups and payouts: {e}")
            raise


async def main():
    """Main seed function"""
    print("🚀 Starting comprehensive database seeding...")

    # Clear existing data
    print("\n🗑️  Clearing existing data...")
    await clear_existing_data()

    # Create users and enterprises
    print("\n👥 Creating users and enterprises...")
    context = await create_users_and_enterprises()
    print("✅ Users and enterprises created")

    # Create assets and batches
    print("\n📦 Creating assets and batches...")
    asset_data = await create_assets_and_batches(context)
    print(f"✅ Created {len(asset_data['assets'])} assets and {len(asset_data['batches'])} batches")

    # Create submissions and reviews
    print("\n📝 Creating submissions and reviews...")
    submission_data = await create_submissions_and_reviews(context, asset_data["assets"])
    print(
        f"✅ Created {len(submission_data['submissions'])} submissions and {len(submission_data['reviews'])} reviews"
    )

    # Create pickups and payouts
    print("\n🚚 Creating pickups and payouts...")
    pickup_data = await create_pickups_and_payouts(context, asset_data["batches"])
    print(
        f"✅ Created {len(pickup_data['pickups'])} pickups and {len(pickup_data['payouts'])} payouts"
    )

    print("\n✅ Comprehensive seed data created successfully!")
    print("\n📝 Demo Accounts (password: password123 for all):")
    print("\n   Platform Roles:")
    print("   • Super Admin:     superadmin@ecotribe.io")
    print("   • OPS Admin:       admin@ecotribe.io")
    print("   • Technician:      tech@ecotribe.io")
    print("\n   Enterprise Roles (TechCorp India):")
    print("   • Org Admin:       orgadmin@techcorp.com")
    print("   • IT Admin (MUM):  it@techcorp.com")
    print("   • IT Admin (BLR):  it-blr@techcorp.com")
    print("   • Employee 1:      employee@techcorp.com")
    print("   • Employee 2:      employee2@techcorp.com")
    print("\n   Logistics Roles:")
    print("   • Logistics Admin: logistics-admin@ecotribe.io")
    print("   • Logistics User:  logistics-user@ecotribe.io")
    print("\n🌐 Start the server with: poetry run uvicorn app.main:app --reload")


if __name__ == "__main__":
    asyncio.run(main())
