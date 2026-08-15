import type { MetadataRoute } from 'next';
import { RESOURCE_ARTICLES } from '@/content/resurse';
import { listPublicReports } from '@/lib/verification/public-reports-query';

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

  // Dynamic public verifications reports using central helper
  let publicReportEntries: MetadataRoute.Sitemap = [];
  try {
    const { reports } = await listPublicReports({ page: 1, limit: 1000 });
    publicReportEntries = reports.map((v) => ({
      url: `${baseUrl}/rapoarte/${v.id}`,
      lastModified: new Date(v.publishedAt || v.createdAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
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
      url: `${baseUrl}/echipa`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
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
