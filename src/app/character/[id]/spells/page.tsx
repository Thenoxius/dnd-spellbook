'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Character } from '@/types/database';
import { dndSpells, getSpellById } from '@/data/spells';
import { dndSubclasses, getSubclassById } from '@/data/subclasses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Check, X, Search, Plus } from 'lucide-react';

export default function SpellLibraryPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [spells, setSpells] = useState<any[]>([]);
  const [subclasses, setSubclasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [expandedSpells, setExpandedSpells] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (characterId) {
      fetchData();
    }
  }, [characterId]);

  const fetchData = async () => {
    const { data: charResult, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (error) {
      console.error('Error fetching character:', error);
      setLoading(false);
      return;
    }

    if (charResult) {
      setCharacter(charResult);
    }

    // Use local data for spells and subclasses
    setSpells(dndSpells);
    setSubclasses(dndSubclasses);
    setLoading(false);
  };

  const toggleSpellPrepared = async (spellId: string) => {
    if (!character) return;

    const isPrepared = character.prepared_spells.includes(spellId);
    const newPreparedSpells = isPrepared
      ? character.prepared_spells.filter(id => id !== spellId)
      : [...character.prepared_spells, spellId];

    const { error } = await supabase
      .from('characters')
      .update({ prepared_spells: newPreparedSpells })
      .eq('id', characterId);

    if (!error) {
      setCharacter(prev => prev ? { ...prev, prepared_spells: newPreparedSpells } : null);
    }
  };

  const toggleSpellExpansion = (spellId: string) => {
    setExpandedSpells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spellId)) {
        newSet.delete(spellId);
      } else {
        newSet.add(spellId);
      }
      return newSet;
    });
  };

    const getAvailableSpells = () => {
    if (!character) return [];

    return dndSpells.filter(spell => {
      // Check if spell is in base class IDs
      const inBaseClass = spell.baseClassIds.includes(character.class_id);
      
      // Check if spell is in subclass bonus spells for current level
      let inSubclassBonus = false;
      if (character.subclass_id) {
        const subclass = dndSubclasses.find(s => s.id === character.subclass_id);
        if (subclass) {
          const bonusSpellsForLevel = subclass.bonusSpells[character.level] || [];
          inSubclassBonus = bonusSpellsForLevel.includes(spell.id);
        }
      }

      return inBaseClass || inSubclassBonus;
    });
  };

  const getFilteredSpells = () => {
    const availableSpells = getAvailableSpells();
    
    return availableSpells.filter(spell => {
      const matchesSearch = spell.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           spell.school.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = filterLevel === 'all' || spell.level === filterLevel;
      return matchesSearch && matchesLevel;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading spell library...</div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Character not found</div>
      </div>
    );
  }

  const filteredSpells = getFilteredSpells();
  const preparedCount = character.prepared_spells.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/character/${characterId}?tab=spells`)} className="text-white hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Spell Library</h1>
            <p className="text-slate-400">
              {character.name} • {preparedCount} spells prepared
            </p>
          </div>
          <Button
            onClick={() => router.push('/spells/create')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Spell
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search spells..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-white pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filterLevel === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterLevel('all')}
                  className={filterLevel === 'all' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}
                >
                  All
                </Button>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                  <Button
                    key={level}
                    variant={filterLevel === level ? 'default' : 'outline'}
                    onClick={() => setFilterLevel(level)}
                    className={filterLevel === level ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}
                  >
                    {level === 0 ? 'Cantrip' : `L${level}`}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spell List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Available Spells</CardTitle>
            <CardDescription className="text-slate-400">
              {filteredSpells.length} spells available for your class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSpells.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No spells match your filters
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredSpells.map(spell => {
                    const isPrepared = character.prepared_spells.includes(spell.id);
                    return (
                      <div key={spell.id} className="p-4 bg-slate-900/50 rounded-lg">
                        <div className="flex items-start gap-4">
                          <Button
                            variant={isPrepared ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => toggleSpellPrepared(spell.id)}
                            className={isPrepared ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}
                          >
                            {isPrepared ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </Button>
                          <div className="flex-1">
                            <div
                              onClick={() => toggleSpellExpansion(spell.id)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-white font-medium">{spell.name}</h4>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="bg-slate-700 border-slate-600 text-white">
                                    {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                                  </Badge>
                                  <Badge variant="outline" className="bg-slate-700 border-slate-600 text-white">
                                    {spell.school}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-slate-400 text-sm">
                                {spell.castingTime} • {spell.range} • {spell.components}
                              </div>
                            </div>
                            {expandedSpells.has(spell.id) && (
                              <div className="mt-4 pt-4 border-t border-slate-700">
                                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                  <div>
                                    <span className="text-slate-400">Duration:</span>
                                    <span className="text-white ml-2">{spell.duration}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    {spell.concentration && (
                                      <Badge variant="outline" className="bg-purple-900/50 border-purple-700 text-purple-300">
                                        Concentration
                                      </Badge>
                                    )}
                                    {spell.ritual && (
                                      <Badge variant="outline" className="bg-blue-900/50 border-blue-700 text-blue-300">
                                        Ritual
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-slate-300 text-sm">{spell.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
