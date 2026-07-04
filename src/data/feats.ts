// D&D 5e Feats (PHB 2014, chapter 6) and Eldritch Invocation catalog.
// Feats are optional character options gained instead of an Ability Score
// Improvement; invocations are the Warlock's selectable class options.

import { dndFeatures, DndFeature } from './features';

export interface DndFeat {
  id: string;
  name: string;
  /** Prerequisite text as printed in the PHB, if any. */
  prerequisite?: string;
  description: string;
}

export const dndFeats: DndFeat[] = [
  {
    id: 'actor',
    name: 'Actor',
    description: 'Increase your Charisma by 1 (max 20). You have advantage on Deception and Performance checks when trying to pass yourself off as a different person, and can mimic the speech of a person or the sounds of a creature you have heard for at least 1 minute.',
  },
  {
    id: 'alert',
    name: 'Alert',
    description: '+5 bonus to initiative. You can\'t be surprised while conscious, and other creatures don\'t gain advantage on attack rolls against you as a result of being unseen by you.',
  },
  {
    id: 'athlete',
    name: 'Athlete',
    description: 'Increase your Strength or Dexterity by 1 (max 20). Standing up from prone uses only 5 feet of movement, climbing doesn\'t cost extra movement, and you can make running long or high jumps after moving only 5 feet.',
  },
  {
    id: 'charger',
    name: 'Charger',
    description: 'When you use your action to Dash, you can use a bonus action to make one melee weapon attack or shove a creature. If you move at least 10 feet in a straight line first, you gain +5 damage on the attack or push the target up to 10 feet.',
  },
  {
    id: 'crossbow_expert',
    name: 'Crossbow Expert',
    description: 'You ignore the loading quality of crossbows you are proficient with, being within 5 feet of a hostile creature doesn\'t impose disadvantage on your ranged attack rolls, and when you attack with a one-handed weapon you can use a bonus action to attack with a hand crossbow you are holding.',
  },
  {
    id: 'defensive_duelist',
    name: 'Defensive Duelist',
    prerequisite: 'Dexterity 13 or higher',
    description: 'When wielding a finesse weapon you are proficient with and another creature hits you with a melee attack, you can use your reaction to add your proficiency bonus to your AC, potentially causing the attack to miss.',
  },
  {
    id: 'dual_wielder',
    name: 'Dual Wielder',
    description: '+1 AC while wielding a separate melee weapon in each hand, you can two-weapon fight with non-light melee weapons, and you can draw or stow two one-handed weapons at once.',
  },
  {
    id: 'dungeon_delver',
    name: 'Dungeon Delver',
    description: 'Advantage on Perception and Investigation checks to detect secret doors, advantage on saves against traps, resistance to trap damage, and searching for traps doesn\'t slow your travel pace.',
  },
  {
    id: 'durable',
    name: 'Durable',
    description: 'Increase your Constitution by 1 (max 20). When you roll a Hit Die to regain hit points, the minimum you regain equals twice your Constitution modifier (minimum 2).',
  },
  {
    id: 'elemental_adept',
    name: 'Elemental Adept',
    prerequisite: 'The ability to cast at least one spell',
    description: 'Choose acid, cold, fire, lightning, or thunder. Your spells ignore resistance to that damage type, and you treat any 1 on a damage die for those spells as a 2. You can take this feat multiple times for different damage types.',
  },
  {
    id: 'grappler',
    name: 'Grappler',
    prerequisite: 'Strength 13 or higher',
    description: 'Advantage on attack rolls against a creature you are grappling, and you can use your action to try to pin a grappled creature (both of you become restrained on a success).',
  },
  {
    id: 'great_weapon_master',
    name: 'Great Weapon Master',
    description: 'When you score a critical hit or reduce a creature to 0 HP with a melee weapon, you can make one melee weapon attack as a bonus action. Before attacking with a heavy weapon you are proficient with, you can take -5 to hit for +10 damage.',
  },
  {
    id: 'healer',
    name: 'Healer',
    description: 'Stabilizing a creature with a healer\'s kit also restores 1 HP. As an action, you can spend a use of a healer\'s kit to restore 1d6+4 HP plus additional HP equal to the creature\'s maximum number of Hit Dice (once per creature per rest).',
  },
  {
    id: 'heavily_armored',
    name: 'Heavily Armored',
    prerequisite: 'Proficiency with medium armor',
    description: 'Increase your Strength by 1 (max 20). You gain proficiency with heavy armor.',
  },
  {
    id: 'heavy_armor_master',
    name: 'Heavy Armor Master',
    prerequisite: 'Proficiency with heavy armor',
    description: 'Increase your Strength by 1 (max 20). While wearing heavy armor, bludgeoning, piercing, and slashing damage from nonmagical attacks is reduced by 3.',
  },
  {
    id: 'inspiring_leader',
    name: 'Inspiring Leader',
    prerequisite: 'Charisma 13 or higher',
    description: 'Spend 10 minutes inspiring up to six friendly creatures within 30 feet. Each gains temporary hit points equal to your level + your Charisma modifier (once per creature per rest).',
  },
  {
    id: 'keen_mind',
    name: 'Keen Mind',
    description: 'Increase your Intelligence by 1 (max 20). You always know which way is north and when the next sunrise or sunset is, and you can accurately recall anything you have seen or heard within the past month.',
  },
  {
    id: 'lightly_armored',
    name: 'Lightly Armored',
    description: 'Increase your Strength or Dexterity by 1 (max 20). You gain proficiency with light armor.',
  },
  {
    id: 'linguist',
    name: 'Linguist',
    description: 'Increase your Intelligence by 1 (max 20). You learn three languages of your choice and can create written ciphers that others can\'t decipher without magic or an Intelligence check against DC = your Intelligence score + proficiency bonus.',
  },
  {
    id: 'lucky',
    name: 'Lucky',
    description: 'You have 3 luck points per long rest. Spend one to roll an additional d20 for an attack roll, ability check, or saving throw you make (choose which roll to use), or when an attack is made against you (choose which roll the attack uses).',
  },
  {
    id: 'mage_slayer',
    name: 'Mage Slayer',
    description: 'When a creature within 5 feet casts a spell, you can use your reaction to make a melee weapon attack against it. Creatures you damage have disadvantage on concentration saves, and you have advantage on saves against spells cast within 5 feet of you.',
  },
  {
    id: 'magic_initiate',
    name: 'Magic Initiate',
    description: 'Choose a class: bard, cleric, druid, sorcerer, warlock, or wizard. Learn two cantrips and one 1st-level spell from that class\'s spell list. You can cast the 1st-level spell once per long rest at its lowest level.',
  },
  {
    id: 'martial_adept',
    name: 'Martial Adept',
    description: 'Learn two maneuvers from the Battle Master archetype and gain one d6 superiority die (regained on a short or long rest) to fuel them.',
  },
  {
    id: 'medium_armor_master',
    name: 'Medium Armor Master',
    prerequisite: 'Proficiency with medium armor',
    description: 'Wearing medium armor doesn\'t impose disadvantage on Stealth checks, and you can add up to +3 (instead of +2) Dexterity modifier to AC in medium armor.',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'Your speed increases by 10 feet. Dashing over difficult terrain doesn\'t cost extra movement, and when you make a melee attack against a creature, you don\'t provoke opportunity attacks from it for the rest of the turn.',
  },
  {
    id: 'moderately_armored',
    name: 'Moderately Armored',
    prerequisite: 'Proficiency with light armor',
    description: 'Increase your Strength or Dexterity by 1 (max 20). You gain proficiency with medium armor and shields.',
  },
  {
    id: 'mounted_combatant',
    name: 'Mounted Combatant',
    description: 'Advantage on melee attacks against unmounted creatures smaller than your mount, you can force attacks against your mount to target you instead, and your mount takes no damage on successful Dexterity saves for half damage (half on a failure).',
  },
  {
    id: 'observant',
    name: 'Observant',
    description: 'Increase your Intelligence or Wisdom by 1 (max 20). You can read lips, and you gain +5 to passive Perception and passive Investigation.',
  },
  {
    id: 'polearm_master',
    name: 'Polearm Master',
    description: 'While wielding a glaive, halberd, or quarterstaff, you can use a bonus action to attack with the opposite end (d4 bludgeoning). Creatures provoke an opportunity attack from you when they enter your reach with those weapons or a pike.',
  },
  {
    id: 'resilient',
    name: 'Resilient',
    description: 'Choose one ability score: increase it by 1 (max 20) and gain proficiency in saving throws using that ability.',
  },
  {
    id: 'ritual_caster',
    name: 'Ritual Caster',
    prerequisite: 'Intelligence or Wisdom 13 or higher',
    description: 'Choose a ritual-casting class. You acquire a ritual book with two 1st-level ritual spells from that class and can cast them as rituals; you can add other ritual spells you find to the book.',
  },
  {
    id: 'savage_attacker',
    name: 'Savage Attacker',
    description: 'Once per turn when you roll damage for a melee weapon attack, you can reroll the weapon\'s damage dice and use either total.',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description: 'When you hit a creature with an opportunity attack its speed becomes 0 for the turn, creatures provoke opportunity attacks from you even if they Disengage, and when a creature within 5 feet attacks someone else you can use your reaction to attack it.',
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Attacking at long range doesn\'t impose disadvantage, your ranged weapon attacks ignore half and three-quarters cover, and before attacking with a ranged weapon you are proficient with you can take -5 to hit for +10 damage.',
  },
  {
    id: 'shield_master',
    name: 'Shield Master',
    description: 'When you take the Attack action, you can use a bonus action to shove with your shield. Add your shield\'s AC bonus to Dexterity saves against effects targeting only you, and you can use your reaction to take no damage on a successful save.',
  },
  {
    id: 'skilled',
    name: 'Skilled',
    description: 'Gain proficiency in any combination of three skills or tools of your choice.',
  },
  {
    id: 'skulker',
    name: 'Skulker',
    prerequisite: 'Dexterity 13 or higher',
    description: 'You can hide when only lightly obscured, missing with a ranged attack doesn\'t reveal your position while hidden, and dim light doesn\'t impose disadvantage on your Perception checks relying on sight.',
  },
  {
    id: 'spell_sniper',
    name: 'Spell Sniper',
    prerequisite: 'The ability to cast at least one spell',
    description: 'Double the range of your attack-roll spells, your spell attacks ignore half and three-quarters cover, and you learn one attack-roll cantrip from any class spell list.',
  },
  {
    id: 'tavern_brawler',
    name: 'Tavern Brawler',
    description: 'Increase your Strength or Constitution by 1 (max 20). You are proficient with improvised weapons, your unarmed strike deals a d4, and hitting with an unarmed strike or improvised weapon lets you attempt a grapple as a bonus action.',
  },
  {
    id: 'tough',
    name: 'Tough',
    description: 'Your hit point maximum increases by 2 for each level you have and by 2 whenever you gain a level.',
  },
  {
    id: 'war_caster',
    name: 'War Caster',
    prerequisite: 'The ability to cast at least one spell',
    description: 'Advantage on Constitution saves to maintain concentration, you can perform somatic components with weapons or a shield in hand, and you can cast a single-target spell (casting time 1 action) instead of an opportunity attack.',
  },
  {
    id: 'weapon_master',
    name: 'Weapon Master',
    description: 'Increase your Strength or Dexterity by 1 (max 20). You gain proficiency with four weapons of your choice.',
  },
];

export function getFeatById(id: string): DndFeat | undefined {
  return dndFeats.find(feat => feat.id === id);
}

// Eldritch Invocations live in features.json as warlock class features with a
// recognizable id prefix; expose them as a selectable catalog and keep them
// out of the automatic class feature list.
export const INVOCATION_ID_PREFIX = 'warlock_eldritch-invocation-';

export function isInvocationFeature(featureId: string): boolean {
  return featureId.startsWith(INVOCATION_ID_PREFIX);
}

export function getInvocations(): DndFeature[] {
  return dndFeatures
    .filter(feature => isInvocationFeature(feature.id))
    .sort((a, b) => a.levelRequired - b.levelRequired || a.name.localeCompare(b.name));
}

export function getInvocationById(id: string): DndFeature | undefined {
  return dndFeatures.find(feature => feature.id === id && isInvocationFeature(id));
}
