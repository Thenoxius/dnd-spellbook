'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getCharacter as dbGetCharacter,
  updateCharacter as dbUpdateCharacter,
  deleteCharacter as dbDeleteCharacter,
} from '@/lib/db';
import { CharacterWithRelations } from '@/types/database';
import { calculateMulticlassSlots, toStoredSlots } from '@/lib/multiclass';
import { getClassById } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Trash2 } from 'lucide-react';

/** Static export renders this page at build time, so the id in the query string
 *  is only known on the client. useSearchParams needs a Suspense boundary for
 *  that hand-off; without one a production build refuses to compile. */
function PageFallback({ label }: { label: string }) {
  return (
    <div style={{ background: 'var(--page-bg)' }} className="flex min-h-screen items-center justify-center">
      <div className="text-ink">{label}</div>
    </div>
  );
}

function EditCharacterPageContent() {
  const router = useRouter();
  const characterId = useSearchParams().get('id') ?? '';

  const [character, setCharacter] = useState<CharacterWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [editLevel, setEditLevel] = useState(1);
  const [editMaxHP, setEditMaxHP] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCharacterData();
  }, [characterId]);

  const fetchCharacterData = async () => {
    // Reference data (class, race, ...) lives in local files, not the store
    const data = await dbGetCharacter(characterId).catch(() => undefined);

    if (data) {
      const withRelations = {
        ...data,
        class: getClassById(data.class_id) || null,
      } as unknown as CharacterWithRelations;
      setCharacter(withRelations);
      setEditLevel(data.level);
      setEditMaxHP(data.hp_max);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!character) return;

    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {
      level: editLevel,
      hp_max: editMaxHP,
    };

    // Recalculate spell slots if level changed
    if (editLevel !== character.level) {
      updates.spell_slots = toStoredSlots(
        calculateMulticlassSlots([
          { classId: character.class_id, level: editLevel },
          { classId: character.secondary_class_id ?? '', level: character.secondary_level ?? 0 },
        ]).spellSlots,
        character.spell_slots
      );
    }

    try {
      await dbUpdateCharacter(characterId, updates);
      setSaving(false);
      router.push(`/character?id=${characterId}`);
    } catch (error) {
      setSaving(false);
      alert(`Error updating character: ${error instanceof Error ? error.message : error}`);
    }
  };

  const handleDelete = async () => {
    if (!character) return;
    if (deleteConfirmName !== character.name) {
      alert('Character name does not match');
      return;
    }

    try {
      await dbDeleteCharacter(characterId);
      router.push('/');
    } catch (error) {
      alert(`Error deleting character: ${error instanceof Error ? error.message : error}`);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--page-bg)' }} className="min-h-screen flex items-center justify-center">
        <div className="text-ink">Loading character...</div>
      </div>
    );
  }

  if (!character) {
    return (
      <div style={{ background: 'var(--page-bg)' }} className="min-h-screen flex items-center justify-center">
        <div className="text-ink">Character not found</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--page-bg)' }} className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-ink hover:text-ink">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-ink">Edit {character.name}</h1>
            <p className="text-ink-muted">
              Level {character.level} {character.class?.name}
            </p>
          </div>
        </div>

        <Card className="tome-panel">
          <CardHeader>
            <CardTitle className="text-ink">Character Details</CardTitle>
            <CardDescription className="text-ink-muted">
              Update your character's level and maximum HP. Spell slots will be recalculated when level changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="edit-level" className="text-ink">Level</Label>
              <Input
                id="edit-level"
                type="number"
                min="1"
                max="20"
                value={editLevel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLevel(parseInt(e.target.value) || 1)}
                className="field mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="edit-max-hp" className="text-ink">Max HP</Label>
              <Input
                id="edit-max-hp"
                type="number"
                min="1"
                value={editMaxHP}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMaxHP(parseInt(e.target.value) || 1)}
                className="field mt-2 h-11"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="btn-quiet h-11 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="btn-accent h-11 flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Character Section */}
        <Card className="bg-danger-surface border-red-700 mt-6">
          <CardHeader>
            <CardTitle className="text-danger">Danger Zone</CardTitle>
            <CardDescription className="text-ink-muted">
              Once you delete a character, there is no going back. Please be certain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Character
              </Button>
              <DialogContent className="dialog-panel">
                <DialogHeader>
                  <DialogTitle className="text-danger">Delete Character</DialogTitle>
                  <DialogDescription className="text-ink-muted">
                    Are you sure you want to delete {character.name}? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="delete-confirm" className="text-ink">
                      Type <span className="text-danger font-bold">{character.name}</span> to confirm
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
                      setDeleteConfirmName('');
                    }}
                    className="btn-quiet h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={deleteConfirmName !== character.name}
                    variant="destructive"
                  >
                    Delete Character
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditCharacterPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading character..." />}>
      <EditCharacterPageContent />
    </Suspense>
  );
}
