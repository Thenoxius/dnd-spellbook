// Local persistence layer. Like fog-atlas, the whole app runs out of the
// browser's IndexedDB: characters and custom spells live on this device only —
// no accounts, no backend, works offline. Static rules data (spells, classes,
// races, …) ships with the app in src/data. New devices start with a blank
// slate; the Backup/Restore buttons on the home page move data between them.

import type { Character } from '@/types/database';
import type { DndSpell } from '@/data/spells';

const DB_NAME = 'dnd-spellbook';
const DB_VERSION = 1;
const CHARACTER_STORE = 'characters';
const SPELL_STORE = 'customSpells';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CHARACTER_STORE)) {
          db.createObjectStore(CHARACTER_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SPELL_STORE)) {
          db.createObjectStore(SPELL_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
  storeName: string
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  return requestToPromise(fn(tx.objectStore(storeName)));
}

/** Fill in every optional/JSONB-ish field so characters created by older
 * versions (or imported from the Supabase export) never surface undefined
 * where the UI expects an object or array. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCharacter(raw: any): Character {
  return {
    temp_hp: 0,
    subclass_id: null,
    secondary_class_id: null,
    secondary_level: 0,
    subrace_id: null,
    spell_slots: {},
    prepared_spells: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    inventory: [],
    ability_uses: {},
    feats: [],
    ...raw,
  } as Character;
}

export async function listCharacters(): Promise<Character[]> {
  const all = await withStore('readonly', (s) => s.getAll() as IDBRequest<Character[]>, CHARACTER_STORE);
  return all
    .map(normalizeCharacter)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  const record = await withStore(
    'readonly',
    (s) => s.get(id) as IDBRequest<Character | undefined>,
    CHARACTER_STORE
  );
  return record ? normalizeCharacter(record) : undefined;
}

export async function addCharacter(
  data: Omit<Character, 'id' | 'created_at' | 'updated_at'>
): Promise<Character> {
  const now = new Date().toISOString();
  const record = normalizeCharacter({ ...data, id: crypto.randomUUID(), created_at: now, updated_at: now });
  await withStore('readwrite', (s) => s.put(record), CHARACTER_STORE);
  return record;
}

export async function updateCharacter(id: string, patch: Partial<Character>): Promise<Character> {
  const existing = await getCharacter(id);
  if (!existing) throw new Error('Character not found');
  const next = { ...existing, ...patch, updated_at: new Date().toISOString() };
  await withStore('readwrite', (s) => s.put(next), CHARACTER_STORE);
  return next;
}

export async function deleteCharacter(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id), CHARACTER_STORE);
}

// Custom (homebrew) spells are stored in the same shape as the bundled spell
// data, so pages can merge them straight into the standard lists.

export async function listCustomSpells(): Promise<DndSpell[]> {
  return withStore('readonly', (s) => s.getAll() as IDBRequest<DndSpell[]>, SPELL_STORE);
}

export async function addCustomSpell(spell: DndSpell): Promise<void> {
  await withStore('readwrite', (s) => s.put(spell), SPELL_STORE);
}

export async function deleteCustomSpell(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id), SPELL_STORE);
}

// Backup: with everything on one device, a JSON export/import is the safety
// net (a cleared browser profile would otherwise take the campaign with it).

export interface BackupData {
  version: 1;
  exportedAt: string;
  characters: Character[];
  customSpells: DndSpell[];
}

export async function exportBackup(): Promise<BackupData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    characters: await listCharacters(),
    customSpells: await listCustomSpells(),
  };
}

/** Merge a backup into the local stores (records with the same id are
 * overwritten; everything else is left untouched). Returns what was read. */
export async function importBackup(data: BackupData): Promise<{ characters: number; customSpells: number }> {
  const characters = Array.isArray(data.characters) ? data.characters : [];
  const customSpells = Array.isArray(data.customSpells) ? data.customSpells : [];
  for (const c of characters) {
    if (c && typeof c.id === 'string') {
      await withStore('readwrite', (s) => s.put(normalizeCharacter(c)), CHARACTER_STORE);
    }
  }
  for (const sp of customSpells) {
    if (sp && typeof sp.id === 'string') {
      await withStore('readwrite', (s) => s.put(sp), SPELL_STORE);
    }
  }
  return { characters: characters.length, customSpells: customSpells.length };
}
