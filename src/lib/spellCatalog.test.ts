import { describe, expect, it } from 'vitest';
import { dndSpells, type DndSpell } from '@/data/spells';
import {
  buildCatalog,
  findUnresolvedIds,
  isCustomSpell,
  resolveSpells,
} from '@/lib/spellCatalog';

const homebrew = (overrides: Partial<DndSpell> = {}): DndSpell => ({
  id: 'custom_1',
  name: 'Whisper of the Deep',
  level: 2,
  school: 'Enchantment',
  castingTime: '1 action',
  range: '30 feet',
  components: 'V, S',
  duration: '1 minute',
  concentration: true,
  ritual: false,
  description: 'A borrowed secret.',
  baseClassIds: ['warlock'],
  ...overrides,
});

describe('buildCatalog', () => {
  it('contains every bundled spell when there is no homebrew', () => {
    const catalog = buildCatalog([]);
    expect(catalog.all).toHaveLength(dndSpells.length);
    expect(catalog.customIds.size).toBe(0);
    expect(catalog.byId.get('fireball')?.name).toBe('Fireball');
  });

  it('adds homebrew alongside the bundled spells', () => {
    const catalog = buildCatalog([homebrew()]);
    expect(catalog.all).toHaveLength(dndSpells.length + 1);
    expect(catalog.byId.get('custom_1')?.name).toBe('Whisper of the Deep');
    expect(isCustomSpell(catalog, 'custom_1')).toBe(true);
    expect(isCustomSpell(catalog, 'fireball')).toBe(false);
  });

  it('lets homebrew override a bundled spell of the same id', () => {
    const catalog = buildCatalog([homebrew({ id: 'fireball', name: 'Fireball (house rule)' })]);
    expect(catalog.byId.get('fireball')?.name).toBe('Fireball (house rule)');
    expect(catalog.all).toHaveLength(dndSpells.length);
    expect(isCustomSpell(catalog, 'fireball')).toBe(true);
  });

  it('ignores malformed homebrew records', () => {
    const catalog = buildCatalog([
      null as unknown as DndSpell,
      { name: 'no id' } as unknown as DndSpell,
      homebrew(),
    ]);
    expect(catalog.customIds.size).toBe(1);
  });
});

describe('resolveSpells', () => {
  it('resolves bundled and custom ids through the same path', () => {
    // The bug this module exists for: the dashboard resolved against the
    // bundled list only, so a prepared custom spell disappeared there while
    // still counting on the shelf and in the library.
    const catalog = buildCatalog([homebrew()]);
    const resolved = resolveSpells(catalog, ['fireball', 'custom_1']);
    expect(resolved.map((s) => s.name)).toEqual(['Fireball', 'Whisper of the Deep']);
  });

  it('keeps the stored order', () => {
    const catalog = buildCatalog([]);
    expect(resolveSpells(catalog, ['shield', 'fireball']).map((s) => s.id)).toEqual([
      'shield',
      'fireball',
    ]);
  });

  it('skips ids it cannot resolve instead of throwing', () => {
    const catalog = buildCatalog([]);
    expect(resolveSpells(catalog, ['fireball', 'spell-from-another-device'])).toHaveLength(1);
  });

  it('de-duplicates repeated ids', () => {
    const catalog = buildCatalog([]);
    expect(resolveSpells(catalog, ['fireball', 'fireball'])).toHaveLength(1);
  });

  it('returns nothing for an empty selection', () => {
    expect(resolveSpells(buildCatalog([]), [])).toEqual([]);
  });
});

describe('findUnresolvedIds', () => {
  it('reports ids with no spell behind them', () => {
    const catalog = buildCatalog([homebrew()]);
    expect(findUnresolvedIds(catalog, ['fireball', 'custom_1', 'ghost', 'ghost'])).toEqual([
      'ghost',
    ]);
  });

  it('is empty when everything resolves', () => {
    expect(findUnresolvedIds(buildCatalog([]), ['fireball', 'shield'])).toEqual([]);
  });
});
