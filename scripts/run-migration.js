const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running subclass migration...');
  
  const sql = fs.readFileSync('./supabase/migrations/add_more_subclasses.sql', 'utf8');
  
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('Error running migration:', error);
    // Try alternative method
    console.log('Trying alternative method...');
    
    // Parse and execute individual INSERT statements
    const statements = sql.match(/INSERT INTO subclasses[^;]+;/g);
    if (statements) {
      for (const statement of statements) {
        const { error: insertError } = await supabase.rpc('exec_sql', { sql: statement });
        if (insertError) {
          console.error('Error in statement:', insertError);
        }
      }
    }
  } else {
    console.log('Migration completed successfully!');
  }
}

runMigration().catch(console.error);
