// Limited-use class abilities (PHB 2014) with max-uses formulas.
// Max uses can depend on level and ability modifiers (e.g. Bardic
// Inspiration = CHA modifier), which is why these are functions rather
// than static tables.

export interface AbilityModifiers {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type RechargeType = 'short' | 'long';

export interface ClassAbilityDef {
  id: string;
  classId: string;
  /** When set, the ability is granted by this subclass rather than the base class. */
  subclassId?: string;
  name: string;
  description: string;
  minLevel: number;
  maxUses: (level: number, mods: AbilityModifiers) => number;
  recharge: (level: number) => RechargeType;
  /** Which ability modifier the max uses derive from, if any (for the UI to show the link). */
  linkedStat?: keyof AbilityModifiers;
  /** The ability banks specific die results (e.g. Portent d20s) that the player enters and spends individually. */
  storesRolls?: boolean;
}

/** A class ability resolved for a specific character. */
export interface ResolvedClassAbility {
  id: string;
  name: string;
  description: string;
  maxUses: number;
  recharge: RechargeType;
  linkedStat?: keyof AbilityModifiers;
  storesRolls?: boolean;
}

const short = () => 'short' as const;
const long = () => 'long' as const;

const classAbilityDefs: ClassAbilityDef[] = [
  {
    id: 'flash_of_genius',
    classId: 'artificer',
    name: 'Flash of Genius',
    description:
      'When you or a creature within 30 feet makes an ability check or saving throw, use your reaction to add your Intelligence modifier to the roll. Uses equal your Intelligence modifier.',
    minLevel: 7,
    maxUses: (_level, mods) => Math.max(1, mods.int),
    recharge: long,
    linkedStat: 'int',
  },
  {
    id: 'rage',
    classId: 'barbarian',
    name: 'Rage',
    description: 'Enter a rage as a bonus action: advantage on STR checks and saves, bonus melee damage, resistance to bludgeoning, piercing, and slashing damage.',
    minLevel: 1,
    maxUses: (level) => (level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2),
    recharge: long,
  },
  {
    id: 'bardic_inspiration',
    classId: 'bard',
    name: 'Bardic Inspiration',
    description: 'As a bonus action, give one creature an inspiration die to add to an ability check, attack roll, or saving throw. Uses equal your Charisma modifier.',
    minLevel: 1,
    maxUses: (_level, mods) => Math.max(1, mods.cha),
    recharge: (level) => (level >= 5 ? 'short' : 'long'),
    linkedStat: 'cha',
  },
  {
    id: 'channel_divinity_cleric',
    classId: 'cleric',
    name: 'Channel Divinity',
    description: 'Channel divine energy to fuel magical effects such as Turn Undead or your domain option.',
    minLevel: 2,
    maxUses: (level) => (level >= 18 ? 3 : level >= 6 ? 2 : 1),
    recharge: short,
  },
  {
    id: 'wild_shape',
    classId: 'druid',
    name: 'Wild Shape',
    description: 'Magically assume the shape of a beast you have seen before.',
    minLevel: 2,
    maxUses: () => 2,
    recharge: short,
  },
  {
    id: 'second_wind',
    classId: 'fighter',
    name: 'Second Wind',
    description: 'As a bonus action, regain 1d10 + your fighter level hit points.',
    minLevel: 1,
    maxUses: () => 1,
    recharge: short,
  },
  {
    id: 'action_surge',
    classId: 'fighter',
    name: 'Action Surge',
    description: 'Take one additional action on your turn.',
    minLevel: 2,
    maxUses: (level) => (level >= 17 ? 2 : 1),
    recharge: short,
  },
  {
    id: 'indomitable',
    classId: 'fighter',
    name: 'Indomitable',
    description: 'Reroll a saving throw that you fail. You must use the new roll.',
    minLevel: 9,
    maxUses: (level) => (level >= 17 ? 3 : level >= 13 ? 2 : 1),
    recharge: long,
  },
  {
    id: 'ki_points',
    classId: 'monk',
    name: 'Ki Points',
    description: 'Fuel Flurry of Blows, Patient Defense, Step of the Wind, and other ki features. You have ki points equal to your monk level.',
    minLevel: 2,
    maxUses: (level) => level,
    recharge: short,
  },
  {
    id: 'divine_sense',
    classId: 'paladin',
    name: 'Divine Sense',
    description: 'Detect celestials, fiends, and undead within 60 feet. Uses equal 1 + your Charisma modifier.',
    minLevel: 1,
    maxUses: (_level, mods) => 1 + Math.max(0, mods.cha),
    recharge: long,
    linkedStat: 'cha',
  },
  {
    id: 'lay_on_hands',
    classId: 'paladin',
    name: 'Lay on Hands',
    description: 'A pool of healing power: restore hit points totalling 5 × your paladin level per long rest.',
    minLevel: 1,
    maxUses: (level) => 5 * level,
    recharge: long,
  },
  {
    id: 'channel_divinity_paladin',
    classId: 'paladin',
    name: 'Channel Divinity',
    description: 'Channel divine energy to fuel the options granted by your sacred oath.',
    minLevel: 3,
    maxUses: () => 1,
    recharge: short,
  },
  {
    id: 'stroke_of_luck',
    classId: 'rogue',
    name: 'Stroke of Luck',
    description: 'Turn a missed attack into a hit, or treat a failed ability check as a natural 20.',
    minLevel: 20,
    maxUses: () => 1,
    recharge: short,
  },
  {
    id: 'sorcery_points',
    classId: 'sorcerer',
    name: 'Sorcery Points',
    description: 'Fuel Metamagic and Flexible Casting. You have sorcery points equal to your sorcerer level.',
    minLevel: 2,
    maxUses: (level) => level,
    recharge: long,
  },
  {
    id: 'arcane_recovery',
    classId: 'wizard',
    name: 'Arcane Recovery',
    description: 'Once per day after a short rest, recover expended spell slots with a combined level up to half your wizard level (rounded up).',
    minLevel: 1,
    maxUses: () => 1,
    recharge: long,
  },
  // --- Subclass abilities ---
  {
    id: 'portent',
    classId: 'wizard',
    subclassId: 'school_of_divination',
    name: 'Portent Dice',
    description: 'Roll your foretelling d20s after each long rest and store the results here. Spend one to replace any attack roll, saving throw, or ability check made by a creature you can see.',
    minLevel: 2,
    maxUses: (level) => (level >= 14 ? 3 : 2),
    recharge: long,
    storesRolls: true,
  },
  {
    id: 'hexblades_curse',
    classId: 'warlock',
    subclassId: 'hexblade',
    name: "Hexblade's Curse",
    description: 'Curse a creature within 30 feet: bonus damage equal to your proficiency bonus, crits on 19-20, and regain HP when it dies.',
    minLevel: 1,
    maxUses: () => 1,
    recharge: short,
  },
];

/** Resolve the limited-use abilities available to a character of the given class/level/stats. */
export function getClassAbilities(
  classId: string,
  level: number,
  mods: AbilityModifiers,
  subclassId?: string | null
): ResolvedClassAbility[] {
  return classAbilityDefs
    .filter(
      (def) =>
        def.classId === classId &&
        level >= def.minLevel &&
        (!def.subclassId || def.subclassId === subclassId)
    )
    .map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      maxUses: def.maxUses(level, mods),
      recharge: def.recharge(level),
      linkedStat: def.linkedStat,
      storesRolls: def.storesRolls,
    }))
    .filter((ability) => ability.maxUses > 0);
}
