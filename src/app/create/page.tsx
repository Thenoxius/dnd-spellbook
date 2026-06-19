'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Class, Race, Background, Subclass, Subrace, AbilityScoreName, SUBCLASS_LEVEL_REQUIREMENTS } from '@/types/database';
import { calculateMaxHP, calculateSpellSlots, applyStatBonuses, formatAbilityScore } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Plus, Minus } from 'lucide-react';

type Step = 1 | 2 | 3;

export default function CreateCharacterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Data from database
  const [classes, setClasses] = useState<Class[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [subraces, setSubraces] = useState<Subrace[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [subclasses, setSubclasses] = useState<Subclass[]>([]);

  // Character data
  const [name, setName] = useState('');

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
    fetchReferenceData();
  }, []);
  const [stats, setStats] = useState<Record<AbilityScoreName, number>>({
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
  });
  const [raceId, setRaceId] = useState('');
  const [subraceId, setSubraceId] = useState('');
  const [backgroundId, setBackgroundId] = useState('');
  const [classId, setClassId] = useState('');
  const [level, setLevel] = useState(1);
  const [subclassId, setSubclassId] = useState('');

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    const [classesData, racesData, subracesData, backgroundsData, subclassesData] = await Promise.all([
      supabase.from('classes').select('*'),
      supabase.from('races').select('*'),
      supabase.from('subraces').select('*'),
      supabase.from('backgrounds').select('*'),
      supabase.from('subclasses').select('*'),
    ]);

    if (classesData.data) setClasses(classesData.data);
    if (racesData.data) setRaces(racesData.data);
    if (subracesData.data) {
      setSubraces(subracesData.data);
      console.log('Subraces loaded:', subracesData.data);
    } else {
      console.error('No subraces data:', subracesData.error);
    }
    if (backgroundsData.data) setBackgrounds(backgroundsData.data);
    if (subclassesData.data) setSubclasses(subclassesData.data);
  };

  const selectedRace = races.find(r => r.id === raceId);
  const selectedSubrace = subraces.find(s => s.id === subraceId);
  const selectedClass = classes.find(c => c.id === classId);
  const selectedBackground = backgrounds.find(b => b.id === backgroundId);
  const selectedSubclass = subclasses.find(s => s.id === subclassId);

  // Calculate stats with racial bonuses
  let adjustedStats = stats;
  if (selectedRace) {
    const raceBonuses = typeof selectedRace.stat_bonuses === 'string' ? JSON.parse(selectedRace.stat_bonuses) : selectedRace.stat_bonuses;
    adjustedStats = applyStatBonuses(adjustedStats, raceBonuses);
  }
  if (selectedSubrace) {
    const subraceBonuses = typeof selectedSubrace.stat_bonuses === 'string' ? JSON.parse(selectedSubrace.stat_bonuses) : selectedSubrace.stat_bonuses;
    adjustedStats = applyStatBonuses(adjustedStats, subraceBonuses);
  }

  // Check if subclass selection should be shown
  const showSubclassSelection = selectedClass && level >= (SUBCLASS_LEVEL_REQUIREMENTS[selectedClass.id] || 3);
  const availableSubclasses = selectedClass ? subclasses.filter(s => s.class_id === selectedClass.id) : [];

  const handleStatChange = (stat: AbilityScoreName, delta: number) => {
    setStats(prev => ({
      ...prev,
      [stat]: Math.max(1, Math.min(20, prev[stat] + delta)),
    }));
  };

  const handleNext = () => {
    if (step < 3) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    if (!name || !raceId || !backgroundId || !classId) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    const hpMax = calculateMaxHP(classId, level, adjustedStats.CON);
    const spellSlots = calculateSpellSlots(classId, level);

    const { data, error } = await supabase.from('characters').insert({
      name,
      level,
      hp_current: hpMax,
      hp_max: hpMax,
      temp_hp: 0,
      class_id: classId,
      subclass_id: subclassId || null,
      race_id: raceId,
      subrace_id: subraceId || null,
      background_id: backgroundId,
      str: adjustedStats.STR,
      dex: adjustedStats.DEX,
      con: adjustedStats.CON,
      int: adjustedStats.INT,
      wis: adjustedStats.WIS,
      cha: adjustedStats.CHA,
      spell_slots: spellSlots,
      prepared_spells: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      inventory: [],
    }).select().single();

    setLoading(false);

    if (error) {
      console.error('Error creating character:', error);
      alert(`Error creating character: ${error.message}`);
    } else {
      router.push(`/character/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Create Character</h1>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              {step === 1 && 'Step 1: Basic Info & Stats'}
              {step === 2 && 'Step 2: Race & Background'}
              {step === 3 && 'Step 3: Class & Level'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {step === 1 && 'Enter your character name and ability scores'}
              {step === 2 && 'Choose your race and background'}
              {step === 3 && 'Select your class and level'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div>
                  <Label htmlFor="name" className="text-white">Character Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter character name"
                    className="bg-slate-900/50 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-white">Ability Scores</Label>
                  {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as AbilityScoreName[]).map((stat) => (
                    <div key={stat} className="flex items-center gap-4">
                      <Label className="w-12 text-white">{stat}</Label>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleStatChange(stat, -1)}
                        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <div className="text-2xl font-bold text-white">{stats[stat]}</div>
                        <div className="text-sm text-slate-400">{formatAbilityScore(stats[stat])}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleStatChange(stat, 1)}
                        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <Label htmlFor="race" className="text-white">Race</Label>
                  <Select value={raceId} onValueChange={(value) => {
                    setRaceId(value || '');
                    setSubraceId(''); // Reset subrace when race changes
                  }}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select a race" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {races.map((race) => (
                        <SelectItem key={race.id} value={race.id} className="text-white">
                          {race.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRace && (
                    <div className="mt-2 text-sm text-slate-400">
                      <div>Stat Bonuses: {Object.entries(typeof selectedRace.stat_bonuses === 'string' ? JSON.parse(selectedRace.stat_bonuses) : selectedRace.stat_bonuses).map(([k, v]) => `${k} +${v}`).join(', ')}</div>
                      {(() => {
                        const grantedSpells = typeof selectedRace.granted_spells === 'string' ? JSON.parse(selectedRace.granted_spells) : selectedRace.granted_spells;
                        return grantedSpells.length > 0 && (
                          <div>Granted Spells: {grantedSpells.join(', ')}</div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {selectedRace && (
                  <div>
                    <Label htmlFor="subrace" className="text-white">Subrace (Optional)</Label>
                    <Select value={subraceId} onValueChange={(value) => setSubraceId(value || '')}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                        <SelectValue placeholder="Select a subrace" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="" className="text-white">None</SelectItem>
                        {subraces.filter(s => s.race_id === raceId).map((subrace) => (
                          <SelectItem key={subrace.id} value={subrace.id} className="text-white">
                            {subrace.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSubrace && (
                      <div className="mt-2 text-sm text-slate-400">
                        <div>Stat Bonuses: {Object.entries(typeof selectedSubrace.stat_bonuses === 'string' ? JSON.parse(selectedSubrace.stat_bonuses) : selectedSubrace.stat_bonuses).map(([k, v]) => `${k} +${v}`).join(', ')}</div>
                        {(() => {
                          const grantedSpells = typeof selectedSubrace.granted_spells === 'string' ? JSON.parse(selectedSubrace.granted_spells) : selectedSubrace.granted_spells;
                          return grantedSpells.length > 0 && (
                            <div>Granted Spells: {grantedSpells.join(', ')}</div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="background" className="text-white">Background</Label>
                  <Select value={backgroundId} onValueChange={(value) => setBackgroundId(value || '')}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select a background" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {backgrounds.map((bg) => (
                        <SelectItem key={bg.id} value={bg.id} className="text-white">
                          {bg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBackground && (
                    <div className="mt-2 text-sm text-slate-400">
                      <div>Skills: {selectedBackground.skills.join(', ')}</div>
                      <div>Feature: {selectedBackground.feature_name}</div>
                    </div>
                  )}
                </div>
                {selectedRace && (
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <Label className="text-white mb-2 block">Stats Preview (with racial bonuses)</Label>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as AbilityScoreName[]).map((stat) => (
                        <div key={stat} className="text-center">
                          <div className="text-white font-medium">{stat}</div>
                          <div className="text-purple-400">{formatAbilityScore(adjustedStats[stat])}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label htmlFor="class" className="text-white">Class</Label>
                  <Select value={classId} onValueChange={(value) => setClassId(value || '')}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id} className="text-white">
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="level" className="text-white">Level</Label>
                  <Select value={level.toString()} onValueChange={(v) => setLevel(v ? parseInt(v) : 1)}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                        <SelectItem key={lvl} value={lvl.toString()} className="text-white">
                          Level {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {showSubclassSelection && availableSubclasses.length > 0 && (
                  <div>
                    <Label htmlFor="subclass" className="text-white">Subclass (Optional)</Label>
                    <Select value={subclassId} onValueChange={(value) => setSubclassId(value || '')}>
                      <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                        <SelectValue placeholder="Select a subclass" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="" className="text-white">None</SelectItem>
                        {availableSubclasses.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id} className="text-white">
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedClass && (
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <div className="text-white font-medium mb-2">Summary</div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <div>Class: {selectedClass.name}</div>
                      <div>Level: {level}</div>
                      <div>Max HP: {classId ? calculateMaxHP(classId, level, adjustedStats.CON) : '-'}</div>
                      <div>Spell Slots: {classId ? Object.values(calculateSpellSlots(classId, level)).map(s => s.max).join('/') : '-'}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !name) ||
                    (step === 2 && (!raceId || !backgroundId))
                  }
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!classId || loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading ? 'Creating...' : 'Create Character'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
