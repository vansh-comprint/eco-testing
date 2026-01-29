# EcoTribe Setup Guide - From Scratch

## Overview

You've created the database tables. Now let's populate them properly from the top down:

```
Super Admin (Platform Owner)
    ↓
Enterprises (Companies using the platform)
    ↓
IT Admin + CFO (Enterprise users)
    ↓
SubUsers (Employees)
    ↓
Batches (Collections of assets)
    ↓
Assets (Laptops to be traded in)
```

## Step-by-Step Setup

### Step 1: Create Platform Admins (2 minutes)

Run this in Supabase SQL Editor:

```bash
File: setup-super-admin.sql
```

**This creates:**
- ✅ Super Admin (`superadmin@ecotribe.io`)
- ✅ Main Admin (`admin@ecotribe.io`) - For OPS/Technician work
- ✅ Logistics Admin (`logistics-admin@ecotribe.io`)

### Step 2: Create Your First Enterprise (2 minutes)

Run this in Supabase SQL Editor:

```bash
File: setup-enterprise.sql
```

**This creates:**
- ✅ Enterprise: **TechCorp India**
- ✅ IT Admin for TechCorp (`it@techcorp.com`)
- ✅ CFO for TechCorp (`cfo@techcorp.com`)
- ✅ Enterprise Wallet
- ✅ Default Pickup Location (Bangalore HQ)

### Step 3: Create Employees (SubUsers) (1 minute)

Run this in Supabase SQL Editor:

```bash
File: setup-subusers.sql
```

**This creates 5 employees:**
- ✅ Priya Sharma (Engineering)
- ✅ Amit Patel (Engineering)
- ✅ Sneha Reddy (Marketing)
- ✅ Rahul Verma (Sales)
- ✅ Ananya Singh (HR)

### Step 4: Create Batch and Assets (1 minute)

Run this in Supabase SQL Editor:

```bash
File: setup-batch-and-assets.sql
```

**This creates:**
- ✅ Batch: "Q1 2025 - Laptop Refresh"
- ✅ 5 Laptops (Dell, Lenovo, HP) in `pending_assignment` status

## Verification

After running all scripts, verify in Supabase:

```sql
-- Check platform admins
SELECT email, role FROM users WHERE role IN ('super_admin', 'main_admin', 'logistics_admin');

-- Check enterprise
SELECT name, status, contact_email FROM enterprises;

-- Check enterprise users
SELECT email, role FROM users WHERE enterprise_id = 'ent-techcorp-001';

-- Check employees
SELECT name, email, department FROM sub_users WHERE enterprise_id = 'ent-techcorp-001';

-- Check batch
SELECT name, status, asset_count, estimated_value FROM batches;

-- Check assets
SELECT serial_number, brand, model, status, base_price FROM assets;
```

## Now Test the Flow!

### 1. Login as IT Admin

**URL:** http://localhost:3001/login
**Email:** `it@techcorp.com`
**Role:** IT Admin

**What you can do:**
- View the batch "Q1 2025 - Laptop Refresh"
- See 5 assets in "pending_assignment" status
- Assign assets to employees
- Create pickup requests

### 2. Assign Assets to Employees

As IT Admin:
1. Go to **Batches** → Click on "Q1 2025 - Laptop Refresh"
2. Click on each asset
3. Assign to employees:
   - Dell Latitude 5420 → Priya Sharma
   - Lenovo ThinkPad T14 → Amit Patel
   - HP EliteBook 850 → Sneha Reddy
   - Dell Latitude 7420 → Rahul Verma
   - Lenovo ThinkPad T14s → Ananya Singh

### 3. Test as Employee (SubUser)

**URL:** http://localhost:3001/check-in
**Email:** `priya.sharma@techcorp.com`
**Role:** SubUser

**What you can do:**
- See assigned laptop (Dell Latitude 5420)
- Start device evaluation
- Submit photos and checklist
- Complete submission

### 4. Test as Technician

