'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getCharacter as dbGetCharacter,
  updateCharacter as dbUpdateCharacter,
  deleteCharacter as dbDeleteCharacter,
} from '@/lib/db';
import { THEMES, applyTheme, loadTheme } from '@/lib/theme';
import { Character, SpellSlot, CharacterWithRelations, CharacterFeat } from '@/types/database';
import { calculateModifier, formatModifier, getDamageTypeBadgeClasses, getEffectiveSpellDamage, getSpellUpcastText } from '@/lib/helpers';
import { calculateMulticlassSlots, toStoredSlots } from '@/lib/multiclass';
import { getAllSpellcastingStats } from '@/lib/spellcasting';
import { dndClasses, getClassProgression } from '@/data/classes';
import { dndFeatures } from '@/data/features';
import { EMPTY_CATALOG, loadSpellCatalog, resolveSpells, type SpellCatalog } from '@/lib/spellCatalog';
import { dndSubclasses } from '@/data/subclasses';
import { getClassAbilities } from '@/data/classAbilities';
import { dndFeats, getFeatById, getInvocations, getInvocationById, isInvocationFeature } from '@/data/feats';
import { getRaceById } from '@/data/races';
import { dndSubraces } from '@/data/subraces';
import { dndBackgrounds } from '@/data/backgrounds';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, BookOpen, Shield, Package, Book, Settings, Check, Trash2, Sparkles, X, Moon, Hourglass, ChevronDown } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast, Toast } from '@/components/ui/toast';

/** The dashboard's chapters. Rendered once and shared by the docked mobile bar
 *  and the desktop strip, so the two can never drift apart. */
const NAV_ITEMS = [
  { value: 'combat', label: 'Combat', Icon: Shield },
  { value: 'spells', label: 'Spells', Icon: BookOpen },
  { value: 'feats', label: 'Feats', Icon: Sparkles },
  { value: 'inventory', label: 'Items', Icon: Package },
  { value: 'settings', label: 'Settings', Icon: Settings },
] as const;

/** Spell slots, one row per level. Rendered on both the Combat and Spells
 *  tabs, so it lives here rather than being written out twice. Each orb keeps a
 *  44px tap target while the visible bead stays small. */
