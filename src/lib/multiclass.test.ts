import { describe, expect, it } from 'vitest';
import {
  calculateMulticlassSlots,
  casterLevelContribution,
  maxKnowableSpellLevel,
  maxSpellLevelForClass,
  multiclassCasterLevel,
  pactMagicSlots,
  toStoredSlots,
  usesPactMagic,
} from '@/lib/multiclass';

describe('casterLevelContribution', () => {
  it('counts full casters at their whole level', () => {
    for (const id of ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']) {
      expect(casterLevelContribution(id, 7)).toBe(7);
    }
  });

  it('halves paladin and ranger, rounding down', () => {
    expect(casterLevelContribution('paladin', 1)).toBe(0);
    expect(casterLevelContribution('paladin', 5)).toBe(2);
    expect(casterLevelContribution('ranger', 11)).toBe(5);
  });

  it('halves the artificer rounding up', () => {
    // TCE differs from the PHB half-casters here.
    expect(casterLevelContribution('artificer', 1)).toBe(1);
    expect(casterLevelContribution('artificer', 5)).toBe(3);
    expect(casterLevelContribution('artificer', 6)).toBe(3);
  });

  it('excludes warlock — Pact Magic is its own pool', () => {
    expect(casterLevelContribution('warlock', 20)).toBe(0);
  });

  it('excludes non-casters', () => {
    for (const id of ['barbarian', 'fighter', 'monk', 'rogue']) {
      expect(casterLevelContribution(id, 20)).toBe(0);
    }
  });
});

describe('multiclassCasterLevel', () => {
  it('adds a full caster to a half caster', () => {
    // Paladin 5 / Sorcerer 3 -> 2 + 3 = 5
    expect(
      multiclassCasterLevel([
        { classId: 'paladin', level: 5 },
        { classId: 'sorcerer', level: 3 },
      ])
    ).toBe(5);
  });

  it('adds two full casters', () => {
    expect(
      multiclassCasterLevel([
        { classId: 'cleric', level: 3 },
        { classId: 'wizard', level: 2 },
      ])
    ).toBe(5);
  });
});

describe('calculateMulticlassSlots', () => {
  it('leaves a single-class caster on its own table', () => {
    // A lone level-2 paladin has 2 first-level slots; the multiclass formula
    // would agree here, but the point is that nothing is recomputed for
    // single-class characters at all.
    const solo = calculateMulticlassSlots([{ classId: 'wizard', level: 5 }]);
    expect(solo.spellSlots).toEqual({ 1: 4, 2: 3, 3: 2 });
    expect(solo.pactSlots).toBeNull();
  });

  it('Cleric 3 / Wizard 2 casts as a level-5 caster', () => {
    const { spellSlots, casterLevel } = calculateMulticlassSlots([
      { classId: 'cleric', level: 3 },
      { classId: 'wizard', level: 2 },
    ]);
    expect(casterLevel).toBe(5);
    expect(spellSlots).toEqual({ 1: 4, 2: 3, 3: 2 });
  });

  it('Paladin 5 / Sorcerer 3 casts as a level-5 caster', () => {
    const { spellSlots, casterLevel } = calculateMulticlassSlots([
      { classId: 'paladin', level: 5 },
      { classId: 'sorcerer', level: 3 },
    ]);
    expect(casterLevel).toBe(5);
    expect(spellSlots).toEqual({ 1: 4, 2: 3, 3: 2 });
  });

  it('Artificer 3 / Wizard 3 casts as a level-5 caster', () => {
    // ceil(3/2) = 2, plus 3 = 5
    const { spellSlots, casterLevel } = calculateMulticlassSlots([
      { classId: 'artificer', level: 3 },
      { classId: 'wizard', level: 3 },
    ]);
    expect(casterLevel).toBe(5);
    expect(spellSlots).toEqual({ 1: 4, 2: 3, 3: 2 });
  });

  it('keeps Warlock slots separate from a Wizard multiclass', () => {
    const { spellSlots, pactSlots, casterLevel } = calculateMulticlassSlots([
      { classId: 'warlock', level: 3 },
      { classId: 'wizard', level: 2 },
    ]);
    // Only the wizard contributes to the shared pool, so it stays a level-2 table.
    expect(casterLevel).toBe(2);
    expect(spellSlots).toEqual({ 1: 3 });
    // Pact Magic sits alongside it, at its own level.
    expect(pactSlots).toEqual({ slotLevel: 2, count: 2 });
  });

  it('gives a lone warlock pact slots and no shared pool', () => {
    const { spellSlots, pactSlots } = calculateMulticlassSlots([
      { classId: 'warlock', level: 5 },
    ]);
    expect(spellSlots).toEqual({});
    expect(pactSlots).toEqual({ slotLevel: 3, count: 2 });
  });

  it('gives a non-caster nothing at all', () => {
    const { spellSlots, pactSlots } = calculateMulticlassSlots([
      { classId: 'barbarian', level: 6 },
      { classId: 'fighter', level: 2 },
    ]);
    expect(spellSlots).toEqual({});
    expect(pactSlots).toBeNull();
  });

  it('ignores a secondary class at level 0', () => {
    const { spellSlots } = calculateMulticlassSlots([
      { classId: 'cleric', level: 4 },
      { classId: 'wizard', level: 0 },
    ]);
    expect(spellSlots).toEqual({ 1: 4, 2: 3 });
  });
});

