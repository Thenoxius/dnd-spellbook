-- Add class progression system
-- This allows tracking different types of abilities that unlock at different levels per class

-- Progression types table (defines what kind of progression we're tracking)
CREATE TABLE progression_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('resource', 'feature', 'limit'))
);

-- Class progression table (stores progression data per class per level)
CREATE TABLE class_progressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 20),
  progression_type_id TEXT NOT NULL REFERENCES progression_types(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, level, progression_type_id)
);

-- Enhance features table with feature type
ALTER TABLE features ADD COLUMN feature_type TEXT DEFAULT 'class_feature' CHECK (feature_type IN (
  'class_feature', 
  'subclass_feature', 
  'invocation', 
  'mystic_arcanum', 
  'metamagic', 
  'fighting_style',
  'ki_feature',
  'rune_feature',
  'other'
));

-- Add indexes
CREATE INDEX idx_class_progressions_class_id ON class_progressions(class_id);
CREATE INDEX idx_class_progressions_level ON class_progressions(level);
CREATE INDEX idx_class_progressions_type ON class_progressions(progression_type_id);

-- Enable RLS
ALTER TABLE progression_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_progressions ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read on progression_types" ON progression_types FOR SELECT USING (true);
CREATE POLICY "Allow public read on class_progressions" ON class_progressions FOR SELECT USING (true);

-- Seed progression types
INSERT INTO progression_types (id, name, description, category) VALUES
  ('proficiency_bonus', 'Proficiency Bonus', 'Proficiency bonus at each level', 'resource'),
  ('cantrips_known', 'Cantrips Known', 'Number of cantrips known at each level', 'resource'),
  ('spells_known', 'Spells Known', 'Number of spells known at each level', 'resource'),
  ('spell_slots', 'Spell Slots', 'Spell slot configuration per level', 'resource'),
  ('invocations_known', 'Invocations Known', 'Number of eldritch invocations known', 'resource'),
  ('metamagic_known', 'Metamagic Known', 'Number of metamagic options known', 'resource'),
  ('ki_points', 'Ki Points', 'Ki points available at each level', 'resource'),
  ('runic_features', 'Runic Features', 'Number of rune features known', 'resource'),
  ('fighting_styles', 'Fighting Styles', 'Number of fighting styles known', 'resource'),
  ('class_features', 'Class Features', 'Features gained at each level', 'feature');
