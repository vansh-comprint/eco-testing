import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBatchCreate() {
  console.log('\n🔍 DEBUG: Batch Creation Flow\n');
  console.log('=' .repeat(60));

  // Step 1: Check what users exist in database
  console.log('\n📋 Step 1: Checking users in database...\n');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, name, role, enterprise_id');

  if (userError) {
    console.error('❌ Error fetching users:', userError.message);
    return;
  }

  console.log(`✅ Found ${users.length} users:`);
  users.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.name} (${u.role})`);
    console.log(`      ID: ${u.id}`);
    console.log(`      Email: ${u.email}`);
    console.log(`      Enterprise ID: ${u.enterprise_id || 'N/A'}\n`);
  });

  // Step 2: Check enterprises
  console.log('=' .repeat(60));
  console.log('\n📋 Step 2: Checking enterprises in database...\n');
  const { data: enterprises, error: entError } = await supabase
    .from('enterprises')
    .select('id, name');

  if (entError) {
    console.error('❌ Error fetching enterprises:', entError.message);
    return;
  }

  console.log(`✅ Found ${enterprises.length} enterprises:`);
  enterprises.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.name}`);
    console.log(`      ID: ${e.id}\n`);
  });

  // Step 3: Find IT Admin user
  console.log('=' .repeat(60));
  console.log('\n📋 Step 3: Finding IT Admin user...\n');
  const itAdmins = users.filter(u => u.role === 'it_admin');

  if (itAdmins.length === 0) {
    console.error('❌ No IT Admin users found!');
    return;
  }

  const itAdmin = itAdmins[0];
  console.log('✅ Using IT Admin:', itAdmin.name);
  console.log(`   ID: ${itAdmin.id}`);
  console.log(`   Enterprise ID: ${itAdmin.enterprise_id || 'N/A'}\n`);

  // Step 4: Try to create a batch
  console.log('=' .repeat(60));
  console.log('\n📋 Step 4: Attempting to create batch...\n');

  const testBatchData = {
    id: `bat-test-${Date.now()}`,
    enterprise_id: itAdmin.enterprise_id,
    name: 'Test Batch - Debug Script',
    description: 'Testing batch creation from debug script',
    status: 'draft',
    asset_count: 0,
    accepted_count: 0,
    rejected_count: 0,
    pending_count: 0,
    total_payout: 0,
    estimated_value: 1000.50,
    requires_cfo_approval: false,
    created_by: itAdmin.id,
    created_at: new Date().toISOString(),
  };

  console.log('Batch data to insert:');
  console.log(JSON.stringify(testBatchData, null, 2));

  const { data: newBatch, error: batchError } = await supabase
    .from('batches')
    .insert(testBatchData)
    .select()
    .single();

  if (batchError) {
    console.error('\n❌ BATCH CREATION FAILED!');
    console.error('Error:', batchError.message);
    console.error('Error code:', batchError.code);
    console.error('Error hint:', batchError.hint);
    console.error('Error details:', batchError.details);
    console.error('\nFull error object:', JSON.stringify(batchError, null, 2));

    // Additional checks
    console.log('\n🔍 Additional debugging:');

    // Check if enterprise exists
    if (itAdmin.enterprise_id) {
      const { data: ent } = await supabase
        .from('enterprises')
        .select('id')
        .eq('id', itAdmin.enterprise_id)
        .single();
      console.log(`   Enterprise ${itAdmin.enterprise_id} exists:`, ent ? 'YES' : 'NO');
    } else {
      console.log('   ⚠️  IT Admin has no enterprise_id!');
    }

    // Check if user exists
    const { data: usr } = await supabase
      .from('users')
      .select('id')
      .eq('id', itAdmin.id)
      .single();
    console.log(`   User ${itAdmin.id} exists:`, usr ? 'YES' : 'NO');

    return;
  }

  console.log('\n✅ BATCH CREATED SUCCESSFULLY!');
  console.log('Created batch:', JSON.stringify(newBatch, null, 2));

  // Clean up - delete the test batch
  console.log('\n🧹 Cleaning up - deleting test batch...');
  await supabase.from('batches').delete().eq('id', testBatchData.id);
  console.log('✅ Test batch deleted\n');

  console.log('=' .repeat(60));
  console.log('\n✅ All checks passed! Batch creation should work.\n');
}

debugBatchCreate().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
