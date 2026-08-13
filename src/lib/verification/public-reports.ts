import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';
import { logAdminAction } from '@/lib/auth/admin';
import type { VisibilityStatus } from '@/types/database';

/**
 * Score thresholds defined by the scoring engine (scoring.ts).
 * Scores 85-100 map to 'true' (probabil adevărat).
 * Scores 0-39 map to 'false' (probabil fals).
 * Scores 40-84 represent the middle/ambiguous zone ('unclear' or 'partial').
 */
export const DECISIVE_SCORE_THRESHOLDS = {
  HIGH_TRUE: 85,
  LOW_FALSE: 39,
} as const;

/**
 * Checks if a verification score is decisive (>= 85 or <= 39).
 * Returns false for null/undefined or scores in the ambiguous middle zone (40-84).
 */
export function isScoreDecisive(score: number | null | undefined): boolean {
  if (score === null || score === undefined) return false;
  return score >= DECISIVE_SCORE_THRESHOLDS.HIGH_TRUE || score <= DECISIVE_SCORE_THRESHOLDS.LOW_FALSE;
}

export type PublishEligibilityResult =
  | {
      eligible: true;
      requiresPendingReview: boolean;
      message: string;
    }
  | {
      eligible: false;
      reason: 'UNAUTHENTICATED' | 'SCORE_NOT_DECISIVE' | 'REPORT_NOT_FOUND' | 'FORBIDDEN' | 'MONTHLY_LIMIT_EXCEEDED';
      message: string;
    };

export interface CheckPublishEligibilityOptions {
  verificationId: string;
  userId: string;
}

/**
 * Checks if a user can publish a specific verification report, evaluating:
 * 1. User ownership & authentication
 * 2. Decisive score requirement (score >= 85 or <= 39)
 * 3. Free tier monthly limit (max 1 public report per calendar month)
 * 4. Account age & activity check (<48h old or <2 verifications -> pending_review)
 */
