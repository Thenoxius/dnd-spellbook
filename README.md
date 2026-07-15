# D&D 5e Spellbook & Character Tracker

A mobile-first, **fully local** web application for tracking D&D 5e (2014 rules) characters, built with Next.js, TypeScript, and Tailwind CSS. No accounts, no backend: characters live in your browser's IndexedDB and never leave your device. Designed to feel like a real spellbook: parchment textures, gold-foil headings, glowing rune-ringed spell slots, character tomes on a shelf, and six switchable magical themes.

## Features

- **Character Management**: Create and manage multiple D&D 5e characters, stored on your device
- **Character Creator**: Step-by-step wizard with:
  - Base stats configuration
  - Race and background selection with automatic stat bonuses (including Tabaxi and subraces)
  - Class and level selection with conditional subclass options
- **Combat Dashboard**: Track HP (with temp HP and a low-HP heartbeat), spell slots, and limited-use class abilities as clickable, glowing slots — including stat-linked uses (e.g. Bardic Inspiration = CHA modifier) and banked die results (Divination wizard Portent)
- **Short & Long Rest**: One tap restores the right resources per PHB rules (warlock pact slots return on a short rest)
- **Feats & Invocations**: Dedicated Feats tab with all class/subclass features, plus an Add button to pick PHB feats, Warlock Eldritch Invocations (with known-count tracking), or custom homebrew options
- **Spell Library**: Browse and prepare spells filtered by class and subclass, with damage scaling by character/slot level and upcast descriptions
- **Custom Spells**: Create your own spells
- **Minimal Multiclassing**: Optional second class contributes features, abilities, and proficiency bonus
- **Inventory Management**: Currency (CP/SP/EP/GP/PP) and items with quantities and notes
- **Themes**: Six spellbook themes (Arcane Tome parchment default, Shadow Codex, Celestial Oath, Wildwood Grimoire, Infernal Pact, Arcane Sanctum), switchable from the home page palette dots or character settings, with theme-aware accents, ambient light motes, and readable contrast everywhere
- **Backup & Restore**: Export everything to a JSON file and import it on another device — the safety net for local-first data

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + custom spellbook theme system (CSS variables)
- **UI Components**: shadcn/ui on Base UI primitives
- **Storage**: Browser IndexedDB (hand-rolled layer in `src/lib/db.ts`) — no backend
- **Icons**: Lucide React

## Architecture: everything local

Static D&D reference data (classes, races, subraces, backgrounds, subclasses, spells, features, feats, invocations) lives in the repo under `src/data/` as TypeScript + JSON — no round-trips for rules lookups. User data lives in the browser:

- `characters` (IndexedDB): all tracked character state — stats, HP, spell slots, prepared spells, feats, inventory, ability uses
- `customSpells` (IndexedDB): homebrew spells, stored in the same shape as the bundled spell data so they merge into the library
- Theme preference in `localStorage`, applied before first paint

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. That's the whole setup — no accounts, no API keys, no database to configure.

## Usage

### Creating a Character

1. Click "New Character"
2. **Step 1**: Enter character name and adjust ability scores
3. **Step 2**: Select race and background (stat bonuses auto-apply, subrace shown when the race has any)
4. **Step 3**: Choose class and level (subclass appears when level meets requirements)

### Managing Characters

- **HP Tracker**: ±1/±10 buttons, temp HP, and rest buttons; below 25% HP the number beats like a heart
- **Spell Slots**: Tap the glowing orbs to spend/restore slots
- **Class Abilities**: Tap ability slots to spend uses; short/long rest recharges them per the rules
- **Feats tab**: Review class features, and use "Add Feat" when your character gains a feat or invocation
- **Spells tab**: Spell save DC, prepared spells with expandable details, link to the Spell Library
- **Inventory**: Currency and items with quantity controls
- **Settings**: Level, max HP, optional second class, theme selection, and character deletion

## Project Structure

```
src/
├── app/
│   ├── character/[id]/
│   │   ├── page.tsx          # Character dashboard (Combat/Spells/Feats/Inventory/Settings)
│   │   ├── edit/page.tsx     # Level & HP editing
│   │   └── spells/page.tsx   # Spell library
│   ├── create/page.tsx       # Character creator wizard
│   ├── spells/create/        # Custom spell creator
│   ├── globals.css           # Spellbook theme system (6 themes, CSS variables)
│   └── page.tsx              # Character roster (tome shelf) + backup/restore
├── components/ui/            # shadcn/ui components
├── data/                     # Local D&D 5e rulebook data
│   ├── classes.ts            # Class progressions (PHB 2014 tables)
│   ├── classAbilities.ts     # Limited-use abilities with max-uses formulas
│   ├── feats.ts              # PHB feats + eldritch invocation catalog
│   ├── races.ts / subraces.ts / backgrounds.ts / subclasses.ts
│   ├── features.ts / spells.ts
│   └── exports/              # JSON data files
├── lib/
│   ├── db.ts                 # IndexedDB persistence (characters, custom spells, backup)
│   ├── theme.ts              # Theme catalog + localStorage preference
│   └── helpers.ts            # D&D calculation helpers (slots, HP, modifiers)
└── types/
    └── database.ts           # TypeScript types
```

## D&D 5e Rules Implementation (PHB 2014)

- **Spell Slots**: Full-caster, half-caster (paladin/ranger), and Warlock Pact Magic tables (pact slots: 1 → 2 → 3 at level 11 → 4 at level 17, slot level scales to 5th); non-casters get none
- **Class Progressions**: Feature levels, ASI levels, cantrips/spells known, ki points, sorcery points, metamagic, and invocations known audited against the PHB
- **Subclass Levels**: Cleric/Sorcerer/Warlock: Lv1, Wizard/Druid: Lv2, others: Lv3
- **Ability Modifiers**: `floor((score - 10) / 2)`
- **HP Calculation**: Class hit die + CON modifier (average per level)

## Development

### Adding New Components

```bash
npx shadcn@latest add [component-name]
```

## License

This project is for personal use and educational purposes.
