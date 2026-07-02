const fs = require('fs');
const path = require('path');

const localSpells = require('../src/data/exports/spells.json');
const apiSpells = require('../all_spells_with_damage.json');

const apiByName = new Map(apiSpells.map((s) => [s.name.toLowerCase(), s]));

// Fallback regex for spells whose damage isn't in the API's structured `damage`
// field but is stated plainly in the description (e.g. some cantrip scaling text).
const damagePattern =
  /(\d+d\d+(?:\s*\+\s*\d+)?)\s+(fire|acid|cold|lightning|necrotic|force|psychic|thunder|poison|radiant|bludgeoning|piercing|slashing)\s+damage/i;

// Cantrips scale with character level (dnd5eapi's damage_at_character_level);
// leveled spells scale with the slot level used to cast them (damage_at_slot_level).
function structuredDamage(apiSpell) {
  const dmg = apiSpell.damage;
  if (!dmg || !dmg.damage_type) return null;

  if (dmg.damage_at_character_level) {
    return {
      damage_type: dmg.damage_type.name.toLowerCase(),
      damage_scaling: dmg.damage_at_character_level,
      scales_with: 'character_level',
    };
  }

  if (dmg.damage_at_slot_level) {
    return {
      damage_type: dmg.damage_type.name.toLowerCase(),
      damage_scaling: dmg.damage_at_slot_level,
      scales_with: 'slot_level',
    };
  }

  return null;
}

function regexDamage(apiSpell) {
  const text = [...(apiSpell.desc || []), ...(apiSpell.higher_level || [])].join(' ');
  const match = text.match(damagePattern);
  if (!match) return null;
  const dice = match[1].replace(/\s+/g, ' ');
  return {
    damage_type: match[2].toLowerCase(),
    damage_scaling: { [String(apiSpell.level || 1)]: dice },
    scales_with: apiSpell.level === 0 ? 'character_level' : 'slot_level',
  };
}

const updatedSpells = localSpells.map((spell) => {
  const apiSpell = apiByName.get(spell.name.toLowerCase());
  const damageInfo = apiSpell && (structuredDamage(apiSpell) || regexDamage(apiSpell));

  if (damageInfo) {
    const levels = Object.keys(damageInfo.damage_scaling).map(Number).sort((a, b) => a - b);
    const baseDamage = damageInfo.damage_scaling[levels[0]];
    return {
      ...spell,
      damage: baseDamage,
      damage_type: damageInfo.damage_type,
      damage_scaling: damageInfo.damage_scaling,
      scales_with: damageInfo.scales_with,
    };
  }

  const { damage, damage_type, damage_scaling, scales_with, ...rest } = spell;
  return rest;
});

const outputPath = path.join(__dirname, '../src/data/exports/spells.json');
fs.writeFileSync(outputPath, JSON.stringify(updatedSpells, null, 2) + '\n');

const withDamage = updatedSpells.filter((s) => s.damage);
const withScaling = updatedSpells.filter((s) => s.damage_scaling && Object.keys(s.damage_scaling).length > 1);
console.log(`Updated ${withDamage.length} spells with damage information (out of ${updatedSpells.length} total)`);
console.log(`${withScaling.length} of those have multi-level scaling data`);
console.log('\nSample spells with scaling:');
withScaling.slice(0, 10).forEach((spell) => {
  console.log(`- ${spell.name} (${spell.scales_with}): ${JSON.stringify(spell.damage_scaling)}`);
});
