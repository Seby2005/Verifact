import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Supabase client for browser/Client Components.
 * Uses the anon key — all queries are subject to Row Level Security.
 * NEVER use service_role key in this client.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables. ' +
      'Copy .env.example to .env.local and fill in the values.'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
