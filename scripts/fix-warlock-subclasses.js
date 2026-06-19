const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixWarlockSubclasses() {
  console.log('Fixing Warlock subclasses...');
  
  // Remove incorrect patron-based subclasses
  const patronSubclasses = ['archfey', 'celestial', 'hexblade', 'genie'];
  
  for (const subclassId of patronSubclasses) {
    const { error } = await supabase.from('subclasses').delete().eq('id', subclassId);
    if (error) {
      console.error(`Error deleting ${subclassId}:`, error);
    } else {
      console.log(`✓ Deleted: ${subclassId}`);
    }
  }
  
  // Add correct warlock pacts
  const warlockPacts = [
    { id: 'pact_of_the_chain', name: 'Pact of the Chain', level: 3 },
    { id: 'pact_of_the_blade', name: 'Pact of the Blade', level: 3 },
    { id: 'pact_of_the_tome', name: 'Pact of the Tome', level: 3 },
    { id: 'pact_of_the_talisman', name: 'Pact of the Talisman', level: 3 }
  ];
  
  for (const pact of warlockPacts) {
    const { error } = await supabase.from('subclasses').upsert({
      id: pact.id,
      class_id: 'warlock',
      name: pact.name,
      bonus_spells: JSON.stringify([]),
      subclass_level_required: pact.level
    }, { onConflict: 'id' });
    
    if (error) {
      console.error(`Error inserting ${pact.name}:`, error);
    } else {
      console.log(`✓ Added: ${pact.name}`);
    }
  }
  
  console.log('Warlock subclasses fixed successfully!');
}

fixWarlockSubclasses().catch(console.error);
