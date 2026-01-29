# Authentication Setup Guide

## Problem
The batch creation button wasn't working because:
1. Users exist in the database `users` table
2. BUT users don't exist in Supabase Auth (needed for login)
3. Without proper authentication, database operations fail

## Solution: Create Supabase Auth Users

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **wtacfktmipvrpfnyqrwa**
3. Go to: **Project Settings** > **API**
4. Copy the **`service_role`** key (NOT the anon key)

### Step 2: Update the Script

1. Open `create-auth-users.js`
2. Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key
3. Save the file

### Step 3: Run the Script

```bash
node create-auth-users.js
```

This will create 4 auth users with these credentials:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | super@eco.com | Super@123 |
| Main Admin | admin@eco.com | Admin@123 |
| IT Admin | it@test.com | It@123 |
| CFO | cfo@test.com | Cfo@123 |

### Step 4: Login and Test

1. Open your app: http://localhost:3001
2. Go to Login page
3. Login as IT Admin:
   - **Email:** `it@test.com`
   - **Password:** `It@123`
4. Navigate to **Create Batch** page
5. Try creating a batch - it should work now! ✅

## What Changed

### 1. Removed RoleSwitcher
- The dev role switcher was removed per your request
- Now you must use the actual login flow

### 2. Added Mesh Background Toggle
- Grid icon button added next to theme toggle (sun/moon icon)
- Toggles the animated mesh background on/off
- Available in both mobile and desktop headers

### 3. Database Verification
- Ran debug script - batch creation works perfectly from backend
- Issue was frontend authentication, not database structure
- All migrations and RLS disable successful

## Troubleshooting

### "Invalid credentials" error
- Make sure you ran `create-auth-users.js` successfully
- Check that you used the correct service role key
- Verify the email/password match exactly

### "Database error" when creating batch
- Check browser DevTools Console for the actual error
- Verify you're logged in as IT Admin (not another role)
- Ensure the enterprise exists in database (run `node check-db-users.js` to verify)

### Can't see mesh background toggle
- Clear browser cache and hard reload (Ctrl+Shift+R)
- Check that the dev server reloaded after code changes

## Next Steps

After authentication is working:
1. Test creating a batch as IT Admin
2. Test other workflows (submissions, reviews, QC, etc.)
3. Verify all database operations are working correctly
