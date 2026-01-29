import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4Mjk5MywiZXhwIjoyMDgwMjU4OTkzfQ.35edAtNmzfgYriANEIdFHQpGdklpLI6ta5gNbL9ZA4I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map old emails to new emails (matching Auth users)
const emailUpdates = [
  { oldEmail: 'super@eco.com', newEmail: 'superadmin@ecotribe.io', name: 'Super Admin' },
  { oldEmail: 'admin@eco.com', newEmail: 'admin@ecotribe.io', name: 'Main Admin' },
  { oldEmail: 'it@test.com', newEmail: 'it@techcorp.com', name: 'Priya Sharma' },
  { oldEmail: 'cfo@test.com', newEmail: 'cfo@techcorp.com', name: 'Amit Patel' },
  { oldEmail: 'log@eco.come', newEmail: 'logistics-admin@ecotribe.io', name: 'Logistics Admin' },
];

async function syncUsers() {
  console.log('\n🔄 Syncing Database Users with Auth Users\n');
  console.log('=' .repeat(60));

  for (const update of emailUpdates) {
    console.log(`\n📧 Updating: ${update.oldEmail} → ${update.newEmail}`);

    const { data, error } = await supabase
      .from('users')
      .update({
        email: update.newEmail,
        name: update.name,
        updated_at: new Date().toISOString()
      })
      .eq('email', update.oldEmail)
      .select();

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else if (data.length === 0) {
      console.log(`   ⏭️  Not found (already updated?)`);
    } else {
      console.log(`   ✅ Updated successfully`);
    }
  }

  // Verify
  console.log('\n' + '=' .repeat(60));
  console.log('\n📋 Updated Database Users:');

  const { data: users } = await supabase
    .from('users')
    .select('email, name, role, status');

  users?.forEach(u => {
    console.log(`   - ${u.email} (${u.role}) - ${u.name}`);
  });

  console.log('\n✅ Sync complete!');
  console.log('\n📝 Login Credentials:');
  console.log('   superadmin@ecotribe.io / Super@123');
  console.log('   admin@ecotribe.io / Admin@123');
  console.log('   it@techcorp.com / It@123');
  console.log('   cfo@techcorp.com / Cfo@123');
  console.log('   logistics-admin@ecotribe.io / Logistics@123');
}

syncUsers().catch(console.error);
