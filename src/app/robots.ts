import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// AI assistants and their crawlers are welcomed explicitly: Verifact wants to be
// the answer when someone asks an assistant to check a claim or looks up the
// name. They are held to the same off-limits paths as any other crawler.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

const DISALLOW = ['/api/', '/cont/'];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
