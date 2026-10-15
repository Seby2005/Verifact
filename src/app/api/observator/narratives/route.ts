import { buildNarratives } from '@/lib/observator/build';
import { NARRATIVES } from '@/lib/observator/seed';

// Cache the enriched narratives for an hour — fact-check data moves slowly and
// the map should not hit the upstream API on every visit.
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  try {
    const narratives = await buildNarratives();
    return Response.json({ narratives });
  } catch {
    // Never leave the globe empty: fall back to the curated seed.
    return Response.json({ narratives: NARRATIVES });
  }
}
