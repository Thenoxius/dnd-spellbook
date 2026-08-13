import { afterEach, describe, expect, it } from 'vitest';
import type { Character } from '@/types/database';
import type { DndSpell } from '@/data/spells';
import {
  BACKUP_VERSION,
  describeBackupAge,
  hasUnsavedChanges,
  markBackupTaken,
  markDataChanged,
  planImport,
  readBackupState,
  validateBackup,
} from '@/lib/backup';

const character = (overrides: Partial<Character> = {}): Character =>
  ({
    id: 'char_1',
    name: 'Neira',
    level: 5,
    class_id: 'warlock',
    hp_current: 32,
    hp_max: 38,
    race_id: 'tiefling',
    background_id: 'sage',
    prepared_spells: ['eldritch-blast'],
    ...overrides,
  }) as Character;

const spell = (overrides: Partial<DndSpell> = {}): DndSpell =>
  ({
    id: 'custom_1',
    name: 'Whisper of the Deep',
    level: 2,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S',
    duration: '1 minute',
    concentration: true,
    ritual: false,
    description: 'A borrowed secret.',
    baseClassIds: ['warlock'],
    ...overrides,
  }) as DndSpell;

const file = (overrides: Record<string, unknown> = {}) => ({
  version: BACKUP_VERSION,
  exportedAt: '2026-08-12T10:00:00.000Z',
  characters: [character()],
  customSpells: [spell()],
  ...overrides,
});

/** A backup file missing one of its keys, the way older exports are. */
const fileWithout = (key: 'version' | 'characters' | 'customSpells') => {
  const contents: Record<string, unknown> = file();
  delete contents[key];
  return contents;
};

describe('validateBackup', () => {
  it('accepts a file the app wrote itself', () => {
    const check = validateBackup(file());
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.characters).toHaveLength(1);
    expect(check.customSpells).toHaveLength(1);
    expect(check.exportedAt).toBe('2026-08-12T10:00:00.000Z');
    expect(check.skipped).toEqual([]);
  });

  it('reads a versionless file as the current format', () => {
    // The first exports predate the version field; refusing them would strand
    // exactly the backups that are oldest and therefore most valuable.
    const check = validateBackup(fileWithout('version'));
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.version).toBe(BACKUP_VERSION);
  });

  it('refuses a format written by a newer app', () => {
    const check = validateBackup(file({ version: BACKUP_VERSION + 1 }));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.error).toContain(`format ${BACKUP_VERSION + 1}`);
  });

  it('refuses a version that is not a whole number', () => {
    expect(validateBackup(file({ version: 'one' })).ok).toBe(false);
    expect(validateBackup(file({ version: 1.5 })).ok).toBe(false);
    expect(validateBackup(file({ version: 0 })).ok).toBe(false);
  });

  it('refuses anything that is not a backup object', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup('a string').ok).toBe(false);
    expect(validateBackup([character()]).ok).toBe(false);
    expect(validateBackup({ version: 1, exportedAt: 'x' }).ok).toBe(false);
  });

  it('refuses records that are not stored as lists', () => {
    expect(validateBackup(file({ characters: { char_1: character() } })).ok).toBe(false);
    expect(validateBackup(file({ customSpells: 'none' })).ok).toBe(false);
  });

  it('accepts a file that only carries custom spells', () => {
    const check = validateBackup(fileWithout('characters'));
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.characters).toEqual([]);
  });

  it('skips unreadable records and reports them instead of failing', () => {
    const check = validateBackup(
      file({
        characters: [
          character(),
          { name: 'no id', class_id: 'wizard', level: 3 },
          { id: 'char_2', name: 'no class', level: 3 },
          { id: 'char_3', name: 'no level', class_id: 'wizard' },
          null,
        ],
        customSpells: [spell(), { id: 'custom_2' }],
      })
    );
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.characters.map((c) => c.id)).toEqual(['char_1']);
    expect(check.customSpells.map((s) => s.id)).toEqual(['custom_1']);
    expect(check.skipped).toHaveLength(2);
    expect(check.skipped[0]).toContain('4 characters');
    expect(check.skipped[1]).toContain('1 custom spell');
  });

  it('refuses a file where nothing at all is readable', () => {
    const check = validateBackup(file({ characters: [{ nonsense: true }], customSpells: [] }));
    expect(check.ok).toBe(false);
  });
});

