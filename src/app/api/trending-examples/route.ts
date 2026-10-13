import { getTrendingExamples, type ExamplesLocale } from '@/lib/examples/trending';

export const dynamic = 'force-dynamic';

/**
 * Homepage claim suggestions — claims that fact-checkers (Factual.ro, AFP,
 * Snopes) reviewed in the last week, in the interface language.
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
        // The selection changes daily, so the edge may hold a copy for a few
        // hours and serve a stale one for at most a day while it refetches —
        // a week of stale-while-revalidate kept old suggestions on quiet days.
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
      },
    }
  );
}
