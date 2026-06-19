-- Create subraces table
CREATE TABLE IF NOT EXISTS subraces (
  id TEXT PRIMARY KEY,
  race_id TEXT NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stat_bonuses JSONB DEFAULT '{}',
  granted_spells JSONB DEFAULT '[]'
);

-- Add subrace_id to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS subrace_id TEXT REFERENCES subraces(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subraces_race_id ON subraces(race_id);
