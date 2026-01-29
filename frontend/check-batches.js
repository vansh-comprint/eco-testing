import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBatches() {
  console.log('\n📦 Checking batches in database...\n');

  const { data: batches, error } = await supabase
    .from('batches')
    .select('*');

  if (error) {
    console.error('❌ Error fetching batches:', error.message);
    return;
  }

  console.log(`✅ Found ${batches.length} batch(es):\n`);

  batches.forEach((b, i) => {
    console.log(`${i + 1}. ${b.name}`);
    console.log(`   ID: ${b.id}`);
    console.log(`   Enterprise ID: ${b.enterprise_id}`);
    console.log(`   Status: ${b.status}`);
    console.log(`   Asset Count: ${b.asset_count}`);
    console.log(`   Created By: ${b.created_by || 'N/A'}`);
    console.log(`   Created At: ${b.created_at}\n`);
  });

  // Check which enterprise this batch belongs to
  if (batches.length > 0) {
    const enterpriseId = batches[0].enterprise_id;
    console.log(`🔍 Checking enterprise: ${enterpriseId}\n`);

    const { data: enterprise } = await supabase
      .from('enterprises')
      .select('*')
      .eq('id', enterpriseId)
      .single();

    if (enterprise) {
      console.log(`✅ Enterprise found:`);
      console.log(`   Name: ${enterprise.name}`);
      console.log(`   ID: ${enterprise.id}\n`);
    } else {
      console.log(`❌ Enterprise NOT found! This is the problem.\n`);
    }

    // Check which users belong to this enterprise
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('enterprise_id', enterpriseId);

    console.log(`👥 Users in this enterprise: ${users?.length || 0}\n`);
    users?.forEach(u => {
      console.log(`   - ${u.name} (${u.role})`);
      console.log(`     Email: ${u.email}`);
      console.log(`     ID: ${u.id}\n`);
    });
  }
}

checkBatches();
