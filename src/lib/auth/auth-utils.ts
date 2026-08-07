import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { ensureProfileExists } from '@/lib/supabase/auth-helpers';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  user?: User | null;
  error?: string;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: 'Email sau parolă incorectă' };
    }
    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'Contul nu a fost confirmat. Verifică emailul.' };
    }
    return { success: false, error: error.message };
  }

  if (data.user) {
    await ensureProfileExists(data.user.id, data.user.email);
  }

  return { success: true, user: data.user };
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = createBrowserClient();
  const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/confirm-email` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    await ensureProfileExists(data.user.id, data.user.email);
  }

  return { success: true, user: data.user };
}

export async function signInWithOAuth(provider: 'google' | 'github'): Promise<void> {
  const supabase = createBrowserClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  });
}

export async function signOut(): Promise<void> {
  const supabase = createBrowserClient();
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    // Full reload (not router navigation) so every bit of client state and the
    // Supabase client are torn down after sign-out, not just the current route.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/';
  }
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/update-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
