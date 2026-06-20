-- Enable Row Level Security on subraces table
ALTER TABLE subraces ENABLE ROW LEVEL SECURITY;

-- Allow public read access for subraces
CREATE POLICY "Allow public read on subraces" ON subraces FOR SELECT USING (true);
