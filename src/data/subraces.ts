// D&D 5e Subrace Data
// Based on exported data from Supabase

import subracesData from './exports/subraces.json';

export interface DndSubrace {
  id: string;
  raceId: string;
  name: string;
  statBonuses: Record<string, number>;
  grantedSpells: string[];
}

// Convert JSON data to TypeScript format
export const dndSubraces: DndSubrace[] = subracesData.map(subrace => ({
  id: subrace.id,
  raceId: subrace.race_id,
  name: subrace.name,
  statBonuses: typeof subrace.stat_bonuses === 'string' ? JSON.parse(subrace.stat_bonuses) : subrace.stat_bonuses,
  grantedSpells: typeof subrace.granted_spells === 'string' ? JSON.parse(subrace.granted_spells) : subrace.granted_spells,
}));

export function getSubracesByRace(raceId: string): DndSubrace[] {
  return dndSubraces.filter(subrace => subrace.raceId === raceId);
}

export function getSubraceById(id: string): DndSubrace | undefined {
  return dndSubraces.find(subrace => subrace.id === id);
}
