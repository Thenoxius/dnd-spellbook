// D&D 5e Class Data with Progression Tables
// Based on official D&D 5e rules and dnd5e.wikidot.com

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

// Standard spell slot table for full spellcasters (Bard, Cleric, Druid, Sorcerer, Wizard)
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
    11: [4, 3, 3, 3, 3, 1],
    12: [4, 3, 3, 3, 3, 1],
    13: [4, 3, 3, 3, 3, 2, 1],
    14: [4, 3, 3, 3, 3, 2, 1],
    15: [4, 3, 3, 3, 3, 2, 2, 1],
    16: [4, 3, 3, 3, 3, 2, 2, 1],
    17: [4, 3, 3, 3, 3, 2, 2, 2, 1],
    18: [4, 3, 3, 3, 3, 3, 2, 2, 1],
    19: [4, 3, 3, 3, 3, 3, 3, 2, 1],
    20: [4, 3, 3, 3, 3, 3, 3, 3, 1],
  };

  const slots = slotTable[level] || [];
  const result: Record<number, number> = {};
  slots.forEach((count, index) => {
    result[index + 1] = count;
  });
  return result;
}

// Half-caster spell slot table (Paladin, Ranger)
function halfCasterSpellSlots(level: number): Record<number, number> {
  const slotTable: Record<number, number[]> = {
    1: [],
    2: [2],
    3: [2],
    4: [3],
    5: [3],
    6: [3, 1],
    7: [3, 1],
    8: [3, 2],
    9: [3, 2],
    10: [3, 2, 1],
    11: [3, 2, 1],
    12: [3, 2, 2],
    13: [3, 2, 2],
    14: [3, 2, 2, 1],
    15: [3, 2, 2, 1],
    16: [3, 2, 2, 2],
    17: [3, 2, 2, 2],
    18: [3, 2, 2, 3, 1],
    19: [3, 2, 2, 3, 1],
    20: [3, 2, 2, 3, 2],
  };

  const slots = slotTable[level] || [];
  const result: Record<number, number> = {};
  slots.forEach((count, index) => {
    result[index + 1] = count;
  });
  return result;
}

// Warlock Pact Magic spell slots
function warlockSpellSlots(level: number): { max: number; slotLevel: number } {
  const slotLevel = Math.min(Math.ceil(level / 2), 5);
  return { max: 2, slotLevel };
}

// Artificer spell slot table
function artificerSpellSlots(level: number): Record<number, number> {
  const slotTable: Record<number, number[]> = {
    1: [],
    2: [2],
    3: [2],
    4: [3],
    5: [3],
    6: [3, 1],
    7: [3, 1],
    8: [3, 2],
    9: [3, 2],
    10: [3, 2, 1],
    11: [3, 2, 1],
    12: [3, 2, 2],
    13: [3, 2, 2],
    14: [3, 2, 2, 1],
    15: [3, 2, 2, 1],
    16: [3, 2, 2, 2],
    17: [3, 2, 2, 2],
    18: [3, 2, 2, 3, 1],
    19: [3, 2, 2, 3, 1],
    20: [3, 2, 2, 3, 2],
  };

  const slots = slotTable[level] || [];
  const result: Record<number, number> = {};
  slots.forEach((count, index) => {
    result[index + 1] = count;
  });
  return result;
}


// BARBARIAN
const barbarianFeatures: Record<number, string[]> = {
  1: ['rage', 'unarmored-defense'],
  2: ['reckless-attack', 'danger-sense'],
  3: ['primal-path'], // Subclass feature
  5: ['extra-attack', 'fast-movement'],
  6: ['path-feature-6'],
  7: ['feral-instinct'],
  9: ['brutal-critical', 'path-feature-9'],
  10: ['relentless-endurance'],
  11: ['path-feature-11'],
  12: ['resilient-rage'],
  13: ['path-feature-13'],
  14: ['persistent-rage'],
  15: ['path-feature-15'],
  16: ['path-feature-16'],
  18: ['indomitable-might'],
  19: ['path-feature-19'],
  20: ['primal-champion'],
};

