// Spellcasting statistics, derived from the class data rather than restated
// here. The dashboard used to branch on class id in a hardcoded list, which is
// how the Artificer ended up casting off Charisma: it simply was not in the
// list. Every class already declares its own `spellcastingAbility`, so that is
// the single source of truth.

import { getClassById } from '@/data/classes';
import { calculateModifier } from '@/lib/helpers';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

/** The six ability scores of a character, however they are stored. */
export type AbilityScores = Record<AbilityKey, number>;

export interface SpellcastingStats {
  /** Class the numbers belong to — with two classes they differ per class. */
  classId: string;
  className: string;
  /** 'INT' | 'WIS' | 'CHA', upper case for display. */
  ability: string;
  abilityScore: number;
  abilityModifier: number;
  /** Proficiency bonus follows total character level across all classes. */
  proficiencyBonus: number;
  spellSaveDC: number;
  spellAttackModifier: number;
}

/** PHB p. 15: +2 at level 1, stepping up every four levels. */
export function proficiencyBonusForLevel(totalLevel: number): number {
  return Math.ceil(Math.max(1, totalLevel) / 4) + 1;
}

/** The casting ability a class uses, or null when it casts no spells. */
export function getSpellcastingAbility(classId: string): 'INT' | 'WIS' | 'CHA' | null {
  const cls = getClassById(classId);
  if (!cls || !cls.spellcaster) return null;
  return cls.spellcastingAbility ?? null;
}

/**
 * Spellcasting statistics for one class of a character.
 *
 * Returns null for non-spellcasters rather than inventing a save DC — a
 * barbarian showing "Spell Save DC 12" is worse than showing nothing.
 *
 * `totalLevel` is deliberately separate from the class level: the proficiency
 * bonus comes from the character's whole level (PHB multiclassing, p. 163),
 * while the casting ability comes from the individual class.
 */
export function getSpellcastingStats(
  classId: string,
  abilities: AbilityScores,
  totalLevel: number
): SpellcastingStats | null {
  const cls = getClassById(classId);
  const ability = getSpellcastingAbility(classId);
  if (!cls || !ability) return null;

  const abilityScore = abilities[ability.toLowerCase() as AbilityKey] ?? 10;
  const abilityModifier = calculateModifier(abilityScore);
  const proficiencyBonus = proficiencyBonusForLevel(totalLevel);

  return {
    classId: cls.id,
    className: cls.name,
    ability,
    abilityScore,
    abilityModifier,
    proficiencyBonus,
    // PHB p. 205: DC 8 + proficiency + ability; attack bonus proficiency + ability.
    spellSaveDC: 8 + proficiencyBonus + abilityModifier,
    spellAttackModifier: proficiencyBonus + abilityModifier,
  };
}

/**
 * Every spellcasting class a character has, in the order primary then
 * secondary. A character with no casting class at all yields an empty array,
 * which is what lets the UI hide the panel entirely.
 */
export function getAllSpellcastingStats(
  character: {
    class_id: string;
    level: number;
    secondary_class_id?: string | null;
    secondary_level?: number | null;
  },
  abilities: AbilityScores
): SpellcastingStats[] {
  const totalLevel = character.level + (character.secondary_level ?? 0);
  const ids = [character.class_id, character.secondary_class_id].filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );
  return ids
    .map((id) => getSpellcastingStats(id, abilities, totalLevel))
    .filter((s): s is SpellcastingStats => s !== null);
}
