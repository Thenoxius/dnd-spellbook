-- Add temp_hp field to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS temp_hp INTEGER DEFAULT 0;
