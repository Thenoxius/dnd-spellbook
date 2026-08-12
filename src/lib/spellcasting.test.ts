import { describe, expect, it } from 'vitest';
import { dndClasses } from '@/data/classes';
import {
  getAllSpellcastingStats,
  getSpellcastingAbility,
  getSpellcastingStats,
  proficiencyBonusForLevel,
  type AbilityScores,
} from '@/lib/spellcasting';

const scores = (overrides: Partial<AbilityScores> = {}): AbilityScores => ({
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  ...overrides,
});

// PHB 2014 casting abilities, written out independently of the data file so a
// wrong value in the data is caught rather than confirmed.
const EXPECTED_ABILITY: Record<string, 'INT' | 'WIS' | 'CHA' | null> = {
  artificer: 'INT',
  barbarian: null,
  bard: 'CHA',
  cleric: 'WIS',
  druid: 'WIS',
  fighter: null,
  monk: null,
  paladin: 'CHA',
  ranger: 'WIS',
  rogue: null,
  sorcerer: 'CHA',
  warlock: 'CHA',
  wizard: 'INT',
};

describe('getSpellcastingAbility', () => {
  it('covers every class the app ships', () => {
    expect(dndClasses.map((c) => c.id).sort()).toEqual(Object.keys(EXPECTED_ABILITY).sort());
  });

  for (const [classId, expected] of Object.entries(EXPECTED_ABILITY)) {
    it(`${classId} casts off ${expected ?? 'nothing'}`, () => {
      expect(getSpellcastingAbility(classId)).toBe(expected);
    });
  }

  it('is unknown for an unknown class', () => {
    expect(getSpellcastingAbility('bard-of-holding')).toBeNull();
  });
});

describe('proficiencyBonusForLevel', () => {
  it.each([
    [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6],
  ])('level %i gives +%i', (level, bonus) => {
    expect(proficiencyBonusForLevel(level)).toBe(bonus);
  });

  it('never drops below the level-1 bonus', () => {
    expect(proficiencyBonusForLevel(0)).toBe(2);
  });
});

describe('getSpellcastingStats', () => {
  it('gives the Artificer Intelligence, not Charisma', () => {
    // The bug this module exists for: artificer was missing from the old
    // hardcoded map and silently fell through to CHA.
    const stats = getSpellcastingStats('artificer', scores({ int: 18, cha: 8 }), 5);
    expect(stats).not.toBeNull();
    expect(stats!.ability).toBe('INT');
    expect(stats!.abilityModifier).toBe(4);
    expect(stats!.spellSaveDC).toBe(8 + 3 + 4);
    expect(stats!.spellAttackModifier).toBe(3 + 4);
  });

  it('derives save DC and attack modifier from the same parts', () => {
    const stats = getSpellcastingStats('wizard', scores({ int: 19 }), 9)!;
    expect(stats.proficiencyBonus).toBe(4);
    expect(stats.abilityModifier).toBe(4);
    expect(stats.spellSaveDC).toBe(16);
    expect(stats.spellAttackModifier).toBe(8);
    expect(stats.spellSaveDC - stats.spellAttackModifier).toBe(8);
  });

  it('handles a negative ability modifier', () => {
    const stats = getSpellcastingStats('sorcerer', scores({ cha: 8 }), 1)!;
    expect(stats.abilityModifier).toBe(-1);
    expect(stats.spellSaveDC).toBe(9);
    expect(stats.spellAttackModifier).toBe(1);
  });

  it('returns nothing for a non-spellcaster', () => {
    for (const classId of ['barbarian', 'fighter', 'monk', 'rogue']) {
      expect(getSpellcastingStats(classId, scores({ cha: 18 }), 10)).toBeNull();
    }
  });

  it('reads each caster from its own configured ability', () => {
    const abilities = scores({ int: 16, wis: 14, cha: 12 });
    expect(getSpellcastingStats('wizard', abilities, 1)!.abilityScore).toBe(16);
    expect(getSpellcastingStats('cleric', abilities, 1)!.abilityScore).toBe(14);
    expect(getSpellcastingStats('bard', abilities, 1)!.abilityScore).toBe(12);
  });
});

describe('getAllSpellcastingStats', () => {
  it('uses the total character level for proficiency but each class own ability', () => {
    const stats = getAllSpellcastingStats(
      { class_id: 'cleric', level: 3, secondary_class_id: 'wizard', secondary_level: 2 },
      scores({ wis: 16, int: 18 })
    );
    expect(stats.map((s) => s.classId)).toEqual(['cleric', 'wizard']);
    // total level 5 -> +3 for both, even though neither class is level 5
    expect(stats.every((s) => s.proficiencyBonus === 3)).toBe(true);
    expect(stats[0].ability).toBe('WIS');
    expect(stats[0].spellSaveDC).toBe(8 + 3 + 3);
    expect(stats[1].ability).toBe('INT');
    expect(stats[1].spellSaveDC).toBe(8 + 3 + 4);
  });

  it('skips a non-casting secondary class', () => {
    const stats = getAllSpellcastingStats(
      { class_id: 'wizard', level: 5, secondary_class_id: 'fighter', secondary_level: 2 },
      scores({ int: 16 })
    );
    expect(stats).toHaveLength(1);
    expect(stats[0].classId).toBe('wizard');
    expect(stats[0].proficiencyBonus).toBe(3); // total level 7 sits in the 5-8 band
  });

  it('is empty for a character who casts nothing at all', () => {
    expect(
      getAllSpellcastingStats({ class_id: 'barbarian', level: 6 }, scores({ cha: 20 }))
    ).toEqual([]);
  });

  it('tolerates a missing secondary class', () => {
    const stats = getAllSpellcastingStats(
      { class_id: 'druid', level: 4, secondary_class_id: null, secondary_level: 0 },
      scores({ wis: 17 })
    );
    expect(stats).toHaveLength(1);
    expect(stats[0].spellAttackModifier).toBe(2 + 3);
  });
});
