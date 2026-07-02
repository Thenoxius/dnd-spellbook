// One-shot data patch for the Friday beta party: adds the Hexblade subclass
// (XGE), the Wrathful Smite spell (PHB, absent from the SRD export), and
// hand-written features for Hexblade, School of Divination, and Way of Mercy.
const fs = require('fs');

// 1. Hexblade subclass
const subs = JSON.parse(fs.readFileSync('src/data/exports/subclasses.json', 'utf8'));
if (!subs.some((s) => s.id === 'hexblade')) {
  subs.push({
    id: 'hexblade',
    class_id: 'warlock',
    name: 'The Hexblade',
    bonus_spells: { '1': ['shield', 'wrathful-smite'] },
    subclass_level_required: 1,
  });
  fs.writeFileSync('src/data/exports/subclasses.json', JSON.stringify(subs, null, 2) + '\n');
  console.log('hexblade subclass added');
}

// 2. Wrathful Smite spell
const spells = JSON.parse(fs.readFileSync('src/data/exports/spells.json', 'utf8'));
if (!spells.some((s) => s.id === 'wrathful-smite')) {
  spells.push({
    id: 'wrathful-smite',
    name: 'Wrathful Smite',
    level: 1,
    school: 'Evocation',
    casting_time: '1 bonus action',
    range: 'Self',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    description:
      "The next time you hit with a melee weapon attack during this spell's duration, your attack deals an extra 1d6 psychic damage. Additionally, if the target is a creature, it must make a Wisdom saving throw or be frightened of you until the spell ends. As an action, the creature can make a Wisdom check against your spell save DC to steel its resolve and end this spell.",
    base_class_ids: ['paladin'],
    damage: '1d6',
    damage_type: 'psychic',
    damage_scaling: { '1': '1d6' },
    scales_with: 'slot_level',
  });
  fs.writeFileSync('src/data/exports/spells.json', JSON.stringify(spells, null, 2) + '\n');
  console.log('wrathful smite added');
}