**URL:** http://localhost:3001/tech
**Email:** `admin@ecotribe.io`
**Role:** Main Admin (acts as Technician)

**What you can do:**
- See submitted devices in review queue
- Accept or reject devices
- Perform facility QC

### 5. Test as CFO

**URL:** http://localhost:3001/cfo
**Email:** `cfo@techcorp.com`
**Role:** CFO

**What you can do:**
- View batch approvals
- See estimated payouts
- Approve/reject batches

## Login Credentials Summary

| Role | Email | Portal URL |
|------|-------|------------|
| **Super Admin** | superadmin@ecotribe.io | http://localhost:3001/super |
| **Main Admin** (OPS/Tech) | admin@ecotribe.io | http://localhost:3001/ops or /tech |
| **Logistics Admin** | logistics-admin@ecotribe.io | http://localhost:3001/logistics-admin |
| **IT Admin** | it@techcorp.com | http://localhost:3001/admin |
| **CFO** | cfo@techcorp.com | http://localhost:3001/cfo |
| **Employee 1** | priya.sharma@techcorp.com | http://localhost:3001/check-in |
| **Employee 2** | amit.patel@techcorp.com | http://localhost:3001/check-in |
| **Employee 3** | sneha.reddy@techcorp.com | http://localhost:3001/check-in |
| **Employee 4** | rahul.verma@techcorp.com | http://localhost:3001/check-in |
| **Employee 5** | ananya.singh@techcorp.com | http://localhost:3001/check-in |

## Complete Workflow to Test

1. **IT Admin assigns laptop to Priya**
   - Status: `pending_assignment` → `assigned`

2. **Priya starts evaluation**
   - Status: `assigned` → `check_in_started`

3. **Priya submits device**
   - Status: `check_in_started` → `submitted` → `remote_review`

4. **Technician reviews device**
   - Status: `remote_review` → `conditionally_accepted`

5. **OPS approves for pickup**
   - Status: `conditionally_accepted` → `ready_for_pickup`

6. **IT Admin creates pickup request**
   - Status: `ready_for_pickup` → `pickup_requested`

7. **Logistics Admin assigns pickup**
   - Status: `pickup_requested` → `pickup_scheduled`

8. **Logistics User completes pickup**
   - Status: `pickup_scheduled` → `picked_up` → `in_transit`

9. **Asset arrives at warehouse**
   - Status: `in_transit` → `facility_qc`

10. **Technician performs facility QC**
    - Status: `facility_qc` → `final_accepted` → `payout_pending`

11. **CFO processes payout**
    - Status: `payout_pending` → `completed`

## Files Created

```
ecotribe/
├── setup-super-admin.sql           # Step 1: Platform admins
├── setup-enterprise.sql            # Step 2: First enterprise
├── setup-subusers.sql              # Step 3: Employees
├── setup-batch-and-assets.sql      # Step 4: Batch + Assets
└── SETUP_GUIDE.md                  # This file
```

## Quick Setup (Copy-Paste All at Once)

If you want to set everything up in one go, run all files in order:

1. Open Supabase SQL Editor
2. Run `setup-super-admin.sql` → Click Run
3. Run `setup-enterprise.sql` → Click Run
4. Run `setup-subusers.sql` → Click Run
5. Run `setup-batch-and-assets.sql` → Click Run

**Total time: ~5 minutes** ⚡

## Troubleshooting

### "relation does not exist"
- Make sure you ran the migration (`001_initial_schema.sql`) first

### "duplicate key value violates unique constraint"
- The data already exists. That's fine! The scripts use `ON CONFLICT` to update existing records.

### Can't see data in the app
- Check that you're using Supabase (not localStorage):
  - `.env` should have `VITE_DATABASE_PROVIDER=supabase`
  - Restart dev server: `npm run dev`

### Console shows "Using LocalStorage adapter"
- Environment variables not loaded
- Restart dev server
- Check `.env` file exists and has correct values

---

**Ready to start?** Run the SQL scripts in order and then test the complete workflow! 🚀
