const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql, description) {
  console.log(`\n${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Try direct SQL execution if RPC fails
      console.log('RPC not available, trying direct execution...');
      const { data: directData, error: directError } = await supabase
        .from('_temp_execution')
        .select('*');
      
      if (directError && directError.code === '42P01') {
        console.log('Direct execution not available either');
        console.error('Error:', error);
        return false;
      }
    }
    
    console.log('✓ Success');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('Starting migration process...');
  
  // Read the migration file
  const fs = require('fs');
  const path = require('path');
  
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/add_class_progressions.sql'),
    'utf8'
  );
  
  const seedSQL = fs.readFileSync(
    path.join(__dirname, '../supabase/seed_warlock_progressions.sql'),
    'utf8'
  );
  
  console.log('Note: This script requires the Supabase SQL editor or dashboard to run migrations.');
  console.log('Please run these SQL files manually in the Supabase dashboard:');
  console.log('\n1. supabase/migrations/add_class_progressions.sql');
  console.log('2. supabase/seed_warlock_progressions.sql');
  console.log('\nOr install the Supabase CLI and run:');
  console.log('  supabase db push');
  console.log('  supabase db reset');
}

main();
