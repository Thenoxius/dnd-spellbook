// D&D 5e Class and Subclass Features
// Based on official D&D 5e rules

import featuresData from './exports/features.json';

export interface DndFeature {
  id: string; // e.g., 'pact-magic'
  name: string;
  source: 'class' | 'subclass' | 'feat';
  sourceId: string; // e.g., 'warlock'
  levelRequired: number;
  description: string;
}

// Convert JSON data to TypeScript format
export const dndFeatures: DndFeature[] = featuresData.map(feature => ({
  id: feature.id,
  name: feature.name,
  source: feature.source_type as 'class' | 'subclass' | 'feat',
  sourceId: feature.source_id,
  levelRequired: feature.level_required,
  description: feature.description,
}));

export function getFeaturesByLevel(sourceId: string, level: number): DndFeature[] {
  return dndFeatures.filter(feature => feature.sourceId === sourceId && feature.levelRequired <= level);
}
