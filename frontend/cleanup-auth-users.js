import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4Mjk5MywiZXhwIjoyMDgwMjU4OTkzfQ.35edAtNmzfgYriANEIdFHQpGdklpLI6ta5gNbL9ZA4I';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Old test emails to clean up
const emailsToDelete = [
  'cfo@test.com',
  'it@test.com',
  'super@eco.com',
  'admin@eco.com',
  'log@eco.come',
  'neha@company.com',
  'amit@company.com',
  'priya@company.com',
  'vikram@company.com',
];

async function cleanupAuthUsers() {
  console.log('\n🧹 Cleaning up old test auth users\n');
  console.log('=' .repeat(60));

  // Get all users
  const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    return;
  }

  console.log(`\n📋 Found ${allUsers.users.length} total auth users\n`);

  for (const email of emailsToDelete) {
    const authUser = allUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (authUser) {
      console.log(`🗑️  Deleting: ${email} (ID: ${authUser.id})`);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);

      if (deleteError) {
        console.error(`   ❌ Error: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Deleted successfully`);
      }
    } else {
      console.log(`⏭️  Skipping: ${email} (not found)`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ Cleanup complete!');
  console.log('\nRemaining auth users:');

  const { data: remaining } = await supabase.auth.admin.listUsers();
  remaining.users.forEach(u => {
    console.log(`   - ${u.email}`);
  });
}

cleanupAuthUsers().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