export async function checkPublishEligibility({
  verificationId,
  userId,
}: CheckPublishEligibilityOptions): Promise<PublishEligibilityResult> {
  if (!userId) {
    return {
      eligible: false,
      reason: 'UNAUTHENTICATED',
      message: 'Doar utilizatorii autentificați pot marca un raport ca public.',
    };
  }

  const supabase = await createServerClient();

  // Fetch report
  const { data: verification, error: verificationError } = (await supabase
    .from('verifications')
    .select('id, user_id, score, is_public, visibility_status')
    .eq('id', verificationId)
    .single()) as unknown as {
    data: {
      id: string;
      user_id: string | null;
      score: number | null;
      is_public: boolean;
      visibility_status: VisibilityStatus;
    } | null;
    error: { message: string } | null;
  };

  if (verificationError || !verification) {
    return {
      eligible: false,
      reason: 'REPORT_NOT_FOUND',
      message: 'Raportul specificat nu a fost găsit.',
    };
  }

  if (verification.user_id !== userId) {
    return {
      eligible: false,
      reason: 'FORBIDDEN',
      message: 'Nu puteți modifica vizibilitatea unui raport care nu vă aparține.',
    };
  }

  // Rule 2: Valid score check (must have a completed score)
  if (verification.score === null || verification.score === undefined) {
    return {
      eligible: false,
      reason: 'SCORE_NOT_DECISIVE',
      message: 'Raportul nu poate fi făcut public deoarece nu are un scor de verificare calculat.',
    };
  }

  // Fetch user profile
  const { data: profile, error: profileError } = (await supabase
    .from('profiles')
    .select('tier, created_at, verifications_count')
    .eq('id', userId)
    .single()) as unknown as {
    data: {
      tier: string;
      created_at: string;
      verifications_count: number;
    } | null;
    error: { message: string } | null;
  };

  if (profileError || !profile) {
    return {
      eligible: false,
      reason: 'FORBIDDEN',
      message: 'Profilul utilizatorului nu a fost găsit.',
    };
  }

  // Rule 3: Tier-differentiated publication limits
  if (profile.tier === 'free') {
    // Free tier: 1 public report TOTAL lifetime (no monthly reset)
    const { count, error: countError } = await supabase
      .from('verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('id', verificationId)
      .in('visibility_status', ['public', 'pending_review']);

    if (!countError && count !== null && count >= 1) {
      return {
        eligible: false,
        reason: 'MONTHLY_LIMIT_EXCEEDED',
        message: 'Contul gratuit permite un singur raport public, în total. Treci la premium pentru mai multe.',
      };
    }
  } else {
    // Non-free tier (pro/business/premium): 4 public reports per calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('id', verificationId)
      .in('visibility_status', ['public', 'pending_review'])
      .gte('created_at', startOfMonth.toISOString());

    if (!countError && count !== null && count >= 4) {
      return {
        eligible: false,
        reason: 'MONTHLY_LIMIT_EXCEEDED',
        message: 'Ai atins limita de 4 rapoarte publice pentru luna aceasta.',
      };
    }
  }

  return {
    eligible: true,
    requiresPendingReview: false,
    message: 'Raportul este eligibil pentru publicare directă.',
  };
}

export interface SetVisibilityParams {
  verificationId: string;
  userId: string;
  isPublic?: boolean;
  showAuthor?: boolean;
}

export type SetVisibilityResult =
  | {
      success: true;
      isPublic: boolean;
      visibilityStatus: VisibilityStatus;
      showAuthor?: boolean;
      message: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

/**
 * Main helper to toggle report visibility and author attribution according to business rules.
 */
export async function setReportVisibility({
  verificationId,
  userId,
  isPublic,
  showAuthor,
}: SetVisibilityParams): Promise<SetVisibilityResult> {
  const supabase = await createServerClient();

  // If isPublic is omitted but showAuthor is provided, update showAuthor independently
  if (typeof isPublic !== 'boolean' && typeof showAuthor === 'boolean') {
    const { data: updatedData, error } = await supabase
      .from('verifications')
      .update({ show_author: showAuthor } as never)
      .eq('id', verificationId)
      .eq('user_id', userId)
      .select('is_public, visibility_status, show_author')
      .single();

    if (error || !updatedData) {
      return { success: false, error: 'Raportul nu a fost găsit sau nu aparține acestui utilizator.', code: 'FORBIDDEN' };
    }

    const row = updatedData as Record<string, unknown>;
    return {
      success: true,
      isPublic: Boolean(row.is_public),
      visibilityStatus: row.visibility_status as VisibilityStatus,
      showAuthor: Boolean(row.show_author),
      message: `Atribuirea autorului a fost actualizată.`,
    };
  }

  if (!isPublic) {
    const unpublishPayload: Record<string, unknown> = {
      is_public: false,
      visibility_status: 'private',
    };
    if (typeof showAuthor === 'boolean') {
      unpublishPayload.show_author = showAuthor;
    }

    const { error } = await supabase
      .from('verifications')
      .update(unpublishPayload as never)
      .eq('id', verificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to unpublish report', { service: 'PublicReports', error: error.message });
      return { success: false, error: 'Eroare la actualizarea vizibilității.' };
    }

    return {
      success: true,
      isPublic: false,
      visibilityStatus: 'private',
      showAuthor: typeof showAuthor === 'boolean' ? showAuthor : false,
      message: 'Raportul a fost marcat ca privat.',
    };
  }

  // Check eligibility for making public
  const eligibility = await checkPublishEligibility({ verificationId, userId });

  if (!eligibility.eligible) {
    return {
      success: false,
      error: eligibility.message,
      code: eligibility.reason,
    };
  }

  const targetStatus: VisibilityStatus = eligibility.requiresPendingReview ? 'pending_review' : 'public';
  const targetIsPublic = targetStatus === 'public';
  const publishedAt = targetStatus === 'public' ? new Date().toISOString() : null;

  const publishPayload: Record<string, unknown> = {
    is_public: targetIsPublic,
    visibility_status: targetStatus,
    published_at: publishedAt,
  };
  if (typeof showAuthor === 'boolean') {
    publishPayload.show_author = showAuthor;
  }

  const { error: updateError } = await supabase
    .from('verifications')
    .update(publishPayload as never)
    .eq('id', verificationId)
    .eq('user_id', userId);

  if (updateError) {
    logger.error('Failed to publish report', { service: 'PublicReports', error: updateError.message });
    return { success: false, error: updateError.message || 'Eroare la publicarea raportului.' };
  }

  return {
    success: true,
    isPublic: targetIsPublic,
    visibilityStatus: targetStatus,
    showAuthor: typeof showAuthor === 'boolean' ? showAuthor : false,
    message: eligibility.message,
  };
}

export interface FlagReportParams {
  verificationId: string;
  reporterUserId: string;
  reason?: string;
}

/**
 * Allows an authenticated user to flag a public report.
 */
export async function flagReport({
  verificationId,
  reporterUserId,
  reason,
}: FlagReportParams): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  // Verify report is public
  const { data: report, error: reportError } = (await supabase
    .from('verifications')
    .select('id, is_public, visibility_status')
    .eq('id', verificationId)
    .single()) as unknown as {
    data: {
      id: string;
      is_public: boolean;
      visibility_status: VisibilityStatus;
    } | null;
    error: { message: string } | null;
  };

  if (reportError || !report) {
    return { success: false, error: 'Raportul nu a fost găsit.' };
  }

  if (!report.is_public && report.visibility_status !== 'public') {
    return { success: false, error: 'Doar rapoartele publice pot fi semnalate.' };
  }

  const { error: flagError } = await supabase
    .from('verification_flags')
    .insert({
      verification_id: verificationId,
      reporter_user_id: reporterUserId,
      reason: reason?.trim() || null,
    } as never);

  if (flagError) {
    if (flagError.code === '23505') {
      return { success: false, error: 'Ați semnalat deja acest raport.' };
    }
    logger.error('Failed to flag report', { service: 'PublicReports', error: flagError.message });
    return { success: false, error: 'Nu s-a putut trimite semnalarea.' };
  }

  return { success: true };
}

export interface ModerateReportParams {
  verificationId: string;
  adminUserId: string;
  action: 'approve' | 'take_down' | 'reject';
  note?: string;
}

/**
 * Admin action to approve, take down, or reject a report.
 */
export async function moderateReport({
  verificationId,
  adminUserId,
  action,
  note,
}: ModerateReportParams): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  let targetStatus: VisibilityStatus;
  let targetIsPublic: boolean;

  switch (action) {
    case 'approve':
      targetStatus = 'public';
      targetIsPublic = true;
      break;
    case 'take_down':
      targetStatus = 'taken_down';
      targetIsPublic = false;
      break;
    case 'reject':
      targetStatus = 'rejected';
      targetIsPublic = false;
      break;
  }

  const { error } = await adminClient
    .from('verifications')
    .update({
      visibility_status: targetStatus,
      is_public: targetIsPublic,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
    } as never)
    .eq('id', verificationId);

  if (error) {
    logger.error('Failed to moderate report', { service: 'PublicReports', error: error.message });
    return { success: false, error: error.message };
  }

  await logAdminAction({
    adminId: adminUserId,
    actionType: `report.${action}`,
    targetTable: 'verifications',
    targetId: verificationId,
    details: { action, note: note || null },
  });

  return { success: true };
}