describe('planImport', () => {
  const existing = {
    characters: [
      { id: 'char_1', name: 'Neira' },
      { id: 'char_9', name: 'Reginald' },
    ],
    customSpells: [{ id: 'custom_1' }, { id: 'custom_9' }],
  };

  it('separates new records from the ones it would overwrite', () => {
    const plan = planImport(
      {
        characters: [character({ id: 'char_1' }), character({ id: 'char_2', name: 'Sable' })],
        customSpells: [spell({ id: 'custom_2' })],
      },
      existing
    );

    expect(plan.characters).toEqual({ total: 2, added: 1, replaced: 1 });
    expect(plan.customSpells).toEqual({ total: 1, added: 1, replaced: 0 });
    expect(plan.replacedNames).toEqual(['Neira']);
  });

  it('counts the local records a merge leaves untouched', () => {
    // The promise the dialog makes: a restore adds and replaces, it never
    // clears out records the file happens not to mention.
    const plan = planImport(
      { characters: [character({ id: 'char_1' })], customSpells: [] },
      existing
    );

    expect(plan.untouched).toEqual({ characters: 1, customSpells: 2 });
  });

  it('counts an id repeated inside the file once', () => {
    const plan = planImport(
      { characters: [character({ id: 'char_2' }), character({ id: 'char_2' })], customSpells: [] },
      existing
    );

    expect(plan.characters).toEqual({ total: 1, added: 1, replaced: 0 });
  });

  it('handles an empty device', () => {
    const plan = planImport(
      { characters: [character()], customSpells: [spell()] },
      { characters: [], customSpells: [] }
    );

    expect(plan.characters).toEqual({ total: 1, added: 1, replaced: 0 });
    expect(plan.replacedNames).toEqual([]);
    expect(plan.untouched).toEqual({ characters: 0, customSpells: 0 });
  });
});

describe('hasUnsavedChanges', () => {
  it('says nothing when there is nothing to lose', () => {
    expect(hasUnsavedChanges({ lastBackupAt: null, lastChangeAt: null }, false)).toBe(false);
  });

  it('flags a device that has never made a backup', () => {
    expect(hasUnsavedChanges({ lastBackupAt: null, lastChangeAt: null }, true)).toBe(true);
  });

  it('flags a change made after the last backup', () => {
    const state = {
      lastBackupAt: '2026-08-12T10:00:00.000Z',
      lastChangeAt: '2026-08-12T11:00:00.000Z',
    };
    expect(hasUnsavedChanges(state, true)).toBe(true);
  });

  it('stays quiet when the backup is newer than the last change', () => {
    const state = {
      lastBackupAt: '2026-08-12T11:00:00.000Z',
      lastChangeAt: '2026-08-12T10:00:00.000Z',
    };
    expect(hasUnsavedChanges(state, true)).toBe(false);
  });
});

describe('describeBackupAge', () => {
  const now = new Date('2026-08-12T12:00:00.000Z');

  it('says Never when no backup has been made', () => {
    expect(describeBackupAge(null, now)).toBe('Never');
    expect(describeBackupAge('not a date', now)).toBe('Never');
  });

  it('describes recent backups in plain words', () => {
    expect(describeBackupAge('2026-08-12T11:59:40.000Z', now)).toBe('Just now');
    expect(describeBackupAge('2026-08-12T11:59:00.000Z', now)).toBe('1 minute ago');
    expect(describeBackupAge('2026-08-12T11:30:00.000Z', now)).toBe('30 minutes ago');
    expect(describeBackupAge('2026-08-12T09:00:00.000Z', now)).toBe('3 hours ago');
    expect(describeBackupAge('2026-08-10T12:00:00.000Z', now)).toBe('2 days ago');
  });

  it('does not read a clock skew as a backup from the future', () => {
    expect(describeBackupAge('2026-08-12T12:05:00.000Z', now)).toBe('Just now');
  });
});

describe('backup timestamps', () => {
  const store = new Map<string, string>();

  const stub = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;

  const withStorage = (storage: Storage | undefined) => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  };

  afterEach(() => {
    store.clear();
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('remembers when data changed and when a backup was taken', () => {
    withStorage(stub);
    markDataChanged('2026-08-12T10:00:00.000Z');
    markBackupTaken('2026-08-12T11:00:00.000Z');

    expect(readBackupState()).toEqual({
      lastBackupAt: '2026-08-12T11:00:00.000Z',
      lastChangeAt: '2026-08-12T10:00:00.000Z',
    });
  });

  it('ignores a stored value that is not a date', () => {
    withStorage(stub);
    markBackupTaken('whenever');
    expect(readBackupState().lastBackupAt).toBeNull();
  });

  it('degrades quietly where storage does not exist', () => {
    // Prerendering for the static export and browsers with storage switched
    // off both land here — every character write calls markDataChanged, so a
    // throw would cost far more than a missing reminder.
    expect(() => markDataChanged()).not.toThrow();
    expect(readBackupState()).toEqual({ lastBackupAt: null, lastChangeAt: null });
  });
});
