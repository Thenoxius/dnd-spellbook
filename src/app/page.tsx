'use client';

import { useState, useEffect, useRef } from 'react';
import { listCharacters, deleteCharacter, exportBackup, importBackup, type BackupData } from '@/lib/db';
import { THEMES, applyTheme, loadTheme } from '@/lib/theme';
import { Character } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [theme, setTheme] = useState('arcane-tome');
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadTheme();
    setTheme(stored);
    document.documentElement.setAttribute('data-theme', stored);
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      setCharacters(await listCharacters());
    } catch (error) {
      console.error('Error fetching characters:', error);
    }
    setLoading(false);
  };

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
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white">D&D Spellbook</h1>
            <div className="theme-dots mt-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  title={t.name}
                  aria-label={`Switch to the ${t.name} theme`}
                  className={`theme-dot ${theme === t.id ? 'theme-dot-active' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${t.from}, ${t.accent})` }}
                  onClick={() => {
                    setTheme(t.id);
                    applyTheme(t.id);
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              onClick={handleCreateCharacter}
              size="lg"
              className="btn-accent flex-1 sm:flex-none text-sm md:text-base"
            >
              <Plus className="mr-1 h-4 w-4 md:mr-2 md:h-5 md:w-5" />
              <span className="hidden sm:inline">New Character</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white py-12">Loading characters...</div>
        ) : characters.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">No Characters Yet</CardTitle>
              <CardDescription className="text-slate-400">
                Create your first character to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateCharacter}
                className="btn-accent w-full"
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Character
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
            {characters.map((character) => (
              <Card
                key={character.id}
                className="tome-card clickable-card cursor-pointer relative"
                onClick={() => handleSelectCharacter(character.id)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteClick(character, e)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardHeader>
                  <CardTitle className="text-white text-base md:text-lg">{character.name}</CardTitle>
                  <CardDescription className="text-slate-400 text-sm md:text-base">
                    Level {character.level} • {character.class_id}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <div className="text-slate-300">
                      HP: {character.hp_current}/{character.hp_max}
                    </div>
                    <div className="text-accent">
                      {character.prepared_spells.length} spells
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Local-first: everything stays in this browser. Backup / restore. */}
        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-400 text-xs md:text-sm">
          <p>
            Your characters are stored on this device only — nothing leaves your browser.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <Download className="mr-1 h-4 w-4" />
              Backup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
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
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Character</DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to delete {characterToDelete?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="delete-confirm" className="text-white">
                  Type <span className="text-red-400 font-bold">{characterToDelete?.name}</span> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmName(e.target.value)}
                  placeholder="Character name"
                  className="bg-slate-900/50 border-slate-700 text-white mt-2"
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
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmName !== characterToDelete?.name}
                variant="destructive"
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
