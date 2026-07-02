// Database types matching Supabase schema

export interface Class {
  id: string;
  name: string;
}

export interface Subclass {
  id: string;
  class_id: string;
  name: string;
  bonus_spells: Record<number, string[]>;
  subclass_level_required: number;
}

export interface Race {
  id: string;
  name: string;
  stat_bonuses: Record<string, number> | string;
  granted_spells: string[] | string;
}

export interface Subrace {
  id: string;
  race_id: string;
  name: string;
  stat_bonuses: Record<string, number> | string;
  granted_spells: string[] | string;
}

export interface Background {
  id: string;
  name: string;
  skills: string[];
  feature_name: string;
  feature_desc: string;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  base_class_ids: string[];
}

export interface Feature {
  id: string;
  source_id: string;
  source_type: 'class' | 'subclass';
  level_required: number;
  name: string;
  description: string;
  feature_type: 'class_feature' | 'subclass_feature' | 'invocation' | 'mystic_arcanum' | 'metamagic' | 'fighting_style' | 'ki_feature' | 'rune_feature' | 'other';
}

export interface ProgressionType {
  id: string;
  name: string;
  description: string | null;
  category: 'resource' | 'feature' | 'limit';
}

export interface ClassProgression {
  id: string;
  class_id: string;
  level: number;
  progression_type_id: string;
  value: any;
  created_at: string;
}

export interface SpellSlot {
  max: number;
  used: number;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  notes: string;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  hp_current: number;
  hp_max: number;
  temp_hp: number;
  class_id: string;
  subclass_id: string | null;
  secondary_class_id: string | null;
  secondary_level: number;
  race_id: string;
  subrace_id: string | null;
  background_id: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  spell_slots: Record<number, SpellSlot>;
  prepared_spells: string[];
  currency: Currency;
  inventory: InventoryItem[];
  // Used counts per ability id; `${id}_rolls` keys bank entered die results (e.g. Portent d20s)
  ability_uses: Record<string, number | number[]>;
  created_at: string;
  updated_at: string;
}

// Joined types for UI
export interface CharacterWithRelations extends Character {
  class: Class;
  subclass: Subclass | null;
  race: Race;
  subrace: Subrace | null;
  background: Background;
}

export interface AbilityScore {
  name: string;
  value: number;
  modifier: number;
}

export const ABILITY_SCORES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
export type AbilityScoreName = typeof ABILITY_SCORES[number];

export const SPELL_SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
] as const;
export type SpellSchool = typeof SPELL_SCHOOLS[number];

export const SUBCLASS_LEVEL_REQUIREMENTS: Record<string, number> = {
  cleric: 1,
  sorcerer: 1,
  warlock: 1,
  wizard: 2,
  druid: 2,
  fighter: 3,
  paladin: 3,
  rogue: 3,
  bard: 3,
  ranger: 3,
  monk: 3,
  barbarian: 3,
} as const;
