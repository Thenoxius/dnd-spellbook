const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const additionalSubclasses = [
  // Barbarian Subclasses
  { id: 'path_of_battlerager', class_id: 'barbarian', name: 'Path of the Battlerager', level: 3 },
  { id: 'path_of_totem_warrior', class_id: 'barbarian', name: 'Path of the Totem Warrior', level: 3 },
  { id: 'path_of_ancestral_guardian', class_id: 'barbarian', name: 'Path of the Ancestral Guardian', level: 3 },
  { id: 'path_of_storm_herald', class_id: 'barbarian', name: 'Path of the Storm Herald', level: 3 },
  { id: 'path_of_zealot', class_id: 'barbarian', name: 'Path of the Zealot', level: 3 },

  // Bard Colleges
  { id: 'college_of_valor', class_id: 'bard', name: 'College of Valor', level: 3 },
  { id: 'college_of_glamour', class_id: 'bard', name: 'College of Glamour', level: 3 },
  { id: 'college_of_swords', class_id: 'bard', name: 'College of Swords', level: 3 },
  { id: 'college_of_whispers', class_id: 'bard', name: 'College of Whispers', level: 3 },

  // Cleric Domains
  { id: 'knowledge_domain', class_id: 'cleric', name: 'Knowledge Domain', level: 1 },
  { id: 'light_domain', class_id: 'cleric', name: 'Light Domain', level: 1 },
  { id: 'nature_domain', class_id: 'cleric', name: 'Nature Domain', level: 1 },
  { id: 'tempest_domain', class_id: 'cleric', name: 'Tempest Domain', level: 1 },
  { id: 'trickery_domain', class_id: 'cleric', name: 'Trickery Domain', level: 1 },
  { id: 'war_domain', class_id: 'cleric', name: 'War Domain', level: 1 },

  // Druid Circles
  { id: 'circle_of_moon', class_id: 'druid', name: 'Circle of the Moon', level: 2 },
  { id: 'circle_of_spores', class_id: 'druid', name: 'Circle of Spores', level: 2 },
  { id: 'circle_of_dreams', class_id: 'druid', name: 'Circle of Dreams', level: 2 },
  { id: 'circle_of_shepherd', class_id: 'druid', name: 'Circle of the Shepherd', level: 2 },

  // Fighter Archetypes
  { id: 'battle_master', class_id: 'fighter', name: 'Battle Master', level: 3 },
  { id: 'eldritch_knight', class_id: 'fighter', name: 'Eldritch Knight', level: 3 },
  { id: 'purple_dragon_knight', class_id: 'fighter', name: 'Purple Dragon Knight', level: 3 },
  { id: 'cavalier', class_id: 'fighter', name: 'Cavalier', level: 3 },
  { id: 'samurai', class_id: 'fighter', name: 'Samurai', level: 3 },
  { id: 'arcane_archer', class_id: 'fighter', name: 'Arcane Archer', level: 3 },

  // Monk Traditions
  { id: 'way_of_four_elements', class_id: 'monk', name: 'Way of the Four Elements', level: 3 },
  { id: 'way_of_kensei', class_id: 'monk', name: 'Way of the Kensei', level: 3 },
  { id: 'way_of_mercy', class_id: 'monk', name: 'Way of Mercy', level: 3 },
  { id: 'way_of_the_drunken_master', class_id: 'monk', name: 'Way of the Drunken Master', level: 3 },
  { id: 'way_of_the_sun_soul', class_id: 'monk', name: 'Way of the Sun Soul', level: 3 },

  // Paladin Oaths
  { id: 'oath_of_ancients', class_id: 'paladin', name: 'Oath of Ancients', level: 3 },
  { id: 'oath_of_vengeance', class_id: 'paladin', name: 'Oath of Vengeance', level: 3 },
  { id: 'oath_of_crown', class_id: 'paladin', name: 'Oath of the Crown', level: 3 },
  { id: 'oath_of_conquest', class_id: 'paladin', name: 'Oath of Conquest', level: 3 },
  { id: 'oath_of_redemption', class_id: 'paladin', name: 'Oath of Redemption', level: 3 },

  // Ranger Conclaves
  { id: 'gloom_stalker', class_id: 'ranger', name: 'Gloom Stalker', level: 3 },
  { id: 'horizon_walker', class_id: 'ranger', name: 'Horizon Walker', level: 3 },
  { id: 'monster_slayer', class_id: 'ranger', name: 'Monster Slayer', level: 3 },
  { id: 'fey_wanderer', class_id: 'ranger', name: 'Fey Wanderer', level: 3 },
  { id: 'swarmkeeper', class_id: 'ranger', name: 'Swarmkeeper', level: 3 },

  // Rogue Archetypes
  { id: 'assassin', class_id: 'rogue', name: 'Assassin', level: 3 },
  { id: 'arcane_trickster', class_id: 'rogue', name: 'Arcane Trickster', level: 3 },
  { id: 'mastermind', class_id: 'rogue', name: 'Mastermind', level: 3 },
  { id: 'phantom', class_id: 'rogue', name: 'Phantom', level: 3 },
  { id: 'soulknife', class_id: 'rogue', name: 'Soulknife', level: 3 },
  { id: 'swashbuckler', class_id: 'rogue', name: 'Swashbuckler', level: 3 },
  { id: 'inquisitive', class_id: 'rogue', name: 'Inquisitive', level: 3 },

  // Sorcerous Origins
  { id: 'wild_magic', class_id: 'sorcerer', name: 'Wild Magic', level: 1 },
  { id: 'divine_soul', class_id: 'sorcerer', name: 'Divine Soul', level: 1 },
  { id: 'shadow_magic', class_id: 'sorcerer', name: 'Shadow Magic', level: 1 },
  { id: 'storm_sorcery', class_id: 'sorcerer', name: 'Storm Sorcery', level: 1 },
  { id: 'phoenix_sorcery', class_id: 'sorcerer', name: 'Phoenix Sorcery', level: 1 },

  // Warlock Patrons
  { id: 'archfey', class_id: 'warlock', name: 'Archfey', level: 1 },
  { id: 'celestial', class_id: 'warlock', name: 'The Celestial', level: 1 },
  { id: 'hexblade', class_id: 'warlock', name: 'Hexblade', level: 1 },
  { id: 'genie', class_id: 'warlock', name: 'Genie', level: 1 },

  // Wizard Schools
  { id: 'school_of_abjuration', class_id: 'wizard', name: 'School of Abjuration', level: 2 },
  { id: 'school_of_conjuration', class_id: 'wizard', name: 'School of Conjuration', level: 2 },
  { id: 'school_of_divination', class_id: 'wizard', name: 'School of Divination', level: 2 },
  { id: 'school_of_enchantment', class_id: 'wizard', name: 'School of Enchantment', level: 2 },
  { id: 'school_of_illusion', class_id: 'wizard', name: 'School of Illusion', level: 2 },
  { id: 'school_of_necromancy', class_id: 'wizard', name: 'School of Necromancy', level: 2 },
  { id: 'school_of_transmutation', class_id: 'wizard', name: 'School of Transmutation', level: 2 },
  { id: 'school_of_bladesinging', class_id: 'wizard', name: 'School of Bladesinging', level: 2 },
  { id: 'school_of_chronurgy', class_id: 'wizard', name: 'School of Chronurgy', level: 2 },
  { id: 'school_of_order_of_scribes', class_id: 'wizard', name: 'Order of Scribes', level: 2 },
  { id: 'school_of_war_magic', class_id: 'wizard', name: 'School of War Magic', level: 2 }
];

async function addSubclasses() {
  console.log(`Adding ${additionalSubclasses.length} additional subclasses...`);
  
  let added = 0;
  let skipped = 0;
  
  for (const subclass of additionalSubclasses) {
    const { error } = await supabase.from('subclasses').upsert({
      id: subclass.id,
      class_id: subclass.class_id,
      name: subclass.name,
      bonus_spells: JSON.stringify([]),
      subclass_level_required: subclass.level
    }, { onConflict: 'id' });
    
    if (error) {
      console.error(`Error inserting ${subclass.name}:`, error);
    } else {
      added++;
      console.log(`✓ Added: ${subclass.name}`);
    }
  }
  
  console.log(`\nCompleted! Added ${added} subclasses.`);
}

addSubclasses().catch(console.error);
