// D&D 5e Spell Data
// Based on exported data from Supabase - 327 standard spells

import spellsData from './exports/spells.json';

export interface DndSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  baseClassIds: string[];
  damage?: string; // e.g., "3d6 fire", "8d6 necrotic", "2d10 force"
  damageType?: string; // e.g., "fire", "necrotic", "force", "acid"
  damageScaling?: Record<string, string>; // dice at each level, keyed by scalesWith
  scalesWith?: 'character_level' | 'slot_level'; // cantrips scale with character level, leveled spells with slot level
}

// Convert JSON data to TypeScript format
export const dndSpells: DndSpell[] = spellsData.map(spell => ({
  id: spell.id,
  name: spell.name,
  level: spell.level,
  school: spell.school,
  castingTime: spell.casting_time,
  range: spell.range,
  components: spell.components,
  duration: spell.duration,
  concentration: spell.concentration,
  ritual: spell.ritual,
  description: spell.description,
  baseClassIds: typeof spell.base_class_ids === 'string' ? JSON.parse(spell.base_class_ids) : spell.base_class_ids,
  damage: (spell as any).damage,
  damageType: (spell as any).damage_type,
  damageScaling: (spell as any).damage_scaling,
  scalesWith: (spell as any).scales_with,
}));

export function getSpellById(id: string): DndSpell | undefined {
  return dndSpells.find(spell => spell.id === id);
}

// Helper functions
export function getSpellsByLevel(level: number): DndSpell[] {
  return dndSpells.filter(spell => spell.level === level);
}

export function getSpellsByClass(classId: string): DndSpell[] {
  return dndSpells.filter(spell => spell.baseClassIds.includes(classId));
}

export function getSpellsBySchool(school: string): DndSpell[] {
  return dndSpells.filter(spell => spell.school === school);
}
