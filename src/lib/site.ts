/**
 * Canonical origin of the deployed site, without a trailing slash.
 *
 * Every absolute URL the app emits — metadataBase, sitemap, robots, JSON-LD,
 * checkout redirects — resolves from here, so the apex and the www host can
 * never end up split across different parts of the same page.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://verifact.ro').replace(/\/+$/, '');
