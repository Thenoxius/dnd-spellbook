'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCharacter as dbGetCharacter, updateCharacter as dbUpdateCharacter, listCustomSpells } from '@/lib/db';
import { Character } from '@/types/database';
import { dndSpells, type DndSpell } from '@/data/spells';
import { dndSubclasses } from '@/data/subclasses';
import { getDamageTypeBadgeClasses, getEffectiveSpellDamage, getSpellUpcastText } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Search, Plus, ChevronDown } from 'lucide-react';

const LEVEL_FILTERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export default function SpellLibraryPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [spells, setSpells] = useState<DndSpell[]>([]);
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
    let charResult;
    try {
      charResult = await dbGetCharacter(characterId);
    } catch (error) {
      console.error('Error fetching character:', error);
      setLoading(false);
      return;
    }

    if (charResult) {
      setCharacter(charResult);
    }

    // Bundled spell data plus any homebrew spells stored on this device
    const customSpells = await listCustomSpells().catch(() => []);
    setSpells([...dndSpells, ...customSpells]);
    setLoading(false);
  };

  const toggleSpellPrepared = async (spellId: string) => {
    if (!character) return;

    const isPrepared = character.prepared_spells.includes(spellId);
    const newPreparedSpells = isPrepared
      ? character.prepared_spells.filter(id => id !== spellId)
      : [...character.prepared_spells, spellId];

    try {
      await dbUpdateCharacter(characterId, { prepared_spells: newPreparedSpells });
      setCharacter(prev => prev ? { ...prev, prepared_spells: newPreparedSpells } : null);
    } catch (error) {
      console.error('Error updating prepared spells:', error);
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

    return spells.filter(spell => {
      // Check primary and (if multiclassed) secondary class spell lists
      const inBaseClass =
        spell.baseClassIds.includes(character.class_id) ||
        (!!character.secondary_class_id && spell.baseClassIds.includes(character.secondary_class_id));

      // Check if spell is granted by the subclass at or below the current level
      // (bonus spells stay on the list once gained, so include all levels <= current)
      let inSubclassBonus = false;
      if (character.subclass_id) {
        const subclass = dndSubclasses.find(s => s.id === character.subclass_id);
        if (subclass) {
          inSubclassBonus = Object.entries(subclass.bonusSpells)
            .filter(([grantLevel]) => Number(grantLevel) <= character.level)
            .some(([, spellIds]) => spellIds.includes(spell.id));
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
      <div style={{ background: 'var(--page-bg)' }} className="min-h-screen flex items-center justify-center">
        <div className="text-ink">Loading spell library...</div>
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

  const filteredSpells = getFilteredSpells();
  const preparedCount = character.prepared_spells.length;

  return (
    <div style={{ background: 'var(--page-bg)' }} className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 pb-10 md:px-8">
        {/* Header. Create Spell is an icon action on mobile so it never wraps
            around the title, and grows a label once there is room. */}
        <header className="flex items-start gap-2 pt-4 pb-3 md:pt-8">
          <button
            type="button"
            onClick={() => router.push(`/character/${characterId}?tab=spells`)}
            className="header-action mt-0.5 shrink-0"
            aria-label="Back to character"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="foil-title text-xl font-bold md:text-3xl">Spell Library</h1>
            <p className="text-ink-muted truncate text-sm">
              {character.name} • {preparedCount} prepared
            </p>
          </div>
          <Button
            onClick={() => router.push('/spells/create')}
            aria-label="Create a custom spell"
            className="btn-accent h-11 min-w-11 shrink-0 px-3"
          >
            <Plus className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Create Spell</span>
          </Button>
        </header>

        {/* Search and level filters ride along as you scroll the list. */}
        <div className="toolbar-sticky -mx-4 space-y-2 px-4 py-2.5 md:-mx-8 md:px-8">
          <div className="relative">
            <Search className="text-ink-faint pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search spells..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search spells by name or school"
              className="field h-11 pl-9"
            />
          </div>
          {/* A deliberate horizontal scroller: the chips slide, the page does
              not. Ten levels never fit across a phone in one static row. */}
          <div
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
            role="group"
            aria-label="Filter by spell level"
          >
            <button
              type="button"
              className="chip"
              data-active={filterLevel === 'all'}
              aria-pressed={filterLevel === 'all'}
              onClick={() => setFilterLevel('all')}
            >
              All
            </button>
            {LEVEL_FILTERS.map(level => (
              <button
                key={level}
                type="button"
                className="chip"
                data-active={filterLevel === level}
                aria-pressed={filterLevel === level}
                onClick={() => setFilterLevel(level)}
              >
                {level === 0 ? 'Cantrip' : `Lv ${level}`}
              </button>
            ))}
          </div>
        </div>

        <p className="text-ink-faint py-3 text-xs">
          {filteredSpells.length} {filteredSpells.length === 1 ? 'spell' : 'spells'} available for your class
        </p>

        {/* Natural page scroll — no nested scroll container to fight with. */}
        {filteredSpells.length === 0 ? (
          <div className="row-plate text-ink-muted p-8 text-center text-sm">
            No spells match your filters
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filteredSpells.map(spell => {
              const isPrepared = character.prepared_spells.includes(spell.id);
              const isExpanded = expandedSpells.has(spell.id);
              const damage = getEffectiveSpellDamage(spell, character.level);
              const upcast = getSpellUpcastText(spell);
              return (
                <li key={spell.id} className="row-plate">
                  <div className="flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSpellPrepared(spell.id)}
                      aria-pressed={isPrepared}
                      aria-label={`${isPrepared ? 'Unprepare' : 'Prepare'} ${spell.name}`}
                      className="prep-toggle mt-1 ml-1"
                    >
                      <span className="prep-toggle__box">
                        {isPrepared && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSpellExpansion(spell.id)}
                      aria-expanded={isExpanded}
                      className="min-w-0 flex-1 py-2.5 pr-2 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-ink text-sm leading-snug font-medium break-words">
                          {spell.name}
                        </span>
                        <span className="text-ink-faint mt-0.5 shrink-0 text-[11px] whitespace-nowrap">
                          {spell.level === 0 ? 'Cantrip' : `Lv ${spell.level}`} · {spell.school}
                        </span>
                      </div>
                      <div className="text-ink-muted mt-0.5 truncate text-xs">
                        {spell.castingTime} · {spell.range} · {spell.components}
                      </div>
                      {(damage || spell.concentration || spell.ritual) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
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
                        </div>
                      )}
                    </button>
                    <ChevronDown
                      aria-hidden="true"
                      className={`text-ink-faint mt-3 mr-2 h-4 w-4 shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  {isExpanded && (
                    <div className="border-edge-soft mx-2.5 border-t py-3">
                      <div className="text-ink-muted mb-2 text-xs">
                        <span className="text-ink-faint">Duration:</span> {spell.duration}
                      </div>
                      <p className="text-ink-muted text-sm whitespace-pre-line">{spell.description}</p>
                      {upcast && <p className="text-ink-faint mt-2 text-sm italic">{upcast}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