// BARD
const bardFeatures: Record<number, string[]> = {
  1: ['bardic-inspiration', 'spellcasting'],
  2: ['jack-of-all-trades', 'song-of-rest'],
  3: ['bard-college'], // Subclass feature
  5: ['font-of-inspiration'],
  6: ['countercharm', 'bard-college-feature'],
  7: ['college-feature-7'],
  8: ['ability-score-improvement'],
  10: ['magical-secrets', 'bard-college-feature'],
  12: ['magical-secrets', 'ability-score-improvement'],
  14: ['magical-secrets', 'bard-college-feature'],
  16: ['magical-secrets', 'ability-score-improvement'],
  18: ['magical-secrets', 'bard-college-feature'],
  19: ['magical-secrets', 'ability-score-improvement'],
  20: ['superior-inspiration'],
};

// CLERIC
const clericFeatures: Record<number, string[]> = {
  1: ['spellcasting', 'divine-domain'], // Subclass feature
  2: ['channel-divinity', 'divine-intervention-2'],
  3: ['channel-divinity-2', 'domain-feature-3'],
  5: ['destroy-undead', 'domain-feature-5'],
  6: ['channel-divinity-3', 'domain-feature-6'],
  7: ['domain-feature-7'],
  8: ['divine-strike', 'domain-feature-8'],
  9: ['divine-intervention-9'],
  10: ['divine-intervention'],
  11: ['domain-feature-11'],
  12: ['domain-feature-12'],
  13: ['domain-feature-13'],
  14: ['domain-feature-14'],
  15: ['domain-feature-15'],
  16: ['domain-feature-16'],
  17: ['domain-feature-17'],
  18: ['domain-feature-18'],
  19: ['domain-feature-19'],
  20: ['divine-intervention-improved'],
};

// DRUID
const druidFeatures: Record<number, string[]> = {
  1: ['druidic', 'spellcasting'],
  2: ['wild-shape', 'circle'], // Subclass feature
  3: ['circle-feature-2'],
  4: ['wild-shape-improved', 'circle-feature-4'],
  5: ['circle-feature-5'],
  6: ['wild-shape-companion', 'circle-feature-6'],
  7: ['circle-feature-7'],
  8: ['wild-shape-elemental', 'circle-feature-8'],
  9: ['circle-feature-9'],
  10: ['circle-feature-10'],
  11: ['circle-feature-11'],
  12: ['circle-feature-12'],
  13: ['circle-feature-13'],
  14: ['circle-feature-14'],
  15: ['circle-feature-15'],
  16: ['circle-feature-16'],
  17: ['circle-feature-17'],
  18: ['circle-feature-18'],
  19: ['circle-feature-19'],
  20: ['archdruid'],
};

