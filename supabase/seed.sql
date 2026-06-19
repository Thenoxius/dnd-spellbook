-- Sample D&D 5e data for testing

-- Classes
INSERT INTO classes (id, name) VALUES
('barbarian', 'Barbarian'),
('bard', 'Bard'),
('cleric', 'Cleric'),
('druid', 'Druid'),
('fighter', 'Fighter'),
('monk', 'Monk'),
('paladin', 'Paladin'),
('ranger', 'Ranger'),
('rogue', 'Rogue'),
('sorcerer', 'Sorcerer'),
('warlock', 'Warlock'),
('wizard', 'Wizard');

-- Subclasses
INSERT INTO subclasses (id, class_id, name, bonus_spells, subclass_level_required) VALUES
('path_of_berserker', 'barbarian', 'Path of the Berserker', '{}', 3),
('college_of_lore', 'bard', 'College of Lore', '{}', 3),
('life_domain', 'cleric', 'Life Domain', '{}', 1),
('circle_of_land', 'druid', 'Circle of Land', '{}', 2),
('champion', 'fighter', 'Champion', '{}', 3),
('way_of_shadow', 'monk', 'Way of Shadow', '{}', 3),
('oath_of_devotion', 'paladin', 'Oath of Devotion', '{}', 3),
('hunter', 'ranger', 'Hunter', '{}', 3),
('thief', 'rogue', 'Thief', '{}', 3),
('draconic_sorcery', 'sorcerer', 'Draconic Sorcery', '{}', 1),
('the_fiend', 'warlock', 'The Fiend', '{}', 1),
('evocation_school', 'wizard', 'School of Evocation', '{}', 2);

-- Races
INSERT INTO races (id, name, stat_bonuses, granted_spells) VALUES
('human', 'Human', '{"STR":1,"DEX":1,"CON":1,"INT":1,"WIS":1,"CHA":1}', '[]'),
('elf', 'Elf', '{"DEX":2}', '[]'),
('dwarf', 'Dwarf', '{"CON":2}', '[]'),
('halfling', 'Halfling', '{"DEX":2}', '[]'),
('dragonborn', 'Dragonborn', '{"STR":2,"CHA":1}', '[]'),
('gnome', 'Gnome', '{"INT":2}', '[]'),
('half_elf', 'Half-Elf', '{"CHA":2}', '[]'),
('half_orc', 'Half-Orc', '{"STR":2,"CON":1}', '[]'),
('tiefling', 'Tiefling', '{"CHA":2,"INT":1}', '[]');

-- Backgrounds
INSERT INTO backgrounds (id, name, skills, feature_name, feature_desc) VALUES
('acolyte', 'Acolyte', ARRAY['Insight', 'Religion'], 'Shelter of the Faithful', 'You can perform religious ceremonies and receive free healing and care at temples.'),
('criminal', 'Criminal', ARRAY['Deception', 'Stealth'], 'Criminal Contact', 'You have a reliable and trustworthy contact in the criminal underworld.'),
('folk_hero', 'Folk Hero', ARRAY['Animal Handling', 'Survival'], 'Rustic Hospitality', 'You can secure free room and board for yourself and your companions in rural areas.'),
('noble', 'Noble', ARRAY['History', 'Persuasion'], 'Position of Privilege', 'You can secure an audience with local nobility and receive free lodging and food.'),
('sage', 'Sage', ARRAY['Arcana', 'History'], 'Researcher', 'You can find information about obscure topics in libraries and archives.'),
('soldier', 'Soldier', ARRAY['Athletics', 'Intimidation'], 'Military Rank', 'You can secure free lodging and food for yourself and your companions in military installations.');

