// D&D 5e Background Data
// Based on exported data from Supabase

import backgroundsData from './exports/backgrounds.json';

export interface DndBackground {
  id: string;
  name: string;
  skills: string[];
  featureName: string;
  featureDesc: string;
}

// Convert JSON data to TypeScript format
export const dndBackgrounds: DndBackground[] = backgroundsData.map(bg => ({
  id: bg.id,
  name: bg.name,
  skills: typeof bg.skills === 'string' ? JSON.parse(bg.skills) : bg.skills,
  featureName: bg.feature_name,
  featureDesc: bg.feature_desc || '',
}));

export function getBackgroundById(id: string): DndBackground | undefined {
  return dndBackgrounds.find(bg => bg.id === id);
}
