'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canUserVerify } from '@/lib/tier-limits';
import type { Tier } from '@/lib/tier-limits';

export interface UseUsageReturn {
  verificationsUsed: number;
  verificationsLimit: number;
  verificationsRemaining: number;
  resetsAt: Date;
  isLimitReached: boolean;
  isLoading: boolean;
}

export function useUsage(): UseUsageReturn {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [usageData, setUsageData] = useState<UseUsageReturn>({
    verificationsUsed: 0,
    verificationsLimit: 10,
    verificationsRemaining: 10,
    resetsAt: new Date(),
    isLimitReached: false,
    isLoading: true,
  });

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      // User anonim
      let count = 0;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('agy_anon_usage');
          if (raw) count = JSON.parse(raw).count || 0;
        } catch {
          count = 0;
        }
      }

      setUsageData({
        verificationsUsed: count,
        verificationsLimit: 3,
        verificationsRemaining: Math.max(0, 3 - count),
        resetsAt: new Date(),
        isLimitReached: count >= 3,
        isLoading: false,
      });
    } else {
      const tier = (user.tier as Tier) || 'free';
      const check = canUserVerify(tier, user.verificationsCount, user.verificationsResetDate);

      setUsageData({
        verificationsUsed: user.verificationsCount,
        verificationsLimit: user.verificationsLimit,
        verificationsRemaining: check.remaining,
        resetsAt: check.resetsAt,
        isLimitReached: !check.allowed,
        isLoading: false,
      });
    }
  }, [user, isAuthLoading]);

  return usageData;
}
