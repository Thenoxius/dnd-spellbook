'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Character, Spell, Feature, SpellSlot, CharacterWithRelations } from '@/types/database';
import { formatAbilityScore, calculateModifier, calculateSpellSlots, calculateProficiencyBonus, getDamageTypeBadgeClasses, getEffectiveSpellDamage, getSpellUpcastText } from '@/lib/helpers';
import { dndClasses, getClassProgression } from '@/data/classes';
import { dndFeatures, getFeaturesByLevel } from '@/data/features';
import { dndSpells, getSpellById } from '@/data/spells';
import { dndSubclasses, getSubclassById } from '@/data/subclasses';
import { getClassAbilities } from '@/data/classAbilities';
import { dndRaces, getRaceById } from '@/data/races';
import { dndSubraces, getSubraceById } from '@/data/subraces';
import { dndBackgrounds, getBackgroundById } from '@/data/backgrounds';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, BookOpen, Shield, Package, Book, Edit, Settings, Check, Trash2, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast, Toast } from '@/components/ui/toast';

export default function CharacterPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;

  const [character, setCharacter] = useState<CharacterWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSpells, setExpandedSpells] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('combat');
  const [theme, setTheme] = useState('shadow-fiend');
  const [editLevel, setEditLevel] = useState(0);
  const [editMaxHP, setEditMaxHP] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [updatingHP, setUpdatingHP] = useState(false);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const { toast, showToast } = useToast();

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

    if (characterId) {
      fetchCharacterData();
    }
    // Check URL for tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['combat', 'spells', 'inventory', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    // Load theme from user profile
    fetchUserTheme();
  }, [characterId]);

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

  const fetchCharacterData = async () => {
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
      // Map character data to use local data instead of Supabase relations
      const characterWithRelations: CharacterWithRelations = {
        ...charResult,
        class: dndClasses.find(c => c.id === charResult.class_id) || null,
        subclass: dndSubclasses.find(s => s.id === charResult.subclass_id) || null,
        race: dndRaces.find(r => r.id === charResult.race_id) || null,
        subrace: dndSubraces.find(sr => sr.id === charResult.subrace_id) || null,
        background: dndBackgrounds.find(b => b.id === charResult.background_id) || null,
      };
      
      setCharacter(characterWithRelations);
      setEditLevel(charResult.level);
      setEditMaxHP(charResult.hp_max);
    }
    
    setLoading(false);
  };

  const updateCharacter = async (updates: Partial<Character>) => {
    const { error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', characterId);

    if (error) {
      console.error('Error updating character:', error);
      showToast(`Error updating character: ${error.message}`, 'error');
    } else {
      setCharacter(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleHPChange = async (delta: number) => {
    if (!character) return;
    setUpdatingHP(true);
    const newHP = Math.max(0, Math.min(character.hp_max, character.hp_current + delta));
    await updateCharacter({ hp_current: newHP });
    setUpdatingHP(false);
    showToast(`HP updated to ${newHP}`, 'success');
  };

  const handleSpellSlotToggle = async (level: number, index: number) => {
    if (!character) return;
    setTogglingSlot(`${level}-${index}`);
    const spellSlots = { ...character.spell_slots };
    const slot = spellSlots[level];
    if (!slot) return;

    if (index < slot.used) {
      slot.used--;
    } else if (index < slot.max) {
      slot.used++;
    }

    await updateCharacter({ spell_slots: spellSlots });
    setTogglingSlot(null);
    showToast(`Spell slot ${level} updated`, 'success');
  };

  const abilityMods = character
    ? {
        str: calculateModifier(character.str),
        dex: calculateModifier(character.dex),
        con: calculateModifier(character.con),
        int: calculateModifier(character.int),
        wis: calculateModifier(character.wis),
        cha: calculateModifier(character.cha),
      }
    : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const classAbilities = character
    ? getClassAbilities(character.class_id, character.level, abilityMods)
    : [];

  const handleAbilityUseChange = async (abilityId: string, used: number, max: number) => {
    if (!character) return;
    const clamped = Math.max(0, Math.min(max, used));
    const abilityUses = { ...(character.ability_uses || {}), [abilityId]: clamped };
    await updateCharacter({ ability_uses: abilityUses });
  };

  const handleRest = async (type: 'short' | 'long') => {
    if (!character) return;
    const abilityUses = { ...(character.ability_uses || {}) };
    for (const ability of classAbilities) {
      if (type === 'long' || ability.recharge === 'short') {
        abilityUses[ability.id] = 0;
      }
    }
    const updates: Partial<Character> = { ability_uses: abilityUses };

    // Long rest restores HP and spell slots; Warlock pact slots also return on a short rest.
    if (type === 'long' || character.class_id === 'warlock') {
      const spellSlots = { ...character.spell_slots };
      for (const level of Object.keys(spellSlots)) {
        spellSlots[Number(level)] = { ...spellSlots[Number(level)], used: 0 };
      }
      updates.spell_slots = spellSlots;
    }
    if (type === 'long') {
      updates.hp_current = character.hp_max;
      updates.temp_hp = 0;
    }

    await updateCharacter(updates);
    showToast(
      type === 'long'
        ? 'Long rest complete: HP, spell slots, and abilities restored'
        : 'Short rest complete: abilities recharged',
      'success'
    );
  };

  // Calculate spellcasting ability modifier and save DC
  const getSpellcastingAbility = () => {
    if (!character) return 'CHA';
    const classId = character.class_id;
    if (classId === 'wizard') return 'INT';
    if (['cleric', 'druid', 'ranger'].includes(classId)) return 'WIS';
    return 'CHA'; // bard, sorcerer, warlock, paladin
  };

  const spellcastingAbility = getSpellcastingAbility();
  const abilityScore = character ? character[spellcastingAbility.toLowerCase() as keyof typeof character] as number : 10;
  const spellcastingModifier = calculateModifier(abilityScore);
  const proficiencyBonus = character ? Math.ceil(character.level / 4) + 1 : 2;
  const spellSaveDC = 8 + proficiencyBonus + spellcastingModifier;

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

  const getPreparedSpells = () => {
    if (!character) return [];
    return dndSpells.filter(spell => character.prepared_spells.includes(spell.id));
  };

  const getCharacterFeatures = () => {
    if (!character) return [];
    return dndFeatures.filter(
      feature =>
        (feature.sourceId === character.class_id || feature.sourceId === character.subclass_id) &&
        feature.levelRequired <= character.level
    );
  };

  const getSpellSlotsByLevel = () => {
    if (!character) return {};
    return character.spell_slots;
  };

  const getClassProgressionData = () => {
    if (!character || !character.class) return null;
    return getClassProgression(character.class_id, character.level);
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

  const preparedSpells = getPreparedSpells();
  const characterFeatures = getCharacterFeatures();
  const spellSlotsByLevel = getSpellSlotsByLevel();

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{character.name}</h1>
            <p className="text-slate-400">
              Level {character.level} {character.class?.name} {character.subclass?.name && `• ${character.subclass.name}`}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 rounded-lg p-1 w-full" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex w-full gap-1">
              <TabsTrigger
                value="combat"
                className="flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 border border-transparent text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md data-[state=active]:bg-slate-700 data-[state=active]:text-white h-[38px] sm:h-[42px]"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden md:inline">Combat</span>
              </TabsTrigger>
              <TabsTrigger
                value="spells"
                className="flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 border border-transparent text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md data-[state=active]:bg-slate-700 data-[state=active]:text-white h-[38px] sm:h-[42px]"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden md:inline">Spells</span>
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 border border-transparent text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md data-[state=active]:bg-slate-700 data-[state=active]:text-white h-[38px] sm:h-[42px]"
              >
                <Package className="h-4 w-4" />
                <span className="hidden md:inline">Inventory</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 border border-transparent text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md data-[state=active]:bg-slate-700 data-[state=active]:text-white h-[38px] sm:h-[42px]"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Settings</span>
              </TabsTrigger>
              <Button
                onClick={() => router.push('/')}
                className="flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 border text-white transition-all px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm hover:opacity-80 rounded-md h-[38px] sm:h-[42px]"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  borderColor: 'var(--accent-primary)',
                }}
              >
                <ArrowRight className="h-4 w-4" />
                <span className="hidden md:inline">Back</span>
              </Button>
            </div>
          </TabsList>

          {/* Combat Tab */}
          <TabsContent value="combat" className="space-y-6">
            {/* HP Tracker */}
            <Card className="bg-slate-800/50 border-slate-700" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Hit Points</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRest('short')}
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-xs"
                    >
                      Short Rest
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRest('long')}
                      className="text-white text-xs hover:opacity-80"
                      style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                    >
                      Long Rest
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHPChange(-10)}
                    disabled={updatingHP}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-xs md:text-sm"
                  >
                    {updatingHP ? <LoadingSpinner size="sm" /> : '-10'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleHPChange(-1)}
                    disabled={updatingHP}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    {updatingHP ? <LoadingSpinner size="sm" /> : <Minus className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>
                  <div className="text-center px-4 md:px-8">
                    <div className="text-3xl md:text-5xl font-bold text-white">
                      {character.hp_current}
                    </div>
                    <div className="text-slate-400 text-sm md:text-base">/ {character.hp_max}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleHPChange(1)}
                    disabled={updatingHP}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    {updatingHP ? <LoadingSpinner size="sm" /> : <Plus className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHPChange(10)}
                    disabled={updatingHP}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-xs md:text-sm"
                  >
                    {updatingHP ? <LoadingSpinner size="sm" /> : '+10'}
                  </Button>
                </div>
                {/* Temp HP */}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newTempHP = Math.max(0, (character.temp_hp || 0) - 1);
                        updateCharacter({ temp_hp: newTempHP });
                      }}
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <div className="text-sm text-slate-400">Temp HP</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {character.temp_hp || 0}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newTempHP = (character.temp_hp || 0) + 1;
                        updateCharacter({ temp_hp: newTempHP });
                      }}
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spell Slots */}
            {Object.keys(spellSlotsByLevel).length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Spell Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-4">
                    {Object.entries(spellSlotsByLevel).map(([level, slot]: [string, SpellSlot]) => (
                      <div key={level} className="text-center">
                        <div className="text-slate-400 text-xs md:text-sm mb-1">L{level}</div>
                        <div className="flex gap-1 md:gap-2 justify-center">
                          {Array.from({ length: slot.max }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => handleSpellSlotToggle(parseInt(level), i)}
                              disabled={togglingSlot === `${level}-${i}`}
                              className={`spell-slot w-6 h-6 md:w-8 md:h-8 relative ${i < slot.used ? 'spell-slot-used' : 'spell-slot-available'}`}
                              style={{ animationDelay: `${i * 200}ms` }}
                            >
                              {togglingSlot === `${level}-${i}` && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <LoadingSpinner size="sm" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{slot.used}/{slot.max}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Class Abilities (limited-use) */}
            {classAbilities.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Class Abilities</CardTitle>
                  <CardDescription className="text-slate-400">
                    Limited-use abilities — tap to spend, rest to recharge
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {classAbilities.map((ability) => {
                    const used = character.ability_uses?.[ability.id] ?? 0;
                    const remaining = ability.maxUses - used;
                    return (
                      <div key={ability.id}>
                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{ability.name}</span>
                            {ability.linkedStat && (
                              <Badge variant="outline" className="bg-purple-900/50 border-purple-700 text-purple-300 text-xs">
                                {ability.linkedStat.toUpperCase()} linked
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300 text-xs">
                            {ability.recharge === 'short' ? 'Short Rest' : 'Long Rest'}
                          </Badge>
                        </div>
                        {ability.maxUses <= 10 ? (
                          <div className="flex gap-1.5 md:gap-2 flex-wrap items-center">
                            {Array.from({ length: ability.maxUses }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() =>
                                  handleAbilityUseChange(ability.id, i < used ? used - 1 : used + 1, ability.maxUses)
                                }
                                className={`spell-slot w-5 h-5 md:w-6 md:h-6 ${i < used ? 'spell-slot-used' : 'spell-slot-available'}`}
                                style={{ animationDelay: `${i * 200}ms` }}
                              />
                            ))}
                            <span className="text-xs text-slate-400 ml-2">{remaining}/{ability.maxUses}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbilityUseChange(ability.id, used + 1, ability.maxUses)}
                              disabled={remaining <= 0}
                              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="text-center min-w-[70px]">
                              <span className="text-xl font-bold" style={{ color: 'var(--text-highlight)' }}>{remaining}</span>
                              <span className="text-slate-400 text-sm"> / {ability.maxUses}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbilityUseChange(ability.id, used - 1, ability.maxUses)}
                              disabled={used <= 0}
                              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <p className="text-slate-400 text-sm mt-2">{ability.description}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Ability Scores */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Ability Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((stat) => {
                    const statValue = character[stat.toLowerCase() as keyof Character] as number;
                    return (
                      <div key={stat} className="text-center">
                        <div className="text-slate-400 text-sm mb-1">{stat}</div>
                        <div className="text-xl font-bold text-white">{statValue}</div>
                        <div className="text-purple-400 text-sm">
                          {formatAbilityScore(statValue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            {characterFeatures.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Features</CardTitle>
                  <CardDescription className="text-slate-400">
                    Class and subclass features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {characterFeatures.map((feature) => (
                        <div key={feature.id} className="p-4 bg-slate-900/50 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white font-medium">{feature.name}</h4>
                            <Badge variant="outline" className="bg-slate-700 border-slate-600 text-white">
                              Lv. {feature.levelRequired}
                            </Badge>
                          </div>
                          <p className="text-slate-400 text-sm">{feature.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Class Progressions */}
            {(() => {
              const progression = getClassProgressionData();
              if (!progression || !progression.customClassData) return null;
              return (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Class Progressions</CardTitle>
                    <CardDescription className="text-slate-400">
                      Abilities and resources gained at your current level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(progression.customClassData).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                          <div>
                            <div className="text-white font-medium">{key}</div>
                          </div>
                          <div className="text-purple-400 font-bold">{value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          {/* Spells Tab */}
          <TabsContent value="spells" className="space-y-6">
            {/* Spell Stats */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-slate-400 text-sm">Spellcasting Ability</div>
                    <div className="text-xl font-bold text-white">{spellcastingAbility}</div>
                    <div className="text-purple-400">{spellcastingModifier >= 0 ? '+' : ''}{spellcastingModifier}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Spell Save DC</div>
                    <div className="text-xl font-bold text-white">{spellSaveDC}</div>
                    <div className="text-slate-400 text-sm">8 + {proficiencyBonus} + {spellcastingModifier}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm">Proficiency Bonus</div>
                    <div className="text-xl font-bold text-white">+{proficiencyBonus}</div>
                    <div className="text-slate-400 text-sm">Level {character.level}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Spell Slots */}
            {Object.keys(spellSlotsByLevel).length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Spell Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-4">
                    {Object.entries(spellSlotsByLevel).map(([level, slot]: [string, SpellSlot]) => (
                      <div key={level} className="text-center">
                        <div className="text-slate-400 text-xs md:text-sm mb-1">L{level}</div>
                        <div className="flex gap-1 md:gap-2 justify-center">
                          {Array.from({ length: slot.max }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => handleSpellSlotToggle(parseInt(level), i)}
                              disabled={togglingSlot === `${level}-${i}`}
                              className={`spell-slot w-6 h-6 md:w-8 md:h-8 relative ${i < slot.used ? 'spell-slot-used' : 'spell-slot-available'}`}
                              style={{ animationDelay: `${i * 200}ms` }}
                            >
                              {togglingSlot === `${level}-${i}` && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <LoadingSpinner size="sm" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{slot.used}/{slot.max}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Prepared Spells</CardTitle>
                    <CardDescription className="text-slate-400">
                      {preparedSpells.length} spells prepared
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => router.push(`/character/${characterId}/spells`)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Book className="mr-2 h-4 w-4" />
                    Spell Library
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {preparedSpells.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    No spells prepared. Visit the Spell Library to prepare spells.
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                        const levelSpells = preparedSpells.filter(s => s.level === level);
                        if (levelSpells.length === 0) return null;
                        return (
                          <div key={level}>
                            <h3 className="text-white font-medium mb-3">
                              {level === 0 ? 'Cantrips' : `Level ${level}`}
                            </h3>
                            <div className="space-y-2">
                              {levelSpells.map(spell => (
                                <div key={spell.id}>
                                  <div
                                    onClick={() => toggleSpellExpansion(spell.id)}
                                    className="p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900/70 transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h4 className="text-white font-medium">{spell.name}</h4>
                                        <div className="text-slate-400 text-sm mt-1">
                                          {spell.school} • {spell.castingTime} • {spell.range}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        {spell.damage && (
                                          <Badge variant="outline" className={getDamageTypeBadgeClasses(spell.damageType)}>
                                            {getEffectiveSpellDamage(spell, character.level)} {spell.damageType}
                                          </Badge>
                                        )}
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
                                    {expandedSpells.has(spell.id) && (
                                      <div className="mt-4 pt-4 border-t border-slate-700">
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                          <div>
                                            <span className="text-slate-400">Components:</span>
                                            <span className="text-white ml-2">{spell.components}</span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400">Duration:</span>
                                            <span className="text-white ml-2">{spell.duration}</span>
                                          </div>
                                        </div>
                                        <p className="text-slate-300 text-sm">{spell.description}</p>
                                        {getSpellUpcastText(spell) && (
                                          <p className="text-slate-400 text-sm mt-2 italic">
                                            {getSpellUpcastText(spell)}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Currency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map(currency => (
                    <div key={currency} className="text-center">
                      <div className="text-slate-400 text-sm mb-1 uppercase">{currency}</div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newCurrency = { ...character.currency };
                            newCurrency[currency] = Math.max(0, newCurrency[currency] - 1);
                            updateCharacter({ currency: newCurrency });
                          }}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-8 w-8"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={character.currency[currency]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = parseInt(e.target.value) || 0;
                            const newCurrency = { ...character.currency };
                            newCurrency[currency] = Math.max(0, value);
                            updateCharacter({ currency: newCurrency });
                          }}
                          className="bg-slate-900/50 border-slate-700 text-white w-20 text-center h-8"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newCurrency = { ...character.currency };
                            newCurrency[currency] = newCurrency[currency] + 1;
                            updateCharacter({ currency: newCurrency });
                          }}
                          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-8 w-8"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Inventory</CardTitle>
                    <CardDescription className="text-slate-400">
                      {character.inventory.length} items
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      const name = prompt('Item name:');
                      if (!name) return;
                      const quantity = parseInt(prompt('Quantity:', '1') || '1') || 1;
                      const notes = prompt('Notes (optional):') || '';
                      const newItem = { name, quantity, notes };
                      const newInventory = [...character.inventory, newItem];
                      updateCharacter({ inventory: newInventory });
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {character.inventory.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    No items in inventory
                  </div>
                ) : (
                  <div className="space-y-2">
                    {character.inventory.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-900/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{item.name}</h4>
                            {item.notes && (
                              <p className="text-slate-400 text-sm mt-1">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newInventory = [...character.inventory];
                                if (newInventory[index].quantity > 1) {
                                  newInventory[index].quantity--;
                                } else {
                                  newInventory.splice(index, 1);
                                }
                                updateCharacter({ inventory: newInventory });
                              }}
                              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-8 w-8"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Badge variant="outline" className="bg-slate-700 border-slate-600 text-white min-w-[50px]">
                              x{item.quantity}
                            </Badge>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newInventory = [...character.inventory];
                                newInventory[index].quantity++;
                                updateCharacter({ inventory: newInventory });
                              }}
                              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-8 w-8"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Character Details Card */}
            <Card className="bg-slate-800/50 border-slate-700" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <CardHeader>
                <CardTitle className="text-white">Character Details</CardTitle>
                <CardDescription className="text-slate-400">
                  Update your character's level and maximum HP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-level" className="text-white">Level</Label>
                  <Input
                    id="edit-level"
                    type="number"
                    value={editLevel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLevel(parseInt(e.target.value) || 0)}
                    className="bg-slate-900/50 border-slate-700 text-white mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max-hp" className="text-white">Max HP</Label>
                  <Input
                    id="edit-max-hp"
                    type="number"
                    value={editMaxHP}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMaxHP(parseInt(e.target.value) || 0)}
                    className="bg-slate-900/50 border-slate-700 text-white mt-2"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (character) {
                        setEditLevel(character.level);
                        setEditMaxHP(character.hp_max);
                      }
                    }}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!character) return;
                      setSavingDetails(true);
                      const { error } = await supabase
                        .from('characters')
                        .update({
                          level: editLevel,
                          hp_max: editMaxHP,
                          spell_slots: calculateSpellSlots(character.class_id, editLevel),
                        })
                        .eq('id', characterId);

                      if (error) {
                        showToast(`Error updating character: ${error.message}`, 'error');
                      } else {
                        fetchCharacterData();
                        showToast('Character details updated successfully', 'success');
                      }
                      setSavingDetails(false);
                    }}
                    disabled={savingDetails}
                    className="text-white flex-1"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    {savingDetails ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme Customization Card */}
            <Card className="bg-slate-800/50 border-slate-700" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <CardHeader>
                <CardTitle className="text-white">Theme Customization</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose your preferred visual theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  {[
                    { id: 'arcane-tome', name: 'Arcane Tome', from: '#ead9b5', to: '#d3bc8d', accent: '#7c3aed', ink: '#3b2a17' },
                    { id: 'shadow-fiend', name: 'Shadow Codex', from: '#1e1b4b', to: '#581c87', accent: '#9333ea', ink: '#ffffff' },
                    { id: 'royal-oath', name: 'Celestial Oath', from: '#0f172a', to: '#1e3a5f', accent: '#fbbf24', ink: '#ffffff' },
                    { id: 'wildwood-sentry', name: 'Wildwood Grimoire', from: '#14532d', to: '#166534', accent: '#22c55e', ink: '#ffffff' },
                    { id: 'crimson-pact', name: 'Infernal Pact', from: '#450a0a', to: '#7f1d1d', accent: '#dc2626', ink: '#ffffff' },
                    { id: 'arcane-sanctum', name: 'Arcane Sanctum', from: '#0f172a', to: '#0e7490', accent: '#06b6d4', ink: '#ffffff' },
                  ].map((themeOption) => (
                    <div
                      key={themeOption.id}
                      onClick={async () => {
                        setTheme(themeOption.id);
                        document.documentElement.setAttribute('data-theme', themeOption.id);
                        // Save to user profile
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          await supabase
                            .from('user_profiles')
                            .update({ theme: themeOption.id })
                            .eq('user_id', user.id);
                        }
                      }}
                      className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                        theme === themeOption.id
                          ? 'ring-4 ring-offset-2 ring-offset-slate-900'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        boxShadow: theme === themeOption.id ? `0 0 20px ${themeOption.accent}40` : 'none',
                      }}
                    >
                      <div
                        className="h-24 w-full"
                        style={{
                          background: `linear-gradient(to bottom right, ${themeOption.from}, ${themeOption.to})`,
                        }}
                      >
                        <div className="absolute inset-0 border-2 border-white/20 rounded-lg" />
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: themeOption.accent }} />
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="text-xs font-serif" style={{ color: themeOption.ink }}>{themeOption.name}</div>
                        </div>
                        {theme === themeOption.id && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4" style={{ color: themeOption.ink }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone Card */}
            <Card className="bg-red-950/30 border-red-900" style={{ backgroundColor: 'rgba(69, 10, 10, 0.3)', borderColor: '#991b1b' }}>
              <CardHeader>
                <CardTitle className="text-red-400">Danger Zone</CardTitle>
                <CardDescription className="text-red-300">
                  Irreversible actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Character
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Character</DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to delete {character?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="delete-confirm" className="text-white">
                  Type <span className="text-red-400 font-bold">{character?.name}</span> to confirm
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
                onClick={async () => {
                  if (!character || deleteConfirmName !== character.name) {
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
                }}
                disabled={deleteConfirmName !== character?.name}
                variant="destructive"
              >
                Delete Character
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toast Notifications */}
        {toast && <Toast message={toast.message} type={toast.type} />}
      </div>
    </div>
  );
}
