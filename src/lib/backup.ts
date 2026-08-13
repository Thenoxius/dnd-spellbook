// Local-data safety.
//
// Every character lives in one browser profile on one device, so the exported
// JSON file is the whole safety net: clear the profile and the campaign goes
// with it. This module owns the promises the shelf makes about that file —
// when it was last written, whether anything has changed since, and, before an
// import is allowed near the stores, what the file actually holds and which
// records it would overwrite.
//
// Everything here is pure or touches localStorage only. The IndexedDB writes
// stay in db.ts, which keeps the validation and merge rules directly testable.

import type { Character } from '@/types/database';
import type { DndSpell } from '@/data/spells';

/** The only format the app writes. A file without a version is read as this
 *  one (that is what the early exports were); a higher version is refused
 *  rather than half-understood. */
export const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  characters: Character[];
  customSpells: DndSpell[];
}

const LAST_BACKUP_KEY = 'dnd-spellbook-last-backup';
const LAST_CHANGE_KEY = 'dnd-spellbook-last-change';

export interface BackupState {
  /** When a backup file was last produced on this device. */
  lastBackupAt: string | null;
  /** When a character or custom spell was last written. */
  lastChangeAt: string | null;
}

// localStorage can throw outright (private mode, storage disabled) and does not
// exist at all while the pages are prerendered for the static export, so every
// access is guarded. Losing the reminder is acceptable; losing the app is not.

