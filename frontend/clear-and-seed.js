import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
// Use service_role key for admin operations
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4Mjk5MywiZXhwIjoyMDgwMjU4OTkzfQ.35edAtNmzfgYriANEIdFHQpGdklpLI6ta5gNbL9ZA4I';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Configure the super admin here
const SUPER_ADMIN = {
  email: 'super@eco.com',
  password: 'superadmin',
  name: 'Super Admin',
  phone: '+91-9999999999',
};

async function clearAndSeed() {
  console.log('🗑️  CLEARING ALL DATA...\n');

  try {
    // Step 1: Delete all users from Supabase Auth
    console.log('📝 Fetching all Auth users...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
    } else if (users && users.length > 0) {
      console.log(`   Found ${users.length} Auth users to delete`);

      for (const user of users) {
        console.log(`   Deleting Auth user: ${user.email}`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`   Error deleting ${user.email}:`, deleteError.message);
        }
      }
      console.log('✅ All Auth users deleted\n');
    } else {
      console.log('   No Auth users found\n');
    }

    // Step 2: Clear database tables (in order due to foreign keys)
    const tablesToClear = [
      'sub_users',
      'users',
      'pickup_locations',
      'enterprise_wallets',
      'enterprises',
    ];

    console.log('📝 Clearing database tables...');
    for (const table of tablesToClear) {
      const { error } = await supabase.from(table).delete().neq('id', '');
      if (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table} cleared`);
      }
    }

    console.log('\n🌱 SEEDING SUPER ADMIN...\n');

    // Step 3: Create super admin in Supabase Auth
    console.log('📝 Creating Super Admin in Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      email_confirm: true,
      user_metadata: {
        name: SUPER_ADMIN.name,
        phone: SUPER_ADMIN.phone,
      },
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create Auth user');
    }

    const userId = authData.user.id;
    console.log('✅ Auth user created:', userId);

    // Step 4: Create super admin in database
    console.log('📝 Creating Super Admin in database...');
    const { error: dbError } = await supabase.from('users').insert([
      {
        id: userId,
        email: SUPER_ADMIN.email,
        name: SUPER_ADMIN.name,
        phone: SUPER_ADMIN.phone,
        role: 'super_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('✅ Database user created');

    console.log('\n🎉 SUCCESS! Database cleared and Super Admin created.\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║         LOGIN CREDENTIALS              ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Email:    ${SUPER_ADMIN.email.padEnd(26)}║`);
    console.log(`║  Password: ${SUPER_ADMIN.password.padEnd(26)}║`);
    console.log('╚════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
  }
}

clearAndSeed();
