# D&D 5e Spellbook & Character Tracker

A mobile-first responsive web application for tracking D&D 5e (2014 Rules) characters, built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Character Management**: Create and manage multiple D&D 5e characters
- **Character Creator**: Step-by-step wizard for creating new characters with:
  - Base stats configuration
  - Race and background selection with automatic stat bonuses
  - Class and level selection with conditional subclass options
- **Combat Dashboard**: Track HP, spell slots, prepared spells, and class features
- **Spell Library**: Browse and prepare spells filtered by class and subclass
- **Inventory Management**: Track currency (CP, SP, EP, GP, PP) and inventory items
- **Mobile-First Design**: Dark mode default, responsive layout optimized for mobile devices

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### 2. Environment Configuration

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your Supabase project settings → API
3. Copy your project URL and anon key
4. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

1. Go to your Supabase project's SQL Editor
2. Run the schema from `supabase/schema.sql` to create all tables
3. Optionally, run `supabase/seed.sql` to populate sample data for testing

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following tables:

- `classes`: D&D classes (Barbarian, Bard, Cleric, etc.)
- `subclasses`: Class subclasses with bonus spells
- `races`: Character races with stat bonuses
- `backgrounds`: Character backgrounds with skills and features
- `spells`: Spell details with class associations
- `features`: Class and subclass features
- `characters`: User-created characters with all tracked data

## Usage

### Creating a Character

1. Click "New Character" on the home screen
2. **Step 1**: Enter character name and adjust ability scores
3. **Step 2**: Select race and background (stat bonuses auto-apply)
4. **Step 3**: Choose class and level (subclass appears when level meets requirements)

### Managing Characters

- **HP Tracker**: Use +/- buttons to adjust current HP
- **Spell Slots**: Click dots to toggle between available/used
- **Prepared Spells**: Click spells to view details, visit Spell Library to prepare/unprepare
- **Features**: View all class/subclass features for your level
- **Inventory**: Adjust currency with +/- buttons, add/remove items

### Spell Library

- Automatically filtered by your class and subclass
- Search by name or school
- Filter by spell level
- Click checkmark to prepare/unprepare spells

## Project Structure

```
src/
├── app/
│   ├── character/[id]/
│   │   ├── page.tsx          # Main character dashboard
│   │   └── spells/
│   │       └── page.tsx      # Spell library
│   ├── create/
│   │   └── page.tsx          # Character creator
│   ├── globals.css
│   └── page.tsx              # Character selection
├── components/ui/            # shadcn/ui components
├── lib/
│   ├── helpers.ts            # D&D calculation helpers
│   ├── supabase.ts           # Supabase client
│   └── utils.ts              # Utility functions
└── types/
    └── database.ts           # TypeScript types
```

## D&D 5e Rules Implementation

- **Spell Slots**: Based on PHB 2014 spell slot progression table
- **Subclass Levels**: Follows 2014 rules (Cleric/Sorcerer/Warlock: Lv1, Wizard/Druid: Lv2, others: Lv3)
- **Ability Modifiers**: Calculated as `floor((score - 10) / 2)`
- **HP Calculation**: Based on class hit die and CON modifier

## Development

### Adding New Components

```bash
npx shadcn@latest add [component-name]
```

### Database Migrations

Run SQL changes in the Supabase SQL Editor or use the Supabase CLI.

## License

This project is for personal use and educational purposes.
