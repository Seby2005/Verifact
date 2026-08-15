import { getTrendingExamples, type ExamplesLocale } from '@/lib/examples/trending';

export const dynamic = 'force-dynamic';

/**
 * Homepage claim suggestions — curated fact-checks from recognised
 * fact-checking organisations (Factual.ro, Veridica.ro, Snopes), served
 * in both Romanian and English.
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
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
