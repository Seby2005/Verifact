'use client';

import { useEffect, useState } from 'react';
import type { UserTier } from '@/types/user';

/**
 * The signed-in user's plan, resolved once for the report view. Anonymous
 * visitors (the usage endpoint answers 401) stay 'free', which is the correct
 * default for both source-link specificity and the download gate.
 */
export function useUserTier(): { tier: UserTier; isPremium: boolean } {
  const [tier, setTier] = useState<UserTier>('free');

  useEffect(() => {
    let active = true;
    fetch('/api/user/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.usage?.tier) setTier(data.usage.tier as UserTier);
      })
      .catch(() => {
        /* Stay on the free default. */
      });
    return () => {
      active = false;
    };
  }, []);

  return { tier, isPremium: tier === 'pro' || tier === 'business' };
}
