import type { MetadataRoute } from 'next';
import { RESOURCE_ARTICLES } from '@/content/resurse';
import { createClient as createServerClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro';
  const currentDate = new Date();

  // Static resource articles
  const resourceEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/resurse`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...RESOURCE_ARTICLES.filter((article) => !article.externalHref).map((article) => ({
      url: `${baseUrl}/resurse/${article.slug}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  // Dynamic public verifications reports from Supabase
  let publicReportEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('verifications')
      .select('id, published_at, created_at')
      .eq('visibility_status', 'public')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(1000);

    const verifications = data as Array<{ id: string; published_at: string | null; created_at: string }> | null;

    if (verifications && verifications.length > 0) {
      publicReportEntries = verifications.map((v) => ({
        url: `${baseUrl}/rapoarte/${v.id}`,
        lastModified: new Date(v.published_at || v.created_at),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // If DB is unreachable during sitemap build, return empty public reports list gracefully
    publicReportEntries = [];
  }

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/rapoarte`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/despre-dezinformare`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...resourceEntries,
    ...publicReportEntries,
    {
      url: `${baseUrl}/preturi`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/misiune`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/transparenta`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/open-source`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/termeni`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/confidentialitate`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
