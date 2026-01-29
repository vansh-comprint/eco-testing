# EcoTribe Supabase Setup Guide

This guide will help you set up Supabase for multi-user testing and production deployment.

## Prerequisites

- A Supabase account (free tier is sufficient for testing)
- Node.js 18+ installed
- Git (for version control)

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up or log in
2. Click "New Project"
3. Fill in the details:
   - **Organization**: Select or create one
   - **Project Name**: `ecotribe-dev` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your team (e.g., `ap-south-1` for India)
4. Click "Create new project"
5. Wait 1-2 minutes for the project to initialize

## Step 2: Run Database Migration

1. Once your project is ready, go to **SQL Editor** in the left sidebar
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click **Run** (bottom right)
6. You should see "Success. No rows returned" - this means all tables were created!

## Step 3: Get Your API Credentials

1. Go to **Project Settings** (gear icon in the sidebar)
2. Click on **API** in the left menu
3. You'll see two important values:
   - **Project URL**: Something like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

## Step 4: Configure Environment Variables

1. In your project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_USE_SUPABASE=true
   ```

3. **IMPORTANT**: Never commit `.env` to git! It's already in `.gitignore`.

## Step 5: Install Dependencies

```bash
npm install
```

This will install the `@supabase/supabase-js` package along with other dependencies.

## Step 6: Verify Connection

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open browser DevTools Console
3. You should see connection logs (no errors)
4. The app will now use Supabase instead of localStorage!

## Step 7: Create Test Users

### Option A: Using Supabase Dashboard

1. Go to **Table Editor** in Supabase
2. Click on `users` table
3. Click "Insert row"
4. Fill in:
   ```
   id: usr-test-itadmin
   email: it@techcorp.com
   name: IT Admin Test
   role: it_admin
   status: active
   created_at: [auto-filled]
   ```
5. Click "Save"
6. Repeat for other test users

### Option B: Using SQL Editor

Run this SQL to create all test users at once:

```sql
-- Create test enterprise
INSERT INTO enterprises (id, name, status, created_at)
VALUES ('ent-techcorp', 'TechCorp India', 'active', NOW());

-- Create test users
INSERT INTO users (id, enterprise_id, email, name, role, status, created_at)
VALUES
  ('usr-it-admin', 'ent-techcorp', 'it@techcorp.com', 'IT Admin', 'it_admin', 'active', NOW()),
  ('usr-cfo', 'ent-techcorp', 'cfo@techcorp.com', 'CFO', 'cfo', 'active', NOW()),
  ('usr-logistics-admin', NULL, 'logistics-admin@ecotribe.io', 'Logistics Admin', 'logistics_admin', 'active', NOW()),
  ('usr-logistics-user', NULL, 'logistics-user@ecotribe.io', 'Logistics User', 'logistics_user', 'active', NOW());

-- Create test sub-users (employees)
INSERT INTO sub_users (id, enterprise_id, email, name, status, created_at)
VALUES
  ('sub-employee1', 'ent-techcorp', 'employee@techcorp.com', 'John Employee', 'active', NOW()),
  ('sub-employee2', 'ent-techcorp', 'employee2@techcorp.com', 'Jane Employee', 'active', NOW());

-- Create enterprise wallet
INSERT INTO enterprise_wallets (id, enterprise_id, available_balance, pending_balance, total_earned, total_redeemed, updated_at)
VALUES ('wal-techcorp', 'ent-techcorp', 0, 0, 0, 0, NOW());
```

## Step 8: Enable Row Level Security (RLS) Policies

For testing, we'll temporarily allow all authenticated access. Run this SQL:

```sql
-- Temporary RLS policies for development/testing
-- WARNING: These are permissive. Replace with proper policies in production.

-- Enterprises
CREATE POLICY "Allow all for authenticated users" ON enterprises
  FOR ALL USING (auth.role() = 'authenticated');

-- Users
CREATE POLICY "Allow all for authenticated users" ON users
  FOR ALL USING (auth.role() = 'authenticated');

-- SubUsers
CREATE POLICY "Allow all for authenticated users" ON sub_users
  FOR ALL USING (auth.role() = 'authenticated');

-- Assets
CREATE POLICY "Allow all for authenticated users" ON assets
  FOR ALL USING (auth.role() = 'authenticated');

-- Batches
CREATE POLICY "Allow all for authenticated users" ON batches
  FOR ALL USING (auth.role() = 'authenticated');

-- Submissions
CREATE POLICY "Allow all for authenticated users" ON submissions
  FOR ALL USING (auth.role() = 'authenticated');

-- Reviews
CREATE POLICY "Allow all for authenticated users" ON remote_reviews
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON facility_qc
  FOR ALL USING (auth.role() = 'authenticated');

-- Pickup Locations
CREATE POLICY "Allow all for authenticated users" ON pickup_locations
  FOR ALL USING (auth.role() = 'authenticated');

-- Pickup Requests
CREATE POLICY "Allow all for authenticated users" ON pickup_requests
  FOR ALL USING (auth.role() = 'authenticated');

-- Financial
CREATE POLICY "Allow all for authenticated users" ON enterprise_wallets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON credit_transactions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON payouts
  FOR ALL USING (auth.role() = 'authenticated');

-- Audit & Notifications
CREATE POLICY "Allow all for authenticated users" ON audit_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON notifications
  FOR ALL USING (auth.role() = 'authenticated');
```

## Step 9: Multi-User Testing

Now you can test with your team!

### Testing Scenario:

1. **Person 1** (IT Admin Portal):
   - Open `http://localhost:3000/admin`
   - Log in as IT Admin
   - Create a new batch and upload assets

2. **Person 2** (SubUser Portal):
   - Open `http://localhost:3000/check-in` in a different browser or incognito window
   - Log in as SubUser
   - See the assigned asset in real-time!
   - Start evaluation

3. **Person 3** (Technician Portal):
   - Open `http://localhost:3000/tech`
   - Watch for new submissions appearing in real-time

### Real-Time Updates:

When Person 1 assigns an asset to Person 2, Person 2's dashboard updates automatically without refresh (via Supabase Realtime subscriptions).

## Step 10: Deploy to Vercel (Optional)

1. Push your code to GitHub (make sure `.env` is in `.gitignore`)

2. Go to [vercel.com](https://vercel.com) and import your repository

3. In Vercel's environment variables section, add:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_USE_SUPABASE=true
   ```

4. Deploy!

5. Your team can now access the app from anywhere:
   ```
   https://ecotribe.vercel.app
   ```

## Troubleshooting

### "Missing Supabase environment variables" error

- Make sure `.env` exists in the project root
- Make sure variable names start with `VITE_` (required for Vite)
- Restart dev server after changing `.env`

### "relation does not exist" error

- Run the migration SQL again
- Check that you're connected to the correct Supabase project

### RLS policy errors

- Make sure you ran the RLS policies in Step 8
- Check Supabase logs: **Database** → **Logs** in the dashboard

### Real-time not working

- Check browser console for WebSocket connection errors
- Verify Supabase Realtime is enabled in Project Settings
- Check that you're subscribed to the correct table/channel

## Next Steps

- [ ] Convert stores to use Supabase queries (in progress)
- [ ] Add real-time subscriptions to all stores
- [ ] Implement proper authentication with Supabase Auth
- [ ] Set up proper RLS policies for production
- [ ] Add file upload for photos (Supabase Storage)

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: https://github.com/your-repo/issues

---

**Ready to test?** Follow steps 1-7, then share the deployed link with your team!
