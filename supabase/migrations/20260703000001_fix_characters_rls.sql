-- Assign legacy characters (created before user_id existed) to Thomas's account
UPDATE characters
SET user_id = (SELECT id FROM auth.users WHERE email = 'thomasvanrens@gmail.com')
WHERE user_id IS NULL;

-- Drop the legacy permissive policy. The drops in 20240101000004 targeted
-- policy names that never existed on this table, so this one stayed active
-- and made every character readable/writable with the anon key.
DROP POLICY IF EXISTS "Allow all on characters" ON characters;