function readStamp(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    return value && !Number.isNaN(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

function writeStamp(key: string, at: string): void {
  try {
    localStorage.setItem(key, at);
  } catch {
    /* no reminder on this device, then */
  }
}

export function readBackupState(): BackupState {
  return {
    lastBackupAt: readStamp(LAST_BACKUP_KEY),
    lastChangeAt: readStamp(LAST_CHANGE_KEY),
  };
}

/** Called by every store mutation so the shelf can tell you the file is stale. */
export function markDataChanged(at: string = new Date().toISOString()): void {
  writeStamp(LAST_CHANGE_KEY, at);
}

/** Called when a backup file has been handed to the browser's downloader. */
export function markBackupTaken(at: string = new Date().toISOString()): void {
  writeStamp(LAST_BACKUP_KEY, at);
}

/**
 * Whether this device is holding data no backup file has seen.
 *
 * A device with characters and no backup at all always qualifies — including
 * the ones that predate this bookkeeping, which have no change stamp yet.
 */
export function hasUnsavedChanges(state: BackupState, hasData: boolean): boolean {
  if (!hasData) return false;
  if (!state.lastBackupAt) return true;
  if (!state.lastChangeAt) return false;
  return Date.parse(state.lastChangeAt) > Date.parse(state.lastBackupAt);
}

/** "Never", or how long ago the last backup was, in plain words. */
export function describeBackupAge(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Never';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'Never';

  const minutes = Math.floor((now.getTime() - then) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(then).toLocaleDateString();
}

export type BackupCheck =
  | { ok: false; error: string }
  | {
      ok: true;
      version: number;
      exportedAt: string | null;
      characters: Character[];
      customSpells: DndSpell[];
      /** Human-readable notes about records the file carried but this app cannot use. */
      skipped: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** A character needs the four things the app cannot invent: an id to merge on,
 *  a name to show, and the class and level every rule is read from. The rest is
 *  filled in by normalizeCharacter when it is stored. */
function isCharacterRecord(value: unknown): value is Character {
  return (
    isRecord(value) &&
    isFilledString(value.id) &&
    isFilledString(value.name) &&
    isFilledString(value.class_id) &&
    Number.isFinite(value.level)
  );
}

function isSpellRecord(value: unknown): value is DndSpell {
  return (
    isRecord(value) &&
    isFilledString(value.id) &&
    isFilledString(value.name) &&
    Number.isFinite(value.level)
  );
}

function countNote(count: number, singular: string, reason: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`} in the file ${count === 1 ? 'was' : 'were'} skipped: ${reason}.`;
}

/**
 * Read a parsed file as a backup, or explain why it is not one.
 *
 * Unreadable individual records are dropped and reported rather than aborting
 * the whole restore — one corrupt row should not cost you the other nineteen.
 * A file the app cannot vouch for at all is refused before anything is written.
 */
export function validateBackup(raw: unknown): BackupCheck {
  if (!isRecord(raw)) {
    return { ok: false, error: 'That file does not contain a spellbook backup.' };
  }

  const version = raw.version === undefined ? BACKUP_VERSION : raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'That backup has an unreadable version number.' };
  }
  if (version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `That backup was written in format ${version}, which this version of the app cannot read yet.`,
    };
  }

  if (raw.characters === undefined && raw.customSpells === undefined) {
    return { ok: false, error: 'That file holds no characters and no custom spells.' };
  }
  if (raw.characters !== undefined && !Array.isArray(raw.characters)) {
    return { ok: false, error: 'The characters in that file are not stored as a list.' };
  }
  if (raw.customSpells !== undefined && !Array.isArray(raw.customSpells)) {
    return { ok: false, error: 'The custom spells in that file are not stored as a list.' };
  }

  const rawCharacters: unknown[] = Array.isArray(raw.characters) ? raw.characters : [];
  const rawSpells: unknown[] = Array.isArray(raw.customSpells) ? raw.customSpells : [];

  const characters = rawCharacters.filter(isCharacterRecord);
  const customSpells = rawSpells.filter(isSpellRecord);

  const skipped: string[] = [];
  if (characters.length < rawCharacters.length) {
    skipped.push(
      countNote(rawCharacters.length - characters.length, 'character', 'no usable id, name, class or level')
    );
  }
  if (customSpells.length < rawSpells.length) {
    skipped.push(
      countNote(rawSpells.length - customSpells.length, 'custom spell', 'no usable id, name or level')
    );
  }

  if (characters.length === 0 && customSpells.length === 0) {
    return { ok: false, error: 'Nothing in that file could be read as a character or a custom spell.' };
  }

  return {
    ok: true,
    version,
    exportedAt: isFilledString(raw.exportedAt) ? raw.exportedAt : null,
    characters,
    customSpells,
    skipped,
  };
}

export interface ImportCounts {
  total: number;
  added: number;
  replaced: number;
}

export interface ImportPlan {
  characters: ImportCounts;
  customSpells: ImportCounts;
  /** Names of the characters an import would overwrite, so the dialog can say so. */
  replacedNames: string[];
  /** Records already on this device that the file does not mention and that a
   *  merge therefore leaves exactly as they are. */
  untouched: { characters: number; customSpells: number };
}

function countAgainst(
  incoming: readonly { id: string }[],
  existingIds: ReadonlySet<string>
): { counts: ImportCounts; ids: Set<string> } {
  // A file may name the same id twice; the last write wins, so it counts once.
  const ids = new Set(incoming.map((record) => record.id));
  let replaced = 0;
  for (const id of ids) if (existingIds.has(id)) replaced += 1;
  return { counts: { total: ids.size, added: ids.size - replaced, replaced }, ids };
}

/**
 * What a restore would do, worked out before anything is written.
 *
 * The merge only ever writes the records in the file: matching ids are
 * replaced, everything else on the device is left alone. The plan spells both
 * halves out so the confirmation dialog can promise exactly that.
 */
export function planImport(
  incoming: { characters: readonly Character[]; customSpells: readonly DndSpell[] },
  existing: {
    characters: readonly Pick<Character, 'id' | 'name'>[];
    customSpells: readonly Pick<DndSpell, 'id'>[];
  }
): ImportPlan {
  const existingCharacters = new Map(existing.characters.map((c) => [c.id, c.name]));
  const existingSpellIds = new Set(existing.customSpells.map((s) => s.id));

  const characters = countAgainst(incoming.characters, new Set(existingCharacters.keys()));
  const spells = countAgainst(incoming.customSpells, existingSpellIds);

  const replacedNames = [...characters.ids]
    .filter((id) => existingCharacters.has(id))
    .map((id) => existingCharacters.get(id) as string);

  return {
    characters: characters.counts,
    customSpells: spells.counts,
    replacedNames,
    untouched: {
      characters: [...existingCharacters.keys()].filter((id) => !characters.ids.has(id)).length,
      customSpells: [...existingSpellIds].filter((id) => !spells.ids.has(id)).length,
    },
  };
}
