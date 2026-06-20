// D&D 5e Subclass Data
// Based on exported data from Supabase

import subclassesData from './exports/subclasses.json';

export interface DndSubclass {
  id: string;
  classId: string;
  name: string;
  bonusSpells: Record<number, string[]>;
  subclassLevelRequired: number;
}

// Convert JSON data to TypeScript format
export const dndSubclasses: DndSubclass[] = subclassesData.map(sub => ({
  id: sub.id,
  classId: sub.class_id,
  name: sub.name,
  bonusSpells: typeof sub.bonus_spells === 'string' ? JSON.parse(sub.bonus_spells) : sub.bonus_spells,
  subclassLevelRequired: sub.subclass_level_required,
}));

export function getSubclassesByClass(classId: string): DndSubclass[] {
  return dndSubclasses.filter(sub => sub.classId === classId);
}

export function getSubclassById(id: string): DndSubclass | undefined {
  return dndSubclasses.find(sub => sub.id === id);
}
