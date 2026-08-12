import { describe, expect, it } from 'vitest';
import { buildCatalog } from '@/lib/spellCatalog';
import type { DndSpell } from '@/data/spells';
import type { AbilityScores } from '@/lib/spellcasting';
import {
  getAlwaysPreparedIds,
  getCasterKind,
  getClassSpellLimits,
  summarizeSelection,
  type SelectionCharacter,
} from '@/lib/spellSelection';

const scores = (o: Partial<AbilityScores> = {}): AbilityScores => ({
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o,
});

const catalog = buildCatalog([
  {
    id: 'custom_1',
    name: 'Homebrew Bolt',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    description: '',
    baseClassIds: ['wizard'],
  } as DndSpell,
]);

const character = (o: Partial<SelectionCharacter> = {}): SelectionCharacter => ({
  class_id: 'cleric',
  level: 5,
  prepared_spells: [],
  ...o,
});

describe('getCasterKind', () => {
  it('separates known casters from preparers', () => {
    for (const id of ['bard', 'ranger', 'sorcerer', 'warlock']) {
      expect(getCasterKind(id)).toBe('known');
    }
    for (const id of ['artificer', 'cleric', 'druid', 'paladin', 'wizard']) {
      expect(getCasterKind(id)).toBe('prepared');
    }
    for (const id of ['barbarian', 'fighter', 'monk', 'rogue']) {
      expect(getCasterKind(id)).toBe('none');
    }
  });
});

describe('getClassSpellLimits', () => {
  it('gives a cleric WIS modifier plus level', () => {
    const limits = getClassSpellLimits('cleric', 5, scores({ wis: 16 }))!;
    expect(limits.casterKind).toBe('prepared');
    expect(limits.spellLimit).toBe(3 + 5);
    expect(limits.spellLimitLabel).toBe('Spells prepared');
    expect(limits.spellLimitFormula).toBe('WIS +3 + level 5');
  });

  it('halves the level for a paladin', () => {
    expect(getClassSpellLimits('paladin', 5, scores({ cha: 16 }))!.spellLimit).toBe(3 + 2);
  });

  it('halves the level for an artificer, rounding down', () => {
    expect(getClassSpellLimits('artificer', 5, scores({ int: 18 }))!.spellLimit).toBe(4 + 2);
  });

  it('never drops a preparer below one spell', () => {
    // A level-1 paladin with CHA 8: -1 + 0 would be negative.
    expect(getClassSpellLimits('paladin', 1, scores({ cha: 8 }))!.spellLimit).toBe(1);
  });

  it('reads spells known from the progression for known casters', () => {
    const bard = getClassSpellLimits('bard', 5, scores({ cha: 16 }))!;
    expect(bard.casterKind).toBe('known');
    expect(bard.spellLimitLabel).toBe('Spells known');
    // Known casters do not add their ability modifier.
    expect(bard.spellLimit).toBe(getClassSpellLimits('bard', 5, scores({ cha: 8 }))!.spellLimit);
  });

  it('reports the cantrip allowance separately', () => {
    expect(getClassSpellLimits('wizard', 4, scores({ int: 16 }))!.cantripLimit).toBe(4);
    // Paladins and rangers learn no cantrips in the 2014 rules.
    expect(getClassSpellLimits('paladin', 5, scores({ cha: 16 }))!.cantripLimit).toBe(0);
  });

  it('is nothing for a non-caster or a level-0 class', () => {
    expect(getClassSpellLimits('barbarian', 5, scores())).toBeNull();
    expect(getClassSpellLimits('wizard', 0, scores())).toBeNull();
  });
});

describe('getAlwaysPreparedIds', () => {
  it('includes subclass bonus spells up to the class level', () => {
    // Battle Smith grants heroism + shield at 3, branding-smite + warding-bond at 5.
    const ids = getAlwaysPreparedIds(
      character({ class_id: 'artificer', level: 5, subclass_id: 'battle_smith' })
    );
    expect([...ids].sort()).toEqual(['branding-smite', 'heroism', 'shield', 'warding-bond']);
  });

  it('excludes bonus spells from levels not yet reached', () => {
    const atThree = getAlwaysPreparedIds(
      character({ class_id: 'artificer', level: 3, subclass_id: 'battle_smith' })
    );
    expect([...atThree].sort()).toEqual(['heroism', 'shield']);
    const atThirteen = getAlwaysPreparedIds(
      character({ class_id: 'artificer', level: 13, subclass_id: 'battle_smith' })
    );
    expect(atThirteen.size).toBeGreaterThan(atThree.size);
  });

  it('uses the secondary class level when the subclass belongs to it', () => {
    const ids = getAlwaysPreparedIds(
      character({
        class_id: 'wizard',
        level: 9,
        secondary_class_id: 'warlock',
        secondary_level: 1,
        subclass_id: 'hexblade',
      })
    );
    // Hexblade grants at warlock level 1, which the character has.
    expect([...ids].sort()).toEqual(['shield', 'wrathful-smite']);
  });

  it('grants nothing for a subclass the dataset has no bonus spells for', () => {
    // Only five of the 82 subclasses carry bonus_spells today; cleric domain
    // spells live in features.json as prose, so they cannot be derived here.
    expect(
      getAlwaysPreparedIds(character({ class_id: 'cleric', level: 9, subclass_id: 'life_domain' })).size
    ).toBe(0);
  });

  it('is empty without a subclass', () => {
    expect(getAlwaysPreparedIds(character({ subclass_id: null })).size).toBe(0);
  });

  it('does not treat racial trait names as spells', () => {
    // races.json stores "Darkvision", "Fey Ancestry" and the like in a field
    // called grantedSpells; those are traits, not spell ids.
    const ids = getAlwaysPreparedIds(character({ race_id: 'tiefling', subclass_id: null }));
    expect(ids.size).toBe(0);
  });
});

