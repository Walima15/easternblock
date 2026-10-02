'use client';

import { useState } from 'react';
import { updateProfile } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ProfileFormProps {
  fullName: string;
  phoneNumber: string;
}

export function ProfileForm({ fullName, phoneNumber }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = await updateProfile(formData);
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Profile updated');
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">Phone number</Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          defaultValue={phoneNumber}
          placeholder="097XXXXXXX"
        />
      </div>
      <Button type="submit" variant="outline" disabled={loading}>
        {loading ? 'Saving...' : 'Save profile'}
      </Button>
    </form>
  );
}