// FIGHTER
const fighterFeatures: Record<number, string[]> = {
  1: ['fighting-style', 'second-wind'],
  2: ['action-surge'],
  3: ['martial-archetype'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['extra-attack'],
  6: ['archetype-feature-3'],
  7: ['archetype-feature-7'],
  8: ['ability-score-improvement'],
  9: ['indomitable'],
  10: ['archetype-feature-10'],
  11: ['extra-attack-2'],
  12: ['ability-score-improvement'],
  13: ['indomitable-2'],
  14: ['archetype-feature-14'],
  15: ['archetype-feature-15'],
  16: ['ability-score-improvement'],
  17: ['action-surge-2', 'indomitable-3'],
  18: ['archetype-feature-18'],
  19: ['ability-score-improvement'],
  20: ['archetype-feature-20'],
};

// MONK
const monkFeatures: Record<number, string[]> = {
  1: ['unarmored-defense', 'martial-arts'],
  2: ['ki', 'unarmored-movement'],
  3: ['monastic-tradition'], // Subclass feature
  4: ['slow-fall', 'deflect-missiles'],
  5: ['extra-attack', 'stunning-strike'],
  6: ['ki-empowered-strikes', 'tradition-feature-3'],
  7: ['stillness', 'tradition-feature-6'],
  8: ['tradition-feature-7'],
  9: ['unarmored-movement-improved', 'tradition-feature-9'],
  10: ['tradition-feature-10'],
  11: ['tradition-feature-11'],
  12: ['tradition-feature-12'],
  13: ['tradition-feature-13'],
  14: ['tradition-feature-14'],
  15: ['tradition-feature-15'],
  16: ['tradition-feature-16'],
  17: ['tradition-feature-17'],
  18: ['tradition-feature-18'],
  19: ['tradition-feature-19'],
  20: ['tradition-feature-20'],
};

const monkKiPoints = (level: number): number => Math.floor(level / 2);

// PALADIN
const paladinFeatures: Record<number, string[]> = {
  1: ['divine-sense', 'lay-on-hands'],
  2: ['fighting-style', 'divine-smite'],
  3: ['divine-health', 'sacred-oath'], // Subclass feature
  5: ['extra-attack', 'oath-channel'],
  6: ['aura-of-protection'],
  7: ['aura-of-courage', 'oath-feature-7'],
  8: ['ability-score-improvement'],
  9: ['oath-feature-9'],
  10: ['aura-of-resistance'],
  11: ['improved-divine-smite'],
  12: ['oath-feature-12'],
  13: ['aura-of-courage-improved', 'oath-feature-13'],
  14: ['cleansing-touch'],
  15: ['oath-feature-15'],
  16: ['ability-score-improvement'],
  17: ['oath-feature-17'],
  18: ['aura-improvements', 'oath-feature-18'],
  19: ['oath-feature-19'],
  20: ['oath-feature-20'],
};

// RANGER
const rangerFeatures: Record<number, string[]> = {
  1: ['favored-enemy', 'natural-explorer'],
  2: ['fighting-style', 'spellcasting'],
  3: ['ranger-archetype'], // Subclass feature
  5: ['extra-attack', 'archetype-feature-3'],
  6: ['archetype-feature-6'],
  7: ['ranger-archetype-feature-7'],
  8: ['ability-score-improvement', 'archetype-feature-8'],
  9: ['archetype-feature-9'],
  10: ['archetype-feature-10'],
  11: ['archetype-feature-11'],
  12: ['ability-score-improvement', 'archetype-feature-12'],
  13: ['archetype-feature-13'],
  14: ['archetype-feature-14'],
  15: ['archetype-feature-15'],
  16: ['ability-score-improvement', 'archetype-feature-16'],
  17: ['archetype-feature-17'],
  18: ['archetype-feature-18'],
  19: ['ability-score-improvement', 'archetype-feature-19'],
  20: ['foe-slayer'],
};

// ROGUE
const rogueFeatures: Record<number, string[]> = {
  1: ['expertise', 'sneak-attack', 'thieves-cant'],
  2: ['cunning-action'],
  3: ['roguish-archetype'], // Subclass feature
  4: ['ability-score-improvement'],
  5: ['uncanny-dodge'],
  6: ['archetype-feature-3'],
  7: ['evasion', 'archetype-feature-6'],
  8: ['ability-score-improvement'],
  9: ['archetype-feature-9'],
  10: ['archetype-feature-10'],
  11: ['reliable-talent', 'archetype-feature-11'],
  12: ['ability-score-improvement'],
  13: ['archetype-feature-13'],
  14: ['blind-sense', 'archetype-feature-14'],
  15: ['slippery-mind', 'archetype-feature-15'],
  16: ['ability-score-improvement'],
  17: ['archetype-feature-17'],
  18: ['elusive', 'archetype-feature-18'],
  19: ['ability-score-improvement', 'archetype-feature-19'],
  20: ['stroke-of-luck'],
};

// SORCERER
const sorcererFeatures: Record<number, string[]> = {
  1: ['sorcerous-origin', 'spellcasting'],
  2: ['font-of-magic'],
  3: ['metamagic', 'origin-feature-3'],
  4: ['ability-score-improvement'],
  5: ['origin-feature-5'],
  6: ['origin-feature-6'],
  7: ['origin-feature-7'],
  8: ['ability-score-improvement'],
  9: ['origin-feature-9'],
  10: ['origin-feature-10'],
  11: ['metamagic-2', 'origin-feature-11'],
  12: ['ability-score-improvement'],
  13: ['origin-feature-13'],
  14: ['origin-feature-14'],
  15: ['origin-feature-15'],
  16: ['ability-score-improvement'],
  17: ['metamagic-3', 'origin-feature-17'],
  18: ['origin-feature-18'],
  19: ['ability-score-improvement', 'origin-feature-19'],
  20: ['sorcerous-restoration', 'origin-feature-20'],
};

const sorcererMetamagicKnown = (level: number): number => {
  if (level < 3) return 0;
  if (level < 11) return 2;
  if (level < 17) return 3;
  return 4;
};

const sorcererSpellSlots = (level: number): number => {
  if (level < 3) return 2;
  if (level < 4) return 3;
  if (level < 5) return 4;
  if (level < 7) return 5;
  if (level < 9) return 6;
  if (level < 11) return 7;
  if (level < 13) return 8;
  if (level < 15) return 9;
  if (level < 17) return 10;
  if (level < 19) return 11;
  return 12;
};

// WARLOCK
const warlockFeatures: Record<number, string[]> = {
  1: ['otherworldly-patron', 'pact-magic'],
  2: ['eldritch-invocations'],
  3: ['pact-boon'],
  4: ['ability-score-improvement'],
  5: ['patron-feature-6'],
  6: ['patron-feature-6'],
  7: ['patron-feature-10'],
  8: ['ability-score-improvement'],
  9: ['patron-feature-10'],
  10: ['patron-feature-10'],
  11: ['mystic-arcanum-6'],
  12: ['ability-score-improvement'],
  13: ['mystic-arcanum-7'],
  14: ['patron-feature-14'],
  15: ['mystic-arcanum-8'],
  16: ['ability-score-improvement'],
  17: ['mystic-arcanum-9'],
  18: ['patron-feature-18'],
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
  if (level < 2) return 2;
  if (level < 3) return 3;
  if (level < 4) return 4;
  if (level < 5) return 5;
  if (level < 6) return 6;
  if (level < 7) return 7;
  if (level < 8) return 8;
  if (level < 9) return 9;
  if (level < 10) return 10;
  if (level < 11) return 10;
  if (level < 13) return 11;
  if (level < 15) return 12;
  if (level < 17) return 13;
  return 14;
};

const warlockCantripsKnown = (level: number): number => {
  if (level < 4) return 2;
  if (level < 10) return 3;
  return 4;
};

// WIZARD
const wizardFeatures: Record<number, string[]> = {
  1: ['arcane-recovery', 'spellcasting'],
  2: ['arcane-tradition'], // Subclass feature
  3: ['tradition-feature-2'],
  4: ['ability-score-improvement', 'tradition-feature-6'],
  5: ['tradition-feature-10'],
  6: ['tradition-feature-14'],
  7: ['tradition-feature-14'],
  8: ['ability-score-improvement', 'tradition-feature-14'],
  9: ['tradition-feature-14'],
  10: ['tradition-feature-14'],
  11: ['tradition-feature-14'],
  12: ['ability-score-improvement', 'tradition-feature-14'],
  13: ['tradition-feature-14'],
  14: ['tradition-feature-14'],
  15: ['tradition-feature-14'],
  16: ['ability-score-improvement', 'tradition-feature-14'],
  17: ['tradition-feature-14'],
  18: ['tradition-feature-14'],
  19: ['ability-score-improvement', 'spell-mastery'],
  20: ['signature-spells'],
};

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
        const spellsKnown = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 22];
        return spellsKnown[level];
      }
    ),
  },
  {
    id: 'cleric',
    name: 'Cleric',
    hitDie: 8,
    primaryAbility: ['WIS', 'CHA'],
    savingThrows: ['wis', 'cha'],
    spellcastingAbility: 'WIS',
    spellcaster: true,
    progression: buildClassProgression(clericFeatures, true, standardSpellSlots),
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
      (level) => (level < 4 ? 2 : 3)
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
      (level) => ({ metamagicKnown: sorcererMetamagicKnown(level), sorceryPoints: level }),
      (level) => 4,
      sorcererSpellSlots
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
      (level) => 3
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
