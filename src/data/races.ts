// D&D 5e Race Data
// Based on exported data from Supabase

import racesData from './exports/races.json';

export interface DndRace {
  id: string;
  name: string;
  statBonuses: Record<string, number>;
  grantedSpells: string[];
}

// Convert JSON data to TypeScript format
export const dndRaces: DndRace[] = racesData.map(race => ({
  id: race.id,
  name: race.name,
  statBonuses: typeof race.stat_bonuses === 'string' ? JSON.parse(race.stat_bonuses) : race.stat_bonuses,
  grantedSpells: typeof race.granted_spells === 'string' ? JSON.parse(race.granted_spells) : race.granted_spells,
}));

export function getRaceById(id: string): DndRace | undefined {
  return dndRaces.find(race => race.id === id);
}
