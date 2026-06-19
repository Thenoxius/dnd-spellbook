-- Allow public insert on spells table for custom spell creation
CREATE POLICY "Allow public insert on spells" ON spells FOR INSERT WITH CHECK (true);
