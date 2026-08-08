'use client';

import { useEffect, useState } from 'react';
import type { UserTier } from '@/types/user';

function isPremiumTier(tier: UserTier): boolean {
  return tier === 'pro' || tier === 'business';
}

/**
 * Authoritative one-off check, used to gate the download click even if the hook
 * below has not resolved yet — so a Pro user who clicks immediately still gets
 * the PDF, not the paywall. Anonymous (401) resolves to false.
 */
export async function fetchIsPremium(): Promise<boolean> {
  try {
    const res = await fetch('/api/user/usage');
    if (!res.ok) return false;
    const data = await res.json();
    const tier = data?.usage?.tier as UserTier | undefined;
    return tier ? isPremiumTier(tier) : false;
  } catch {
    return false;
  }
}

/**
 * The signed-in user's plan, resolved once for the report view. Anonymous
 * visitors (the usage endpoint answers 401) stay 'free', which is the correct
 * default for source-link specificity. `ready` flips true once the fetch has
 * settled, so the download gate can wait for an authoritative answer instead of
 * acting on the free default during the first render.
 */
export function useUserTier(): { tier: UserTier; isPremium: boolean; ready: boolean } {
  const [tier, setTier] = useState<UserTier>('free');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/user/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.usage?.tier) setTier(data.usage.tier as UserTier);
      })
      .catch(() => {
        /* Stay on the free default. */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { tier, isPremium: isPremiumTier(tier), ready };
}
