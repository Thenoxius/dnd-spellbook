const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAndSeedData() {
  console.log('Starting database seeding...');

  try {
    // Seed Spells
    console.log('Fetching spells...');
    const spellsResponse = await fetch('https://www.dnd5eapi.co/api/spells');
    const spellsData = await spellsResponse.json();
    
    for (const spell of spellsData.results) {
      try {
        const spellDetails = await fetch(`https://www.dnd5eapi.co${spell.url}`).then(r => r.json());
        
        const { error } = await supabase.from('spells').upsert({
          id: spellDetails.index,
          name: spellDetails.name,
          level: spellDetails.level,
          school: spellDetails.school.name,
          casting_time: spellDetails.casting_time,
          range: spellDetails.range,
          components: spellDetails.components.join(', '),
          duration: spellDetails.duration,
          concentration: spellDetails.concentration,
          ritual: spellDetails.ritual,
          description: spellDetails.desc?.join(' ') || '',
          base_class_ids: spellDetails.classes?.map(c => c.index) || []
        }, { onConflict: 'id' });
        
        if (error) console.error(`Error inserting spell ${spellDetails.name}:`, error);
        else console.log(`Inserted spell: ${spellDetails.name}`);
      } catch (err) {
        console.error(`Error fetching spell details for ${spell.name}:`, err);
      }
    }

    // Seed Classes
    console.log('Fetching classes...');
    const classesResponse = await fetch('https://www.dnd5eapi.co/api/classes');
    const classesData = await classesResponse.json();
    
    for (const cls of classesData.results) {
      const { error } = await supabase.from('classes').upsert({
        id: cls.index,
        name: cls.name
      }, { onConflict: 'id' });
      
      if (error) console.error(`Error inserting class ${cls.name}:`, error);
      else console.log(`Inserted class: ${cls.name}`);
    }

    // Seed Races
    console.log('Fetching races...');
    const racesResponse = await fetch('https://www.dnd5eapi.co/api/races');
    const racesData = await racesResponse.json();
    
    for (const race of racesData.results) {
      try {
        const raceDetails = await fetch(`https://www.dnd5eapi.co${race.url}`).then(r => r.json());
        
        const statBonuses = {};
        raceDetails.ability_bonuses?.forEach(bonus => {
          statBonuses[bonus.ability_score.index] = bonus.bonus;
        });

        const { error } = await supabase.from('races').upsert({
          id: raceDetails.index,
          name: raceDetails.name,
          stat_bonuses: JSON.stringify(statBonuses),
          granted_spells: JSON.stringify(raceDetails.traits?.map(t => t.name) || [])
        }, { onConflict: 'id' });
        
        if (error) console.error(`Error inserting race ${raceDetails.name}:`, error);
        else console.log(`Inserted race: ${raceDetails.name}`);
      } catch (err) {
        console.error(`Error fetching race details for ${race.name}:`, err);
      }
    }

    // Seed Subclasses
    console.log('Fetching subclasses...');
    const subclassesResponse = await fetch('https://www.dnd5eapi.co/api/2014/subclasses');
    const subclassesData = await subclassesResponse.json();
    
    console.log(`Found ${subclassesData.count} subclasses in API`);
    
    for (const subclass of subclassesData.results) {
      try {
        const subclassDetails = await fetch(`https://www.dnd5eapi.co${subclass.url}`).then(r => r.json());
        
        const { error } = await supabase.from('subclasses').upsert({
          id: subclassDetails.index,
          class_id: subclassDetails.class.index,
          name: subclassDetails.name,
          bonus_spells: JSON.stringify([]),
          subclass_level_required: 3
        }, { onConflict: 'id' });
        
        if (error) console.error(`Error inserting subclass ${subclassDetails.name}:`, error);
        else console.log(`Inserted subclass: ${subclassDetails.name}`);
      } catch (err) {
        console.error(`Error fetching subclass details for ${subclass.name}:`, err);
      }
    }

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error during seeding:', error);
  }
}

fetchAndSeedData();
