'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { AuthContextValue, UserProfile, UserTier } from '@/types/user';
import { TIER_CONFIG } from '@/types/user';

const AuthContext = createContext<AuthContextValue | null>(null);

interface ProfileRecord {
  id: string;
  username?: string | null;
  tier?: string | null;
  verifications_count?: number | null;
  verifications_reset?: string | null;
  created_at?: string | null;
  avatar_url?: string | null;
}

function mapProfileToUserProfile(data: ProfileRecord, email: string): UserProfile {
  const tier = (data.tier as UserTier) || 'free';
  const limit = TIER_CONFIG[tier]?.monthlyLimit ?? 10;
  return {
    id: data.id,
    email: email || '',
    username: data.username || null,
    avatarUrl: data.avatar_url || null,
    tier,
    verificationsCount: data.verifications_count ?? 0,
    verificationsLimit: limit,
    verificationsResetDate: data.verifications_reset || new Date().toISOString().split('T')[0],
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  const fetchProfile = async (userId: string, email: string): Promise<void> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUser(mapProfileToUserProfile(data as ProfileRecord, email));
      } else {
        setUser({
          id: userId,
          email,
          username: null,
          avatarUrl: null,
          tier: 'free',
          verificationsCount: 0,
          verificationsLimit: TIER_CONFIG.free.monthlyLimit,
          verificationsResetDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      setUser({
        id: userId,
        email,
        username: null,
        avatarUrl: null,
        tier: 'free',
        verificationsCount: 0,
        verificationsLimit: TIER_CONFIG.free.monthlyLimit,
        verificationsResetDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email ?? '');
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshProfile = async (): Promise<void> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) await fetchProfile(authUser.id, authUser.email ?? '');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
