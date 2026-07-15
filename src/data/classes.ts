// D&D 5e Class Data with Progression Tables
// Based on the 2014 Player's Handbook

export interface ClassProgression {
  level: number;
  proficiencyBonus: number;
  featuresUnlocked: string[]; // IDs of features unlocked at this level
  cantripsKnown?: number;
  spellsKnown?: number;
  spellSlots?: Record<number, number>; // spell level -> number of slots
  slotLevel?: number; // For Warlock Pact Magic
  customClassData?: Record<string, any>; // Class-specific data (e.g., invocationsKnown, kiPoints, etc.)
}

export interface DndClass {
  id: string; // 'warlock', 'wizard', etc.
  name: string;
  hitDie: number; // e.g., 8 for Warlock
  primaryAbility: string[]; // e.g., ['CHA'] for Warlock
  savingThrows: string[]; // ['wis', 'cha']
  spellcastingAbility?: 'INT' | 'WIS' | 'CHA';
  spellcaster: boolean;
  progression: Record<number, ClassProgression>;
}

// Helper function to calculate proficiency bonus
function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

// Standard spell slot table for full spellcasters (Bard, Cleric, Druid, Sorcerer, Wizard), PHB p. 113 etc.
function standardSpellSlots(level: number): Record<number, number> {
  const slotTable: Record<number, number[]> = {
    1: [2],
    2: [3],
    3: [4, 2],
    4: [4, 3],
    5: [4, 3, 2],
    6: [4, 3, 3],
    7: [4, 3, 3, 1],
    8: [4, 3, 3, 2],
    9: [4, 3, 3, 3, 1],
    10: [4, 3, 3, 3, 2],
    11: [4, 3, 3, 3, 2, 1],
    12: [4, 3, 3, 3, 2, 1],
    13: [4, 3, 3, 3, 2, 1, 1],
    14: [4, 3, 3, 3, 2, 1, 1],
    15: [4, 3, 3, 3, 2, 1, 1, 1],
    16: [4, 3, 3, 3, 2, 1, 1, 1],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  };

  const slots = slotTable[level] || [];
  const result: Record<number, number> = {};
  slots.forEach((count, index) => {
    result[index + 1] = count;
  });
  return result;
}

// Half-caster spell slot table (Paladin, Ranger), PHB p. 83/91
function halfCasterSpellSlots(level: number): Record<number, number> {
  const slotTable: Record<number, number[]> = {
    1: [],
    2: [2],
    3: [3],
    4: [3],
    5: [4, 2],
    6: [4, 2],
    7: [4, 3],
    8: [4, 3],
    9: [4, 3, 2],
    10: [4, 3, 2],
    11: [4, 3, 3],
    12: [4, 3, 3],
    13: [4, 3, 3, 1],
    14: [4, 3, 3, 1],
    15: [4, 3, 3, 2],
    16: [4, 3, 3, 2],
    17: [4, 3, 3, 3, 1],
    18: [4, 3, 3, 3, 1],
    19: [4, 3, 3, 3, 2],
    20: [4, 3, 3, 3, 2],
  };

  const slots = slotTable[level] || [];
  const result: Record<number, number> = {};
  slots.forEach((count, index) => {
    result[index + 1] = count;
  });
  return result;
}

// Artificer spell slot table (TCE p. 10). A half-caster that rounds UP:
// slots from level 1, never 4th/5th-level slots before 13/17.
function artificerSpellSlots(level: number): Record<number, number> {
  const slotTable: Record<number, number[]> = {
    1: [2],
    2: [2],
    3: [3],
    4: [3],
    5: [4, 2],
    6: [4, 2],
    7: [4, 3],
    8: [4, 3],
    9: [4, 3, 2],
    10: [4, 3, 2],
    11: [4, 3, 3],
    12: [4, 3, 3],
    13: [4, 3, 3, 1],
    14: [4, 3, 3, 1],
    15: [4, 3, 3, 2],
    16: [4, 3, 3, 2],
    17: [4, 3, 3, 3, 1],
    18: [4, 3, 3, 3, 1],
    19: [4, 3, 3, 3, 2],
    20: [4, 3, 3, 3, 2],
  };

  const slots = slotTable[level] || [];
  const result: Record<number, number> = {};
  slots.forEach((count, index) => {
    result[index + 1] = count;
  });
  return result;
}

