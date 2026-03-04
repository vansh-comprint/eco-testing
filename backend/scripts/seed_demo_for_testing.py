"""
Additive seed script using raw SQL — adds demo data for UI regression testing.
Does NOT clear existing data — only inserts if missing.
Run: cd backend && python scripts/seed_demo_for_testing.py
"""

import asyncio
import uuid
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
import bcrypt


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def uid():
    return str(uuid.uuid4())


NOW = datetime.now(timezone.utc)
PW = hash_pw("password123")


async def get_row(conn, query, *args):
    return await conn.fetchrow(query, *args)


async def seed():
    # Read DATABASE_URL from .env
    env_path = Path(__file__).parent.parent / ".env"
    db_url = "postgresql://postgres:postgres@localhost:5432/ecotribe"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("DATABASE_URL="):
                raw = line.split("=", 1)[1].strip()
                # Convert asyncpg URL to plain postgres
                db_url = raw.replace("postgresql+asyncpg://", "postgresql://")
                break

    print(f"Connecting to: {db_url[:50]}...")
    conn = await asyncpg.connect(db_url)
    print("Connected!\n")

    try:
        # ========================
        # 1. Find TechCorp enterprise
        # ========================
        print("=== ENTERPRISE & BRANCHES ===")
        ent = await get_row(conn, "SELECT id, name FROM enterprises WHERE name ILIKE '%techcorp%' LIMIT 1")
        if not ent:
            print("  ERROR: TechCorp not found!")
            return
        ent_id = ent["id"]
        print(f"  Enterprise: {ent['name']} (id={str(ent_id)[:8]})")

        # Get branches
        branches = await conn.fetch("SELECT id, branch_name, status FROM branches WHERE enterprise_id = $1 ORDER BY created_at", ent_id)
        print(f"  Branches: {len(branches)}")
        for b in branches:
            print(f"    - {b['branch_name']} (id={str(b['id'])[:8]}) status={b['status']}")

        branch1_id = branches[0]["id"] if branches else None
        branch2_id = branches[1]["id"] if len(branches) > 1 else None

        # Create second branch if needed for multi-branch tests
        if not branch2_id:
            branch2_id = uid()
            await conn.execute("""
                INSERT INTO branches (id, enterprise_id, branch_name, branch_code, address_line1, city, state, pin_code, status, created_at, updated_at, created_by)
                VALUES ($1, $2, 'Bangalore Office', 'BLR-OFF', '456 Tech Park', 'Bangalore', 'Karnataka', '560001', 'active', $3, $3, 'seed-demo')
            """, branch2_id, ent_id, NOW)
            print(f"  [created] Branch: Bangalore Office (id={str(branch2_id)[:8]})")

        # ========================
        # 2. Ensure all test users
        # ========================
        print("\n=== USERS ===")

        async def ensure_user(email, name, role, status="active", enterprise_id=None, branch_id=None, parent_user_id=None, **extra):
            existing = await get_row(conn, "SELECT id FROM users WHERE email = $1", email)
            if existing:
                print(f"  [exists] {email} (id={str(existing['id'])[:8]})")
                return existing["id"]
            user_id = uid()
            cols = "id, email, name, role, status, password_hash, created_at, updated_at, created_by"
            vals = "$1, $2, $3, $4, $5, $6, $7, $7, 'seed-demo'"
            params = [user_id, email, name, role, status, PW, NOW]
            if enterprise_id:
                cols += ", enterprise_id"
                vals += f", ${len(params)+1}"
                params.append(enterprise_id)
            if branch_id:
                cols += ", branch_id"
                vals += f", ${len(params)+1}"
                params.append(branch_id)
            if parent_user_id:
                cols += ", parent_user_id"
                vals += f", ${len(params)+1}"
                params.append(parent_user_id)
            for k, v in extra.items():
                cols += f", {k}"
                vals += f", ${len(params)+1}"
                params.append(v)
            await conn.execute(f"INSERT INTO users ({cols}) VALUES ({vals})", *params)
            print(f"  [created] {email} (id={str(user_id)[:8]})")
            return user_id

        sa_id = await ensure_user("superadmin@ecotribe.io", "Super Admin", "super_admin")
        ops_id = await ensure_user("opsadmin@ecotribe.io", "OPS Admin", "ops_admin")
        org_id = await ensure_user("orgadmin@techcorp.com", "Org Admin", "org_admin", enterprise_id=ent_id)
        it_id = await ensure_user("itadmin@techcorp.com", "IT Admin", "it_admin", enterprise_id=ent_id, branch_id=branch1_id)
        emp_id = await ensure_user("employee@techcorp.com", "John Employee", "employee", enterprise_id=ent_id, branch_id=branch1_id, employee_id="EMP001", department="Engineering")

        # More employees in different branches for IT-03 filtering
        emp2_id = await ensure_user("jane.smith@techcorp.com", "Jane Smith", "employee", enterprise_id=ent_id, branch_id=branch1_id, employee_id="EMP002", department="Marketing")
        emp3_id = await ensure_user("bob.wilson@techcorp.com", "Bob Wilson", "employee", enterprise_id=ent_id, branch_id=branch2_id, employee_id="EMP003", department="Finance")
        emp4_id = await ensure_user("alice.jones@techcorp.com", "Alice Jones", "employee", enterprise_id=ent_id, branch_id=branch2_id, employee_id="EMP004", department="HR")

        # Logistics
        la_id = await ensure_user("logisticsadmin@express.com", "Express Logistics Admin", "logistics_admin", company_name="Express Logistics")
        d1_id = await ensure_user("driver@express.com", "Raj Driver", "logistics_user", parent_user_id=la_id)
        d2_id = await ensure_user("driver2@express.com", "Amit Driver", "logistics_user", parent_user_id=la_id)
        di_id = await ensure_user("inactive.driver@express.com", "Inactive Driver", "logistics_user", status="inactive", parent_user_id=la_id)

        # IT Admin multi-branch assignment (IT-03, IT-10)
        try:
            existing_junctions = await conn.fetch("SELECT branch_id FROM user_branches WHERE user_id = $1", it_id)
            existing_bids = {str(r["branch_id"]) for r in existing_junctions}
            if str(branch1_id) not in existing_bids and branch1_id:
                await conn.execute("INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)", it_id, branch1_id)
                print(f"  [assigned] IT Admin -> branch1")
            if str(branch2_id) not in existing_bids:
                await conn.execute("INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)", it_id, branch2_id)
                print(f"  [assigned] IT Admin -> branch2")
        except Exception as e:
            print(f"  [skip] user_branches: {e}")

        # ========================
        # 3. Create assets in various states
        # ========================
        print("\n=== ASSETS ===")
        existing_count = await conn.fetchval("SELECT COUNT(*) FROM assets WHERE enterprise_id = $1", ent_id)
        print(f"  Existing assets: {existing_count}")

        statuses_to_create = [
            ("pending_assignment", None, None, None),
            ("assigned", emp2_id, None, None),
            ("submitted", emp_id, 15000, None),
            ("submitted", emp2_id, 22000, None),
            ("remote_review", emp_id, 18000, None),
            ("conditionally_accepted", emp3_id, 12000, 10000),
            ("pickup_requested", emp_id, 25000, 20000),
            ("pickup_scheduled", emp2_id, 30000, 25000),
            ("picked_up", emp3_id, 20000, 16000),
            ("in_transit", emp4_id, 35000, 28000),
            ("facility_qc", emp_id, 40000, 32000),
            ("final_accepted", emp2_id, 28000, 24000),
            ("final_rejected", emp3_id, 15000, 0),
            ("payout_pending", emp_id, 22000, 18000),
            ("completed", emp2_id, 32000, 27000),
        ]

        brands = ["Dell", "HP", "Lenovo", "Apple", "Asus"]
        models = ["Latitude 5520", "ProBook 450", "ThinkPad T14", "MacBook Pro 14", "ZenBook 14"]
        created_asset_ids = []

        for i, (status, assigned_to, base_price, final_price) in enumerate(statuses_to_create):
            serial = f"DEMO-{status[:6].upper()}-{i:03d}"
            existing = await get_row(conn, "SELECT id FROM assets WHERE serial_number = $1", serial)
            if existing:
                created_asset_ids.append(existing["id"])
                continue

            asset_id = uid()
            created_asset_ids.append(asset_id)
            await conn.execute("""
                INSERT INTO assets (id, serial_number, brand, model, status, enterprise_id, branch_id, assigned_to_user_id, base_price, final_price, created_at, updated_at, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'seed-demo')
            """,
                asset_id, serial, brands[i % 5], models[i % 5], status, ent_id,
                branch1_id if i % 2 == 0 else branch2_id,
                assigned_to, base_price, final_price,
                NOW - timedelta(days=30 - i), NOW - timedelta(days=max(0, 15 - i))
            )
            print(f"  [created] Asset {serial} status={status}")

        # ========================
        # 4. Create batches
        # ========================
        print("\n=== BATCHES ===")
        batch_count = await conn.fetchval("SELECT COUNT(*) FROM batches WHERE enterprise_id = $1", ent_id)
        print(f"  Existing batches: {batch_count}")

        for bname, bstatus, bid, est_val in [
            ("Q1 2026 Laptops", "draft", branch1_id, 50000),
            ("Feb Batch - Bangalore", "pending_approval", branch2_id, 75000),
            ("Completed Batch", "completed", branch1_id, 120000),
            ("Approved Batch", "approved", branch1_id, 95000),
        ]:
            existing = await get_row(conn, "SELECT id FROM batches WHERE name = $1 AND enterprise_id = $2", bname, ent_id)
            if existing:
                print(f"  [exists] Batch: {bname}")
                continue
            await conn.execute("""
                INSERT INTO batches (id, name, status, enterprise_id, branch_id, created_by, estimated_value, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, uid(), bname, bstatus, ent_id, bid, it_id, est_val, NOW - timedelta(days=15), NOW)
            print(f"  [created] Batch: {bname} status={bstatus}")

        # ========================
        # 5. Create pickup requests
        # ========================
        print("\n=== PICKUP REQUESTS ===")
        pickup_count = await conn.fetchval("SELECT COUNT(*) FROM pickup_requests")
        print(f"  Existing pickups: {pickup_count}")

        if pickup_count < 5:
            # pickup_requests uses: asset_ids (array), batch_id, enterprise_id, logistics_admin_id, logistics_user_id, status
            pickup_data = [
                ("pending", None, None),
                ("assigned_to_logistics_admin", la_id, None),
                ("assigned_to_logistics_user", la_id, d1_id),
                ("scheduled", la_id, d1_id),
                ("completed", la_id, d1_id),
                ("in_progress", la_id, d2_id),
            ]
            for i, (pstatus, la, lu) in enumerate(pickup_data):
                if i >= len(created_asset_ids):
                    break
                # Check if pickup already exists for this asset
                existing = await get_row(conn, "SELECT id FROM pickup_requests WHERE asset_ids @> $1::jsonb", f'["{created_asset_ids[i]}"]')
                if existing:
                    continue
                asset_ids_json = f'["{created_asset_ids[i]}"]'
                await conn.execute("""
                    INSERT INTO pickup_requests (id, enterprise_id, status, logistics_admin_id, logistics_user_id, asset_ids, created_at, updated_at, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'seed-demo')
                """, uid(), ent_id, pstatus, la, lu, asset_ids_json,
                    NOW - timedelta(days=10 - i), NOW - timedelta(days=max(0, 5 - i)))
                print(f"  [created] Pickup: status={pstatus}")

        # ========================
        # 6. Ensure resolved disputes
        # ========================
        print("\n=== DISPUTES ===")
        resolved_count = await conn.fetchval("SELECT COUNT(*) FROM disputes WHERE status = 'resolved'")
        print(f"  Existing resolved disputes: {resolved_count}")

        if resolved_count < 2 and created_asset_ids:
            # disputes cols: asset_id, raised_by_user_id, dispute_type, status, description, resolution, resolved_by_user_id, resolved_at
            for resolution, reason in [
                ("upheld", "Grade dispute upheld - device condition confirmed"),
                ("overturned", "Pricing dispute overturned - adjusted valuation"),
            ]:
                await conn.execute("""
                    INSERT INTO disputes (id, asset_id, raised_by_user_id, dispute_type, description, status, resolution, resolved_by_user_id, resolved_at, created_at, updated_at, created_by)
                    VALUES ($1, $2, $3, 'grade_dispute', $4, 'resolved', $5, $6, $7, $8, $9, 'seed-demo')
                """, uid(), created_asset_ids[0], emp_id, reason, resolution, ops_id,
                    NOW - timedelta(days=2), NOW - timedelta(days=5), NOW - timedelta(days=2))
                print(f"  [created] Dispute: resolved/{resolution}")

        # ========================
        # 7. Ensure EPR certificates for CP-01
        # ========================
        print("\n=== EPR CERTIFICATES ===")
        epr_count = await conn.fetchval("SELECT COUNT(*) FROM epr_certificates WHERE enterprise_id = $1", ent_id)
        print(f"  Existing EPR certs for TechCorp: {epr_count}")

        if epr_count < 1:
            try:
                await conn.execute("""
                    INSERT INTO epr_certificates (id, enterprise_id, certificate_number, issue_date, expiry_date, status, total_weight_kg, created_at, updated_at, created_by)
                    VALUES ($1, $2, $3, $4, $5, 'active', 25.0, $6, $6, 'seed-demo')
                """, uid(), ent_id, f"EPR-2026-{str(uuid.uuid4())[:8].upper()}", NOW - timedelta(days=90), NOW + timedelta(days=275), NOW)
                print(f"  [created] EPR certificate for TechCorp")
            except Exception as e:
                print(f"  [skip] EPR cert: {e}")

        # ========================
        # Summary
        # ========================
        print("\n=== SUMMARY ===")
        ent_count = await conn.fetchval("SELECT COUNT(*) FROM enterprises")
        user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        asset_count = await conn.fetchval("SELECT COUNT(*) FROM assets WHERE enterprise_id = $1", ent_id)
        batch_count = await conn.fetchval("SELECT COUNT(*) FROM batches WHERE enterprise_id = $1", ent_id)
        pickup_count = await conn.fetchval("SELECT COUNT(*) FROM pickup_requests")
        dispute_count = await conn.fetchval("SELECT COUNT(*) FROM disputes")
        print(f"  Enterprises: {ent_count}")
        print(f"  Users: {user_count}")
        print(f"  TechCorp assets: {asset_count}")
        print(f"  TechCorp batches: {batch_count}")
        print(f"  Pickups: {pickup_count}")
        print(f"  Disputes: {dispute_count}")

        print("\n=== SEED COMPLETE ===")
        print("Demo data is ready for UI testing!")
        print("\nTest credentials (all password123):")
        print("  superadmin@ecotribe.io    -> /super")
        print("  opsadmin@ecotribe.io      -> /ops")
        print("  orgadmin@techcorp.com     -> /org-admin")
        print("  itadmin@techcorp.com      -> /admin")
        print("  employee@techcorp.com     -> /check-in")
        print("  logisticsadmin@express.com -> /logistics-admin")
        print("  driver@express.com        -> /logistics")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
