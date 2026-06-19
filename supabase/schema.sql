-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Classes table
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Subclasses table
CREATE TABLE subclasses (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bonus_spells JSONB DEFAULT '{}',
  subclass_level_required INTEGER DEFAULT 3
);

-- Races table
CREATE TABLE races (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stat_bonuses JSONB DEFAULT '{}',
  granted_spells JSONB DEFAULT '[]'
);

-- Backgrounds table
CREATE TABLE backgrounds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  feature_name TEXT,
  feature_desc TEXT
);

-- Spells table
CREATE TABLE spells (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  school TEXT NOT NULL,
  casting_time TEXT NOT NULL,
  range TEXT NOT NULL,
  components TEXT NOT NULL,
  duration TEXT NOT NULL,
  concentration BOOLEAN DEFAULT false,
  ritual BOOLEAN DEFAULT false,
  description TEXT,
  base_class_ids TEXT[] DEFAULT '{}'
);

-- Features table
CREATE TABLE features (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('class', 'subclass')),
  level_required INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT
);

-- Characters table
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  hp_current INTEGER NOT NULL,
  hp_max INTEGER NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id),
  subclass_id TEXT REFERENCES subclasses(id),
  race_id TEXT NOT NULL REFERENCES races(id),
  background_id TEXT NOT NULL REFERENCES backgrounds(id),
  str INTEGER NOT NULL DEFAULT 10,
  dex INTEGER NOT NULL DEFAULT 10,
  con INTEGER NOT NULL DEFAULT 10,
  int INTEGER NOT NULL DEFAULT 10,
  wis INTEGER NOT NULL DEFAULT 10,
  cha INTEGER NOT NULL DEFAULT 10,
  spell_slots JSONB DEFAULT '{}',
  prepared_spells TEXT[] DEFAULT '{}',
  currency JSONB DEFAULT '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}',
  inventory JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_characters_class_id ON characters(class_id);
CREATE INDEX idx_characters_subclass_id ON characters(subclass_id);
CREATE INDEX idx_characters_race_id ON characters(race_id);
CREATE INDEX idx_characters_background_id ON characters(background_id);
CREATE INDEX idx_spells_base_class_ids ON spells USING GIN(base_class_ids);
CREATE INDEX idx_subclasses_class_id ON subclasses(class_id);
CREATE INDEX idx_features_source_id ON features(source_id);

-- Enable Row Level Security
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subclasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- Allow public read access for reference tables
CREATE POLICY "Allow public read on classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Allow public read on subclasses" ON subclasses FOR SELECT USING (true);
CREATE POLICY "Allow public read on races" ON races FOR SELECT USING (true);
CREATE POLICY "Allow public read on backgrounds" ON backgrounds FOR SELECT USING (true);
CREATE POLICY "Allow public read on spells" ON spells FOR SELECT USING (true);
CREATE POLICY "Allow public read on features" ON features FOR SELECT USING (true);

-- Characters table - allow all operations (you may want to restrict this based on auth)
CREATE POLICY "Allow all on characters" ON characters FOR ALL USING (true);
