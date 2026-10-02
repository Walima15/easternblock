'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  signupSchema,
  loginSchema,
  profileUpdateSchema,
} from '@/lib/security/validation';
import {
  authenticateUser,
  createUser,
  getProfile,
  getRecentTransactions,
  getTransactions,
  getUserById,
  getWallet,
  updateProfile as updateProfileStore,
} from '@/lib/db/local-store';
import {
  clearSession,
  getSessionUserId,
  requireSessionUserId,
  setSessionUserId,
} from '@/lib/auth/session';

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const result = createUser(
    parsed.data.email,
    parsed.data.password,
    parsed.data.fullName
  );

  if ('error' in result) {
    return { error: result.error };
  }

  await setSessionUserId(result.userId);
  redirect('/dashboard');
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const user = authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    return { error: 'Invalid email or password' };
  }

  await setSessionUserId(user.id);
  redirect('/dashboard');
}

export async function logout() {
  await clearSession();
  redirect('/login');
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string;
  if (!email) return { error: 'Email is required' };
  return {
    success: true,
    message: 'Password reset is not available in demo mode. Create a new account instead.',
  };
}

export async function updateProfile(formData: FormData) {
  const userId = await requireSessionUserId();

  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get('fullName') || undefined,
    phoneNumber: formData.get('phoneNumber') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const updates: { full_name?: string; phone_number?: string } = {};
  if (parsed.data.fullName) updates.full_name = parsed.data.fullName;
  if (parsed.data.phoneNumber !== undefined) {
    updates.phone_number = parsed.data.phoneNumber;
  }

  const result = updateProfileStore(userId, updates);
  if ('error' in result) return { error: result.error };

  revalidatePath('/settings');
  return { success: true };
}

export async function getSessionUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getUserById(userId);
}

export async function getProfileAction() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getProfile(userId);
}

export { getProfileAction as getProfile };

export async function getWalletAction() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getWallet(userId);
}

export { getWalletAction as getWallet };

export async function getRecentTransactionsAction(limit = 5) {
  const userId = await getSessionUserId();
  if (!userId) return [];
  return getRecentTransactions(userId, limit);
}

export { getRecentTransactionsAction as getRecentTransactions };

export async function getAllTransactions(type?: string) {
  const userId = await getSessionUserId();
  if (!userId) return [];
  return getTransactions(userId, type);
}
