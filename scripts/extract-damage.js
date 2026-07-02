const fs = require('fs');
const path = require('path');

const localSpells = require('../src/data/exports/spells.json');
const apiSpells = require('../all_spells_with_damage.json');

const apiByName = new Map(apiSpells.map((s) => [s.name.toLowerCase(), s]));

// Fallback regex for spells whose damage isn't in the API's structured `damage`
// field but is stated plainly in the description (e.g. some cantrip scaling text).
const damagePattern =
  /(\d+d\d+(?:\s*\+\s*\d+)?)\s+(fire|acid|cold|lightning|necrotic|force|psychic|thunder|poison|radiant|bludgeoning|piercing|slashing)\s+damage/i;

function structuredDamage(apiSpell) {
  const dmg = apiSpell.damage;
  if (!dmg) return null;

  const levels = dmg.damage_at_character_level || dmg.damage_at_slot_level;
  if (!levels || !dmg.damage_type) return null;

  const lowestLevel = Math.min(...Object.keys(levels).map(Number));
  return {
    damage: levels[lowestLevel],
    damage_type: dmg.damage_type.name.toLowerCase(),
  };
}

function regexDamage(apiSpell) {
  const text = [...(apiSpell.desc || []), ...(apiSpell.higher_level || [])].join(' ');
  const match = text.match(damagePattern);
  if (!match) return null;
  return { damage: match[1].replace(/\s+/g, ' '), damage_type: match[2].toLowerCase() };
}

const updatedSpells = localSpells.map((spell) => {
  const apiSpell = apiByName.get(spell.name.toLowerCase());
  const damageInfo = apiSpell && (structuredDamage(apiSpell) || regexDamage(apiSpell));

  if (damageInfo) {
    return { ...spell, damage: damageInfo.damage, damage_type: damageInfo.damage_type };
  }

  const { damage, damage_type, ...rest } = spell;
  return rest;
});

const outputPath = path.join(__dirname, '../src/data/exports/spells.json');
fs.writeFileSync(outputPath, JSON.stringify(updatedSpells, null, 2) + '\n');

const withDamage = updatedSpells.filter((s) => s.damage);
console.log(`Updated ${withDamage.length} spells with damage information (out of ${updatedSpells.length} total)`);
console.log('\nSample spells with damage:');
withDamage.slice(0, 10).forEach((spell) => {
  console.log(`- ${spell.name}: ${spell.damage} ${spell.damage_type}`);
});
