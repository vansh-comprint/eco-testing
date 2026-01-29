import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('📋 Checking table structure...\n');

  // Try to query users table to see what columns exist
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  console.log('Users table:');
  if (usersError) {
    console.log('  Error:', usersError.message);
  } else {
    console.log('  Columns:', users && users.length > 0 ? Object.keys(users[0]) : 'No data yet');
    console.log('  Data:', users);
  }

  // Check enterprises table
  const { data: enterprises, error: enterprisesError } = await supabase
    .from('enterprises')
    .select('*')
    .limit(1);

  console.log('\nEnterprises table:');
  if (enterprisesError) {
    console.log('  Error:', enterprisesError.message);
  } else {
    console.log('  Columns:', enterprises && enterprises.length > 0 ? Object.keys(enterprises[0]) : 'No data yet');
    console.log('  Count:', enterprises?.length || 0);
  }
}

checkTables();
