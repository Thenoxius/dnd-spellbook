-- Additional subclasses beyond what the D&D 5e API provides
-- This adds more comprehensive subclass data for D&D 5e

INSERT INTO subclasses (id, class_id, name, bonus_spells, subclass_level_required) VALUES
-- Barbarian Subclasses
('path_of_battlerager', 'barbarian', 'Path of the Battlerager', '{}', 3),
('path_of_totem_warrior', 'barbarian', 'Path of the Totem Warrior', '{}', 3),
('path_of_ancestral_guardian', 'barbarian', 'Path of the Ancestral Guardian', '{}', 3),
('path_of_storm_herald', 'barbarian', 'Path of the Storm Herald', '{}', 3),
('path_of_zealot', 'barbarian', 'Path of the Zealot', '{}', 3),

-- Bard Colleges
('college_of_valor', 'bard', 'College of Valor', '{}', 3),
('college_of_glamour', 'bard', 'College of Glamour', '{}', 3),
('college_of_swords', 'bard', 'College of Swords', '{}', 3),
('college_of_whispers', 'bard', 'College of Whispers', '{}', 3),

-- Cleric Domains
('knowledge_domain', 'cleric', 'Knowledge Domain', '{}', 1),
('light_domain', 'cleric', 'Light Domain', '{}', 1),
('nature_domain', 'cleric', 'Nature Domain', '{}', 1),
('tempest_domain', 'cleric', 'Tempest Domain', '{}', 1),
('trickery_domain', 'cleric', 'Trickery Domain', '{}', 1),
('war_domain', 'cleric', 'War Domain', '{}', 1),

-- Druid Circles
('circle_of_moon', 'druid', 'Circle of the Moon', '{}', 2),
('circle_of_spores', 'druid', 'Circle of Spores', '{}', 2),
('circle_of_dreams', 'druid', 'Circle of Dreams', '{}', 2),
('circle_of_shepherd', 'druid', 'Circle of the Shepherd', '{}', 2),

-- Fighter Archetypes
('battle_master', 'fighter', 'Battle Master', '{}', 3),
('eldritch_knight', 'fighter', 'Eldritch Knight', '{}', 3),
('purple_dragon_knight', 'fighter', 'Purple Dragon Knight', '{}', 3),
('cavalier', 'fighter', 'Cavalier', '{}', 3),
('samurai', 'fighter', 'Samurai', '{}', 3),
('arcane_archer', 'fighter', 'Arcane Archer', '{}', 3),

-- Monk Traditions
('way_of_shadow', 'monk', 'Way of Shadow', '{}', 3),
('way_of_four_elements', 'monk', 'Way of the Four Elements', '{}', 3),
('way_of_the_open_hand', 'monk', 'Way of the Open Hand', '{}', 3),
('way_of_kensei', 'monk', 'Way of the Kensei', '{}', 3),
('way_of_mercy', 'monk', 'Way of Mercy', '{}', 3),
('way_of_the_drunken_master', 'monk', 'Way of the Drunken Master', '{}', 3),
('way_of_the_sun_soul', 'monk', 'Way of the Sun Soul', '{}', 3),

-- Paladin Oaths
('oath_of_ancients', 'paladin', 'Oath of Ancients', '{}', 3),
('oath_of_vengeance', 'paladin', 'Oath of Vengeance', '{}', 3),
('oath_of_crown', 'paladin', 'Oath of the Crown', '{}', 3),
('oath_of_conquest', 'paladin', 'Oath of Conquest', '{}', 3),
('oath_of_redemption', 'paladin', 'Oath of Redemption', '{}', 3),

-- Ranger Conclaves
('gloom_stalker', 'ranger', 'Gloom Stalker', '{}', 3),
('horizon_walker', 'ranger', 'Horizon Walker', '{}', 3),
('monster_slayer', 'ranger', 'Monster Slayer', '{}', 3),
('fey_wanderer', 'ranger', 'Fey Wanderer', '{}', 3),
('swarmkeeper', 'ranger', 'Swarmkeeper', '{}', 3),

-- Rogue Archetypes
('assassin', 'rogue', 'Assassin', '{}', 3),
('arcane_trickster', 'rogue', 'Arcane Trickster', '{}', 3),
('mastermind', 'rogue', 'Mastermind', '{}', 3),
('phantom', 'rogue', 'Phantom', '{}', 3),
('soulknife', 'rogue', 'Soulknife', '{}', 3),
('swashbuckler', 'rogue', 'Swashbuckler', '{}', 3),
('inquisitive', 'rogue', 'Inquisitive', '{}', 3),

-- Sorcerous Origins
('wild_magic', 'sorcerer', 'Wild Magic', '{}', 1),
('divine_soul', 'sorcerer', 'Divine Soul', '{}', 1),
('shadow_magic', 'sorcerer', 'Shadow Magic', '{}', 1),
('storm_sorcery', 'sorcerer', 'Storm Sorcery', '{}', 1),
('phoenix_sorcery', 'sorcerer', 'Phoenix Sorcery', '{}', 1),

-- Warlock Patrons
('archfey', 'warlock', 'Archfey', '{}', 1),
('celestial', 'warlock', 'The Celestial', '{}', 1),
('hexblade', 'warlock', 'Hexblade', '{}', 1),
('genie', 'warlock', 'Genie', '{}', 1),

-- Wizard Schools
('school_of_abjuration', 'wizard', 'School of Abjuration', '{}', 2),
('school_of_conjuration', 'wizard', 'School of Conjuration', '{}', 2),
('school_of_divination', 'wizard', 'School of Divination', '{}', 2),
('school_of_enchantment', 'wizard', 'School of Enchantment', '{}', 2),
('school_of_illusion', 'wizard', 'School of Illusion', '{}', 2),
('school_of_necromancy', 'wizard', 'School of Necromancy', '{}', 2),
('school_of_transmutation', 'wizard', 'School of Transmutation', '{}', 2),
('school_of_bladesinging', 'wizard', 'School of Bladesinging', '{}', 2),
('school_of_chronurgy', 'wizard', 'School of Chronurgy', '{}', 2),
('school_of_order_of_scribes', 'wizard', 'Order of Scribes', '{}', 2),
('school_of_war_magic', 'wizard', 'School of War Magic', '{}', 2)
ON CONFLICT (id) DO NOTHING;
