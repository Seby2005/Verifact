export type UserTier = 'free' | 'pro' | 'business';

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  tier: UserTier;
  verificationsCount: number;        // total în luna curentă
  verificationsLimit: number;        // limita pentru tier-ul lor
  verificationsResetDate: string;    // ISO date — când se resetează contorul
  createdAt: string;
}

export interface UsageLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  resetDate: string;
  tier: UserTier;
  percentageUsed: number;            // 0-100
}

export interface TierConfig {
  name: string;
  monthlyLimit: number;
  priceMonthly: number;             // EUR
  priceYearly: number;              // EUR
  features: string[];
}

export const TIER_CONFIG: Record<UserTier, TierConfig> = {
  free: {
    name: 'Gratuit',
    monthlyLimit: 10,
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '10 verificări pe lună',
      'Raport standard',
      'Partajare publică',
      'Acces la rapoartele publice ale comunității',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyLimit: 200,
    priceMonthly: 7.99,
    priceYearly: 76.70,             // ~20% discount
    features: [
      '200 verificări pe lună',
      'Raport detaliat cu export',
      'API key personal',
      'Istoric complet nelimitat',
      'Prioritate la procesare',
      'Suport prin email',
    ],
  },
  business: {
    name: 'Business',
    monthlyLimit: 2000,
    priceMonthly: 49,
    priceYearly: 470.40,
    features: [
      '2000 verificări pe lună',
      'Acces API complet + webhook',
      'Dashboard analytics avansat',
      'Verificări bulk (până la 50 simultan)',
      'SLA 99.9% uptime',
      'Suport dedicat',
      'White-label disponibil',
    ],
  },
};

// State autentificare pentru React Context
export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
