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
export type VisibilityStatus = 'private' | 'pending_review' | 'public' | 'taken_down' | 'rejected';
export type DisputeStatus = 'open' | 'reviewing' | 'resolved_kept' | 'resolved_hidden' | 'resolved_edited' | 'rejected';
export type SubscriptionStatus = 'pending_manual' | 'active' | 'past_due' | 'canceled';
export type OpportunityStatus = 'new' | 'reviewed' | 'dismissed' | 'used';

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
  visibility_status: VisibilityStatus;
  show_author: boolean;
  flagged_count: number;
  published_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  language: LanguageType;
  processing_time_ms: number | null;
  status: VerificationStatus;
  error_message: string | null;
  disputed: boolean;
  input_tokens?: number | null;
  output_tokens?: number | null;
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

export interface VerificationFlag {
  id: string;
  verification_id: string;
  reporter_user_id: string;
  reason: string | null;
  created_at: string;
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

export interface VerificationCost {
  id: string;
  verification_id: string;
  provider: string;
  model: string;
  step: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number | null;
  created_at: string;
}

export interface ApiPricing {
  id: string;
  provider: string;
  model: string;
  price_per_million_input_tokens: number;
  price_per_million_output_tokens: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type FixedCostCategory = 'hosting' | 'ai_tools' | 'infrastructure' | 'domain' | 'other';

export interface FixedCost {
  id: string;
  name: string;
  category: FixedCostCategory | string;
  monthly_amount: number;
  currency: string;
  note: string | null;
  created_at: string;
  updated_at: string;
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

export interface ContentOpportunity {
  id: string;
  title: string;
  source_url: string;
  source_name: string;
  trend_rank: number | null;
  fetched_at: string;
  status: OpportunityStatus;
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
        Insert: Omit<Verification, 'id' | 'created_at' | 'disputed' | 'visibility_status' | 'flagged_count'> & {
          id?: string;
          created_at?: string;
          disputed?: boolean;
          visibility_status?: VisibilityStatus;
          flagged_count?: number;
          published_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
        };
        Update: Partial<Verification>;
      };
      verification_costs: {
        Row: VerificationCost;
        Insert: Omit<VerificationCost, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<VerificationCost>;
      };
      api_pricing: {
        Row: ApiPricing;
        Insert: Omit<ApiPricing, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ApiPricing>;
      };
      fixed_costs: {
        Row: FixedCost;
        Insert: Omit<FixedCost, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<FixedCost>;
      };
      verification_flags: {
        Row: VerificationFlag;
        Insert: Omit<VerificationFlag, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<VerificationFlag>;
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
      content_opportunities: {
        Row: ContentOpportunity;
        Insert: Omit<ContentOpportunity, 'id' | 'fetched_at' | 'status'> & {
          id?: string;
          fetched_at?: string;
          status?: OpportunityStatus;
        };
        Update: Partial<ContentOpportunity>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      request_account_deletion: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      reserve_usage_slot: {
        Args: Record<PropertyKey, never>;
        Returns: { allowed: boolean; usage_limit: number; used: number }[];
      };
      release_usage_slot: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_ms: number };
        Returns: { allowed: boolean; remaining: number; reset_at: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
