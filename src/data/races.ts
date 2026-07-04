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

// Older seeds used dash-separated ids for these races; existing characters may still reference them.
const legacyRaceIdAliases: Record<string, string> = {
  'half-elf': 'half_elf',
  'half-orc': 'half_orc',
};

export function getRaceById(id: string): DndRace | undefined {
  const resolvedId = legacyRaceIdAliases[id] || id;
  return dndRaces.find(race => race.id === resolvedId);
}
