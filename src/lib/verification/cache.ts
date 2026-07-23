import { createClient } from '@/lib/supabase/server';
import type { VerificationReport } from '@/types/verification';
import { CACHE_TTL_DAYS } from './constants';

/**
 * Attempts to retrieve a cached verification report by content hash.
 * Returns null if not found or if the cache entry has expired.
 */
export async function getCached(hash: string): Promise<VerificationReport | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cached_results')
      .select('result_json, expires_at')
      .eq('content_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Cast data since it's a partial select result
    const row = data as unknown as { result_json: unknown; hits?: number };

    // Increment cache hit counter asynchronously (don't await)
    void supabase
      .from('cached_results')
      .update({ hits: (row.hits ?? 0) + 1 } as never)
      .eq('content_hash', hash);

    return row.result_json as VerificationReport;
  } catch {
    return null; // Cache failure is non-fatal
  }
}

/**
 * Stores a verification report in the cache with a 7-day TTL.
 * Uses upsert to handle concurrent cache writes gracefully.
 */
export async function setCached(
  hash: string,
  report: VerificationReport
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    const supabase = createClient();
    await supabase.from('cached_results').upsert(
      {
        content_hash: hash,
        result_json: report as unknown as Record<string, unknown>,
        expires_at: expiresAt.toISOString(),
        hits: 0,
      } as never,
      { onConflict: 'content_hash' }
    );
  } catch (error) {
    // Cache write failure is non-fatal — log and continue
    console.error('[Cache] Failed to write to cache:', error);
  }
}
