import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
// Use service_role key for admin operations (creating users in Auth)
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
  password: 'password123', // Change this to your desired password
  name: 'Super Admin',
  phone: '+91-9999999999',
};

async function seedSuperAdmin() {
  console.log('🌱 Seeding Super Admin user...');
  console.log('   Email:', SUPER_ADMIN.email);

  try {
    // Step 1: Check if user already exists in database
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', SUPER_ADMIN.email)
      .single();

    if (existing) {
      console.log('⚠️  User already exists in database:', existing.email);
      console.log('   If you need to reset, delete the user from both Auth and database first.');
      return;
    }

    // Step 2: Create user in Supabase Auth
    console.log('📝 Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: SUPER_ADMIN.name,
        phone: SUPER_ADMIN.phone,
      },
    });

    if (authError) {
      // Check if user already exists in Auth
      if (authError.message.includes('already been registered')) {
        console.log('⚠️  User already exists in Supabase Auth');
        console.log('   Fetching existing Auth user...');

        // List users to find the one we're looking for
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          throw listError;
        }

        const existingAuthUser = users.find(u => u.email === SUPER_ADMIN.email);
        if (existingAuthUser) {
          console.log('   Found Auth user ID:', existingAuthUser.id);
          // Continue to create database record with this ID
          await createDatabaseUser(existingAuthUser.id);
        }
        return;
      }
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user in Auth');
    }

    console.log('✅ Supabase Auth user created:', authData.user.id);

    // Step 3: Create user in database
    await createDatabaseUser(authData.user.id);

  } catch (error) {
    console.error('❌ Error:', error.message || error);
  }
}

async function createDatabaseUser(userId) {
  console.log('📝 Creating user in database...');

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        email: SUPER_ADMIN.email,
        name: SUPER_ADMIN.name,
        phone: SUPER_ADMIN.phone,
        role: 'super_admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating database user:', error);
    return;
  }

  console.log('✅ Database user created successfully');
  console.log('\n🎉 Super Admin created successfully!');
  console.log('\n📧 Login Credentials:');
  console.log('   Email:', SUPER_ADMIN.email);
  console.log('   Password:', SUPER_ADMIN.password);
}

seedSuperAdmin();
