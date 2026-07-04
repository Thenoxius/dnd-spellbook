'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Character } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [theme, setTheme] = useState('shadow-fiend');

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
    };

    checkAuth();
    fetchCharacters();
    fetchUserTheme();
  }, []);

  const fetchUserTheme = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('theme')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setTheme(profile.theme);
        document.documentElement.setAttribute('data-theme', profile.theme);
      }
    }
  };

  const fetchCharacters = async () => {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching characters:', error);
    } else {
      setCharacters(data || []);
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

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterToDelete.id);

    if (error) {
      alert(`Error deleting character: ${error.message}`);
    } else {
      setDeleteDialogOpen(false);
      setCharacterToDelete(null);
      setDeleteConfirmName('');
      fetchCharacters();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <h1 className="text-2xl md:text-4xl font-bold text-white">D&D Spellbook</h1>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="lg"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 flex-1 sm:flex-none text-sm md:text-base"
            >
              <LogOut className="mr-1 h-4 w-4 md:mr-2 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
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
                className="clickable-card bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 cursor-pointer relative"
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
