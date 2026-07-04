'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Class } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus } from 'lucide-react';

const SPELL_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 
  'Illusion', 'Necromancy', 'Transmutation'
];

export default function CreateSpellPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [level, setLevel] = useState(0);
  const [school, setSchool] = useState('');
  const [castingTime, setCastingTime] = useState('');
  const [range, setRange] = useState('');
  const [components, setComponents] = useState('');
  const [duration, setDuration] = useState('');
  const [concentration, setConcentration] = useState(false);
  const [ritual, setRitual] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*');
    if (data) setClasses(data);
    setLoading(false);
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!name || !school) {
      alert('Please fill in at least the name and school');
      return;
    }

    setSaving(true);

    // Generate a unique ID for the spell
    const spellId = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

    const { error } = await supabase.from('spells').insert({
      id: spellId,
      name,
      level,
      school,
      casting_time: castingTime,
      range,
      components,
      duration,
      concentration,
      ritual,
      description,
      base_class_ids: Array.from(selectedClasses),
    });

    setSaving(false);

    if (error) {
      alert(`Error creating spell: ${error.message}`);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--page-bg)' }} className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
            <h1 className="text-2xl md:text-3xl font-bold text-white">Create Custom Spell</h1>
            <p className="text-slate-400">Add a new spell to your spellbook</p>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Spell Details</CardTitle>
            <CardDescription className="text-slate-400">
              Fill in the spell information. All fields are optional except name and school.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-white">Spell Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Fireball"
                className="bg-slate-900/50 border-slate-700 text-white mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="level" className="text-white">Spell Level</Label>
                <Select value={level.toString()} onValueChange={(v) => setLevel(parseInt(v || '0'))}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white mt-2">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <SelectItem key={lvl} value={lvl.toString()} className="text-white">
                        {lvl === 0 ? 'Cantrip' : `Level ${lvl}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="school" className="text-white">School *</Label>
                <Select value={school} onValueChange={(v) => setSchool(v || '')}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white mt-2">
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {SPELL_SCHOOLS.map((s) => (
                      <SelectItem key={s} value={s} className="text-white">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="castingTime" className="text-white">Casting Time</Label>
                <Input
                  id="castingTime"
                  value={castingTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCastingTime(e.target.value)}
                  placeholder="1 action"
                  className="bg-slate-900/50 border-slate-700 text-white mt-2"
                />
              </div>
              <div>
                <Label htmlFor="range" className="text-white">Range</Label>
                <Input
                  id="range"
                  value={range}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRange(e.target.value)}
                  placeholder="60 ft"
                  className="bg-slate-900/50 border-slate-700 text-white mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="components" className="text-white">Components</Label>
              <Input
                id="components"
                value={components}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComponents(e.target.value)}
                placeholder="V, S, M"
                className="bg-slate-900/50 border-slate-700 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="duration" className="text-white">Duration</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value)}
                placeholder="1 minute"
                className="bg-slate-900/50 border-slate-700 text-white mt-2"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="concentration"
                  checked={concentration}
                  onCheckedChange={(checked: boolean) => setConcentration(checked)}
                  className="border-slate-600"
                />
                <Label htmlFor="concentration" className="text-white">Concentration</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ritual"
                  checked={ritual}
                  onCheckedChange={(checked: boolean) => setRitual(checked)}
                  className="border-slate-600"
                />
                <Label htmlFor="ritual" className="text-white">Ritual</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Spell description..."
                rows={4}
                className="w-full bg-slate-900/50 border-slate-700 text-white mt-2 p-3 rounded-md"
              />
            </div>

            <div>
              <Label className="text-white">Available Classes</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={selectedClasses.has(cls.id)}
                      onCheckedChange={() => handleClassToggle(cls.id)}
                      className="border-slate-600"
                    />
                    <Label htmlFor={`class-${cls.id}`} className="text-white cursor-pointer">
                      {cls.name}
                    </Label>
                  </div>
                ))}
              </div>
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
                onClick={handleSubmit}
                disabled={saving}
                className="btn-accent flex-1"
              >
                {saving ? 'Saving...' : 'Create Spell'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