// 3. Subclass features
const features = JSON.parse(fs.readFileSync('src/data/exports/features.json', 'utf8'));
const newFeatures = [
  // --- The Hexblade (XGE) ---
  {
    id: 'hexblade_hexblades_curse', source_id: 'hexblade', level_required: 1, name: "Hexblade's Curse",
    description: "As a bonus action, curse a creature you can see within 30 feet for 1 minute. You gain a bonus to damage rolls against the cursed target equal to your proficiency bonus, you score a critical hit against it on a 19 or 20, and if it dies you regain hit points equal to your warlock level + your Charisma modifier. Once used, you can't use it again until you finish a short or long rest.",
  },
  {
    id: 'hexblade_hex_warrior', source_id: 'hexblade', level_required: 1, name: 'Hex Warrior',
    description: 'You gain proficiency with medium armor, shields, and martial weapons. When you finish a long rest, touch one weapon you are proficient with that lacks the two-handed property: you can use your Charisma modifier for attack and damage rolls with that weapon. This benefit also applies to any pact weapon.',
  },
  {
    id: 'hexblade_accursed_specter', source_id: 'hexblade', level_required: 6, name: 'Accursed Specter',
    description: "When you slay a humanoid, you can cause its spirit to rise as a specter that serves you until the end of your next long rest. It gains temporary hit points equal to half your warlock level and a bonus to attack rolls equal to your Charisma modifier. Once used, you can't use this feature again until you finish a long rest.",
  },
  {
    id: 'hexblade_armor_of_hexes', source_id: 'hexblade', level_required: 10, name: 'Armor of Hexes',
    description: "If the target cursed by your Hexblade's Curse hits you with an attack roll, roll a d6: on a 4 or higher, the attack misses you, regardless of its roll.",
  },
  {
    id: 'hexblade_master_of_hexes', source_id: 'hexblade', level_required: 14, name: 'Master of Hexes',
    description: "When the creature cursed by your Hexblade's Curse dies, you can apply the curse to a different creature you can see within 30 feet, provided you aren't incapacitated. This doesn't restore hit points to you.",
  },
  // --- School of Divination (PHB) ---
  {
    id: 'divination_savant', source_id: 'school_of_divination', level_required: 2, name: 'Divination Savant',
    description: 'The gold and time you must spend to copy a divination spell into your spellbook is halved.',
  },
  {
    id: 'divination_portent', source_id: 'school_of_divination', level_required: 2, name: 'Portent',
    description: 'When you finish a long rest, roll two d20s and record the numbers. You can replace any attack roll, saving throw, or ability check made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll, and you can replace a roll in this way only once per turn. Each foretelling roll can be used only once.',
  },
  {
    id: 'divination_expert_divination', source_id: 'school_of_divination', level_required: 6, name: 'Expert Divination',
    description: "When you cast a divination spell of 2nd level or higher using a spell slot, you regain one expended spell slot. The slot you regain must be of a level lower than the spell you cast and can't be higher than 5th level.",
  },
  {
    id: 'divination_third_eye', source_id: 'school_of_divination', level_required: 10, name: 'The Third Eye',
    description: "As an action, gain one of the following benefits until you are incapacitated or take a short or long rest: Darkvision 60 ft, Ethereal Sight 60 ft, Greater Comprehension (read any language), or See Invisibility 10 ft. You can't use this feature again until you finish a rest.",
  },
  {
    id: 'divination_greater_portent', source_id: 'school_of_divination', level_required: 14, name: 'Greater Portent',
    description: 'The visions in your dreams intensify: roll three d20s for your Portent feature, rather than two.',
  },
  // --- Way of Mercy (TCE) ---
  {
    id: 'mercy_implements', source_id: 'way_of_mercy', level_required: 3, name: 'Implements of Mercy',
    description: 'You gain proficiency in the Insight and Medicine skills, and proficiency with the herbalism kit.',
  },
  {
    id: 'mercy_hand_of_healing', source_id: 'way_of_mercy', level_required: 3, name: 'Hand of Healing',
    description: 'As an action, spend 1 ki point to touch a creature and restore hit points equal to a roll of your Martial Arts die + your Wisdom modifier. When you use Flurry of Blows, you can replace one of the unarmed strikes with a use of this feature without spending a ki point.',
  },
  {
    id: 'mercy_hand_of_harm', source_id: 'way_of_mercy', level_required: 3, name: 'Hand of Harm',
    description: 'When you hit a creature with an unarmed strike, spend 1 ki point to deal extra necrotic damage equal to one roll of your Martial Arts die + your Wisdom modifier. You can use this feature only once per turn.',
  },
  {
    id: 'mercy_physicians_touch', source_id: 'way_of_mercy', level_required: 6, name: "Physician's Touch",
    description: 'When you use Hand of Healing on a creature, you can also end one disease or one of these conditions: blinded, deafened, paralyzed, poisoned, or stunned. When you use Hand of Harm on a creature, you can also subject it to the poisoned condition until the end of your next turn.',
  },
  {
    id: 'mercy_flurry', source_id: 'way_of_mercy', level_required: 11, name: 'Flurry of Healing and Harm',
    description: "When you use Flurry of Blows, you can replace each of the unarmed strikes with a use of Hand of Healing, without spending ki for those uses. When you use Hand of Harm as part of a Flurry of Blows, you don't need to spend the ki point for Hand of Harm. You can use these benefits a total number of times equal to your proficiency bonus, and regain all uses on a long rest.",
  },
  {
    id: 'mercy_ultimate_mercy', source_id: 'way_of_mercy', level_required: 17, name: 'Hand of Ultimate Mercy',
    description: "As an action, spend 5 ki points to touch the corpse of a creature that died within the past 24 hours and return it to life with 4d10 + your Wisdom modifier hit points, curing several conditions. Once used, you can't use it again until you finish a long rest.",
  },
].map((f) => ({ ...f, source_type: 'subclass' }));

let added = 0;
for (const f of newFeatures) {
  if (!features.some((x) => x.id === f.id)) {
    features.push(f);
    added++;
  }
}
fs.writeFileSync('src/data/exports/features.json', JSON.stringify(features, null, 2) + '\n');
console.log('added', added, 'subclass features; total now', features.length);
