'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoBanner } from '@/components/wallet/demo-banner';
import { SuccessState } from '@/components/wallet/success-state';

export default function ForgotPasswordPage() {
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    const res = await forgotPassword(formData);
    setResult(res);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/" className="mb-2 text-2xl font-bold">
              <span className="text-emerald-600">Eastern</span>Block
            </Link>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>We&apos;ll send you a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            {result?.success ? (
              <SuccessState title="Check your email" message={result.message} />
            ) : (
              <form action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                {result?.error && (
                  <p className="text-sm text-destructive">{result.error}</p>
                )}
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Send reset link
                </Button>
              </form>
            )}
            <p className="mt-4 text-center text-sm">
              <Link href="/login" className="text-emerald-600 hover:underline">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
