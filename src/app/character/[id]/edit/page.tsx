'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CharacterWithRelations } from '@/types/database';
import { calculateSpellSlots } from '@/lib/helpers';
import { getClassById } from '@/data/classes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function EditCharacterPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;

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
    // Reference data (class, race, ...) lives in local files, not the database
    const charResult = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (charResult.data) {
      const withRelations = {
        ...charResult.data,
        class: getClassById(charResult.data.class_id) || null,
      } as CharacterWithRelations;
      setCharacter(withRelations);
      setEditLevel(charResult.data.level);
      setEditMaxHP(charResult.data.hp_max);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!character) return;

    setSaving(true);
    const updates: any = {
      level: editLevel,
      hp_max: editMaxHP,
    };

    // Recalculate spell slots if level changed
    if (editLevel !== character.level) {
      updates.spell_slots = calculateSpellSlots(character.class_id, editLevel);
    }

    const { error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', characterId);

    setSaving(false);

    if (error) {
      alert(`Error updating character: ${error.message}`);
    } else {
      router.push(`/character/${characterId}`);
    }
  };

  const handleDelete = async () => {
    if (!character) return;
    if (deleteConfirmName !== character.name) {
      alert('Character name does not match');
      return;
    }

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId);

    if (error) {
      alert(`Error deleting character: ${error.message}`);
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--page-bg)' }} className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading character...</div>
      </div>
    );
  }

  if (!character) {
    return (
      <div style={{ background: 'var(--page-bg)' }} className="min-h-screen flex items-center justify-center">
        <div className="text-white">Character not found</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--page-bg)' }} className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Edit {character.name}</h1>
            <p className="text-slate-400">
              Level {character.level} {character.class?.name}
            </p>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Character Details</CardTitle>
            <CardDescription className="text-slate-400">
              Update your character's level and maximum HP. Spell slots will be recalculated when level changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="edit-level" className="text-white">Level</Label>
              <Input
                id="edit-level"
                type="number"
                min="1"
                max="20"
                value={editLevel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLevel(parseInt(e.target.value) || 1)}
                className="bg-slate-900/50 border-slate-700 text-white mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-max-hp" className="text-white">Max HP</Label>
              <Input
                id="edit-max-hp"
                type="number"
                min="1"
                value={editMaxHP}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMaxHP(parseInt(e.target.value) || 1)}
                className="bg-slate-900/50 border-slate-700 text-white mt-2"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="btn-accent flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Character Section */}
        <Card className="bg-red-900/20 border-red-700 mt-6">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
            <CardDescription className="text-slate-400">
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
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-red-400">Delete Character</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Are you sure you want to delete {character.name}? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="delete-confirm" className="text-white">
                      Type <span className="text-red-400 font-bold">{character.name}</span> to confirm
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
                      setDeleteConfirmName('');
                    }}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
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
