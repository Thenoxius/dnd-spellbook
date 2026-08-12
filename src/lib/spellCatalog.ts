// One place where "every spell this device knows about" is assembled.
//
// The Spell Library used to merge bundled and homebrew spells itself while the
// character dashboard resolved prepared spells against the bundled list alone.
// A prepared custom spell therefore counted on the shelf and in the library but
// vanished from the Spells tab. Anything that turns spell ids into spells now
// goes through this catalog instead.

import { dndSpells, type DndSpell } from '@/data/spells';
import { listCustomSpells } from '@/lib/db';

export interface SpellCatalog {
  /** Bundled spells followed by this device's homebrew. */
  all: DndSpell[];
  byId: Map<string, DndSpell>;
  /** Ids that came from the customSpells store rather than the bundled data. */
  customIds: Set<string>;
}

/** An empty catalog, for the moment before the homebrew store has answered. */
export const EMPTY_CATALOG: SpellCatalog = {
  all: [],
  byId: new Map(),
  customIds: new Set(),
};

/**
 * Combine bundled and custom spells.
 *
 * A homebrew spell that reuses a bundled id overrides it, so someone can fix a
 * spell they disagree with without the original shadowing their version.
 */
export function buildCatalog(customSpells: readonly DndSpell[]): SpellCatalog {
  const byId = new Map<string, DndSpell>();
  for (const spell of dndSpells) byId.set(spell.id, spell);

  const customIds = new Set<string>();
  for (const spell of customSpells) {
    if (!spell || typeof spell.id !== 'string') continue;
    byId.set(spell.id, spell);
    customIds.add(spell.id);
  }

  return { all: [...byId.values()], byId, customIds };
}

/** Build the catalog from the bundled data plus whatever this device stores. */
export async function loadSpellCatalog(): Promise<SpellCatalog> {
  const custom = await listCustomSpells().catch(() => [] as DndSpell[]);
  return buildCatalog(custom);
}

/**
 * Turn stored spell ids into spells, dropping ids the catalog cannot resolve.
 *
 * Unknown ids are skipped rather than throwing: a character may hold a
 * reference to homebrew that lived on another device, and losing one row is
 * better than a blank screen.
 */
export function resolveSpells(catalog: SpellCatalog, ids: readonly string[]): DndSpell[] {
  const seen = new Set<string>();
  const out: DndSpell[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const spell = catalog.byId.get(id);
    if (spell) out.push(spell);
  }
  return out;
}

/** Stored ids the catalog cannot explain — used to warn rather than delete. */
export function findUnresolvedIds(catalog: SpellCatalog, ids: readonly string[]): string[] {
  return [...new Set(ids)].filter((id) => !catalog.byId.has(id));
}

export function isCustomSpell(catalog: SpellCatalog, id: string): boolean {
  return catalog.customIds.has(id);
}
