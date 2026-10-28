import { getTrendingExamples, type ExamplesLocale } from '@/lib/examples/trending';

export const dynamic = 'force-dynamic';

/**
 * Homepage claim suggestions — claims that fact-checkers (Factual.ro, AFP,
 * Veridica, Snopes…) reviewed recently, in the interface language, the ones
 * already verified in advance first.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawLang = searchParams.get('lang');
  const lang: ExamplesLocale = rawLang === 'fr' ? 'fr' : rawLang === 'en' ? 'en' : 'ro';

  const examples = await getTrendingExamples(lang);

  return Response.json(
    { examples },
    {
      headers: {
        // The selection changes daily and fills in as the hourly job verifies
        // it, so the edge holds a copy for an hour and serves a stale one for
        // at most a day while it refetches — a week of stale-while-revalidate
        // kept old suggestions on quiet days.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