describe('summarizeSelection', () => {
  it('counts cantrips and spells against separate budgets', () => {
    const summary = summarizeSelection(
      character({
        class_id: 'wizard',
        level: 3,
        prepared_spells: ['fire-bolt', 'light', 'shield', 'magic-missile'],
      }),
      scores({ int: 16 }),
      catalog
    );
    expect(summary.cantrips.map((s) => s.id)).toEqual(['fire-bolt', 'light']);
    expect(summary.spells.map((s) => s.id)).toEqual(['shield', 'magic-missile']);
    expect(summary.cantripLimit).toBe(3);
    expect(summary.spellLimit).toBe(3 + 3);
    expect(summary.overCantripLimit).toBe(false);
    expect(summary.overSpellLimit).toBe(false);
  });

  it('does not charge always-prepared subclass spells to the budget', () => {
    const smith = character({
      class_id: 'artificer',
      level: 5,
      subclass_id: 'battle_smith',
      prepared_spells: [],
    });
    const granted = [...getAlwaysPreparedIds(smith)];
    expect(granted.length).toBe(4);
    const summary = summarizeSelection(
      { ...smith, prepared_spells: [...granted, 'cure-wounds'] },
      scores({ int: 16 }),
      catalog
    );
    expect(summary.granted).toHaveLength(4);
    // Only the freely chosen spell spends the preparation budget.
    expect(summary.spells.map((s) => s.id)).toEqual(['cure-wounds']);
  });

  it('reports going over a limit without discarding anything', () => {
    // A legacy character who selected far more than the rules now allow.
    const many = ['shield', 'magic-missile', 'mage-armor', 'detect-magic', 'fog-cloud', 'grease'];
    const summary = summarizeSelection(
      character({ class_id: 'wizard', level: 1, prepared_spells: many }),
      scores({ int: 12 }),
      catalog
    );
    expect(summary.spellLimit).toBe(1 + 1);
    expect(summary.overSpellLimit).toBe(true);
    // Nothing was dropped: every selection is still accounted for.
    expect(summary.spells).toHaveLength(many.length);
  });

  it('includes custom spells in the count', () => {
    const summary = summarizeSelection(
      character({ class_id: 'wizard', level: 3, prepared_spells: ['custom_1'] }),
      scores({ int: 16 }),
      catalog
    );
    expect(summary.spells.map((s) => s.name)).toEqual(['Homebrew Bolt']);
  });

  it('surfaces unresolved ids rather than dropping them silently', () => {
    const summary = summarizeSelection(
      character({ prepared_spells: ['cure-wounds', 'spell-from-another-device'] }),
      scores({ wis: 14 }),
      catalog
    );
    expect(summary.unresolvedIds).toEqual(['spell-from-another-device']);
  });

  it('flags a multiclass budget as an approximation', () => {
    const summary = summarizeSelection(
      character({
        class_id: 'cleric',
        level: 3,
        secondary_class_id: 'wizard',
        secondary_level: 2,
        prepared_spells: [],
      }),
      scores({ wis: 16, int: 14 }),
      catalog
    );
    expect(summary.limits.map((l) => l.classId)).toEqual(['cleric', 'wizard']);
    expect(summary.multiclassApproximation).toBe(true);
    // Budgets add up across classes.
    expect(summary.spellLimit).toBe(3 + 3 + (2 + 2));
  });

  it('gives a non-caster no limits at all', () => {
    const summary = summarizeSelection(
      character({ class_id: 'barbarian', level: 5, prepared_spells: [] }),
      scores(),
      catalog
    );
    expect(summary.limits).toEqual([]);
    expect(summary.spellLimit).toBe(0);
  });
});