// ARTIFICER (TCE p. 9) — specialist features at 3, 5, 9, 15; ASI also at 19
const artificerFeatures: Record<number, string[]> = {
  1: ['magical-tinkering', 'spellcasting'],
  2: ['infuse-item'],
  3: ['artificer-specialist', 'the-right-tool-for-the-job'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['specialist-feature'],
  6: ['tool-expertise'],
  7: ['flash-of-genius'],
  8: ['ability-score-improvement'],
  9: ['specialist-feature'],
  10: ['magic-item-adept'],
  11: ['spell-storing-item'],
  12: ['ability-score-improvement'],
  14: ['magic-item-savant'],
  15: ['specialist-feature'],
  16: ['ability-score-improvement'],
  18: ['magic-item-master'],
  19: ['ability-score-improvement'],
  20: ['soul-of-artifice'],
};

const artificerCantripsKnown = (level: number): number => (level < 10 ? 2 : level < 14 ? 3 : 4);

// Warlock Pact Magic spell slots: 1 slot at level 1, 2 at level 2, 3 at level 11, 4 at level 17.
// Slot level scales 1st -> 5th over levels 1-9.
function warlockSpellSlots(level: number): { max: number; slotLevel: number } {
  const slotLevel = Math.min(Math.ceil(level / 2), 5);
  const max = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
  return { max, slotLevel };
}


// BARBARIAN (PHB p. 46)
const barbarianFeatures: Record<number, string[]> = {
  1: ['rage', 'unarmored-defense'],
  2: ['reckless-attack', 'danger-sense'],
  3: ['primal-path'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['extra-attack', 'fast-movement'],
  6: ['path-feature'],
  7: ['feral-instinct'],
  8: ['ability-score-improvement'],
  9: ['brutal-critical-1'],
  10: ['path-feature'],
  11: ['relentless-rage'],
  12: ['ability-score-improvement'],
  13: ['brutal-critical-2'],
  14: ['path-feature'],
  15: ['persistent-rage'],
  16: ['ability-score-improvement'],
  17: ['brutal-critical-3'],
  18: ['indomitable-might'],
  19: ['ability-score-improvement'],
  20: ['primal-champion'],
};

// BARD (PHB p. 52)
const bardFeatures: Record<number, string[]> = {
  1: ['spellcasting', 'bardic-inspiration'],
  2: ['jack-of-all-trades', 'song-of-rest'],
  3: ['bard-college', 'expertise'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['bardic-inspiration-d8', 'font-of-inspiration'],
  6: ['countercharm', 'college-feature'],
  8: ['ability-score-improvement'],
  9: ['song-of-rest-d8'],
  10: ['bardic-inspiration-d10', 'expertise', 'magical-secrets'],
  12: ['ability-score-improvement'],
  13: ['song-of-rest-d10'],
  14: ['magical-secrets', 'college-feature'],
  15: ['bardic-inspiration-d12'],
  16: ['ability-score-improvement'],
  17: ['song-of-rest-d12'],
  18: ['magical-secrets'],
  19: ['ability-score-improvement'],
  20: ['superior-inspiration'],
};

// CLERIC (PHB p. 57) — domain features at 1, 2, 6, 8, 17
const clericFeatures: Record<number, string[]> = {
  1: ['spellcasting', 'divine-domain'], // Subclass feature
  2: ['channel-divinity-1', 'domain-feature'],
  4: ['ability-score-improvement'],
  5: ['destroy-undead-cr-half'],
  6: ['channel-divinity-2', 'domain-feature'],
  8: ['ability-score-improvement', 'destroy-undead-cr-1', 'domain-feature'],
  10: ['divine-intervention'],
  11: ['destroy-undead-cr-2'],
  12: ['ability-score-improvement'],
  14: ['destroy-undead-cr-3'],
  16: ['ability-score-improvement'],
  17: ['destroy-undead-cr-4', 'domain-feature'],
  18: ['channel-divinity-3'],
  19: ['ability-score-improvement'],
  20: ['divine-intervention-improved'],
};

// DRUID (PHB p. 65) — circle features at 2, 6, 10, 14
const druidFeatures: Record<number, string[]> = {
  1: ['druidic', 'spellcasting'],
  2: ['wild-shape', 'druid-circle'], // Subclass feature
  4: ['wild-shape-improvement', 'ability-score-improvement'],
  6: ['circle-feature'],
  8: ['wild-shape-improvement', 'ability-score-improvement'],
  10: ['circle-feature'],
  12: ['ability-score-improvement'],
  14: ['circle-feature'],
  16: ['ability-score-improvement'],
  18: ['timeless-body', 'beast-spells'],
  19: ['ability-score-improvement'],
  20: ['archdruid'],
};

// FIGHTER (PHB p. 71) — archetype features at 3, 7, 10, 15, 18; extra ASIs at 6 and 14
const fighterFeatures: Record<number, string[]> = {
  1: ['fighting-style', 'second-wind'],
  2: ['action-surge-1'],
  3: ['martial-archetype'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['extra-attack'],
  6: ['ability-score-improvement'],
  7: ['archetype-feature'],
  8: ['ability-score-improvement'],
  9: ['indomitable-1'],
  10: ['archetype-feature'],
  11: ['extra-attack-2'],
  12: ['ability-score-improvement'],
  13: ['indomitable-2'],
  14: ['ability-score-improvement'],
  15: ['archetype-feature'],
  16: ['ability-score-improvement'],
  17: ['action-surge-2', 'indomitable-3'],
  18: ['archetype-feature'],
  19: ['ability-score-improvement'],
  20: ['extra-attack-3'],
};

// MONK (PHB p. 77) — tradition features at 3, 6, 11, 17
const monkFeatures: Record<number, string[]> = {
  1: ['unarmored-defense', 'martial-arts'],
  2: ['ki', 'unarmored-movement'],
  3: ['monastic-tradition', 'deflect-missiles'], // Subclass feature
  4: ['ability-score-improvement', 'slow-fall'],
  5: ['extra-attack', 'stunning-strike'],
  6: ['ki-empowered-strikes', 'tradition-feature'],
  7: ['evasion', 'stillness-of-mind'],
  8: ['ability-score-improvement'],
  9: ['unarmored-movement-improvement'],
  10: ['purity-of-body'],
  11: ['tradition-feature'],
  12: ['ability-score-improvement'],
  13: ['tongue-of-the-sun-and-moon'],
  14: ['diamond-soul'],
  15: ['timeless-body'],
  16: ['ability-score-improvement'],
  17: ['tradition-feature'],
  18: ['empty-body'],
  19: ['ability-score-improvement'],
  20: ['perfect-self'],
};

// Monk ki points equal monk level, starting when Ki unlocks at level 2 (PHB p. 78)
const monkKiPoints = (level: number): number => (level >= 2 ? level : 0);

// PALADIN (PHB p. 83) — oath features at 3, 7, 15, 20
const paladinFeatures: Record<number, string[]> = {
  1: ['divine-sense', 'lay-on-hands'],
  2: ['fighting-style', 'spellcasting', 'divine-smite'],
  3: ['divine-health', 'sacred-oath'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['extra-attack'],
  6: ['aura-of-protection'],
  7: ['oath-feature'],
  8: ['ability-score-improvement'],
  10: ['aura-of-courage'],
  11: ['improved-divine-smite'],
  12: ['ability-score-improvement'],
  14: ['cleansing-touch'],
  15: ['oath-feature'],
  16: ['ability-score-improvement'],
  18: ['aura-improvements'],
  19: ['ability-score-improvement'],
  20: ['oath-feature'],
};

// RANGER (PHB p. 91) — archetype features at 3, 7, 11, 15
const rangerFeatures: Record<number, string[]> = {
  1: ['favored-enemy', 'natural-explorer'],
  2: ['fighting-style', 'spellcasting'],
  3: ['ranger-archetype', 'primeval-awareness'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['extra-attack'],
  6: ['favored-enemy-improvement', 'natural-explorer-improvement'],
  7: ['archetype-feature'],
  8: ['ability-score-improvement', 'lands-stride'],
  10: ['natural-explorer-improvement', 'hide-in-plain-sight'],
  11: ['archetype-feature'],
  12: ['ability-score-improvement'],
  14: ['favored-enemy-improvement', 'vanish'],
  15: ['archetype-feature'],
  16: ['ability-score-improvement'],
  18: ['feral-senses'],
  19: ['ability-score-improvement'],
  20: ['foe-slayer'],
};

// Ranger spells known (PHB p. 91): starts at 2, +1 at every odd level from 3
const rangerSpellsKnown = (level: number): number => {
  if (level < 2) return 0;
  return 1 + Math.ceil(level / 2);
};

// ROGUE (PHB p. 95) — archetype features at 3, 9, 13, 17; extra ASI at 10
const rogueFeatures: Record<number, string[]> = {
  1: ['expertise', 'sneak-attack', 'thieves-cant'],
  2: ['cunning-action'],
  3: ['roguish-archetype'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['uncanny-dodge'],
  6: ['expertise'],
  7: ['evasion'],
  8: ['ability-score-improvement'],
  9: ['archetype-feature'],
  10: ['ability-score-improvement'],
  11: ['reliable-talent'],
  12: ['ability-score-improvement'],
  13: ['archetype-feature'],
  14: ['blindsense'],
  15: ['slippery-mind'],
  16: ['ability-score-improvement'],
  17: ['archetype-feature'],
  18: ['elusive'],
  19: ['ability-score-improvement'],
  20: ['stroke-of-luck'],
};

// SORCERER (PHB p. 99) — origin features at 1, 6, 14, 18; extra Metamagic at 10 and 17
const sorcererFeatures: Record<number, string[]> = {
  1: ['spellcasting', 'sorcerous-origin'], // Subclass feature
  2: ['font-of-magic'],
  3: ['metamagic'],
  4: ['ability-score-improvement'],
  6: ['origin-feature'],
  8: ['ability-score-improvement'],
  10: ['metamagic'],
  12: ['ability-score-improvement'],
  14: ['origin-feature'],
  16: ['ability-score-improvement'],
  17: ['metamagic'],
  18: ['origin-feature'],
  19: ['ability-score-improvement'],
  20: ['sorcerous-restoration'],
};

const sorcererMetamagicKnown = (level: number): number => {
  if (level < 3) return 0;
  if (level < 10) return 2;
  if (level < 17) return 3;
  return 4;
};

// Sorcery points equal sorcerer level once Font of Magic unlocks at level 2
const sorcererSorceryPoints = (level: number): number => (level >= 2 ? level : 0);

const sorcererSpellsKnown = (level: number): number => {
  const spellsKnown = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
  return spellsKnown[level] ?? 15;
};

const sorcererCantripsKnown = (level: number): number => (level < 4 ? 4 : level < 10 ? 5 : 6);

// WARLOCK (PHB p. 106) — patron features at 1, 6, 10, 14
const warlockFeatures: Record<number, string[]> = {
  1: ['otherworldly-patron', 'pact-magic'], // Subclass feature
  2: ['eldritch-invocations'],
  3: ['pact-boon'],
  4: ['ability-score-improvement'],
  6: ['patron-feature'],
  8: ['ability-score-improvement'],
  10: ['patron-feature'],
  11: ['mystic-arcanum-6'],
  12: ['ability-score-improvement'],
  13: ['mystic-arcanum-7'],
  14: ['patron-feature'],
  15: ['mystic-arcanum-8'],
  16: ['ability-score-improvement'],
  17: ['mystic-arcanum-9'],
  19: ['ability-score-improvement'],
  20: ['eldritch-master'],
};

const warlockInvocationsKnown = (level: number): number => {
  if (level < 2) return 0;
  if (level < 5) return 2;
  if (level < 7) return 3;
  if (level < 9) return 4;
  if (level < 12) return 5;
  if (level < 15) return 6;
  if (level < 18) return 7;
  return 8;
};

const warlockSpellsKnown = (level: number): number => {
  const spellsKnown = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
  return spellsKnown[level] ?? 15;
};

const warlockCantripsKnown = (level: number): number => {
  if (level < 4) return 2;
  if (level < 10) return 3;
  return 4;
};

// WIZARD (PHB p. 113) — tradition features at 2, 6, 10, 14
const wizardFeatures: Record<number, string[]> = {
  1: ['spellcasting', 'arcane-recovery'],
  2: ['arcane-tradition'], // Subclass feature
  4: ['ability-score-improvement'],
  6: ['tradition-feature'],
  8: ['ability-score-improvement'],
  10: ['tradition-feature'],
  12: ['ability-score-improvement'],
  14: ['tradition-feature'],
  16: ['ability-score-improvement'],
  18: ['spell-mastery'],
  19: ['ability-score-improvement'],
  20: ['signature-spells'],
};

const wizardCantripsKnown = (level: number): number => (level < 4 ? 3 : level < 10 ? 4 : 5);

// Build complete progression data for all classes
function buildClassProgression(
  features: Record<number, string[]>,
  spellcaster: boolean,
  spellSlotsFn?: (level: number) => Record<number, number> | { max: number; slotLevel: number },
  customDataFn?: (level: number) => Record<string, any>,
  cantripsFn?: (level: number) => number,
  spellsKnownFn?: (level: number) => number
): Record<number, ClassProgression> {
  const progression: Record<number, ClassProgression> = {};

  for (let level = 1; level <= 20; level++) {
    const baseProgression: ClassProgression = {
      level,
      proficiencyBonus: proficiencyBonus(level),
      featuresUnlocked: features[level] || [],
    };

    if (spellcaster && spellSlotsFn) {
      const slots = spellSlotsFn(level);
      if ('max' in slots) {
        // Warlock pact magic
        baseProgression.spellSlots = { [slots.slotLevel]: slots.max };
        baseProgression.slotLevel = slots.slotLevel;
      } else {
        baseProgression.spellSlots = slots;
      }
    }

    if (customDataFn) {
      baseProgression.customClassData = customDataFn(level);
    }

    if (cantripsFn) {
      baseProgression.cantripsKnown = cantripsFn(level);
    }

    if (spellsKnownFn) {
      baseProgression.spellsKnown = spellsKnownFn(level);
    }

    progression[level] = baseProgression;
  }

  return progression;
}

export const dndClasses: DndClass[] = [
  {
    id: 'artificer',
    name: 'Artificer',
    hitDie: 8,
    primaryAbility: ['INT'],
    savingThrows: ['con', 'int'],
    spellcastingAbility: 'INT',
    spellcaster: true,
    progression: buildClassProgression(
      artificerFeatures,
      true,
      artificerSpellSlots,
      // Infusions known / infused items track the TCE table
      (level) => ({
        infusionsKnown: level >= 18 ? 12 : level >= 14 ? 10 : level >= 10 ? 8 : level >= 6 ? 6 : level >= 2 ? 4 : 0,
        infusedItems: level >= 18 ? 6 : level >= 14 ? 5 : level >= 10 ? 4 : level >= 6 ? 3 : level >= 2 ? 2 : 0,
      }),
      artificerCantripsKnown
    ),
  },
  {
    id: 'barbarian',
    name: 'Barbarian',
    hitDie: 12,
    primaryAbility: ['STR', 'CON'],
    savingThrows: ['str', 'con'],
    spellcaster: false,
    progression: buildClassProgression(barbarianFeatures, false),
  },
  {
    id: 'bard',
    name: 'Bard',
    hitDie: 8,
    primaryAbility: ['CHA'],
    savingThrows: ['dex', 'cha'],
    spellcastingAbility: 'CHA',
    spellcaster: true,
    progression: buildClassProgression(
      bardFeatures,
      true,
      standardSpellSlots,
      undefined,
      (level) => (level < 4 ? 2 : level < 10 ? 3 : 4),
      (level) => {
        const spellsKnown = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
        return spellsKnown[level] ?? 22;
      }
    ),
  },
  {
    id: 'cleric',
    name: 'Cleric',
    hitDie: 8,
    primaryAbility: ['WIS'],
    savingThrows: ['wis', 'cha'],
    spellcastingAbility: 'WIS',
    spellcaster: true,
    progression: buildClassProgression(
      clericFeatures,
      true,
      standardSpellSlots,
      undefined,
      (level) => (level < 4 ? 3 : level < 10 ? 4 : 5)
    ),
  },
  {
    id: 'druid',
    name: 'Druid',
    hitDie: 8,
    primaryAbility: ['WIS'],
    savingThrows: ['int', 'wis'],
    spellcastingAbility: 'WIS',
    spellcaster: true,
    progression: buildClassProgression(
      druidFeatures,
      true,
      standardSpellSlots,
      undefined,
      (level) => (level < 4 ? 2 : level < 10 ? 3 : 4)
    ),
  },
  {
    id: 'fighter',
    name: 'Fighter',
    hitDie: 10,
    primaryAbility: ['STR', 'DEX'],
    savingThrows: ['str', 'con'],
    spellcaster: false,
    progression: buildClassProgression(fighterFeatures, false),
  },
  {
    id: 'monk',
    name: 'Monk',
    hitDie: 8,
    primaryAbility: ['DEX', 'WIS'],
    savingThrows: ['str', 'dex'],
    spellcaster: false,
    progression: buildClassProgression(
      monkFeatures,
      false,
      undefined,
      (level) => ({ kiPoints: monkKiPoints(level) })
    ),
  },
  {
    id: 'paladin',
    name: 'Paladin',
    hitDie: 10,
    primaryAbility: ['STR', 'CHA'],
    savingThrows: ['wis', 'cha'],
    spellcastingAbility: 'CHA',
    spellcaster: true,
    progression: buildClassProgression(paladinFeatures, true, halfCasterSpellSlots),
  },
  {
    id: 'ranger',
    name: 'Ranger',
    hitDie: 10,
    primaryAbility: ['DEX', 'WIS'],
    savingThrows: ['str', 'dex'],
    spellcastingAbility: 'WIS',
    spellcaster: true,
    progression: buildClassProgression(
      rangerFeatures,
      true,
      halfCasterSpellSlots,
      undefined,
      undefined,
      rangerSpellsKnown
    ),
  },
  {
    id: 'rogue',
    name: 'Rogue',
    hitDie: 8,
    primaryAbility: ['DEX'],
    savingThrows: ['dex', 'int'],
    spellcaster: false,
    progression: buildClassProgression(rogueFeatures, false),
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    hitDie: 6,
    primaryAbility: ['CHA'],
    savingThrows: ['con', 'cha'],
    spellcastingAbility: 'CHA',
    spellcaster: true,
    progression: buildClassProgression(
      sorcererFeatures,
      true,
      standardSpellSlots,
      (level) => ({ metamagicKnown: sorcererMetamagicKnown(level), sorceryPoints: sorcererSorceryPoints(level) }),
      sorcererCantripsKnown,
      sorcererSpellsKnown
    ),
  },
  {
    id: 'warlock',
    name: 'Warlock',
    hitDie: 8,
    primaryAbility: ['CHA'],
    savingThrows: ['wis', 'cha'],
    spellcastingAbility: 'CHA',
    spellcaster: true,
    progression: buildClassProgression(
      warlockFeatures,
      true,
      warlockSpellSlots,
      (level) => ({ invocationsKnown: warlockInvocationsKnown(level) }),
      warlockCantripsKnown,
      warlockSpellsKnown
    ),
  },
  {
    id: 'wizard',
    name: 'Wizard',
    hitDie: 6,
    primaryAbility: ['INT'],
    savingThrows: ['int', 'wis'],
    spellcastingAbility: 'INT',
    spellcaster: true,
    progression: buildClassProgression(
      wizardFeatures,
      true,
      standardSpellSlots,
      undefined,
      wizardCantripsKnown
    ),
  },
];

// Helper function to get class by ID
export function getClassById(id: string): DndClass | undefined {
  return dndClasses.find(cls => cls.id === id);
}

// Helper function to get progression for a class at a specific level
export function getClassProgression(classId: string, level: number): ClassProgression | undefined {
  const cls = getClassById(classId);
  return cls?.progression[level];
}
