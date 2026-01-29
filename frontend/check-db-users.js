import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('\n📋 Checking database contents...\n');

  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*');

  if (userError) {
    console.error('❌ Error fetching users:', userError.message);
  } else {
    console.log(`✅ Found ${users.length} users in database:\n`);
    users.forEach(u => {
      console.log(`   📍 ID: ${u.id}`);
      console.log(`      Email: ${u.email}`);
      console.log(`      Name: ${u.name}`);
      console.log(`      Role: ${u.role}`);
      console.log(`      Enterprise: ${u.enterprise_id || 'N/A'}\n`);
    });
  }

  const { data: enterprises } = await supabase.from('enterprises').select('*');
  console.log(`\n✅ Found ${enterprises?.length || 0} enterprises:\n`);
  enterprises?.forEach(e => {
    console.log(`   🏢 ID: ${e.id}`);
    console.log(`      Name: ${e.name}\n`);
  });

  const { data: batches } = await supabase.from('batches').select('*');
  console.log(`📦 Batches in database: ${batches?.length || 0}\n`);
}

checkUsers();
