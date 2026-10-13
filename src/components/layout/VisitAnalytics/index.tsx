'use client';

import { Analytics } from '@vercel/analytics/next';
import { isOwnBrowser } from '@/lib/analytics/own-visits';

/** Vercel Analytics for every visitor except the team's own browsers. */
export function VisitAnalytics() {
  return <Analytics beforeSend={(event) => (isOwnBrowser() ? null : event)} />;
}
