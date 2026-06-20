const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndExportTable(tableName) {
  console.log(`\nChecking ${tableName}...`);
  
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: false });
    
    if (error) {
      console.error(`❌ Error checking ${tableName}:`, error.message);
      return;
    }
    
    console.log(`✓ Found ${data.length} rows in ${tableName}`);
    
    if (data.length > 0) {
      // Export to JSON
      const exportDir = path.join(__dirname, '../src/data/exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      const exportFile = path.join(exportDir, `${tableName}.json`);
      fs.writeFileSync(exportFile, JSON.stringify(data, null, 2));
      console.log(`  → Exported to ${exportFile}`);
      
      // Show sample data
      console.log(`  Sample data:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
    }
  } catch (error) {
    console.error(`❌ Error checking ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('Checking existing data in Supabase tables...');
  
  const tables = [
    'classes',
    'subclasses', 
    'races',
    'subraces',
    'backgrounds',
    'spells',
    'features',
    'characters',
    'user_profiles'
  ];
  
  for (const table of tables) {
    await checkAndExportTable(table);
  }
  
  console.log('\n✓ Data check complete');
  console.log('Exported files are in src/data/exports/');
}

main();
