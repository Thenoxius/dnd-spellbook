const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('Verifying migration...\n');

  // Check if progression_types table exists and has data
  try {
    const { data: progressionTypes, error: typesError } = await supabase
      .from('progression_types')
      .select('*')
      .limit(5);

    if (typesError) {
      console.error('❌ progression_types table error:', typesError.message);
    } else {
      console.log('✓ progression_types table exists');
      console.log(`  Found ${progressionTypes.length} progression types`);
      if (progressionTypes.length > 0) {
        console.log('  Sample:', progressionTypes[0]);
      }
    }
  } catch (error) {
    console.error('❌ Error checking progression_types:', error.message);
  }

  // Check if class_progressions table exists and has data
  try {
    const { data: classProgressions, error: progressionsError } = await supabase
      .from('class_progressions')
      .select('*')
      .limit(5);

    if (progressionsError) {
      console.error('❌ class_progressions table error:', progressionsError.message);
    } else {
      console.log('✓ class_progressions table exists');
      console.log(`  Found ${classProgressions.length} class progressions`);
      if (classProgressions.length > 0) {
        console.log('  Sample:', classProgressions[0]);
      }
    }
  } catch (error) {
    console.error('❌ Error checking class_progressions:', error.message);
  }

  // Check if features table has the new feature_type column
  try {
    const { data: features, error: featuresError } = await supabase
      .from('features')
      .select('id, name, feature_type')
      .limit(5);

    if (featuresError) {
      console.error('❌ features table error:', featuresError.message);
    } else {
      console.log('✓ features table exists with feature_type column');
      console.log(`  Found ${features.length} features`);
      if (features.length > 0) {
        console.log('  Sample:', features[0]);
      }
    }
  } catch (error) {
    console.error('❌ Error checking features:', error.message);
  }

  // Check if Warlock progressions were seeded
  try {
    const { data: warlockProgressions, error: warlockError } = await supabase
      .from('class_progressions')
      .select('*')
      .eq('class_id', 'warlock')
      .limit(5);

    if (warlockError) {
      console.error('❌ Warlock progressions error:', warlockError.message);
    } else {
      console.log('✓ Warlock progressions seeded');
      console.log(`  Found ${warlockProgressions.length} Warlock progressions`);
      if (warlockProgressions.length > 0) {
        console.log('  Sample:', warlockProgressions[0]);
      }
    }
  } catch (error) {
    console.error('❌ Error checking Warlock progressions:', error.message);
  }

  console.log('\nVerification complete!');
}

verifyMigration();
