# Database Seeding Guide

This guide explains how to populate your database with real D&D 5e data for spells, subclasses, races, subraces, and other reference data.

## Current State

The current `seed.sql` file contains sample data for testing purposes. For a production-ready application, you'll want to use comprehensive D&D 5e data.

## Options for Getting Real D&D 5e Data

### Option 1: Open5e API (Recommended)

Open5e is a free, open-source API with comprehensive D&D 5e data.

**API Endpoint:** https://api.open5e.com/

**Example endpoints:**
- Spells: https://api.open5e.com/spells/
- Classes: https://api.open5e.com/classes/
- Races: https://api.open5e.com/races/
- Subclasses: https://api.open5e.com/subclasses/

### Option 2: 5e.tools Data

5e.tools has comprehensive data that can be scraped or exported.

**Website:** https://5e.tools/

### Option 3: D&D 5e API

**API Endpoint:** https://www.dnd5eapi.co/

**Example endpoints:**
- Spells: https://www.dnd5eapi.co/api/spells
- Classes: https://www.dnd5eapi.co/api/classes
- Races: https://www.dnd5eapi.co/api/races
- Subclasses: https://www.dnd5eapi.co/api/subclasses

## Automated Seeding Script

Here's a Node.js script to fetch data from the D&D 5e API and populate your database:

```javascript
// scripts/seed-database.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAndSeedData() {
  console.log('Starting database seeding...');

  // Seed Spells
  console.log('Fetching spells...');
  const spellsResponse = await fetch('https://www.dnd5eapi.co/api/spells');
  const spellsData = await spellsResponse.json();
  
  for (const spell of spellsData.results) {
    const spellDetails = await fetch(`https://www.dnd5eapi.co${spell.url}`).then(r => r.json());
    
    const { error } = await supabase.from('spells').insert({
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
    });
    
    if (error) console.error(`Error inserting spell ${spellDetails.name}:`, error);
  }

  // Seed Classes
  console.log('Fetching classes...');
  const classesResponse = await fetch('https://www.dnd5eapi.co/api/classes');
  const classesData = await classesResponse.json();
  
  for (const cls of classesData.results) {
    const { error } = await supabase.from('classes').insert({
      id: cls.index,
      name: cls.name
    });
    
    if (error) console.error(`Error inserting class ${cls.name}:`, error);
  }

  // Seed Races
  console.log('Fetching races...');
  const racesResponse = await fetch('https://www.dnd5eapi.co/api/races');
  const racesData = await racesResponse.json();
  
  for (const race of racesData.results) {
    const raceDetails = await fetch(`https://www.dnd5eapi.co${race.url}`).then(r => r.json());
    
    const statBonuses = {};
    raceDetails.ability_bonuses?.forEach(bonus => {
      statBonuses[bonus.ability_score.index] = bonus.bonus;
    });

    const { error } = await supabase.from('races').insert({
      id: raceDetails.index,
      name: raceDetails.name,
      stat_bonuses: JSON.stringify(statBonuses),
      granted_spells: JSON.stringify(raceDetails.traits?.map(t => t.name) || [])
    });
    
    if (error) console.error(`Error inserting race ${raceDetails.name}:`, error);
  }

  // Seed Subclasses
  console.log('Fetching subclasses...');
  const subclassesResponse = await fetch('https://www.dnd5eapi.co/api/subclasses');
  const subclassesData = await subclassesResponse.json();
  
  for (const subclass of subclassesData.results) {
    const subclassDetails = await fetch(`https://www.dnd5eapi.co${subclass.url}`).then(r => r.json());
    
    const { error } = await supabase.from('subclasses').insert({
      id: subclassDetails.index,
      class_id: subclassDetails.class.index,
      name: subclassDetails.name,
      bonus_spells: JSON.stringify([]),
      subclass_level_required: subclassDetails.subclass_flavor?.level || 3
    });
    
    if (error) console.error(`Error inserting subclass ${subclassDetails.name}:`, error);
  }

  console.log('Database seeding complete!');
}

fetchAndSeedData().catch(console.error);
```

## Manual SQL Import

If you prefer to use SQL files, you can:

1. Export data from 5e.tools or other sources
2. Format it according to your schema
3. Run the SQL file in the Supabase SQL Editor

## Running the Seeding Script

1. Install dependencies:
```bash
npm install dotenv @supabase/supabase-js
```

2. Create a `.env` file with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Run the script:
```bash
node scripts/seed-database.js
```

## Important Notes

- **Service Role Key**: Use the service role key (not anon key) for seeding to bypass RLS policies
- **Data Validation**: The API data may need transformation to match your schema
- **Rate Limiting**: Some APIs have rate limits, so consider adding delays between requests
- **Incremental Seeding**: You can modify the script to only insert new data and skip existing records

## Recommended Data Sources

1. **Open5e**: Best balance of data quality and ease of use
2. **D&D 5e API**: Official-ish, well-structured data
3. **5e.tools**: Most comprehensive, but requires more processing

## Current Schema Compatibility

Your current schema expects:
- `stat_bonuses` as JSON object (e.g., `{"STR":1,"DEX":2}`)
- `granted_spells` as JSON array
- `base_class_ids` as array of class IDs
- `bonus_spells` as JSON object

Make sure to transform API data to match this format.
