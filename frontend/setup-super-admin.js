import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSuperAdmin() {
  console.log('🔧 Setting up Super Admin with Supabase Auth...\n');

  const email = 'superadmin@ecotribe.io';
  const password = 'demo123456'; // 8+ characters required by Supabase

  try {
    // Step 1: Create Supabase Auth user
    console.log('Step 1: Creating Supabase Auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Super Admin',
          phone: '+1-555-0000',
        },
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        console.log('✅ Auth user already exists, skipping auth creation');
      } else {
        console.error('❌ Auth error:', authError);
        return;
      }
    } else if (authData.user) {
      console.log('✅ Supabase Auth user created:', authData.user.id);
    }

    // Step 2: Check if user record exists in users table
    console.log('\nStep 2: Checking users table...');
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      console.log('✅ Super Admin record already exists in users table:', existing);
      console.log('\n✨ Setup complete!');
      console.log('\n📧 Login Credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      return;
    }

    // Step 3: Create user record in users table
    console.log('\nStep 3: Creating user record in users table...');

    // We need to sign in first to bypass RLS
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('❌ Sign in error:', signInError);
      console.log('\n⚠️ You need to manually insert the super admin into the users table.');
      console.log('\nRun this SQL in your Supabase SQL Editor:');
      console.log(`
INSERT INTO users (id, email, name, phone, role, status, created_at)
VALUES (
  'usr-super-' || gen_random_uuid()::text,
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

    // Try to insert the user record
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: `usr-super-${Date.now()}`,
          email: email,
          name: 'Super Admin',
          phone: '+1-555-0000',
          role: 'super_admin',
          status: 'active',
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting user record:', insertError);
      console.log('\n⚠️ RLS might be blocking the insert. Run this SQL in Supabase SQL Editor:');
      console.log(`
INSERT INTO users (id, email, name, phone, role, status, created_at)
VALUES (
  'usr-super-' || gen_random_uuid()::text,
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

    console.log('✅ User record created:', userData);
    console.log('\n✨ Setup complete!');
    console.log('\n📧 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🔗 You can now log in at: http://localhost:3001/login');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupSuperAdmin();
