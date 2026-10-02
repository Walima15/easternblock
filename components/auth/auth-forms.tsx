'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <CardContent>
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
      </form>
      <div className="mt-4 space-y-2 text-center text-sm">
        <Link href="/forgot-password" className="text-emerald-600 hover:underline">
          Forgot password?
        </Link>
        <p className="text-muted-foreground">
          No account?{' '}
          <Link href="/signup" className="text-emerald-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </CardContent>
  );
}

export function LoginCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Link href="/" className="mb-2 text-2xl font-bold">
          <span className="text-emerald-600">Eastern</span>Block
        </Link>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to your EasternBlock wallet</CardDescription>
      </CardHeader>
      <LoginForm />
    </Card>
  );
}
