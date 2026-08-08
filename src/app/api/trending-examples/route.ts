import { getTrendingExamples, type ExamplesLocale } from '@/lib/examples/trending';

export const dynamic = 'force-dynamic';

/**
 * Homepage claim suggestions — live Romanian headlines when available, curated
 * evergreen claims otherwise. Cached at the edge for an hour; the underlying
 * fetch is additionally throttled in-process (see getTrendingExamples).
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const lang: ExamplesLocale = searchParams.get('lang') === 'en' ? 'en' : 'ro';

  const examples = await getTrendingExamples(lang);

  return Response.json(
    { examples },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
