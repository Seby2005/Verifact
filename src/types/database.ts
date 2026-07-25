// =============================================================================
// Verifact — Database Types (generated from schema, do NOT edit manually)
// =============================================================================
// Regenerate with: npx supabase gen types typescript --local > src/types/database.ts
// Until Supabase CLI is configured, maintain manually to match migrations.
// =============================================================================

export type UserTier = 'free' | 'pro' | 'business';
export type UserRole = 'user' | 'admin' | 'moderator';
export type InputType = 'text' | 'screenshot' | 'url';
export type VerdictType = 'true' | 'partial' | 'unclear' | 'false';
export type LanguageType = 'ro' | 'en';
export type VerificationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DisputeStatus = 'open' | 'reviewing' | 'resolved_kept' | 'resolved_hidden' | 'resolved_edited' | 'rejected';
export type SubscriptionStatus = 'pending_manual' | 'active' | 'past_due' | 'canceled';

export interface Profile {
  id: string;
  username: string | null;
  tier: UserTier;
  role: UserRole;
  verifications_count: number;
  verifications_reset: string;
  preferred_language: LanguageType;
  gdpr_data_export_requested_at: string | null;
  gdpr_deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Verification {
  id: string;
  user_id: string | null;
  anonymous_hash: string | null;
  input_type: InputType;
  input_text: string;
  input_url: string | null;
  verdict: VerdictType | null;
  score: number | null;
  report_json: Record<string, unknown> | null;
  is_public: boolean;
  language: LanguageType;
  processing_time_ms: number | null;
  status: VerificationStatus;
  error_message: string | null;
  created_at: string;
}

export interface CachedResult {
  id: string;
  content_hash: string;
  result_json: Record<string, unknown>;
  hits: number;
  disputed_count: number;
  expires_at: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  verification_id: string;
  reporter_email: string | null;
  reporter_user_id: string | null;
  reason: string;
  status: DisputeStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ApiCallLog {
  id: string;
  verification_id: string | null;
  provider: string;
  endpoint: string | null;
  latency_ms: number | null;
  status_code: number | null;
  success: boolean;
  estimated_cost_usd: number | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: Exclude<UserTier, 'free'>;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_table: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, 'id'> & Partial<Omit<Profile, 'id'>>;
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
        Insert: Omit<CachedResult, 'id' | 'created_at' | 'hits' | 'disputed_count'> & {
          id?: string;
          hits?: number;
          disputed_count?: number;
          created_at?: string;
        };
        Update: Partial<CachedResult>;
      };
      disputes: {
        Row: Dispute;
        Insert: Omit<Dispute, 'id' | 'created_at' | 'resolved_at' | 'status'> & {
          id?: string;
          status?: DisputeStatus;
          created_at?: string;
          resolved_at?: string;
        };
        Update: Partial<Dispute>;
      };
      api_call_logs: {
        Row: ApiCallLog;
        Insert: Omit<ApiCallLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ApiCallLog>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'status'> & {
          id?: string;
          status?: SubscriptionStatus;
          created_at?: string;
        };
        Update: Partial<Subscription>;
      };
      admin_actions: {
        Row: AdminAction;
        Insert: Omit<AdminAction, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AdminAction>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      request_account_deletion: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
