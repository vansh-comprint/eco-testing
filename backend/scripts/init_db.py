"""Initialize database with sample data for development"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.enterprise import Enterprise, EnterpriseStatus, Branch
import uuid


async def create_tables():
    """Create all database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")


async def create_sample_data():
    """Create sample data for development with all 7 user roles"""
    async with AsyncSessionLocal() as db:
        try:
            # Check if data already exists
            existing_user = await db.execute(
                select(User).where(User.email == "superadmin@ecotribe.io")
            )
            if existing_user.scalar_one_or_none():
                print("ℹ️  Sample data already exists, skipping...")
                return

            # ==================== Platform Roles ====================

            # 1. Super Admin
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

            # 2. OPS Admin
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

            # 3. Technician
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

            # ==================== Logistics Roles ====================

            # 6. Logistics Admin
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

            # 7. Logistics User (child of Logistics Admin)
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

            # ==================== Enterprise Setup ====================

            # Create Sample Enterprise
            enterprise = Enterprise(
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
            db.add(enterprise)

            await db.flush()

            # Create a Branch for the enterprise
            branch = Branch(
                id=str(uuid.uuid4()),
                enterprise_id=enterprise.id,
                branch_name="Mumbai HQ",
                branch_code="MUM-HQ",
                address_line1="123 Business Park",
                city="Mumbai",
                state="Maharashtra",
                pin_code="400001",
                status="active",
                created_by="system",
            )
            db.add(branch)

            await db.flush()

            # 4. Org Admin for enterprise
            org_admin = User(
                id=str(uuid.uuid4()),
                email="orgadmin@techcorp.com",
                name="Org Admin",
                role=UserRole.ORG_ADMIN,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise.id,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(org_admin)

            # 5. IT Admin for enterprise (with branch)
            it_admin = User(
                id=str(uuid.uuid4()),
                email="it@techcorp.com",
                name="IT Admin",
                role=UserRole.IT_ADMIN,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise.id,
                branch_id=branch.id,
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(it_admin)

            # 8. Employee (Sub-User) - uses OTP auth, no password
            employee = User(
                id=str(uuid.uuid4()),
                email="employee@techcorp.com",
                name="John Employee",
                role=UserRole.EMPLOYEE,
                status=UserStatus.ACTIVE,
                enterprise_id=enterprise.id,
                branch_id=branch.id,
                employee_id="EMP001",
                department="Engineering",
                designation="Software Engineer",
                # Employee uses OTP auth, but add password for demo login
                password_hash=get_password_hash("password123"),
                created_by="system",
            )
            db.add(employee)

            await db.commit()

            print("✅ Sample data created successfully")
            print("\n📝 Demo Accounts (password: password123 for all):")
            print("\n   Platform Roles:")
            print("   • Super Admin:     superadmin@ecotribe.io")
            print("   • OPS Admin:       admin@ecotribe.io")
            print("   • Technician:      tech@ecotribe.io")
            print("\n   Enterprise Roles (TechCorp India):")
            print("   • Org Admin:       orgadmin@techcorp.com")
            print("   • IT Admin:        it@techcorp.com")
            print("   • Employee:        employee@techcorp.com")
            print("\n   Logistics Roles:")
            print("   • Logistics Admin: logistics-admin@ecotribe.io")
            print("   • Logistics User:  logistics-user@ecotribe.io")

        except Exception as e:
            await db.rollback()
            print(f"❌ Error creating sample data: {e}")
            raise


async def main():
    """Main initialization function"""
    print("🚀 Initializing EcoTribe database...")

    # Create tables
    await create_tables()

    # Create sample data
    await create_sample_data()

    print("\n✅ Database initialization complete!")
    print("🌐 Start the server with: poetry run uvicorn app.main:app --reload")


if __name__ == "__main__":
    asyncio.run(main())
