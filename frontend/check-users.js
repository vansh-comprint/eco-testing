import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4Mjk5MywiZXhwIjoyMDgwMjU4OTkzfQ.35edAtNmzfgYriANEIdFHQpGdklpLI6ta5gNbL9ZA4I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  console.log('\n📋 Checking Users\n');
  console.log('=' .repeat(60));

  // Get database users
  console.log('\n🗄️  Database Users (users table):');
  const { data: dbUsers, error: dbError } = await supabase
    .from('users')
    .select('id, email, name, role, status');

  if (dbError) {
    console.error('Error:', dbError.message);
  } else {
    dbUsers.forEach(u => {
      console.log(`   - ${u.email} (${u.role}) - ${u.status}`);
    });
  }

  // Get Auth users
  console.log('\n🔐 Auth Users (Supabase Auth):');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error:', authError.message);
  } else {
    authData.users.forEach(u => {
      console.log(`   - ${u.email} (confirmed: ${u.email_confirmed_at ? 'yes' : 'no'})`);
    });
  }

  // Find mismatches
  console.log('\n⚠️  Mismatches:');
  const dbEmails = new Set(dbUsers?.map(u => u.email.toLowerCase()) || []);
  const authEmails = new Set(authData?.users.map(u => u.email?.toLowerCase()) || []);

  console.log('\n   In DB but NOT in Auth:');
  dbEmails.forEach(email => {
    if (!authEmails.has(email)) {
      console.log(`   - ${email}`);
    }
  });

  console.log('\n   In Auth but NOT in DB:');
  authEmails.forEach(email => {
    if (!dbEmails.has(email)) {
      console.log(`   - ${email}`);
    }
  });
}

checkUsers().catch(console.error);