-- Sample Spells (limited set for testing)
INSERT INTO spells (id, name, level, school, casting_time, range, components, duration, concentration, ritual, description, base_class_ids) VALUES
('firebolt', 'Fire Bolt', 0, 'Evocation', '1 action', '120 ft', 'V, S', 'Instantaneous', false, false, 'You hurl a mote of fire at a creature or object within range.', ARRAY['sorcerer', 'wizard']),
('mage_hand', 'Mage Hand', 0, 'Conjuration', '1 action', '30 ft', 'V, S', '1 minute', false, false, 'A spectral, floating hand appears at a point you choose within range.', ARRAY['bard', 'sorcerer', 'warlock', 'wizard']),
('sacred_flame', 'Sacred Flame', 0, 'Evocation', '1 action', '60 ft', 'V, S', 'Instantaneous', false, false, 'Flame-like radiance descends on a creature that you can see within range.', ARRAY['cleric']),
('guidance', 'Guidance', 0, 'Divination', '1 action', 'Touch', 'V, S', '1 minute', false, false, 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.', ARRAY['bard', 'cleric', 'druid', 'wizard']),
('light', 'Light', 0, 'Evocation', '1 action', 'Touch', 'V, M', '1 hour', false, true, 'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.', ARRAY['bard', 'cleric', 'sorcerer', 'wizard']),
('fireball', 'Fireball', 3, 'Evocation', '1 action', '150 ft', 'V, S, M', 'Instantaneous', false, false, 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.', ARRAY['sorcerer', 'wizard']),
('cure_wounds', 'Cure Wounds', 1, 'Evocation', '1 action', 'Touch', 'V, S', 'Instantaneous', false, false, 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.', ARRAY['bard', 'cleric', 'druid', 'paladin', 'ranger']),
('healing_word', 'Healing Word', 1, 'Evocation', '1 bonus action', '60 ft', 'V', 'Instantaneous', false, false, 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.', ARRAY['bard', 'cleric', 'druid']),
('magic_missile', 'Magic Missile', 1, 'Evocation', '1 action', '120 ft', 'V, S', 'Instantaneous', false, false, 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range.', ARRAY['sorcerer', 'wizard']),
('shield', 'Shield', 1, 'Abjuration', '1 reaction', 'Self', 'V, S', '1 round', false, false, 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack.', ARRAY['sorcerer', 'wizard']),
('bless', 'Bless', 1, 'Enchantment', '1 action', '30 ft', 'V, S, M', '1 minute', true, false, 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.', ARRAY['cleric', 'paladin']),
('hold_person', 'Hold Person', 2, 'Enchantment', '1 action', '60 ft', 'V, S, M', '1 minute', true, false, 'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration.', ARRAY['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']);

-- Sample Features
INSERT INTO features (id, source_id, source_type, level_required, name, description) VALUES
('barb_rage', 'barbarian', 'class', 1, 'Rage', 'On your turn, you can enter a rage as a bonus action. While raging, you gain the following benefits if you aren''t wearing heavy armor: Advantage on Strength checks and saving throws; +2 bonus to damage rolls with melee weapon attacks; Resistance to bludgeoning, piercing, and slashing damage.'),
('barb_unarmored_defense', 'barbarian', 'class', 1, 'Unarmored Defense', 'While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.'),
('cleric_divine_domain', 'cleric', 'class', 1, 'Divine Domain', 'Choose one domain related to your deity: Knowledge, Life, Light, Nature, Tempest, Trickery, or War. Each domain is detailed at the end of the class description.'),
('cleric_spellcasting', 'cleric', 'class', 1, 'Spellcasting', 'You can cast cleric spells using Wisdom as your spellcasting ability.'),
('wizard_arcane_recovery', 'wizard', 'class', 1, 'Arcane Recovery', 'Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to or less than half your wizard level (rounded up), and none of the slots can be 6th level or higher.'),
('wizard_spellcasting', 'wizard', 'class', 1, 'Spellcasting', 'You can cast wizard spells using Intelligence as your spellcasting ability.'),
('fighter_fighting_style', 'fighter', 'class', 1, 'Fighting Style', 'You adopt a particular style of fighting as your specialty. Choose one of the following options: Archery, Defense, Dueling, Great Weapon Fighting, Protection, Two-Weapon Fighting.'),
('fighter_second_wind', 'fighter', 'class', 1, 'Second Wind', 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level.'),
('rogue_expertise', 'rogue', 'class', 1, 'Expertise', 'Choose two of your skill proficiencies, or one of your skill proficiencies and one of your tool proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.'),
('rogue_sneak_attack', 'rogue', 'class', 1, 'Sneak Attack', 'You know how to strike subtly and exploit a foe''s distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll.');