function SpellSlotTracker({
  slots,
  togglingSlot,
  onToggle,
}: {
  slots: Record<number, SpellSlot>;
  togglingSlot: string | null;
  onToggle: (level: number, index: number) => void;
}) {
  return (
    <div className="space-y-1">
      {Object.entries(slots).map(([level, slot]: [string, SpellSlot]) => (
        <div key={level} className="flex items-center gap-2">
          <span className="text-ink-muted w-6 shrink-0 text-xs font-semibold">L{level}</span>
          <div className="flex flex-wrap items-center">
            {Array.from({ length: slot.max }).map((_, i) => {
              const spent = i < slot.used;
              return (
                <button
                  key={i}
                  onClick={() => onToggle(parseInt(level), i)}
                  disabled={togglingSlot === `${level}-${i}`}
                  aria-pressed={spent}
                  aria-label={`Level ${level} slot ${i + 1} of ${slot.max}, ${spent ? 'spent' : 'available'}`}
                  className="slot-hit"
                >
                  <span
                    className={`spell-slot h-6 w-6 md:h-7 md:w-7 ${
                      spent ? 'spell-slot-used' : 'spell-slot-available'
                    }`}
                    style={{ animationDelay: `${i * 200}ms` }}
                  >
                    {togglingSlot === `${level}-${i}` && <LoadingSpinner size="sm" />}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-ink-faint ml-auto shrink-0 text-xs tabular-nums">
            {slot.used}/{slot.max}
          </span>
        </div>
      ))}
    </div>
  );
}

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

function CharacterPageContent() {
  const router = useRouter();
  const characterId = useSearchParams().get('id') ?? '';

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
  const [spellCatalog, setSpellCatalog] = useState<SpellCatalog>(EMPTY_CATALOG);
  const { toast, showToast } = useToast();

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

    setSpellCatalog(await loadSpellCatalog());
    setLoading(false);
  };

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

  // Spellcasting statistics come from each class's own configured ability, so
  // the Artificer casts off Intelligence and a non-caster gets nothing at all.
  const totalLevel = character ? character.level + (character.secondary_level || 0) : 1;
  const spellcastingStats = character
    ? getAllSpellcastingStats(character, {
        str: character.str,
        dex: character.dex,
        con: character.con,
        int: character.int,
        wis: character.wis,
        cha: character.cha,
      })
    : [];
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

  // Resolved through the shared catalog so a prepared homebrew spell shows up
  // here too, not just in the library and the shelf count.
  const getPreparedSpells = () =>
    character ? resolveSpells(spellCatalog, character.prepared_spells) : [];

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

  const preparedSpells = getPreparedSpells();
  const characterFeatures = getCharacterFeatures();
  const spellSlotsByLevel = getSpellSlotsByLevel();

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      {/* has-docked-nav reserves exactly the bar's height (plus safe area), so
          the last card always clears it without a magic number here. */}
      <div className="has-docked-nav mx-auto max-w-5xl px-4 pt-4 md:px-8 md:pt-8">
        {/* Header: who you are, plus the one action that leaves this screen.
            Back is a quiet header control so it never reads as a sixth chapter. */}
        <header className="mb-5 flex items-start gap-2 md:mb-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="header-action mt-0.5 shrink-0"
            aria-label="Back to your shelf"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="foil-title text-xl leading-tight font-bold break-words md:text-3xl">
              {character.name}
            </h1>
            <p className="text-ink-muted text-sm md:text-base">
              {secondaryClass
                ? `${character.class?.name} ${character.level} / ${secondaryClass.name} ${character.secondary_level}`
                : `Level ${character.level} ${character.class?.name}`}
              {character.subclass?.name && ` • ${character.subclass.name}`}
            </p>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
          {/* One list, two layouts: a docked bar below md, the chapter strip
              above it. Labels always render, so every destination keeps an
              accessible name at every width. */}
          <TabsList className="app-nav app-nav--docked fixed inset-x-0 bottom-0 z-40 flex h-auto w-full gap-1 rounded-none border-x-0 border-b-0 p-1.5 md:static md:mb-6 md:rounded-xl md:border md:p-1.5">
            {NAV_ITEMS.map(({ value, label, Icon }) => (
              <TabsTrigger key={value} value={value} className="nav-item h-auto">
                <Icon className="h-5 w-5 md:h-4 md:w-4" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Combat Tab */}
          <TabsContent value="combat" className="space-y-4 md:space-y-6">
            {/* The command surface: the two things you reach for mid-fight sit
                side by side on wide screens instead of stacking into two very
                wide, half-empty cards. */}
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              {/* HP carries the heaviest plate on the screen. */}
              <Card className="tome-panel tome-panel--primary">
                <CardHeader>
                  <CardTitle className="text-ink">Hit Points</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center gap-1 md:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHPChange(-10)}
                      disabled={updatingHP}
                      aria-label="Lose 10 hit points"
                      className="btn-quiet h-11 min-w-11 text-xs md:text-sm"
                    >
                      {updatingHP ? <LoadingSpinner size="sm" /> : '-10'}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleHPChange(-1)}
                      disabled={updatingHP}
                      aria-label="Lose 1 hit point"
                      className="btn-quiet h-11 min-w-11"
                    >
                      {updatingHP ? <LoadingSpinner size="sm" /> : <Minus className="h-5 w-5" />}
                    </Button>
                    <div className="flex-1 px-2 text-center">
                      <div
                        className={`text-4xl leading-none font-bold md:text-5xl ${
                          character.hp_current <= character.hp_max / 4 ? 'hp-low' : 'text-ink'
                        }`}
                      >
                        {character.hp_current}
                      </div>
                      <div className="text-ink-muted mt-1 text-sm">of {character.hp_max}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleHPChange(1)}
                      disabled={updatingHP}
                      aria-label="Regain 1 hit point"
                      className="btn-quiet h-11 min-w-11"
                    >
                      {updatingHP ? <LoadingSpinner size="sm" /> : <Plus className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHPChange(10)}
                      disabled={updatingHP}
                      aria-label="Regain 10 hit points"
                      className="btn-quiet h-11 min-w-11 text-xs md:text-sm"
                    >
                      {updatingHP ? <LoadingSpinner size="sm" /> : '+10'}
                    </Button>
                  </div>

                  {/* Temp HP: a secondary pool, so it reads quieter than the
                      main number but keeps full-size controls. */}
                  <div className="border-edge-soft flex items-center justify-between gap-3 border-t pt-3">
                    <div>
                      <div className="text-ink-muted text-sm">Temp HP</div>
                      <div className="text-accent text-2xl leading-none font-bold">
                        {character.temp_hp || 0}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newTempHP = Math.max(0, (character.temp_hp || 0) - 1);
                          updateCharacter({ temp_hp: newTempHP });
                        }}
                        aria-label="Remove 1 temporary hit point"
                        className="btn-quiet h-11 min-w-11"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newTempHP = (character.temp_hp || 0) + 1;
                          updateCharacter({ temp_hp: newTempHP });
                        }}
                        aria-label="Add 1 temporary hit point"
                        className="btn-quiet h-11 min-w-11"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Rests get their own full-width row rather than crowding
                      the card heading. */}
                  <div className="border-edge-soft grid grid-cols-2 gap-2 border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRest('short')}
                      className="btn-quiet h-11"
                    >
                      <Hourglass className="mr-1.5 h-4 w-4" />
                      Short Rest
                    </Button>
                    <Button size="sm" onClick={() => handleRest('long')} className="btn-accent h-11">
                      <Moon className="mr-1.5 h-4 w-4" />
                      Long Rest
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Spell Slots — one row per level so narrow screens never have
                  to scroll sideways, and every orb gets a 44px tap target. */}
              {Object.keys(spellSlotsByLevel).length > 0 && (
                <Card className="tome-panel">
                  <CardHeader>
                    <CardTitle className="text-ink">Spell Slots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SpellSlotTracker
                      slots={spellSlotsByLevel}
                      togglingSlot={togglingSlot}
                      onToggle={handleSpellSlotToggle}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Class Abilities (limited-use) */}
            {classAbilities.length > 0 && (
              <Card className="tome-panel">
                <CardHeader>
                  <CardTitle className="text-ink">Class Abilities</CardTitle>
                  <CardDescription className="text-ink-muted">
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
                            <span className="text-ink font-medium">{ability.name}</span>
                            {ability.linkedStat && (
                              <Badge variant="outline" className="tag tag--concentration">
                                {ability.linkedStat.toUpperCase()} linked
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-surface-raised border-edge text-ink-muted text-xs">
                            {ability.recharge === 'short' ? 'Short Rest' : 'Long Rest'}
                          </Badge>
                        </div>
                        {ability.storesRolls ? (
                          <div className="flex flex-wrap items-center gap-y-1">
                            {storedRolls.map((roll, i) => (
                              <button
                                key={i}
                                onClick={() =>
                                  handleStoredRollsChange(ability.id, storedRolls.filter((_, idx) => idx !== i))
                                }
                                aria-label={`Spend the stored ${roll}`}
                                className="slot-hit"
                              >
                                <span
                                  className="spell-slot spell-slot-available h-8 w-8 md:h-9 md:w-9"
                                  style={{ animationDelay: `${i * 200}ms` }}
                                >
                                  {/* The orb is filled with the theme accent, so the
                                      numeral takes the accent's own foreground —
                                      white would vanish on the amber theme. */}
                                  <span
                                    className="text-xs font-bold md:text-sm"
                                    style={{ color: 'var(--brand-ink)' }}
                                  >
                                    {roll}
                                  </span>
                                </span>
                              </button>
                            ))}
                            {storedRolls.length < ability.maxUses && (
                              <div className="ml-1 flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min={1}
                                  max={20}
                                  placeholder="d20"
                                  value={rollInputs[ability.id] ?? ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setRollInputs(prev => ({ ...prev, [ability.id]: e.target.value }))
                                  }
                                  className="field h-11 w-16 text-center"
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
                                  className="btn-quiet h-11"
                                >
                                  Store
                                </Button>
                              </div>
                            )}
                            <span className="text-ink-faint ml-2 text-xs">
                              {storedRolls.length}/{ability.maxUses} stored
                            </span>
                          </div>
                        ) : ability.maxUses <= 10 ? (
                          <div className="flex flex-wrap items-center">
                            {Array.from({ length: ability.maxUses }).map((_, i) => {
                              const spent = i < used;
                              return (
                                <button
                                  key={i}
                                  onClick={() =>
                                    handleAbilityUseChange(ability.id, spent ? used - 1 : used + 1, ability.maxUses)
                                  }
                                  aria-pressed={spent}
                                  aria-label={`${ability.name} use ${i + 1} of ${ability.maxUses}, ${
                                    spent ? 'spent' : 'available'
                                  }`}
                                  className="slot-hit"
                                >
                                  <span
                                    className={`spell-slot h-5 w-5 md:h-6 md:w-6 ${
                                      spent ? 'spell-slot-used' : 'spell-slot-available'
                                    }`}
                                    style={{ animationDelay: `${i * 200}ms` }}
                                  />
                                </button>
                              );
                            })}
                            <span className="text-ink-faint ml-2 text-xs tabular-nums">
                              {remaining}/{ability.maxUses}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbilityUseChange(ability.id, used + 1, ability.maxUses)}
                              disabled={remaining <= 0}
                              aria-label={`Spend one use of ${ability.name}`}
                              className="btn-quiet h-11 min-w-11"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="min-w-[70px] text-center">
                              <span className="text-accent text-xl font-bold">{remaining}</span>
                              <span className="text-ink-muted text-sm"> / {ability.maxUses}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbilityUseChange(ability.id, used - 1, ability.maxUses)}
                              disabled={used <= 0}
                              aria-label={`Restore one use of ${ability.name}`}
                              className="btn-quiet h-11 min-w-11"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <p className="text-ink-muted mt-2 text-sm">{ability.description}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Ability Scores — reference material, so the plate is quiet and
                the modifier (the number you actually roll with) leads. */}
            <Card className="tome-panel tome-panel--quiet">
              <CardHeader>
                <CardTitle className="text-ink">Ability Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:gap-3">
                  {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((stat) => {
                    const statValue = character[stat.toLowerCase() as keyof Character] as number;
                    const modifier = calculateModifier(statValue);
                    return (
                      <div key={stat} className="stat-medallion text-center">
                        <div className="text-ink-faint text-[11px] tracking-[0.08em]">{stat}</div>
                        <div className="text-accent text-xl leading-tight font-bold">
                          {modifier >= 0 ? '+' : ''}{modifier}
                        </div>
                        <div className="text-ink-muted text-xs">{statValue}</div>
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
                <Card className="tome-panel tome-panel--quiet">
                  <CardHeader>
                    <CardTitle className="text-ink">Class Progressions</CardTitle>
                    <CardDescription className="text-ink-muted">
                      Abilities and resources gained at your current level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(progression.customClassData).map(([key, value]) => (
                        <div key={key} className="row-plate flex items-center justify-between gap-3 p-3">
                          <div className="text-ink text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </div>
                          <div className="text-accent font-bold tabular-nums">{String(value)}</div>
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
            {/* Spellcasting statistics, one block per casting class. A
                character who casts nothing gets no block at all rather than a
                misleading save DC. */}
            {spellcastingStats.length > 0 && (
              <Card className="tome-panel">
                <CardContent className="space-y-4 pt-6">
                  {spellcastingStats.map((stats) => (
                    <div key={stats.classId}>
                      {spellcastingStats.length > 1 && (
                        <h3 className="text-ink-faint mb-2 text-xs tracking-[0.08em] uppercase">
                          {stats.className}
                        </h3>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                        <div>
                          <div className="text-ink-muted text-xs">Ability</div>
                          <div className="text-ink text-xl font-bold">{stats.ability}</div>
                          <div className="text-accent text-sm">{formatModifier(stats.abilityModifier)}</div>
                        </div>
                        <div>
                          <div className="text-ink-muted text-xs">Spell Save DC</div>
                          <div className="text-ink text-xl font-bold">{stats.spellSaveDC}</div>
                          <div className="text-ink-faint text-xs">
                            8 + {stats.proficiencyBonus} {formatModifier(stats.abilityModifier)}
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted text-xs">Spell Attack</div>
                          <div className="text-ink text-xl font-bold">
                            {formatModifier(stats.spellAttackModifier)}
                          </div>
                          <div className="text-ink-faint text-xs">
                            {stats.proficiencyBonus} {formatModifier(stats.abilityModifier)}
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted text-xs">Proficiency</div>
                          <div className="text-ink text-xl font-bold">+{stats.proficiencyBonus}</div>
                          <div className="text-ink-faint text-xs">Level {totalLevel}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Spell Slots */}
            {Object.keys(spellSlotsByLevel).length > 0 && (
              <Card className="tome-panel">
                <CardHeader>
                  <CardTitle className="text-ink">Spell Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <SpellSlotTracker
                    slots={spellSlotsByLevel}
                    togglingSlot={togglingSlot}
                    onToggle={handleSpellSlotToggle}
                  />
                </CardContent>
              </Card>
            )}

            <Card className="tome-panel">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-ink">Prepared Spells</CardTitle>
                    <CardDescription className="text-ink-muted">
                      {preparedSpells.length} spells prepared
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => router.push(`/character/spells?id=${characterId}`)}
                    className="btn-accent h-11 shrink-0"
                  >
                    <Book className="mr-2 h-4 w-4" />
                    Spell Library
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {preparedSpells.length === 0 ? (
                  <div className="text-ink-muted py-8 text-center text-sm">
                    No spells prepared. Visit the Spell Library to prepare spells.
                  </div>
                ) : (
                  /* Grouped by level and scrolled by the page itself — a fixed
                     600px window inside a scrolling page is two scrollbars
                     fighting over the same gesture. */
                  <div className="space-y-4">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                      const levelSpells = preparedSpells.filter(s => s.level === level);
                      if (levelSpells.length === 0) return null;
                      return (
                        <section key={level}>
                          <h3 className="text-ink-faint mb-2 text-xs tracking-[0.08em] uppercase">
                            {level === 0 ? 'Cantrips' : `Level ${level}`}
                          </h3>
                          <ul className="space-y-1.5">
                            {levelSpells.map(spell => {
                              const isExpanded = expandedSpells.has(spell.id);
                              const damage = getEffectiveSpellDamage(spell, character.level);
                              const upcast = getSpellUpcastText(spell);
                              return (
                                <li key={spell.id} className="row-plate">
                                  <button
                                    type="button"
                                    onClick={() => toggleSpellExpansion(spell.id)}
                                    aria-expanded={isExpanded}
                                    className="flex w-full items-start gap-2 p-2.5 text-left"
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="text-ink block text-sm leading-snug font-medium break-words">
                                        {spell.name}
                                      </span>
                                      <span className="text-ink-muted mt-0.5 block truncate text-xs">
                                        {spell.school} · {spell.castingTime} · {spell.range}
                                      </span>
                                      {(damage || spell.concentration || spell.ritual) && (
                                        <span className="mt-1.5 flex flex-wrap items-center gap-1">
                                          {damage && (
                                            <Badge variant="outline" className={getDamageTypeBadgeClasses(spell.damageType)}>
                                              {damage} {spell.damageType}
                                            </Badge>
                                          )}
                                          {spell.concentration && (
                                            <Badge variant="outline" className="tag tag--concentration">
                                              Concentration
                                            </Badge>
                                          )}
                                          {spell.ritual && (
                                            <Badge variant="outline" className="tag tag--ritual">
                                              Ritual
                                            </Badge>
                                          )}
                                        </span>
                                      )}
                                    </span>
                                    <ChevronDown
                                      aria-hidden="true"
                                      className={`text-ink-faint mt-1 h-4 w-4 shrink-0 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </button>
                                  {isExpanded && (
                                    <div className="border-edge-soft mx-2.5 border-t py-3">
                                      <div className="text-ink-muted mb-2 grid gap-1 text-xs sm:grid-cols-2">
                                        <div>
                                          <span className="text-ink-faint">Components:</span> {spell.components}
                                        </div>
                                        <div>
                                          <span className="text-ink-faint">Duration:</span> {spell.duration}
                                        </div>
                                      </div>
                                      <p className="text-ink-muted text-sm whitespace-pre-line">
                                        {spell.description}
                                      </p>
                                      {upcast && (
                                        <p className="text-ink-faint mt-2 text-sm italic">{upcast}</p>
                                      )}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feats Tab */}
          <TabsContent value="feats" className="space-y-6">
            {/* Chosen feats & invocations */}
            <Card className="tome-panel">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-ink">Feats & Invocations</CardTitle>
                    <CardDescription className="text-ink-muted">
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
                    className="btn-accent h-11"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feat
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {characterFeats.length === 0 ? (
                  <div className="text-center text-ink-muted py-8">
                    No feats or invocations yet. Use the Add Feat button when your character gains one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {characterFeats.map((feat, index) => {
                      const resolved = resolveFeat(feat);
                      return (
                        <div key={`${feat.id}-${index}`} className="row-plate p-4">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-ink font-medium">{resolved.name}</h4>
                              <Badge
                                variant="outline"
                                className={
                                  resolved.badge === 'Invocation'
                                    ? 'tag tag--concentration'
                                    : resolved.badge === 'Custom'
                                    ? 'bg-surface-raised border-edge text-ink-muted text-xs'
                                    : 'tag tag--feat'
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
                              className="btn-quiet h-11 w-11 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-ink-muted text-sm whitespace-pre-line">{resolved.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Class & subclass features */}
            {characterFeatures.length > 0 && (
              <Card className="tome-panel">
                <CardHeader>
                  <CardTitle className="text-ink">Class Features</CardTitle>
                  <CardDescription className="text-ink-muted">
                    Features granted automatically by your class and subclass
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {characterFeatures.map((feature) => (
                      <div key={feature.id} className="row-plate p-3">
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <h4 className="text-ink text-sm font-medium break-words">{feature.name}</h4>
                          <Badge variant="outline" className="tag shrink-0">
                            Lv. {feature.levelRequired}
                          </Badge>
                        </div>
                        <p className="text-ink-muted text-sm whitespace-pre-line">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card className="tome-panel">
              <CardHeader>
                <CardTitle className="text-ink">Currency</CardTitle>
              </CardHeader>
              <CardContent>
                {/* One coin per row on a phone: a stepper either side of an
                    editable field needs ~150px, which five columns never give. */}
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map(currency => (
                    <div key={currency} className="flex items-center gap-2">
                      <label
                        htmlFor={`currency-${currency}`}
                        className="text-ink-muted w-7 shrink-0 text-xs font-semibold uppercase"
                      >
                        {currency}
                      </label>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`One fewer ${currency.toUpperCase()}`}
                        onClick={() => {
                          const newCurrency = { ...character.currency };
                          newCurrency[currency] = Math.max(0, newCurrency[currency] - 1);
                          updateCharacter({ currency: newCurrency });
                        }}
                        className="btn-quiet h-11 w-11 shrink-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        id={`currency-${currency}`}
                        type="number"
                        value={character.currency[currency]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = parseInt(e.target.value) || 0;
                          const newCurrency = { ...character.currency };
                          newCurrency[currency] = Math.max(0, value);
                          updateCharacter({ currency: newCurrency });
                        }}
                        className="field h-11 min-w-0 flex-1 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`One more ${currency.toUpperCase()}`}
                        onClick={() => {
                          const newCurrency = { ...character.currency };
                          newCurrency[currency] = newCurrency[currency] + 1;
                          updateCharacter({ currency: newCurrency });
                        }}
                        className="btn-quiet h-11 w-11 shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="tome-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-ink">Inventory</CardTitle>
                    <CardDescription className="text-ink-muted">
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
                    className="btn-accent h-11"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {character.inventory.length === 0 ? (
                  <div className="text-center text-ink-muted py-8">
                    No items in inventory
                  </div>
                ) : (
                  <div className="space-y-2">
                    {character.inventory.map((item, index) => (
                      <div key={index} className="row-plate flex items-start justify-between gap-2 p-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-ink text-sm font-medium break-words">{item.name}</h4>
                          {item.notes && (
                            <p className="text-ink-muted mt-0.5 text-xs break-words">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={
                              item.quantity > 1 ? `One fewer ${item.name}` : `Remove ${item.name}`
                            }
                            onClick={() => {
                              const newInventory = [...character.inventory];
                              if (newInventory[index].quantity > 1) {
                                newInventory[index].quantity--;
                              } else {
                                newInventory.splice(index, 1);
                              }
                              updateCharacter({ inventory: newInventory });
                            }}
                            className="btn-quiet h-11 w-11"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-ink min-w-[2.5rem] text-center text-sm tabular-nums">
                            ×{item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`One more ${item.name}`}
                            onClick={() => {
                              const newInventory = [...character.inventory];
                              newInventory[index].quantity++;
                              updateCharacter({ inventory: newInventory });
                            }}
                            className="btn-quiet h-11 w-11"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
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
            <Card className="tome-panel">
              <CardHeader>
                <CardTitle className="text-ink">Character Details</CardTitle>
                <CardDescription className="text-ink-muted">
                  Update your character's level and maximum HP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-level" className="text-ink">Level</Label>
                  <Input
                    id="edit-level"
                    type="number"
                    value={editLevel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLevel(parseInt(e.target.value) || 0)}
                    className="field mt-2 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max-hp" className="text-ink">Max HP</Label>
                  <Input
                    id="edit-max-hp"
                    type="number"
                    value={editMaxHP}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditMaxHP(parseInt(e.target.value) || 0)}
                    className="field mt-2 h-11"
                  />
                </div>
                <div className="pt-2 border-edge-soft border-t">
                  <Label htmlFor="edit-secondary-class" className="text-ink">Multiclass (optional)</Label>
                  <div className="flex gap-3 mt-2">
                    <select
                      id="edit-secondary-class"
                      value={editSecondaryClass}
                      onChange={(e) => {
                        setEditSecondaryClass(e.target.value);
                        if (e.target.value && editSecondaryLevel === 0) setEditSecondaryLevel(1);
                        if (!e.target.value) setEditSecondaryLevel(0);
                      }}
                      className="field h-11 flex-1 rounded-md border px-3 text-sm"
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
                      className="field h-11 w-24"
                      aria-label="Secondary class level"
                    />
                  </div>
                  <p className="text-ink-muted text-xs mt-2">
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
                    className="btn-quiet h-11 flex-1"
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
                          // Both classes, PHB multiclass rules, and slots
                          // already spent are carried over rather than reset.
                          spell_slots: toStoredSlots(
                            calculateMulticlassSlots([
                              { classId: character.class_id, level: editLevel },
                              { classId: editSecondaryClass, level: editSecondaryClass ? editSecondaryLevel : 0 },
                            ]).spellSlots,
                            character.spell_slots
                          ),
                        });
                        fetchCharacterData();
                        showToast('Character details updated successfully', 'success');
                      } catch (error) {
                        showToast(`Error updating character: ${error instanceof Error ? error.message : error}`, 'error');
                      }
                      setSavingDetails(false);
                    }}
                    disabled={savingDetails}
                    className="btn-accent h-11 flex-1"
                  >
                    {savingDetails ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme Customization Card */}
            <Card className="tome-panel">
              <CardHeader>
                <CardTitle className="text-ink">Theme Customization</CardTitle>
                <CardDescription className="text-ink-muted">
                  Choose your preferred visual theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Named swatches: the theme's name is readable text rather than
                    a tooltip, and the selected one is marked with a check as
                    well as a border. */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {THEMES.map((themeOption) => {
                    const selected = theme === themeOption.id;
                    return (
                      <button
                        key={themeOption.id}
                        type="button"
                        onClick={() => {
                          setTheme(themeOption.id);
                          applyTheme(themeOption.id);
                        }}
                        aria-pressed={selected}
                        data-selected={selected}
                        className="theme-swatch"
                      >
                        <span
                          className="theme-swatch__chip"
                          style={{
                            background: `linear-gradient(135deg, ${themeOption.from}, ${themeOption.to})`,
                            borderLeft: `3px solid ${themeOption.accent}`,
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">{themeOption.name}</span>
                        {selected && <Check className="text-accent h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone Card */}
            <Card className="tome-panel tome-panel--danger">
              <CardHeader>
                <CardTitle className="text-danger">Danger Zone</CardTitle>
                <CardDescription className="text-ink-muted">
                  Irreversible actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="btn-danger h-11"
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
          <DialogContent className="dialog-panel">
            <DialogHeader>
              <DialogTitle className="text-danger">Delete Character</DialogTitle>
              <DialogDescription className="text-ink-muted">
                Are you sure you want to delete {character?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="delete-confirm" className="text-ink">
                  Type <span className="text-danger font-bold">{character?.name}</span> to confirm
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
          <DialogContent className="dialog-panel">
            <DialogHeader>
              <DialogTitle className="text-ink">Add Item</DialogTitle>
              <DialogDescription className="text-ink-muted">
                Add an item to your inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="item-name" className="text-ink">Name</Label>
                <Input
                  id="item-name"
                  value={newItemName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemName(e.target.value)}
                  placeholder="e.g. Rope (50 ft)"
                  className="field mt-2 h-11"
                />
              </div>
              <div>
                <Label htmlFor="item-quantity" className="text-ink">Quantity</Label>
                <Input
                  id="item-quantity"
                  type="number"
                  min={1}
                  value={newItemQuantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemQuantity(e.target.value)}
                  className="field mt-2 h-11 w-24"
                />
              </div>
              <div>
                <Label htmlFor="item-notes" className="text-ink">Notes (optional)</Label>
                <Input
                  id="item-notes"
                  value={newItemNotes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemNotes(e.target.value)}
                  placeholder="e.g. Hempen, slightly frayed"
                  className="field mt-2 h-11"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
                className="btn-quiet h-11"
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
                className="btn-accent h-11"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Feat Dialog */}
        <Dialog open={featDialogOpen} onOpenChange={setFeatDialogOpen}>
          <DialogContent className="dialog-panel max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-ink">Add Feat</DialogTitle>
              <DialogDescription className="text-ink-muted">
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
                      featDialogType === type ? 'btn-accent' : 'btn-quiet'
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {featDialogType === 'custom' ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="custom-feat-name" className="text-ink">Name</Label>
                    <Input
                      id="custom-feat-name"
                      value={customFeatName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFeatName(e.target.value)}
                      placeholder="e.g. Boon of the Night Mother"
                      className="field mt-2 h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-feat-description" className="text-ink">Description</Label>
                    <textarea
                      id="custom-feat-description"
                      value={customFeatDescription}
                      onChange={(e) => setCustomFeatDescription(e.target.value)}
                      placeholder="What does it do?"
                      rows={4}
                      className="w-full rounded-md px-3 py-2 text-sm field border mt-2"
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
                    className="btn-accent h-11 w-full"
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
                    className="field h-11"
                  />
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-2 pr-2">
                      {featDialogType === 'invocation'
                        ? getInvocations()
                            .filter(inv => !characterFeats.some(f => f.id === inv.id))
                            .filter(inv => inv.name.toLowerCase().includes(featSearch.toLowerCase()))
                            .map(inv => (
                              <div key={inv.id} className="row-plate p-3">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-ink font-medium text-sm">
                                      {inv.name.replace('Eldritch Invocation: ', '')}
                                    </span>
                                    {inv.levelRequired > 1 && (
                                      <Badge variant="outline" className="bg-surface-raised border-edge text-ink-muted text-xs">
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
                                    className="btn-quiet h-7 shrink-0"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-ink-muted text-xs line-clamp-3">{inv.description}</p>
                              </div>
                            ))
                        : dndFeats
                            .filter(feat => !characterFeats.some(f => f.id === feat.id))
                            .filter(feat => feat.name.toLowerCase().includes(featSearch.toLowerCase()))
                            .map(feat => (
                              <div key={feat.id} className="row-plate p-3">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <span className="text-ink font-medium text-sm">{feat.name}</span>
                                    {feat.prerequisite && (
                                      <div className="text-ink-faint text-xs italic">Prerequisite: {feat.prerequisite}</div>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleAddFeat({ id: feat.id, type: 'feat' });
                                      setFeatDialogOpen(false);
                                    }}
                                    className="btn-quiet h-7 shrink-0"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-ink-muted text-xs line-clamp-3">{feat.description}</p>
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

export default function CharacterPage() {
  return (
    <Suspense fallback={<PageFallback label="Loading character..." />}>
      <CharacterPageContent />
    </Suspense>
  );
}
