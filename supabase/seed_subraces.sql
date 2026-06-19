-- Seed subraces data

-- Human subraces
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('human_variant', 'human', 'Human (Variant)', '{}', '[]'),
('human_standard', 'human', 'Human (Standard)', '{"STR":1,"DEX":1,"CON":1,"INT":1,"WIS":1,"CHA":1}', '[]');

-- Elf subraces
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('high_elf', 'elf', 'High Elf', '{"INT":1}', '[]'),
('wood_elf', 'elf', 'Wood Elf', '{"WIS":1}', '[]'),
('drow', 'elf', 'Drow', '{"CHA":1}', '[]');

-- Dwarf subraces
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('hill_dwarf', 'dwarf', 'Hill Dwarf', '{"WIS":1}', '[]'),
('mountain_dwarf', 'dwarf', 'Mountain Dwarf', '{"STR":2}', '[]');

-- Halfling subraces
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('lightfoot_halfling', 'halfling', 'Lightfoot Halfling', '{"CHA":1}', '[]'),
('stout_halfling', 'halfling', 'Stout Halfling', '{"CON":1}', '[]');

-- Gnome subraces
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('forest_gnome', 'gnome', 'Forest Gnome', '{"DEX":1}', '[]'),
('rock_gnome', 'gnome', 'Rock Gnome', '{"CON":1}', '[]');

-- Half-elf subraces (variant options)
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('half_elf_variant', 'half_elf', 'Half-Elf (Variant)', '{}', '[]');

-- Half-orc subraces
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('half_orc_standard', 'half_orc', 'Half-Orc', '{}', '[]');

-- Tiefling subraces
INSERT INTO subraces (id, race_id, name, stat_bonuses, granted_spells) VALUES
('tiefling_variant', 'tiefling', 'Tiefling (Variant)', '{}', '[]');
