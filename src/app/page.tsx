'use client';

import { useState, useEffect, useRef } from 'react';
import { listCharacters, deleteCharacter, exportBackup, importBackup, type BackupData } from '@/lib/db';
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

  const fetchCharacters = async () => {
    try {
      setCharacters(await listCharacters());
    } catch (error) {
      console.error('Error fetching characters:', error);
    }
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
    router.push(`/character/${characterId}`);
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
  };

  const handleImportFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as BackupData;
      const result = await importBackup(data);
      alert(`Imported ${result.characters} character(s) and ${result.customSpells} custom spell(s).`);
      fetchCharacters();
    } catch (error) {
      alert(`Could not import that file: ${error instanceof Error ? error.message : error}`);
    }
  };

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

        {loading ? (
          <div className="text-ink-muted py-12 text-center">Loading characters...</div>
        ) : characters.length === 0 ? (
          <div className="shelf" style={{ '--shelf-cols': 1 } as React.CSSProperties}>
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
          <div
            className="shelf"
            style={{ '--shelf-cols': Math.min(characters.length, 3) } as React.CSSProperties}
          >
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
                  <dl className="tome__meta mt-4 flex items-end justify-between gap-2 text-xs">
                    <div>
                      <dt className="opacity-75">Hit points</dt>
                      <dd className="tome__stat text-base font-semibold tabular-nums">
                        {character.hp_current}
                        <span className="opacity-70">/{character.hp_max}</span>
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="opacity-75">Prepared</dt>
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

        {/* Local-first: everything stays in this browser. Backup / restore. */}
        <div className="text-ink-muted mt-8 flex flex-col items-start justify-between gap-3 text-xs sm:flex-row sm:items-center md:text-sm">
          <p>Your characters are stored on this device only — nothing leaves your browser.</p>
          <div className="flex gap-2">
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
      </div>
    </div>
  );
}
