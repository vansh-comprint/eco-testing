import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
// NOTE: You need the SERVICE ROLE key (not anon key) to create users
// Get this from: Supabase Dashboard > Project Settings > API > service_role key (secret)
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4Mjk5MywiZXhwIjoyMDgwMjU4OTkzfQ.35edAtNmzfgYriANEIdFHQpGdklpLI6ta5gNbL9ZA4I';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAuthUsers() {
  console.log('\n🔐 Creating Supabase Auth Users\n');
  console.log('=' .repeat(60));

  // Users to create - these match the database users in seed-users.js
  const users = [
    {
      email: 'superadmin@ecotribe.io',
      password: 'Super@123',
      name: 'Super Admin',
      role: 'super_admin'
    },
    {
      email: 'admin@ecotribe.io',
      password: 'Admin@123',
      name: 'Main Admin',
      role: 'main_admin'
    },
    {
      email: 'it@techcorp.com',
      password: 'It@123',
      name: 'IT Admin (Priya Sharma)',
      role: 'it_admin'
    },
    {
      email: 'cfo@techcorp.com',
      password: 'Cfo@123',
      name: 'CFO (Amit Patel)',
      role: 'cfo'
    },
    {
      email: 'logistics-admin@ecotribe.io',
      password: 'Logistics@123',
      name: 'Logistics Admin',
      role: 'logistics_admin'
    },
  ];

  console.log('Using service role key to create auth users...\n');

  for (const user of users) {
    console.log(`\n📧 Creating auth user: ${user.email}`);

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: user.name,
          role: user.role
        }
      });

      if (error) {
        if (error.message.includes('already been registered')) {
          console.log(`   ⚠️  User already exists, skipping...`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Created successfully!`);
        console.log(`   👤 User ID: ${data.user.id}`);
        console.log(`   🔑 Password: ${user.password}`);
      }
    } catch (err) {
      console.error(`   ❌ Unexpected error:`, err.message);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ Auth users setup complete!');
  console.log('\n📝 Login Credentials:\n');
  users.forEach(u => {
    console.log(`   ${u.role.toUpperCase().replace('_', ' ')}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   Password: ${u.password}\n`);
  });
}

createAuthUsers().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
