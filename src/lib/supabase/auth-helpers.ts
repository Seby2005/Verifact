import { createClient as createServerClient } from './server';

/**
 * Ensures a user profile exists in the `profiles` table.
 * Created on first login or user registration.
 */
export async function ensureProfileExists(userId: string, _email?: string): Promise<void> {
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('profiles').insert({
      id: userId,
      tier: 'free',
      verifications_count: 0,
      verifications_reset: today,
    });
  }
}

/**
 * Server-side helper to fetch the current authenticated user.
 */
export async function getAuthenticatedUser() {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}
