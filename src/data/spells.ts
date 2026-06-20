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
