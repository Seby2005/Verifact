import stateMediaDataset from '@/data/state-media-outlets.json';

export type StateMediaControlLevel = 'state_controlled' | 'state_funded' | 'public_broadcaster';

export interface StateMediaInfo {
  domain: string;
  name: string;
  country: string;
  countryCode: string;
  controlLevel: StateMediaControlLevel;
  ownership: string;
  description: string;
  badgeLabel: string;
}

interface OutletRaw {
  domain: string;
  name: string;
  country: string;
  countryCode: string;
  controlLevel: string;
  ownership: string;
  description: string;
  badgeLabel: string;
}

const outletsMap: Map<string, StateMediaInfo> = new Map();

for (const raw of (stateMediaDataset as { outlets: OutletRaw[] }).outlets) {
  const controlLevel: StateMediaControlLevel =
    raw.controlLevel === 'state_controlled' || raw.controlLevel === 'state_funded' || raw.controlLevel === 'public_broadcaster'
      ? raw.controlLevel
      : 'state_controlled';

  outletsMap.set(raw.domain.toLowerCase(), {
    domain: raw.domain,
    name: raw.name,
    country: raw.country,
    countryCode: raw.countryCode,
    controlLevel,
    ownership: raw.ownership,
    description: raw.description,
    badgeLabel: raw.badgeLabel,
  });
}

export function extractDomainFromUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./i, '');
  }
}

/**
 * Checks if a given URL belongs to a known state media / public broadcaster.
 * Returns the StateMediaInfo metadata, or null if it's an independent/unlisted outlet.
 * 
 * IMPORTANT: This function ONLY identifies state media affiliation for UI transparency.
 * It DOES NOT deduct or penalize credibility scores.
 */
export function getStateMediaInfo(url: string): StateMediaInfo | null {
  const domain = extractDomainFromUrl(url);
  if (!domain) return null;

  if (outletsMap.has(domain)) {
    return outletsMap.get(domain)!;
  }

  const parts = domain.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join('.');
    if (outletsMap.has(parentDomain)) {
      return outletsMap.get(parentDomain)!;
    }
  }

  return null;
}
