export type UserTier = 'free' | 'pro' | 'business';
export type InputType = 'text' | 'screenshot' | 'url';
export type VerdictType = 'true' | 'false' | 'partial' | 'unclear';
export type LanguageType = 'ro' | 'en';

export interface Profile {
  id: string;
  username: string | null;
  tier: UserTier;
  verifications_count: number;
  verifications_reset: string;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string | null;
  input_type: InputType;
  input_text: string;
  input_url: string | null;
  verdict: VerdictType;
  score: number | null;
  report_json: Record<string, unknown>;
  is_public: boolean;
  language: LanguageType;
  processing_time: number | null;
  created_at: string;
}

export interface CachedResult {
  id: string;
  content_hash: string;
  result_json: Record<string, unknown>;
  hits: number;
  expires_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'verifications_count' | 'verifications_reset' | 'tier'> & {
          tier?: UserTier;
          verifications_count?: number;
          verifications_reset?: string;
          created_at?: string;
        };
        Update: Partial<Profile>;
      };
      verifications: {
        Row: Verification;
        Insert: Omit<Verification, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Verification>;
      };
      cached_results: {
        Row: CachedResult;
        Insert: Omit<CachedResult, 'id' | 'created_at' | 'hits'> & {
          id?: string;
          hits?: number;
          created_at?: string;
        };
        Update: Partial<CachedResult>;
      };
    };
  };
}
