import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUsers() {
  console.log('🌱 Seeding users into database...\n');

  // Create enterprises first
  const enterprises = [
    {
      id: 'ent-001',
      name: 'TechCorp India',
      legal_name: 'TechCorp India Private Limited',
      gst_number: '29ABCDE1234F1Z5',
      industry: 'Technology',
      employee_count: 150,
      contact_person: 'Rajesh Kumar',
      contact_email: 'contact@techcorp.in',
      contact_phone: '+91 98765 43210',
      status: 'active',
      created_at: new Date().toISOString(),
    }
  ];

  console.log('Creating enterprises...');
  const { error: entError } = await supabase
    .from('enterprises')
    .upsert(enterprises, { onConflict: 'id' });

  if (entError) {
    console.error('❌ Error creating enterprises:', entError.message);
  } else {
    console.log('✅ Enterprises created\n');
  }

  // Create users
  const users = [
    {
      id: 'usr-superadmin',
      email: 'superadmin@ecotribe.io',
      name: 'Super Admin',
      role: 'super_admin',
      status: 'active',
      enterprise_id: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-mainadmin',
      email: 'admin@ecotribe.io',
      name: 'Main Admin',
      role: 'main_admin',
      status: 'active',
      enterprise_id: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-it-admin-1',
      email: 'it@techcorp.com',
      name: 'Priya Sharma',
      role: 'it_admin',
      status: 'active',
      enterprise_id: 'ent-001',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-cfo-1',
      email: 'cfo@techcorp.com',
      name: 'Amit Patel',
      role: 'cfo',
      status: 'active',
      enterprise_id: 'ent-001',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-logistics-admin',
      email: 'logistics-admin@ecotribe.io',
      name: 'Logistics Admin',
      role: 'logistics_admin',
      status: 'active',
      enterprise_id: null,
      created_at: new Date().toISOString(),
    }
  ];

  console.log('Creating users...');
  const { data, error } = await supabase
    .from('users')
    .upsert(users, { onConflict: 'id' });

  if (error) {
    console.error('❌ Error creating users:', error.message);
    console.error('Details:', error);
  } else {
    console.log('✅ Users created successfully!\n');

    // Verify
    const { data: allUsers } = await supabase.from('users').select('id, email, name, role');
    console.log('📋 Users in database:');
    allUsers.forEach(u => {
      console.log(`   - ${u.name} (${u.email}) - ${u.role}`);
    });
  }
}

seedUsers()
  .then(() => {
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  });
