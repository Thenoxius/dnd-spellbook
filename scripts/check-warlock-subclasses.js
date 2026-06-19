const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWarlockSubclasses() {
  console.log('Checking current warlock subclasses...');
  
  const { data, error } = await supabase
    .from('subclasses')
    .select('*')
    .eq('class_id', 'warlock');
  
  if (error) {
    console.error('Error fetching warlock subclasses:', error);
  } else {
    console.log(`Found ${data.length} warlock subclasses:`);
    data.forEach(subclass => {
      console.log(`- ${subclass.name} (id: ${subclass.id})`);
    });
  }
}

checkWarlockSubclasses().catch(console.error);
