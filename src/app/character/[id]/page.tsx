'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getCharacter as dbGetCharacter,
  updateCharacter as dbUpdateCharacter,
  deleteCharacter as dbDeleteCharacter,
} from '@/lib/db';
import { THEMES, applyTheme, loadTheme } from '@/lib/theme';
import { Character, Spell, Feature, SpellSlot, CharacterWithRelations, CharacterFeat } from '@/types/database';
import { formatAbilityScore, calculateModifier, calculateSpellSlots, calculateProficiencyBonus, getDamageTypeBadgeClasses, getEffectiveSpellDamage, getSpellUpcastText } from '@/lib/helpers';
import { dndClasses, getClassProgression } from '@/data/classes';
import { dndFeatures, getFeaturesByLevel } from '@/data/features';
import { dndSpells, getSpellById } from '@/data/spells';
import { dndSubclasses, getSubclassById } from '@/data/subclasses';
import { getClassAbilities } from '@/data/classAbilities';
import { dndFeats, getFeatById, getInvocations, getInvocationById, isInvocationFeature } from '@/data/feats';
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
import { ArrowLeft, Plus, Minus, BookOpen, Shield, Package, Book, Edit, Settings, Check, Trash2, ArrowRight, Sparkles, X, Moon, Hourglass } from 'lucide-react';
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
  const [editSecondaryClass, setEditSecondaryClass] = useState('');
  const [editSecondaryLevel, setEditSecondaryLevel] = useState(0);
  const [rollInputs, setRollInputs] = useState<Record<string, string>>({});
  const [editMaxHP, setEditMaxHP] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [featDialogOpen, setFeatDialogOpen] = useState(false);
  const [featDialogType, setFeatDialogType] = useState<'feat' | 'invocation' | 'custom'>('feat');
  const [featSearch, setFeatSearch] = useState('');
  const [customFeatName, setCustomFeatName] = useState('');
  const [customFeatDescription, setCustomFeatDescription] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [updatingHP, setUpdatingHP] = useState(false);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (characterId) {
      fetchCharacterData();
    }
    // Check URL for tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['combat', 'spells', 'feats', 'inventory', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    // Apply the device's stored theme
    const stored = loadTheme();
    setTheme(stored);
    document.documentElement.setAttribute('data-theme', stored);
  }, [characterId]);

  const fetchCharacterData = async () => {
    let charResult;
    try {
      charResult = await dbGetCharacter(characterId);
    } catch (error) {
      console.error('Error fetching character:', error);
      setLoading(false);
      return;
    }

    if (charResult) {
      // Attach the bundled reference data (class, race, …) the UI reads from
      const characterWithRelations = {
        ...charResult,
        class: dndClasses.find(c => c.id === charResult.class_id) || null,
        subclass: dndSubclasses.find(s => s.id === charResult.subclass_id) || null,
        race: getRaceById(charResult.race_id) || null,
        subrace: dndSubraces.find(sr => sr.id === charResult.subrace_id) || null,
        background: dndBackgrounds.find(b => b.id === charResult.background_id) || null,
      } as unknown as CharacterWithRelations;
      
      setCharacter(characterWithRelations);
      setEditLevel(charResult.level);
      setEditMaxHP(charResult.hp_max);
      setEditSecondaryClass(charResult.secondary_class_id || '');
      setEditSecondaryLevel(charResult.secondary_level || 0);
    }
    
    setLoading(false);
  };

  const updateCharacter = async (updates: Partial<Character>) => {
    try {
      await dbUpdateCharacter(characterId, updates);
      setCharacter(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating character:', error);
      showToast(`Error updating character: ${error instanceof Error ? error.message : error}`, 'error');
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
    ? [
        ...getClassAbilities(character.class_id, character.level, abilityMods, character.subclass_id),
        ...(character.secondary_class_id
          ? getClassAbilities(character.secondary_class_id, character.secondary_level || 0, abilityMods)
          : []),
      ]
    : [];

  const handleAbilityUseChange = async (abilityId: string, used: number, max: number) => {
    if (!character) return;
    const clamped = Math.max(0, Math.min(max, used));
    const abilityUses = { ...(character.ability_uses || {}), [abilityId]: clamped };
    await updateCharacter({ ability_uses: abilityUses });
  };

  const getStoredRolls = (abilityId: string): number[] => {
    const rolls = character?.ability_uses?.[`${abilityId}_rolls`];
    return Array.isArray(rolls) ? rolls : [];
  };

  const handleStoredRollsChange = async (abilityId: string, rolls: number[]) => {
    if (!character) return;
    const abilityUses = { ...(character.ability_uses || {}), [`${abilityId}_rolls`]: rolls };
    await updateCharacter({ ability_uses: abilityUses });
  };

  const handleRest = async (type: 'short' | 'long') => {
    if (!character) return;
    const abilityUses = { ...(character.ability_uses || {}) };
    for (const ability of classAbilities) {
      if (type === 'long' || ability.recharge === 'short') {
        abilityUses[ability.id] = 0;
        // Banked die results (Portent) are discarded on recharge: new rest, new rolls
        if (ability.storesRolls) {
          abilityUses[`${ability.id}_rolls`] = [];
        }
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
  // Proficiency bonus derives from total character level across all classes
  const totalLevel = character ? character.level + (character.secondary_level || 0) : 1;
  const proficiencyBonus = Math.ceil(totalLevel / 4) + 1;
  const spellSaveDC = 8 + proficiencyBonus + spellcastingModifier;
  const secondaryClass = character?.secondary_class_id
    ? dndClasses.find(c => c.id === character.secondary_class_id)
    : null;

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
    return dndFeatures.filter(feature => {
      // Invocations are chosen individually, not granted by level (see Feats tab)
      if (isInvocationFeature(feature.id)) return false;
      // Primary class and subclass features gate on primary class level
      if (feature.sourceId === character.class_id || feature.sourceId === character.subclass_id) {
        return feature.levelRequired <= character.level;
      }
      // Secondary class features gate on levels taken in that class
      if (character.secondary_class_id && feature.sourceId === character.secondary_class_id) {
        return feature.levelRequired <= (character.secondary_level || 0);
      }
      return false;
    });
  };

  const characterFeats: CharacterFeat[] = character?.feats || [];

  // Resolve a stored feat entry to displayable text; known feats/invocations
  // look up local data by id, custom entries carry their own text.
  const resolveFeat = (feat: CharacterFeat): { name: string; description: string; badge: string; prerequisite?: string } => {
    if (feat.type === 'feat') {
      const data = getFeatById(feat.id);
      return {
        name: data?.name ?? feat.name ?? feat.id,
        description: data?.description ?? feat.description ?? '',
        badge: 'Feat',
        prerequisite: data?.prerequisite,
      };
    }
    if (feat.type === 'invocation') {
      const data = getInvocationById(feat.id);
      return {
        name: (data?.name ?? feat.name ?? feat.id).replace('Eldritch Invocation: ', ''),
        description: data?.description ?? feat.description ?? '',
        badge: 'Invocation',
      };
    }
    return { name: feat.name ?? 'Custom', description: feat.description ?? '', badge: 'Custom' };
  };

  const handleAddFeat = async (feat: CharacterFeat) => {
    if (!character) return;
    await updateCharacter({ feats: [...characterFeats, feat] });
    showToast(`${resolveFeat(feat).name} added`, 'success');
  };

  const handleRemoveFeat = async (index: number) => {
    if (!character) return;
    const removed = characterFeats[index];
    await updateCharacter({ feats: characterFeats.filter((_, i) => i !== index) });
    showToast(`${resolveFeat(removed).name} removed`, 'success');
  };

  const isWarlock = character?.class_id === 'warlock' || character?.secondary_class_id === 'warlock';
  const warlockLevel = character?.class_id === 'warlock' ? character.level : (character?.secondary_level || 0);
  const invocationsKnownMax = getClassProgression('warlock', warlockLevel)?.customClassData?.invocationsKnown ?? 0;
  const invocationsTaken = characterFeats.filter(f => f.type === 'invocation').length;

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
              {secondaryClass
                ? `${character.class?.name} ${character.level} / ${secondaryClass.name} ${character.secondary_level}`
                : `Level ${character.level} ${character.class?.name}`}
              {character.subclass?.name && ` • ${character.subclass.name}`}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList
            className="border rounded-lg p-1 w-full"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}
          >
            <div className="flex w-full gap-1">
              <TabsTrigger
                value="combat"
                className="spellbook-tab flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md h-[38px] sm:h-[42px]"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden md:inline">Combat</span>
              </TabsTrigger>
              <TabsTrigger
                value="spells"
                className="spellbook-tab flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md h-[38px] sm:h-[42px]"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden md:inline">Spells</span>
              </TabsTrigger>
              <TabsTrigger
                value="feats"
                className="spellbook-tab flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md h-[38px] sm:h-[42px]"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden md:inline">Feats</span>
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="spellbook-tab flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md h-[38px] sm:h-[42px]"
              >
                <Package className="h-4 w-4" />
                <span className="hidden md:inline">Inventory</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="spellbook-tab flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md h-[38px] sm:h-[42px]"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Settings</span>
              </TabsTrigger>
              <Button
                onClick={() => router.push('/')}
                className="btn-accent flex-1 min-w-[70px] justify-center gap-1 sm:gap-2 px-2 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm rounded-md h-[38px] sm:h-[42px]"
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
                      <Hourglass className="mr-1 h-3.5 w-3.5" />
                      Short Rest
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRest('long')}
                      className="btn-accent text-xs"
                    >
                      <Moon className="mr-1 h-3.5 w-3.5" />
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
                    <div className={`text-3xl md:text-5xl font-bold text-white ${character.hp_current <= character.hp_max / 4 ? 'hp-low' : ''}`}>
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
                    const used = (character.ability_uses?.[ability.id] as number) ?? 0;
                    const remaining = ability.maxUses - used;
                    const storedRolls = ability.storesRolls ? getStoredRolls(ability.id) : [];
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
                        {ability.storesRolls ? (
                          <div className="flex gap-2 flex-wrap items-center">
                            {storedRolls.map((roll, i) => (
                              <button
                                key={i}
                                onClick={() =>
                                  handleStoredRollsChange(ability.id, storedRolls.filter((_, idx) => idx !== i))
                                }
                                title="Tap to spend this die"
                                className="spell-slot spell-slot-available w-8 h-8 md:w-9 md:h-9 flex items-center justify-center"
                                style={{ animationDelay: `${i * 200}ms` }}
                              >
                                <span
                                  className="text-xs md:text-sm font-bold"
                                  style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                                >
                                  {roll}
                                </span>
                              </button>
                            ))}
                            {storedRolls.length < ability.maxUses && (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min={1}
                                  max={20}
                                  placeholder="d20"
                                  value={rollInputs[ability.id] ?? ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setRollInputs(prev => ({ ...prev, [ability.id]: e.target.value }))
                                  }
                                  className="w-16 h-8 bg-slate-900/50 border-slate-700 text-white text-center"
                                  aria-label={`Store a ${ability.name} roll`}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={(() => {
                                    const v = parseInt(rollInputs[ability.id] ?? '');
                                    return isNaN(v) || v < 1 || v > 20;
                                  })()}
                                  onClick={() => {
                                    const v = parseInt(rollInputs[ability.id] ?? '');
                                    if (isNaN(v) || v < 1 || v > 20) return;
                                    handleStoredRollsChange(ability.id, [...storedRolls, v]);
                                    setRollInputs(prev => ({ ...prev, [ability.id]: '' }));
                                  }}
                                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-8"
                                >
                                  Store
                                </Button>
                              </div>
                            )}
                            <span className="text-xs text-slate-400 ml-1">
                              {storedRolls.length}/{ability.maxUses} stored
                            </span>
                          </div>
                        ) : ability.maxUses <= 10 ? (
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
                      <div key={stat} className="stat-medallion text-center">
                        <div className="text-slate-400 text-sm mb-1">{stat}</div>
                        <div className="text-xl font-bold text-white">{statValue}</div>
                        <div className="text-accent text-sm">
                          {formatAbilityScore(statValue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

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
                            <div className="text-white font-medium capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </div>
                          </div>
                          <div className="text-accent font-bold">{String(value)}</div>
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
                    <div className="text-accent">{spellcastingModifier >= 0 ? '+' : ''}{spellcastingModifier}</div>
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
                    className="btn-accent"
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

          {/* Feats Tab */}
          <TabsContent value="feats" className="space-y-6">
            {/* Chosen feats & invocations */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-white">Feats & Invocations</CardTitle>
                    <CardDescription className="text-slate-400">
                      {isWarlock
                        ? `Options your character has chosen • ${invocationsTaken}/${invocationsKnownMax} invocations known`
                        : 'Options your character has chosen'}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setFeatDialogType(isWarlock ? 'invocation' : 'feat');
                      setFeatSearch('');
                      setCustomFeatName('');
                      setCustomFeatDescription('');
                      setFeatDialogOpen(true);
                    }}
                    className="btn-accent"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feat
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {characterFeats.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    No feats or invocations yet. Use the Add Feat button when your character gains one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {characterFeats.map((feat, index) => {
                      const resolved = resolveFeat(feat);
                      return (
                        <div key={`${feat.id}-${index}`} className="p-4 bg-slate-900/50 rounded-lg">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-white font-medium">{resolved.name}</h4>
                              <Badge
                                variant="outline"
                                className={
                                  resolved.badge === 'Invocation'
                                    ? 'bg-purple-900/50 border-purple-700 text-purple-300 text-xs'
                                    : resolved.badge === 'Custom'
                                    ? 'bg-slate-700 border-slate-600 text-slate-300 text-xs'
                                    : 'bg-amber-900/50 border-amber-700 text-amber-300 text-xs'
                                }
                              >
                                {resolved.badge}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveFeat(index)}
                              aria-label={`Remove ${resolved.name}`}
                              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-7 w-7 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-slate-400 text-sm whitespace-pre-line">{resolved.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Class & subclass features */}
            {characterFeatures.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Class Features</CardTitle>
                  <CardDescription className="text-slate-400">
                    Features granted automatically by your class and subclass
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
                          <p className="text-slate-400 text-sm whitespace-pre-line">{feature.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
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
                      setNewItemName('');
                      setNewItemQuantity('1');
                      setNewItemNotes('');
                      setItemDialogOpen(true);
                    }}
                    className="btn-accent"
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
                <div className="pt-2 border-t border-slate-700">
                  <Label htmlFor="edit-secondary-class" className="text-white">Multiclass (optional)</Label>
                  <div className="flex gap-3 mt-2">
                    <select
                      id="edit-secondary-class"
                      value={editSecondaryClass}
                      onChange={(e) => {
                        setEditSecondaryClass(e.target.value);
                        if (e.target.value && editSecondaryLevel === 0) setEditSecondaryLevel(1);
                        if (!e.target.value) setEditSecondaryLevel(0);
                      }}
                      className="flex-1 h-9 rounded-md px-3 text-sm bg-slate-900/50 border border-slate-700 text-white"
                    >
                      <option value="">None</option>
                      {dndClasses
                        .filter(c => c.id !== character.class_id)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      max={19}
                      value={editSecondaryLevel}
                      disabled={!editSecondaryClass}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSecondaryLevel(parseInt(e.target.value) || 0)}
                      className="w-24 bg-slate-900/50 border-slate-700 text-white"
                      aria-label="Secondary class level"
                    />
                  </div>
                  <p className="text-slate-400 text-xs mt-2">
                    Adds the class's features and abilities. The Level field above is your {character.class?.name} level; spell slots stay based on it.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (character) {
                        setEditLevel(character.level);
                        setEditMaxHP(character.hp_max);
                        setEditSecondaryClass(character.secondary_class_id || '');
                        setEditSecondaryLevel(character.secondary_level || 0);
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
                      try {
                        await dbUpdateCharacter(characterId, {
                          level: editLevel,
                          hp_max: editMaxHP,
                          secondary_class_id: editSecondaryClass || null,
                          secondary_level: editSecondaryClass ? editSecondaryLevel : 0,
                          spell_slots: calculateSpellSlots(character.class_id, editLevel),
                        });
                        fetchCharacterData();
                        showToast('Character details updated successfully', 'success');
                      } catch (error) {
                        showToast(`Error updating character: ${error instanceof Error ? error.message : error}`, 'error');
                      }
                      setSavingDetails(false);
                    }}
                    disabled={savingDetails}
                    className="btn-accent flex-1"
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
                  {THEMES.map((themeOption) => (
                    <div
                      key={themeOption.id}
                      onClick={() => {
                        setTheme(themeOption.id);
                        applyTheme(themeOption.id);
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

                  try {
                    await dbDeleteCharacter(characterId);
                    router.push('/');
                  } catch (error) {
                    alert(`Error deleting character: ${error instanceof Error ? error.message : error}`);
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

        {/* Add Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Add Item</DialogTitle>
              <DialogDescription className="text-slate-400">
                Add an item to your inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="item-name" className="text-white">Name</Label>
                <Input
                  id="item-name"
                  value={newItemName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemName(e.target.value)}
                  placeholder="e.g. Rope (50 ft)"
                  className="bg-slate-900/50 border-slate-700 text-white mt-2"
                />
              </div>
              <div>
                <Label htmlFor="item-quantity" className="text-white">Quantity</Label>
                <Input
                  id="item-quantity"
                  type="number"
                  min={1}
                  value={newItemQuantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemQuantity(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-white mt-2 w-24"
                />
              </div>
              <div>
                <Label htmlFor="item-notes" className="text-white">Notes (optional)</Label>
                <Input
                  id="item-notes"
                  value={newItemNotes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemNotes(e.target.value)}
                  placeholder="e.g. Hempen, slightly frayed"
                  className="bg-slate-900/50 border-slate-700 text-white mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Cancel
              </Button>
              <Button
                disabled={!newItemName.trim()}
                onClick={() => {
                  const quantity = Math.max(1, parseInt(newItemQuantity) || 1);
                  const newItem = { name: newItemName.trim(), quantity, notes: newItemNotes.trim() };
                  updateCharacter({ inventory: [...character.inventory, newItem] });
                  setItemDialogOpen(false);
                }}
                className="btn-accent"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Feat Dialog */}
        <Dialog open={featDialogOpen} onOpenChange={setFeatDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Add Feat</DialogTitle>
              <DialogDescription className="text-slate-400">
                Pick an option your character has gained, or write your own.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                {([
                  ...(isWarlock ? [['invocation', 'Invocations'] as const] : []),
                  ['feat', 'Feats'] as const,
                  ['custom', 'Custom'] as const,
                ]).map(([type, label]) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => setFeatDialogType(type)}
                    className={`flex-1 ${
                      featDialogType === type ? 'btn-accent' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {featDialogType === 'custom' ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="custom-feat-name" className="text-white">Name</Label>
                    <Input
                      id="custom-feat-name"
                      value={customFeatName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFeatName(e.target.value)}
                      placeholder="e.g. Boon of the Night Mother"
                      className="bg-slate-900/50 border-slate-700 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-feat-description" className="text-white">Description</Label>
                    <textarea
                      id="custom-feat-description"
                      value={customFeatDescription}
                      onChange={(e) => setCustomFeatDescription(e.target.value)}
                      placeholder="What does it do?"
                      rows={4}
                      className="w-full rounded-md px-3 py-2 text-sm bg-slate-900/50 border border-slate-700 text-white mt-2"
                    />
                  </div>
                  <Button
                    disabled={!customFeatName.trim()}
                    onClick={() => {
                      handleAddFeat({
                        id: `custom_${Date.now()}`,
                        type: 'custom',
                        name: customFeatName.trim(),
                        description: customFeatDescription.trim(),
                      });
                      setFeatDialogOpen(false);
                    }}
                    className="btn-accent w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Feat
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={featSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeatSearch(e.target.value)}
                    placeholder={featDialogType === 'invocation' ? 'Search invocations...' : 'Search feats...'}
                    className="bg-slate-900/50 border-slate-700 text-white"
                  />
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-2 pr-2">
                      {featDialogType === 'invocation'
                        ? getInvocations()
                            .filter(inv => !characterFeats.some(f => f.id === inv.id))
                            .filter(inv => inv.name.toLowerCase().includes(featSearch.toLowerCase()))
                            .map(inv => (
                              <div key={inv.id} className="p-3 bg-slate-900/50 rounded-lg">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-white font-medium text-sm">
                                      {inv.name.replace('Eldritch Invocation: ', '')}
                                    </span>
                                    {inv.levelRequired > 1 && (
                                      <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300 text-xs">
                                        Lv. {inv.levelRequired}+
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleAddFeat({ id: inv.id, type: 'invocation' });
                                      setFeatDialogOpen(false);
                                    }}
                                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-7 shrink-0"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-slate-400 text-xs line-clamp-3">{inv.description}</p>
                              </div>
                            ))
                        : dndFeats
                            .filter(feat => !characterFeats.some(f => f.id === feat.id))
                            .filter(feat => feat.name.toLowerCase().includes(featSearch.toLowerCase()))
                            .map(feat => (
                              <div key={feat.id} className="p-3 bg-slate-900/50 rounded-lg">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <span className="text-white font-medium text-sm">{feat.name}</span>
                                    {feat.prerequisite && (
                                      <div className="text-slate-500 text-xs italic">Prerequisite: {feat.prerequisite}</div>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleAddFeat({ id: feat.id, type: 'feat' });
                                      setFeatDialogOpen(false);
                                    }}
                                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-7 shrink-0"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-slate-400 text-xs line-clamp-3">{feat.description}</p>
                              </div>
                            ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Toast Notifications */}
        {toast && <Toast message={toast.message} type={toast.type} />}
      </div>
    </div>
  );
}