describe('pactMagicSlots', () => {
  it.each([
    [1, 1, 1],
    [2, 1, 2],
    [3, 2, 2],
    [5, 3, 2],
    [9, 5, 2],
    [11, 5, 3],
    [17, 5, 4],
  ])('warlock %i has %i slots of level %i', (level, slotLevel, count) => {
    expect(pactMagicSlots(level)).toEqual({ slotLevel, count });
  });

  it('is nothing at level 0', () => {
    expect(pactMagicSlots(0)).toBeNull();
  });
});

describe('maxSpellLevelForClass', () => {
  it('caps a low secondary class at its own ceiling', () => {
    // The rule this protects: shared slots may upcast, never unlock.
    expect(maxSpellLevelForClass('wizard', 1)).toBe(1);
    expect(maxSpellLevelForClass('cleric', 9)).toBe(5);
  });

  it('is zero for a class with no slots yet', () => {
    expect(maxSpellLevelForClass('paladin', 1)).toBe(0);
    expect(maxSpellLevelForClass('barbarian', 10)).toBe(0);
  });

  it('takes the higher of the two classes for the overall ceiling', () => {
    // Cleric 9 / Wizard 1 owns 5th-level slots but may only learn 1st-level
    // wizard spells; the cleric list is what reaches level 5.
    expect(
      maxKnowableSpellLevel([
        { classId: 'cleric', level: 9 },
        { classId: 'wizard', level: 1 },
      ])
    ).toBe(5);
  });
});

describe('toStoredSlots', () => {
  it('keeps spent slots across a recalculation', () => {
    const stored = toStoredSlots({ 1: 4, 2: 3 }, { 1: { max: 4, used: 2 }, 2: { max: 2, used: 1 } });
    expect(stored).toEqual({ 1: { max: 4, used: 2 }, 2: { max: 3, used: 1 } });
  });

  it('clamps spent slots when the maximum shrinks', () => {
    const stored = toStoredSlots({ 1: 2 }, { 1: { max: 4, used: 4 } });
    expect(stored).toEqual({ 1: { max: 2, used: 2 } });
  });

  it('starts fresh where there was nothing before', () => {
    expect(toStoredSlots({ 1: 2 }, undefined)).toEqual({ 1: { max: 2, used: 0 } });
  });
});

describe('usesPactMagic', () => {
  it('is the warlock and only the warlock', () => {
    expect(usesPactMagic('warlock')).toBe(true);
    expect(usesPactMagic('sorcerer')).toBe(false);
  });
});
