import { logger } from '@/lib/utils/logger';

/**
 * Fire-and-forget alerting through a self-hosted ntfy topic.
 *
 * No-ops when NTFY_URL / NTFY_TOPIC are unset, and never throws — alerting is a
 * side channel, so a misconfigured or down ntfy must never break the code path
 * that is trying to warn about something. Callers should not await this for
 * correctness (though awaiting to observe the boolean in a handler is fine).
 *
 * Topics that use this so far:
 *   - pipeline health   (src/app/api/health/route.ts, ?notify=1)
 *   - GlitchTip errors  (configured as a webhook inside GlitchTip, no code)
 */
export interface NtfyAlert {
  title: string;
  message: string;
  /** ntfy priority 1 (min) .. 5 (max). Default 3. */
  priority?: 1 | 2 | 3 | 4 | 5;
  /** ntfy tags / emoji shortcodes, e.g. ['warning', 'rotating_light']. */
  tags?: string[];
}

export async function sendNtfyAlert(alert: NtfyAlert): Promise<boolean> {
  const base = process.env.NTFY_URL?.replace(/\/+$/, '');
  const topic = process.env.NTFY_TOPIC;
  if (!base || !topic) return false;

  try {
    const headers: Record<string, string> = {
      Title: alert.title,
      Priority: String(alert.priority ?? 3),
    };
    if (alert.tags?.length) headers.Tags = alert.tags.join(',');
    // Optional bearer token for a locked-down (auth) ntfy instance.
    if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;

    const res = await fetch(`${base}/${topic}`, {
      method: 'POST',
      headers,
      body: alert.message,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      logger.warn('ntfy alert non-2xx', { service: 'ntfy', status: res.status });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn('ntfy alert failed', { service: 'ntfy', error });
    return false;
  }
}
