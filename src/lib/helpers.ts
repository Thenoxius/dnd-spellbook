import { AbilityScoreName, SpellSlot, ClassProgression, ProgressionType } from '@/types/database';

// Calculate ability modifier: floor((score - 10) / 2)
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Format modifier with sign (+3, -1, +0)
export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

// Format ability score with modifier (e.g., "16 (+3)")
export function formatAbilityScore(score: number): string {
  const modifier = calculateModifier(score);
  return `${score} (${formatModifier(modifier)})`;
}

// Calculate spell slots based on class and level (PHB 2014 rules)
export function calculateSpellSlots(classId: string, level: number): Record<number, SpellSlot> {
  const slots: Record<number, SpellSlot> = {};
  
  // Warlock uses Pact Magic: 2 slots that scale in level
  if (classId === 'warlock') {
    const pactSlotLevel = Math.min(Math.ceil(level / 2), 5); // Slot level scales: 1, 1, 2, 2, 3, 3, 4, 4, 5, 5
    slots[pactSlotLevel] = { max: 2, used: 0 };
    return slots;
  }
  
  // Standard spell slot table from PHB 2014 for other classes
  const spellSlotTable: Record<number, number[]> = {
    1: [2], // Level 1: 2 level 1 slots
    2: [3], // Level 2: 3 level 1 slots
    3: [4, 2], // Level 3: 4 level 1, 2 level 2
    4: [4, 3], // Level 4: 4 level 1, 3 level 2
    5: [4, 3, 2], // Level 5: 4 level 1, 3 level 2, 2 level 3
    6: [4, 3, 3], // Level 6: 4 level 1, 3 level 2, 3 level 3
    7: [4, 3, 3, 1], // Level 7: 4 level 1, 3 level 2, 3 level 3, 1 level 4
    8: [4, 3, 3, 2], // Level 8: 4 level 1, 3 level 2, 3 level 3, 2 level 4
    9: [4, 3, 3, 3, 1], // Level 9: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 1 level 5
    10: [4, 3, 3, 3, 2], // Level 10: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 2 level 5
    11: [4, 3, 3, 3, 3, 1], // Level 11: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 3 level 5, 1 level 6
    12: [4, 3, 3, 3, 3, 1], // Level 12: same as 11
    13: [4, 3, 3, 3, 3, 2, 1], // Level 13: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 3 level 5, 2 level 6, 1 level 7
    14: [4, 3, 3, 3, 3, 2, 1], // Level 14: same as 13
    15: [4, 3, 3, 3, 3, 2, 2, 1], // Level 15: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 3 level 5, 2 level 6, 2 level 7, 1 level 8
    16: [4, 3, 3, 3, 3, 2, 2, 1], // Level 16: same as 15
    17: [4, 3, 3, 3, 3, 2, 2, 2, 1], // Level 17: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 3 level 5, 2 level 6, 2 level 7, 2 level 8, 1 level 9
    18: [4, 3, 3, 3, 3, 3, 2, 2, 1], // Level 18: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 3 level 5, 3 level 6, 2 level 7, 2 level 8, 1 level 9
    19: [4, 3, 3, 3, 3, 3, 3, 2, 1], // Level 19: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 3 level 5, 3 level 6, 3 level 7, 2 level 8, 1 level 9
    20: [4, 3, 3, 3, 3, 3, 3, 3, 1], // Level 20: 4 level 1, 3 level 2, 3 level 3, 3 level 4, 3 level 5, 3 level 6, 3 level 7, 3 level 8, 1 level 9
  };

  const levelSlots = spellSlotTable[level] || [];
  
  levelSlots.forEach((max, index) => {
    slots[index + 1] = { max, used: 0 };
  });

  return slots;
}

// Calculate max HP based on class hit die and CON modifier
export function calculateMaxHP(classId: string, level: number, conScore: number): number {
  const conModifier = calculateModifier(conScore);
  
  // Hit dice by class (PHB 2014)
  const hitDice: Record<string, number> = {
    barbarian: 12,
    fighter: 10,
    paladin: 10,
    ranger: 10,
    bard: 8,
    cleric: 8,
    druid: 8,
    monk: 8,
    rogue: 8,
    warlock: 8,
    wizard: 6,
    sorcerer: 6,
  };

  const hitDie = hitDice[classId] || 8;
  const baseHP = hitDie + conModifier;
  const levelHP = (hitDie / 2 + 1 + conModifier) * (level - 1);
  
  return Math.max(baseHP + levelHP, 1);
}

// Apply stat bonuses from race to base stats
export function applyStatBonuses(
  baseStats: Record<AbilityScoreName, number>,
  statBonuses: Record<string, number>
): Record<AbilityScoreName, number> {
  const result = { ...baseStats };
  
  Object.entries(statBonuses).forEach(([stat, bonus]) => {
    const upperStat = stat.toUpperCase() as AbilityScoreName;
    if (result[upperStat] !== undefined) {
      result[upperStat] += bonus;
    }
  });

  return result;
}

// Get progression value for a specific class and level
export function getProgressionValue(
  progressions: ClassProgression[],
  progressionTypeId: string,
  level: number
): any {
  const progression = progressions.find(
    p => p.progression_type_id === progressionTypeId && p.level === level
  );
  return progression?.value;
}

// Get all progressions for a class up to a specific level
export function getProgressionsUpToLevel(
  progressions: ClassProgression[],
  progressionTypeId: string,
  maxLevel: number
): ClassProgression[] {
  return progressions.filter(
    p => p.progression_type_id === progressionTypeId && p.level <= maxLevel
  ).sort((a, b) => a.level - b.level);
}

// Calculate proficiency bonus based on level (standard D&D 5e formula)
export function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

// Tailwind badge classes per D&D 5e damage type, for visually distinguishing damage badges
const damageTypeBadgeClasses: Record<string, string> = {
  acid: 'bg-lime-900/50 border-lime-700 text-lime-300',
  bludgeoning: 'bg-stone-800/50 border-stone-600 text-stone-300',
  cold: 'bg-cyan-900/50 border-cyan-700 text-cyan-300',
  fire: 'bg-orange-900/50 border-orange-700 text-orange-300',
  force: 'bg-violet-900/50 border-violet-700 text-violet-300',
  lightning: 'bg-yellow-900/50 border-yellow-700 text-yellow-300',
  necrotic: 'bg-emerald-950/50 border-emerald-800 text-emerald-400',
  piercing: 'bg-slate-800/50 border-slate-600 text-slate-300',
  poison: 'bg-green-900/50 border-green-700 text-green-300',
  psychic: 'bg-pink-900/50 border-pink-700 text-pink-300',
  radiant: 'bg-amber-900/50 border-amber-700 text-amber-300',
  slashing: 'bg-zinc-800/50 border-zinc-600 text-zinc-300',
  thunder: 'bg-indigo-900/50 border-indigo-700 text-indigo-300',
};

const defaultDamageTypeBadgeClasses = 'bg-red-900/50 border-red-700 text-red-300';

export function getDamageTypeBadgeClasses(damageType?: string): string {
  if (!damageType) return defaultDamageTypeBadgeClasses;
  return damageTypeBadgeClasses[damageType.toLowerCase()] || defaultDamageTypeBadgeClasses;
}
