import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client scoped to a user's Bearer access token (JWT).
 * Used for Mode A authentication (Chrome extension / authenticated API calls)
 * where the caller provides their Supabase access token in the Authorization header.
 *
 * Calling `supabase.auth.getUser()` on this client verifies the JWT and retrieves
 * the user profile. Calling `supabase.rpc('reserve_usage_slot')` automatically
 * provides `auth.uid()` from the token.
 */
export function createClientFromToken(accessToken: string): SupabaseClient<Database> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
