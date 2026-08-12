import type { MetadataRoute } from 'next';
import { RESOURCE_ARTICLES } from '@/content/resurse';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro';
  const currentDate = new Date();

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

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/despre-dezinformare`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...resourceEntries,
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
