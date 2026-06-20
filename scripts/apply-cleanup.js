// Script to apply cleanup migration directly to Supabase
// This drops the static tables and removes foreign key constraints

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCleanup() {
  console.log('Applying cleanup migration...');

  try {
    // Drop the progression tables
    console.log('Dropping progression tables...');
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS class_progressions CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS progression_types CASCADE;' });

    // Drop the static rulebook tables
    console.log('Dropping static tables...');
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS spells CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS features CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS subclasses CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS races CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS subraces CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS backgrounds CASCADE;' });
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS classes CASCADE;' });

    // Modify characters table to remove foreign key constraints
    console.log('Removing foreign key constraints from characters table...');
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_class_id_fkey;' });
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_subclass_id_fkey;' });
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_race_id_fkey;' });
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_subrace_id_fkey;' });
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_background_id_fkey;' });

    console.log('Cleanup migration applied successfully!');
  } catch (error) {
    console.error('Error applying cleanup:', error);
    process.exit(1);
  }
}

applyCleanup();
