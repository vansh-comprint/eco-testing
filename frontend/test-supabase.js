/**
 * Quick Supabase Connection Test
 * Run this to verify your Supabase setup
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wtacfktmipvrpfnyqrwa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0YWNma3RtaXB2cnBmbnlxcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI5OTMsImV4cCI6MjA4MDI1ODk5M30.2xIjJh8zQaKMFGhWLa1xXfRFIFZKU9MK0sw2m-TeKdE';

console.log('🔍 Testing Supabase Connection...\n');

console.log('1. Configuration:');
console.log('   URL:', SUPABASE_URL);
console.log('   Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');

console.log('\n2. Creating client...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('   ✅ Client created');

console.log('\n3. Testing connection...');
const { data, error, count } = await supabase
  .from('enterprises')
  .select('*', { count: 'exact', head: true });

if (error) {
  console.log('   ❌ Connection FAILED');
  console.log('   Error:', error.message);
  console.log('   Code:', error.code);
  console.log('   Details:', error.details);

  if (error.message.includes('relation') && error.message.includes('does not exist')) {
    console.log('\n❗ ISSUE: Tables not created yet!');
    console.log('   Solution: Run the migration SQL in Supabase dashboard');
    console.log('   Go to: https://wtacfktmipvrpfnyqrwa.supabase.co');
    console.log('   SQL Editor → New Query → Paste migration SQL → Run');
  }
} else {
  console.log('   ✅ Connection SUCCESS');
  console.log('   Tables exist:', count !== null ? 'Yes' : 'Unknown');
}

console.log('\n4. Testing actual query...');
const { data: enterprises, error: queryError } = await supabase
  .from('enterprises')
  .select('*')
  .limit(1);

if (queryError) {
  console.log('   ❌ Query FAILED');
  console.log('   Error:', queryError.message);
} else {
  console.log('   ✅ Query SUCCESS');
  console.log('   Found enterprises:', enterprises?.length || 0);
  if (enterprises && enterprises.length > 0) {
    console.log('   First enterprise:', enterprises[0].name);
  }
}

console.log('\n✨ Test Complete!');
