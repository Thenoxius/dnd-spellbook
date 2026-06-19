'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--bg-from), var(--bg-to))' }}>
      <Card className="w-full max-w-md" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <CardHeader>
          <CardTitle className="text-white">Sign Up</CardTitle>
          <CardDescription className="text-slate-400">
            Create an account to start tracking your D&D characters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900/50 border-slate-700 text-white mt-2"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-900/50 border-slate-700 text-white mt-2"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-white hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                Login
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
