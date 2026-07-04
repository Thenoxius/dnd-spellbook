-- Feats, eldritch invocations, and homebrew options chosen by the character.
-- Stored as a JSONB array of objects: { id, type: 'feat' | 'invocation' | 'custom', name?, description? }.
-- Known feats/invocations resolve their text from local data by id; custom
-- entries carry their own name and description.
ALTER TABLE characters ADD COLUMN IF NOT EXISTS feats JSONB DEFAULT '[]';
