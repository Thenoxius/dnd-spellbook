// What a character's spell selection actually means.
//
// The app stores one flat `prepared_spells: string[]` and used to call every
// entry "prepared". D&D 2014 does not work that way: a sorcerer *knows* spells
// and can never swap them freely, a cleric *prepares* from the whole class
// list every long rest, cantrips are known rather than prepared, and domain or
// racial spells are always prepared without spending the budget.
//
// None of that needs a schema change. The limits and the always-prepared set
// are entirely derivable from the class, subclass and race data, so the stored
// array keeps its shape and existing backups stay importable. This module is
// the interpretation layer.

import { getClassById, getClassProgression } from '@/data/classes';
import { getSubclassById } from '@/data/subclasses';
import type { DndSpell } from '@/data/spells';
import { calculateModifier } from '@/lib/helpers';
import { resolveSpells, type SpellCatalog } from '@/lib/spellCatalog';
import type { AbilityScores } from '@/lib/spellcasting';

/** How a class gets its spells. */
export type CasterKind = 'prepared' | 'known' | 'none';

/** Classes that learn a fixed list and cannot swap it on a rest (PHB). */
const KNOWN_CASTERS = new Set(['bard', 'ranger', 'sorcerer', 'warlock']);

/** Classes that prepare from their whole list each long rest. */
const PREPARED_CASTERS = new Set(['artificer', 'cleric', 'druid', 'paladin', 'wizard']);

export function getCasterKind(classId: string): CasterKind {
  if (KNOWN_CASTERS.has(classId)) return 'known';
  if (PREPARED_CASTERS.has(classId)) return 'prepared';
  return 'none';
}

export interface ClassSpellLimits {
  classId: string;
  className: string;
  classLevel: number;
  casterKind: CasterKind;
  /** Cantrips the class knows at this level; 0 when it learns none. */
  cantripLimit: number;
  /** Spells known, or spells preparable — see casterKind for which. */
  spellLimit: number;
  /** "Spells known" or "Spells prepared", for the counter's label. */
  spellLimitLabel: string;
  /** Plain-language derivation, e.g. "WIS +3 + cleric level 5". */
  spellLimitFormula: string;
}

/**
 * Preparation budget for a class that prepares (PHB per class entry).
 * All of them are "ability modifier + some fraction of class level, minimum 1".
 */
function preparedLimit(classId: string, level: number, abilities: AbilityScores): number {
  const mod = (key: keyof AbilityScores) => calculateModifier(abilities[key]);
  switch (classId) {
    case 'cleric':
    case 'druid':
      return Math.max(1, mod('wis') + level);
    case 'wizard':
      return Math.max(1, mod('int') + level);
    case 'paladin':
      return Math.max(1, mod('cha') + Math.floor(level / 2));
    case 'artificer':
      // TCE: INT modifier + half artificer level rounded down, minimum one.
      return Math.max(1, mod('int') + Math.floor(level / 2));
    default:
      return 0;
  }
}

function preparedFormula(classId: string, level: number, abilities: AbilityScores): string {
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const mod = (key: keyof AbilityScores) => calculateModifier(abilities[key]);
  switch (classId) {
    case 'cleric':
    case 'druid':
      return `WIS ${fmt(mod('wis'))} + level ${level}`;
    case 'wizard':
      return `INT ${fmt(mod('int'))} + level ${level}`;
    case 'paladin':
      return `CHA ${fmt(mod('cha'))} + half of level ${level}`;
    case 'artificer':
      return `INT ${fmt(mod('int'))} + half of level ${level}`;
    default:
      return '';
  }
}

/** Limits for one class at one level. */
export function getClassSpellLimits(
  classId: string,
  classLevel: number,
  abilities: AbilityScores
): ClassSpellLimits | null {
  const cls = getClassById(classId);
  if (!cls || !cls.spellcaster || classLevel <= 0) return null;

  const casterKind = getCasterKind(classId);
  const progression = getClassProgression(classId, classLevel);
  const cantripLimit = progression?.cantripsKnown ?? 0;

  const spellLimit =
    casterKind === 'known'
      ? progression?.spellsKnown ?? 0
      : preparedLimit(classId, classLevel, abilities);

  return {
    classId,
    className: cls.name,
    classLevel,
    casterKind,
    cantripLimit,
    spellLimit,
    spellLimitLabel: casterKind === 'known' ? 'Spells known' : 'Spells prepared',
    spellLimitFormula:
      casterKind === 'known' ? `${cls.name} level ${classLevel}` : preparedFormula(classId, classLevel, abilities),
  };
}

