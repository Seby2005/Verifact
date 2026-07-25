// =============================================================================
// ⚠️  DANGER: SERVICE ROLE CLIENT — BYPASSES ALL ROW LEVEL SECURITY  ⚠️
// =============================================================================
// DO NOT import this client in any Client Component, browser-side code,
// or any file that could be included in the browser bundle.
//
// The service_role key has FULL, UNRESTRICTED access to ALL data in the
// database, bypassing every RLS policy. It must ONLY be used in:
//   - Next.js API Route Handlers (src/app/api/...)
//   - Server-side scheduled functions
//   - Admin operations that require elevated privileges
//
// If you import this file from a Client Component, you WILL expose the
// service_role key to the browser, which is a CRITICAL security vulnerability.
// =============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase admin client that bypasses Row Level Security.
 * Use ONLY in server-side API routes for operations that require elevated
 * privileges, such as:
 * - Writing verdict/score after verification processing
 * - Resetting monthly verification counters
 * - Changing user roles or tiers
 * - GDPR account deletion
 * - Admin panel operations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'These are required for admin operations and must be set in .env.local.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
