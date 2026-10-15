'use client';

import { useEffect } from 'react';
import { markOwnBrowser } from '@/lib/analytics/own-visits';

/** Marks the browser an admin page is opened in as the team's own, and says so. */
export function OwnVisitsExcluded() {
  useEffect(markOwnBrowser, []);

  return <p className="container eyebrow">Vizitele din acest browser nu se numără în statistici.</p>;
}