export interface SelectionCharacter {
  class_id: string;
  level: number;
  secondary_class_id?: string | null;
  secondary_level?: number | null;
  subclass_id?: string | null;
  race_id?: string;
  subrace_id?: string | null;
  prepared_spells: string[];
}

/**
 * Spells the character always has available without spending their budget —
 * subclass bonus spells gained at or below the current level. The PHB wording
 * for domain spells is "they are always prepared and don't count against the
 * number of spells you can prepare each day".
 *
 * Racial spells are deliberately absent. The race data's `grantedSpells` field
 * does not hold spell ids at all: it holds trait names ("Darkvision", "Fey
 * Ancestry", "Brave"). A tiefling's Infernal Legacy really does grant
 * Thaumaturgy and Hellish Rebuke, but the dataset records the trait rather than
 * the spells, so there is nothing here to derive them from yet. Treating those
 * strings as spell ids would silently match nothing and imply a feature that
 * does not exist.
 */
export function getAlwaysPreparedIds(character: SelectionCharacter): Set<string> {
  const ids = new Set<string>();

  const subclass = character.subclass_id ? getSubclassById(character.subclass_id) : undefined;
  if (!subclass) return ids;

  // Which class level unlocks the bonus spells depends on which of the
  // character's classes the subclass belongs to.
  const classLevel =
    subclass.classId === character.secondary_class_id
      ? character.secondary_level ?? 0
      : character.level;

  for (const [grantLevel, spellIds] of Object.entries(subclass.bonusSpells ?? {})) {
    if (Number(grantLevel) <= classLevel) {
      for (const id of spellIds) ids.add(id);
    }
  }

  return ids;
}

export interface SelectionSummary {
  /** One block per spellcasting class, in primary-then-secondary order. */
  limits: ClassSpellLimits[];
  /** Selected cantrips that cost budget. */
  cantrips: DndSpell[];
  /** Selected leveled spells that cost budget. */
  spells: DndSpell[];
  /** Selected spells granted by subclass or race — free. */
  granted: DndSpell[];
  cantripLimit: number;
  spellLimit: number;
  overCantripLimit: boolean;
  overSpellLimit: boolean;
  /** Stored ids no catalog entry explains; surfaced, never deleted. */
  unresolvedIds: string[];
  /** True when two casting classes make a single combined budget misleading. */
  multiclassApproximation: boolean;
}

/**
 * Classify a character's stored selection against their limits.
 *
 * Nothing is ever removed here. If a legacy character holds more spells than
 * the rules now allow, the counters simply read over the limit so the UI can
 * say so — deleting someone's choices to satisfy a freshly-added rule would be
 * the worst possible outcome.
 */
export function summarizeSelection(
  character: SelectionCharacter,
  abilities: AbilityScores,
  catalog: SpellCatalog
): SelectionSummary {
  const classEntries = [
    { classId: character.class_id, level: character.level },
    { classId: character.secondary_class_id ?? '', level: character.secondary_level ?? 0 },
  ];

  const limits = classEntries
    .map((c) => getClassSpellLimits(c.classId, c.level, abilities))
    .filter((l): l is ClassSpellLimits => l !== null);

  const granted = getAlwaysPreparedIds(character);
  const selected = resolveSpells(catalog, character.prepared_spells);

  const cantrips: DndSpell[] = [];
  const spells: DndSpell[] = [];
  const grantedSpells: DndSpell[] = [];

  for (const spell of selected) {
    if (granted.has(spell.id)) grantedSpells.push(spell);
    else if (spell.level === 0) cantrips.push(spell);
    else spells.push(spell);
  }

  const cantripLimit = limits.reduce((sum, l) => sum + l.cantripLimit, 0);
  const spellLimit = limits.reduce((sum, l) => sum + l.spellLimit, 0);

  return {
    limits,
    cantrips,
    spells,
    granted: grantedSpells,
    cantripLimit,
    spellLimit,
    overCantripLimit: cantrips.length > cantripLimit,
    overSpellLimit: spells.length > spellLimit,
    unresolvedIds: character.prepared_spells.filter((id) => !catalog.byId.has(id)),
    multiclassApproximation: limits.length > 1,
  };
}
