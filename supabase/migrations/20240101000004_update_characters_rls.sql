-- Add user_id column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing characters to have a default user_id (temporary migration)
-- This will need to be run once to migrate existing data
UPDATE characters SET user_id = auth.uid() WHERE user_id IS NULL;

-- Make user_id NOT NULL after migration
-- ALTER TABLE characters ALTER COLUMN user_id SET NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read on characters" ON characters;
DROP POLICY IF EXISTS "Allow public insert on characters" ON characters;
DROP POLICY IF EXISTS "Allow public update on characters" ON characters;
DROP POLICY IF EXISTS "Allow public delete on characters" ON characters;

-- Create new user-specific policies
CREATE POLICY "Users can read own characters"
  ON characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters"
  ON characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters"
  ON characters FOR DELETE
  USING (auth.uid() = user_id);
