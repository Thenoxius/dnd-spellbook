'use client';

import { useState, useEffect, useRef } from 'react';
import { listCharacters, listCustomSpells, deleteCharacter, exportBackup, importBackup } from '@/lib/db';
import {
  describeBackupAge,
  hasUnsavedChanges,
  markBackupTaken,
  planImport,
  readBackupState,
  validateBackup,
  type BackupCheck,
  type BackupState,
  type ImportPlan,
} from '@/lib/backup';
import { THEMES, applyTheme, loadTheme } from '@/lib/theme';
import { Character } from '@/types/database';
import { getClassById } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Download, Upload, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [theme, setTheme] = useState('arcane-tome');
  /** The dot currently hovered or focused; drives the name readout only. */
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  /** Read after mount only: the timestamps live in localStorage, which the
      prerendered HTML cannot know about. */
  const [backupState, setBackupState] = useState<BackupState | null>(null);
  /** A chosen file, read and checked but not yet applied to the stores. */
  const [pendingImport, setPendingImport] = useState<
    { name: string; check: BackupCheck; plan: ImportPlan | null } | null
  >(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchCharacters = async () => {
    try {
      setCharacters(await listCharacters());
    } catch (error) {
      console.error('Error fetching characters:', error);
    }
    // Every store write stamps localStorage, so the backup reading is refreshed
    // alongside the roster — a deleted character is exactly the kind of change
    // the strip below should start warning about.
    setBackupState(readBackupState());
    setLoading(false);
  };

  useEffect(() => {
    const stored = loadTheme();
    setTheme(stored);
    document.documentElement.setAttribute('data-theme', stored);
    fetchCharacters();
  }, []);

  const handleCreateCharacter = () => {
    router.push('/create');
  };

  const handleSelectCharacter = (characterId: string) => {
    router.push(`/character?id=${characterId}`);
  };

  const handleDeleteClick = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setCharacterToDelete(character);
    setDeleteConfirmName('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!characterToDelete || deleteConfirmName !== characterToDelete.name) {
      alert('Character name does not match');
      return;
    }

    try {
      await deleteCharacter(characterToDelete.id);
      setDeleteDialogOpen(false);
      setCharacterToDelete(null);
      setDeleteConfirmName('');
      fetchCharacters();
    } catch (error) {
      alert(`Error deleting character: ${error instanceof Error ? error.message : error}`);
    }
  };

  // Everything lives in this browser's storage, so a JSON file is the backup
  // story: download a snapshot, or restore/merge one on a new device.
  const handleExport = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd-spellbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // The browser owns the file from here; the moment it was handed over is
    // the honest answer to "when did you last back up?".
    markBackupTaken();
    setBackupState(readBackupState());
    setImportResult(null);
  };

  /** Read and check the chosen file, then show what a restore would do. The
      stores are not touched until the dialog is confirmed. */
  const handleImportFile = async (file: File) => {
    setImportResult(null);
    let check: BackupCheck;
    try {
      check = validateBackup(JSON.parse(await file.text()));
    } catch {
      check = { ok: false, error: 'That file is not readable JSON.' };
    }

    let plan: ImportPlan | null = null;
    if (check.ok) {
      const customSpells = await listCustomSpells().catch(() => []);
      plan = planImport(check, { characters, customSpells });
    }
    setPendingImport({ name: file.name, check, plan });
  };

  const handleImportConfirm = async () => {
    const check = pendingImport?.check;
    if (!check?.ok) return;

    setImporting(true);
    try {
      const result = await importBackup(check);
      setPendingImport(null);
      setImportResult(
        `Restored ${plural(result.characters, 'character')} and ${plural(result.customSpells, 'custom spell')}.`
      );
      await fetchCharacters();
    } catch (error) {
      setImportResult(
        `Could not restore that file: ${error instanceof Error ? error.message : error}`
      );
    }
    setImporting(false);
  };

  /** Does this device hold anything the last backup file has not seen? */
  const unsavedChanges = backupState
    ? hasUnsavedChanges(backupState, characters.length > 0)
    : false;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--page-bg)' }}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 md:mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="foil-title text-2xl font-bold md:text-4xl">D&amp;D Spellbook</h1>
              <p className="text-ink-muted mt-1 text-sm">
                {characters.length === 0
                  ? 'Your shelf is waiting'
                  : `${characters.length} ${characters.length === 1 ? 'tome' : 'tomes'} on the shelf`}
              </p>
              {/* Which rulebook this app implements. Quiet, but stated: someone
                  comparing a sheet against a 2024 PHB should not have to guess. */}
              <p className="rules-stamp mt-2">D&amp;D 5e — 2014 rules</p>
            </div>
            {/* The label stays visible at every width — a bare plus tells a
                first-time reader nothing. */}
            <Button onClick={handleCreateCharacter} className="btn-accent h-11 px-4">
              <Plus className="mr-2 h-5 w-5" />
              New Character
            </Button>
          </div>

          {/* Theme picker. The readout beside the label names the selection and
              previews whatever dot is hovered or focused, which beats a floating
              tooltip here: it cannot overflow a 320px row, cannot cover the dots
              and cannot get stuck on a touch device. Screen readers already get
              the name from each button's aria-label, so the readout is hidden
              from them to avoid announcing it twice. */}
          <div className="mt-4 flex flex-wrap items-center gap-0.5">
            <span className="text-ink-faint mr-1 text-xs">Theme</span>
            <span
              aria-hidden="true"
              className={`mr-1 min-w-[7.5rem] text-xs ${previewTheme ? 'text-ink-faint italic' : 'text-ink-muted'}`}
            >
              {(THEMES.find((t) => t.id === (previewTheme ?? theme)) ?? THEMES[0]).name}
            </span>
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-label={t.name}
                aria-pressed={theme === t.id}
                onClick={() => {
                  setTheme(t.id);
                  applyTheme(t.id);
                }}
                onMouseEnter={() => setPreviewTheme(t.id)}
                onMouseLeave={() => setPreviewTheme(null)}
                onFocus={() => setPreviewTheme(t.id)}
                onBlur={() => setPreviewTheme(null)}
                className="flex h-11 w-11 items-center justify-center rounded-lg"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2"
                  style={{
                    background: `linear-gradient(135deg, ${t.from}, ${t.accent})`,
                    borderColor: theme === t.id ? 'var(--text-highlight)' : 'rgba(255,255,255,0.25)',
                  }}
                >
                  {theme === t.id && <Check className="h-3.5 w-3.5" style={{ color: t.ink }} />}
                </span>
              </button>
            ))}
          </div>
        </header>

        {/* The shelf and its backup strip share one measure: --shelf-cols sizes
            the grid, and the strip below inherits it so the controls stay with
            the books instead of stretching to the window edge on a wide screen. */}
        <div
          className="shelf-area"
          style={{ '--shelf-cols': Math.min(Math.max(characters.length, 1), 3) } as React.CSSProperties}
        >
          {loading ? (
            <div className="text-ink-muted py-12 text-center">Loading characters...</div>
          ) : characters.length === 0 ? (
            <div className="shelf">
              <Card className="shelf-empty text-center">
                <CardHeader>
                  <CardTitle className="text-ink">Your Shelf Is Empty</CardTitle>
                  <CardDescription className="text-ink-muted">
                    Bind your first character into the book — everything stays on this device.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleCreateCharacter} className="btn-accent h-11 w-full">
                    <Plus className="mr-2 h-5 w-5" />
                    Create Character
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* The shelf is only as wide as the books on it (capped at three
               columns), so one, two and many all look deliberately composed
               instead of one card stranded in a wide canvas. */
            <div className="shelf">
              {characters.map((character) => {
                const cls = getClassById(character.class_id);
                return (
                  <article key={character.id} className="tome" data-class={character.class_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectCharacter(character.id)}
                      className="tome__link tome__title block w-full pr-10 text-base font-semibold break-words"
                    >
                      {character.name}
                    </button>
                    <p className="tome__meta mt-1 text-sm">
                      Level {character.level} {cls?.name ?? character.class_id}
                    </p>
                    {/* The labels take their contrast from a colour, not from an
                        opacity on top of an already-translucent ink — stacking the
                        two is what made these two lines the least readable text in
                        the app. */}
                    <dl className="tome__meta mt-4 flex items-end justify-between gap-2 text-xs">
                      <div>
                        <dt className="tome__meta-label">Hit points</dt>
                        <dd className="tome__stat text-base font-semibold tabular-nums">
                          {character.hp_current}
                          <span className="tome__stat-sub">/{character.hp_max}</span>
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="tome__meta-label">Prepared</dt>
                        <dd className="tome__stat text-base font-semibold tabular-nums">
                          {character.prepared_spells.length}
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(character, e)}
                      aria-label={`Delete ${character.name}`}
                      className="tome__delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {/* Local-first: everything stays in this browser, so this file is the
              entire safety net. The strip says when it was last written and
              whether anything has happened since. */}
          <div className="shelf-footer">
            <div className="min-w-0">
              <p className="text-ink-muted text-xs md:text-sm">
                Your characters are stored on this device only — nothing leaves your browser.
              </p>
              {backupState && (
                <p className="text-ink-faint mt-1 text-xs">
                  Last backup:{' '}
                  {/* With no backup at all, "Never" is the reminder and carries
                      the accent itself — a second phrase beside it would only
                      say the same thing twice. */}
                  <span
                    className={
                      unsavedChanges && !backupState.lastBackupAt
                        ? 'backup-flag-value'
                        : 'text-ink-muted font-medium'
                    }
                  >
                    {describeBackupAge(backupState.lastBackupAt)}
                  </span>
                  {unsavedChanges && backupState.lastBackupAt && (
                    <span className="backup-flag">Changes since then</span>
                  )}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="btn-quiet h-11">
                <Download className="mr-1 h-4 w-4" />
                Backup
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => importInputRef.current?.click()}
                className="btn-quiet h-11"
              >
                <Upload className="mr-1 h-4 w-4" />
                Restore
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {importResult && (
            <p role="status" className="text-ink-muted mt-2 text-xs">
              {importResult}
            </p>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="dialog-panel">
            <DialogHeader>
              <DialogTitle className="text-danger">Delete Character</DialogTitle>
              <DialogDescription className="text-ink-muted">
                Are you sure you want to delete {characterToDelete?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="delete-confirm" className="text-ink">
                  Type <span className="text-danger font-bold">{characterToDelete?.name}</span> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmName(e.target.value)}
                  placeholder="Character name"
                  className="field mt-2 h-11"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setCharacterToDelete(null);
                  setDeleteConfirmName('');
                }}
                className="btn-quiet h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmName !== characterToDelete?.name}
                className="btn-danger h-11"
              >
                Delete Character
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore preview. A backup file is read, checked and counted before
            anything is written, so the confirmation can say exactly what the
            merge will do — and what it will leave alone. */}
        <Dialog
          open={pendingImport !== null}
          onOpenChange={(open: boolean) => {
            if (!open) setPendingImport(null);
          }}
        >
          <DialogContent className="dialog-panel">
            {pendingImport?.check.ok === false ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-danger">That file cannot be restored</DialogTitle>
                  <DialogDescription className="text-ink-muted">
                    {pendingImport.check.error}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-ink-faint py-2 text-xs">
                  Nothing on this device has been changed. Pick another file and try again.
                </p>
                <DialogFooter>
                  <Button onClick={() => setPendingImport(null)} className="btn-quiet h-11">
                    Close
                  </Button>
                </DialogFooter>
              </>
            ) : pendingImport?.check.ok && pendingImport.plan ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-ink">Restore from backup</DialogTitle>
                  <DialogDescription className="text-ink-muted break-words">
                    {pendingImport.name}
                    {pendingImport.check.exportedAt &&
                      ` — written ${new Date(pendingImport.check.exportedAt).toLocaleString()}`}
                  </DialogDescription>
                </DialogHeader>

                <dl className="import-preview row-plate">
                  <div>
                    <dt>Characters</dt>
                    <dd>
                      <strong className="text-ink tabular-nums">
                        {pendingImport.plan.characters.total}
                      </strong>{' '}
                      in the file — {pendingImport.plan.characters.added} new,{' '}
                      {pendingImport.plan.characters.replaced} replaced
                    </dd>
                  </div>
                  <div>
                    <dt>Custom spells</dt>
                    <dd>
                      <strong className="text-ink tabular-nums">
                        {pendingImport.plan.customSpells.total}
                      </strong>{' '}
                      in the file — {pendingImport.plan.customSpells.added} new,{' '}
                      {pendingImport.plan.customSpells.replaced} replaced
                    </dd>
                  </div>
                </dl>

                <p className="text-ink-muted text-xs">
                  A record with the same id is <strong className="text-ink">replaced</strong> by the
                  version in the file.
                  {pendingImport.plan.replacedNames.length > 0 && (
                    <> Overwrites: {pendingImport.plan.replacedNames.join(', ')}.</>
                  )}{' '}
                  {pendingImport.plan.untouched.characters +
                    pendingImport.plan.untouched.customSpells >
                  0
                    ? `Everything else stays as it is — ${plural(pendingImport.plan.untouched.characters, 'character')} and ${plural(pendingImport.plan.untouched.customSpells, 'custom spell')} on this device are not mentioned in the file.`
                    : 'Nothing else on this device is removed.'}
                </p>

                {pendingImport.check.skipped.length > 0 && (
                  <ul className="text-ink-faint list-disc space-y-1 pl-4 text-xs">
                    {pendingImport.check.skipped.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setPendingImport(null)}
                    className="btn-quiet h-11"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleImportConfirm} disabled={importing} className="btn-accent h-11">
                    {importing ? 'Restoring…' : 'Restore'}
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
