// Theme preference — a per-device choice in localStorage now that there is
// no user profile table. The root layout inlines a tiny script that applies
// the stored theme before first paint, so pages never flash the default.

export interface ThemeOption {
  id: string;
  name: string;
  /** Swatch gradient + ink for the theme picker preview. */
  from: string;
  to: string;
  accent: string;
  ink: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'arcane-tome', name: 'Arcane Tome', from: '#ead9b5', to: '#d3bc8d', accent: '#7c3aed', ink: '#3b2a17' },
  { id: 'shadow-fiend', name: 'Shadow Codex', from: '#1e1b4b', to: '#581c87', accent: '#9333ea', ink: '#ffffff' },
  { id: 'royal-oath', name: 'Celestial Oath', from: '#0f172a', to: '#1e3a5f', accent: '#fbbf24', ink: '#ffffff' },
  { id: 'wildwood-sentry', name: 'Wildwood Grimoire', from: '#14532d', to: '#166534', accent: '#22c55e', ink: '#ffffff' },
  { id: 'crimson-pact', name: 'Infernal Pact', from: '#450a0a', to: '#7f1d1d', accent: '#dc2626', ink: '#ffffff' },
  { id: 'arcane-sanctum', name: 'Arcane Sanctum', from: '#0f172a', to: '#0e7490', accent: '#06b6d4', ink: '#ffffff' },
];

export const DEFAULT_THEME = 'arcane-tome';
export const THEME_STORAGE_KEY = 'dnd-spellbook-theme';

export function loadTheme(): string {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored && THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME;
}

export function applyTheme(id: string): void {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem(THEME_STORAGE_KEY, id);
}
