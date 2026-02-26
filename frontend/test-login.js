import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const email = 'super@eco.com';
  const password = 'demo123456'; // Replace with your actual password

  console.log('🔐 Testing login flow...\n');

  // Step 1: Test Supabase Auth
  console.log('Step 1: Testing Supabase Auth sign in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('❌ Auth error:', authError.message);
    console.log('\n💡 Try resetting the password or creating a new auth user.');
    return;
  }

  console.log('✅ Auth successful!');
  console.log('   User ID:', authData.user.id);
  console.log('   Email:', authData.user.email);

  // Step 2: Test querying users table
  console.log('\nStep 2: Testing users table query...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (usersError) {
    console.error('❌ Users query error:', usersError.message);
    console.log('\n💡 RLS policies might still be blocking. Check policies.');
    return;
  }

  if (!users || users.length === 0) {
    console.error('❌ No user record found in users table!');
    console.log('\n💡 Run this SQL:');
    console.log(`
INSERT INTO users (id, email, name, phone, role, status, created_at)
VALUES (
  'usr-super-001',
  '${email}',
  'Super Admin',
  '+1-555-0000',
  'super_admin',
  'active',
  now()
);
    `);
    return;
  }

  console.log('✅ User record found!');
  console.log('   User data:', users[0]);

  // Check status
  if (users[0].status !== 'active') {
    console.error('❌ User status is not active:', users[0].status);
    console.log('\n💡 Update status with: UPDATE users SET status = \'active\' WHERE email = \'' + email + '\';');
    return;
  }

  console.log('\n✅ All checks passed! Login should work now.');
  console.log('\n📧 Login at: http://localhost:3001/login');
  console.log('   Email:', email);
  console.log('   Password:', password);

  // Sign out
  await supabase.auth.signOut();
}

testLogin();
