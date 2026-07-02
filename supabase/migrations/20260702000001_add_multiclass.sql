-- Minimal multiclass support: an optional second class and its level.
-- Spellcasting remains driven by the primary class; the secondary class
-- contributes features, limited-use abilities, and total character level.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS secondary_class_id TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS secondary_level INTEGER DEFAULT 0;
