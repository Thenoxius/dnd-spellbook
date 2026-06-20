-- Clean up static tables after migrating to local data
-- This migration drops the static rulebook tables that are now served from local TypeScript files

-- Drop the progression tables (they were never successfully applied)
DROP TABLE IF EXISTS class_progressions CASCADE;
DROP TABLE IF EXISTS progression_types CASCADE;

-- Drop the static rulebook tables
DROP TABLE IF EXISTS spells CASCADE;
DROP TABLE IF EXISTS features CASCADE;
DROP TABLE IF EXISTS subclasses CASCADE;
DROP TABLE IF EXISTS races CASCADE;
DROP TABLE IF EXISTS subraces CASCADE;
DROP TABLE IF EXISTS backgrounds CASCADE;
DROP TABLE IF EXISTS classes CASCADE;

-- Modify characters table to remove foreign key constraints
-- The columns will now store plain TEXT references instead of foreign keys
ALTER TABLE characters 
  DROP CONSTRAINT IF EXISTS characters_class_id_fkey,
  DROP CONSTRAINT IF EXISTS characters_subclass_id_fkey,
  DROP CONSTRAINT IF EXISTS characters_race_id_fkey,
  DROP CONSTRAINT IF EXISTS characters_subrace_id_fkey,
  DROP CONSTRAINT IF EXISTS characters_background_id_fkey;

-- Note: The columns themselves (class_id, subclass_id, race_id, subrace_id, background_id) 
-- are kept as TEXT fields to store references like "warlock", "fiend", etc.
-- The application now maps these IDs to local data instead of database joins.
