<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the generic Next.js starter

This project uses Next.js 16 with App Router, but it is a local-only D&D character tracker with custom data, browser storage, and design conventions that do not match a basic template app.

Read the relevant guide in `node_modules/next/dist/docs/` before writing code and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# D&D Spellbook Agent Guide

## Project intent
- This is a mobile-first D&D 5e local character tracker and spellbook.
- All user data stays in the browser using IndexedDB and localStorage; do not introduce a backend or remote database unless the user explicitly requests it.
- Keep the app as a single-page local-first experience with no accounts or external auth.

## Architecture
- App routes live under `src/app/` using the Next.js App Router.
- Reusable UI primitives live under `src/components/ui/`.
- Rule/data definitions live under `src/data/` and should remain static reference data.
- Storage helpers live under `src/lib/db.ts`; theme logic under `src/lib/theme.ts`.
- Shared TypeScript interfaces live under `src/types/database.ts`.

## Coding expectations
- Prefer the existing patterns already used in the repo over introducing new abstractions.
- Keep changes small, focused, and compatible with the current app architecture.
- Preserve the D&D rule behavior described in the README and data files; avoid breaking spell slots, class abilities, rest logic, or stat calculations.
- Favor TypeScript-safe code and avoid adding unnecessary packages.
- Reuse the existing shadcn/ui and Tailwind styling patterns instead of replacing them with ad hoc CSS.

## Verification
- Run `npm run lint` after meaningful changes.
- Run `npm run build` when changing app behavior, routing, data flow, or UI integration.
- If you change user-facing logic, verify the relevant functionality end-to-end with a sensible check in the app or local build output.

## Important constraints
- Do not add backend APIs, Supabase calls, or authentication flows unless explicitly requested.
- Do not remove or alter the local-first backup/restore workflow or browser-only storage model.
- Keep character, spell, and feature data consistent with the existing D&D 5e structure.
- Treat the data under `src/data/` as canonical reference data; custom spells and user characters are separate from it.

## Suggested workflow for agents
1. Read the relevant route/component and adjacent library files before editing.
2. Trace the data flow through the browser storage layer if the change affects character, spell, or backup behavior.
3. Make the minimum root-cause fix and verify with lint/build output.
4. Keep user-facing labels and design language consistent with the spellbook theme system.

