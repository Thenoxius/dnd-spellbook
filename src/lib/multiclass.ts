// Multiclass spellcasting, PHB 2014 p. 163-164.
//
// Two classes that both cast do not simply add their slot tables together.
// They contribute levels to a shared "spellcaster level", and that level is
// read off the full-caster table. Pact Magic stays out of it entirely: warlock
// slots are their own pool, they come back on a short rest, and they are
// tracked separately from everything else.

import { getClassById, getClassProgression } from '@/data/classes';
import type { SpellSlot } from '@/types/database';

export interface ClassLevel {
  classId: string;
  level: number;
}

/** Slot table for a multiclass spellcaster (PHB p. 165), by caster level. */
const MULTICLASS_SLOTS: Record<number, number[]> = {
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

/** How many caster levels one class contributes to the shared pool. */
export function casterLevelContribution(classId: string, level: number): number {
  if (level <= 0) return 0;
  switch (classId) {
    // Full casters contribute every level.
    case 'bard':
    case 'cleric':
    case 'druid':
    case 'sorcerer':
    case 'wizard':
      return level;
    // Half casters contribute half, rounded down (PHB p. 164).
    case 'paladin':
    case 'ranger':
      return Math.floor(level / 2);
    // The Artificer rounds up instead (TCE, "Multiclassing" sidebar).
    case 'artificer':
      return Math.ceil(level / 2);
    // Pact Magic is not part of the shared pool at all.
    case 'warlock':
      return 0;
    default:
      return 0;
  }
}

/** Combined spellcaster level across the character's classes. */
export function multiclassCasterLevel(classes: readonly ClassLevel[]): number {
  return classes.reduce((sum, c) => sum + casterLevelContribution(c.classId, c.level), 0);
}

/** True when the class uses Pact Magic rather than ordinary Spellcasting. */
export function usesPactMagic(classId: string): boolean {
  return classId === 'warlock';
}

/** True when the class contributes to (or has) ordinary spell slots. */
export function hasSpellcasting(classId: string): boolean {
  const cls = getClassById(classId);
  return Boolean(cls?.spellcaster) && !usesPactMagic(classId);
}

/**
 * Pact Magic slots: all of one level, restored on a short rest.
 * Read from the warlock's own progression so the table stays in one place.
 */
export function pactMagicSlots(warlockLevel: number): { slotLevel: number; count: number } | null {
  if (warlockLevel <= 0) return null;
  const progression = getClassProgression('warlock', warlockLevel);
  if (!progression?.spellSlots) return null;
  const entries = Object.entries(progression.spellSlots);
  if (entries.length === 0) return null;
  const [slotLevel, count] = entries[0];
  return { slotLevel: Number(slotLevel), count };
}

/**
 * Spell slots for a whole character.
 *
 * With a single spellcasting class this defers to that class's own table, so
 * nothing about an existing single-class character changes. The multiclass
 * table only comes into play once two classes actually combine, which is the
 * case the PHB reserves it for.
 *
 * Pact Magic slots are returned separately because they recharge on a different
 * rest and must not be merged into the shared pool.
 */
export function calculateMulticlassSlots(classes: readonly ClassLevel[]): {
  spellSlots: Record<number, number>;
  pactSlots: { slotLevel: number; count: number } | null;
  casterLevel: number;
} {
  const real = classes.filter((c) => c.level > 0);
  const casters = real.filter((c) => hasSpellcasting(c.classId));
  const warlock = real.find((c) => usesPactMagic(c.classId));

  const pactSlots = warlock ? pactMagicSlots(warlock.level) : null;

  let spellSlots: Record<number, number> = {};
  if (casters.length === 1) {
    // Single caster: its own table, unchanged.
    const progression = getClassProgression(casters[0].classId, casters[0].level);
    spellSlots = { ...(progression?.spellSlots ?? {}) };
  } else if (casters.length > 1) {
    const casterLevel = multiclassCasterLevel(casters);
    const row = MULTICLASS_SLOTS[casterLevel] ?? [];
    row.forEach((count, index) => {
      spellSlots[index + 1] = count;
    });
  }

  return { spellSlots, pactSlots, casterLevel: multiclassCasterLevel(casters) };
}

/**
 * Highest spell level the character may *prepare or learn* from a given class.
 *
 * This is deliberately not the highest slot they own. A cleric 9 / wizard 1 has
 * fifth-level slots, but their wizard list still stops at first level — the
 * shared slots let them upcast a spell they know, never learn a higher one
 * (PHB p. 164, "Spells Known and Prepared").
 */
export function maxSpellLevelForClass(classId: string, classLevel: number): number {
  if (classLevel <= 0) return 0;
  const progression = getClassProgression(classId, classLevel);
  if (!progression?.spellSlots) return 0;
  const levels = Object.keys(progression.spellSlots).map(Number);
  return levels.length ? Math.max(...levels) : 0;
}

/**
 * Highest spell level the character may prepare or learn across all their
 * classes — the ceiling the Spell Library's "Castable" filter should use.
 */
export function maxKnowableSpellLevel(classes: readonly ClassLevel[]): number {
  return classes.reduce(
    (max, c) => Math.max(max, maxSpellLevelForClass(c.classId, c.level)),
    0
  );
}

/** Convert a slot count map into the stored shape, preserving spent slots. */
export function toStoredSlots(
  counts: Record<number, number>,
  previous: Record<number, SpellSlot> | undefined
): Record<number, SpellSlot> {
  const out: Record<number, SpellSlot> = {};
  for (const [level, max] of Object.entries(counts)) {
    const lvl = Number(level);
    const wasUsed = previous?.[lvl]?.used ?? 0;
    // Keep what has been spent, but never more than the new maximum.
    out[lvl] = { max, used: Math.min(wasUsed, max) };
  }
  return out;
}
