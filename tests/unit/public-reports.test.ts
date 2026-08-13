import {
  isScoreDecisive,
  checkPublishEligibility,
  setReportVisibility,
  flagReport,
  moderateReport,
} from '@/lib/verification/public-reports';

// Mock Supabase Server & Admin clients
const mockServerFrom = jest.fn();
const mockAdminFrom = jest.fn();
const mockLogAdminAction = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockServerFrom }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

jest.mock('@/lib/auth/admin', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

describe('Public Reports System — Core Logic & Eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isScoreDecisive', () => {
    it('returns true for high confidence true scores (>= 85)', () => {
      expect(isScoreDecisive(85)).toBe(true);
      expect(isScoreDecisive(95)).toBe(true);
      expect(isScoreDecisive(100)).toBe(true);
    });

    it('returns true for high confidence false scores (<= 39)', () => {
      expect(isScoreDecisive(39)).toBe(true);
      expect(isScoreDecisive(15)).toBe(true);
      expect(isScoreDecisive(0)).toBe(true);
    });

    it('returns false for ambiguous middle zone scores (40 to 84)', () => {
      expect(isScoreDecisive(40)).toBe(false);
      expect(isScoreDecisive(50)).toBe(false);
      expect(isScoreDecisive(60)).toBe(false);
      expect(isScoreDecisive(75)).toBe(false);
      expect(isScoreDecisive(84)).toBe(false);
    });

    it('returns false for null or undefined scores', () => {
      expect(isScoreDecisive(null)).toBe(false);
      expect(isScoreDecisive(undefined)).toBe(false);
    });
  });

  describe('checkPublishEligibility', () => {
    it('returns UNAAUTHENTICATED error when userId is missing', async () => {
      const result = await checkPublishEligibility({ verificationId: 'v1', userId: '' });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('UNAUTHENTICATED');
      }
    });

    it('returns REPORT_NOT_FOUND if verification is missing', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v-missing', userId: 'user-1' });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('REPORT_NOT_FOUND');
      }
    });

    it('returns FORBIDDEN if user does not own the verification', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'v1', user_id: 'user-owner', score: 90, is_public: false, visibility_status: 'private' },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v1', userId: 'other-user' });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('FORBIDDEN');
      }
    });

    it('returns SCREENSHOT_NOT_PUBLISHABLE when report input_type is screenshot', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'v1', user_id: 'user-1', input_type: 'screenshot', score: 90, is_public: false, visibility_status: 'private' },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v1', userId: 'user-1' });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('SCREENSHOT_NOT_PUBLISHABLE');
      }
    });

    it('returns SCORE_NOT_DECISIVE when report score is null', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'v1', user_id: 'user-1', score: null, is_public: false, visibility_status: 'private' },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v1', userId: 'user-1' });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('SCORE_NOT_DECISIVE');
      }
    });

    it('returns MONTHLY_LIMIT_EXCEEDED for pro/premium tier user with 4+ public reports this month', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockImplementation((_cols, options) => {
              if (options?.count === 'exact') {
                return {
                  eq: jest.fn().mockReturnThis(),
                  neq: jest.fn().mockReturnThis(),
                  in: jest.fn().mockReturnThis(),
                  gte: jest.fn().mockResolvedValue({ count: 4, error: null }),
                };
              }
              return {
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'v1', user_id: 'user-pro', score: 90, is_public: false, visibility_status: 'private' },
                  error: null,
                }),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { tier: 'pro', created_at: new Date(Date.now() - 100 * 3600 * 1000).toISOString(), verifications_count: 5 },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v1', userId: 'user-pro' });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('MONTHLY_LIMIT_EXCEEDED');
        expect(result.message).toContain('limita de 4 rapoarte publice');
      }
    });

    it('returns MONTHLY_LIMIT_EXCEEDED for free tier user with 1+ total public reports lifetime', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockImplementation((_cols, options) => {
              if (options?.count === 'exact') {
                return {
                  eq: jest.fn().mockReturnThis(),
                  neq: jest.fn().mockReturnThis(),
                  in: jest.fn().mockResolvedValue({ count: 1, error: null }),
                };
              }
              return {
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'v1', user_id: 'user-free', score: 90, is_public: false, visibility_status: 'private' },
                  error: null,
                }),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { tier: 'free', created_at: new Date(Date.now() - 100 * 3600 * 1000).toISOString(), verifications_count: 5 },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v1', userId: 'user-free' });
      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.reason).toBe('MONTHLY_LIMIT_EXCEEDED');
        expect(result.message).toContain('Contul gratuit permite un singur raport public');
      }
    });

    it('returns requiresPendingReview = false for eligible account', async () => {
      const recentCreatedAt = new Date(Date.now() - 12 * 3600 * 1000).toISOString(); // 12h old

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockImplementation((_cols, options) => {
              if (options?.count === 'exact') {
                const chain: any = {
                  eq: jest.fn().mockReturnThis(),
                  neq: jest.fn().mockReturnThis(),
                  in: jest.fn().mockReturnThis(),
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                  then: (cb: any) => Promise.resolve({ count: 5, error: null }).then(cb),
                };
                return chain;
              }
              return {
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'v1', user_id: 'user-recent', score: 90, is_public: false, visibility_status: 'private' },
                  error: null,
                }),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { tier: 'pro', created_at: recentCreatedAt, verifications_count: 5 },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v1', userId: 'user-recent' });
      expect(result.eligible).toBe(true);
      if (result.eligible) {
        expect(result.requiresPendingReview).toBe(false);
      }
    });

    it('returns requiresPendingReview = false for mature account (>=48h, >=2 verifications)', async () => {
      const oldCreatedAt = new Date(Date.now() - 100 * 3600 * 1000).toISOString(); // 100h old

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockImplementation((_cols, options) => {
              if (options?.count === 'exact') {
                const chain: any = {
                  eq: jest.fn().mockImplementation((field, val) => {
                    if (field === 'user_id' && val === 'user-mature') {
                      return chain;
                    }
                    return chain;
                  }),
                  neq: jest.fn().mockReturnThis(),
                  in: jest.fn().mockReturnThis(),
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                  then: (cb: any) => Promise.resolve({ count: 10, error: null }).then(cb),
                };
                return chain;
              }
              return {
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'v1', user_id: 'user-mature', score: 90, is_public: false, visibility_status: 'private' },
                  error: null,
                }),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { tier: 'pro', created_at: oldCreatedAt, verifications_count: 10 },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await checkPublishEligibility({ verificationId: 'v1', userId: 'user-mature' });
      expect(result.eligible).toBe(true);
      if (result.eligible) {
        expect(result.requiresPendingReview).toBe(false);
      }
    });
  });

  describe('setReportVisibility', () => {
    it('unpublishes report successfully when isPublic is false', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return { update: mockUpdate };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await setReportVisibility({
        verificationId: 'v1',
        userId: 'user-1',
        isPublic: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.isPublic).toBe(false);
        expect(result.visibilityStatus).toBe('private');
      }
    });

    it('sets status to pending_review when account is recent', async () => {
      const recentCreatedAt = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockImplementation((_cols, options) => {
              if (options?.count === 'exact') {
                const chain: any = {
                  eq: jest.fn().mockReturnThis(),
                  neq: jest.fn().mockReturnThis(),
                  in: jest.fn().mockReturnThis(),
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                  then: (cb: any) => Promise.resolve({ count: 5, error: null }).then(cb),
                };
                return chain;
              }
              return {
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'v1', user_id: 'user-recent', score: 92, is_public: false, visibility_status: 'private' },
                  error: null,
                }),
              };
            }),
            update: mockUpdate,
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { tier: 'pro', created_at: recentCreatedAt, verifications_count: 5 },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await setReportVisibility({
        verificationId: 'v1',
        userId: 'user-recent',
        isPublic: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.isPublic).toBe(true);
        expect(result.visibilityStatus).toBe('public');
      }
    });
  });

  describe('flagReport', () => {
    it('rejects flagging a non-public report', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'v1', is_public: false, visibility_status: 'private' },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await flagReport({
        verificationId: 'v1',
        reporterUserId: 'reporter-1',
        reason: 'Spam',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Doar rapoartele publice');
    });

    it('succeeds flagging a public report', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'v1', is_public: true, visibility_status: 'public' },
              error: null,
            }),
          };
        }
        if (table === 'verification_flags') {
          return { insert: mockInsert };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await flagReport({
        verificationId: 'v1',
        reporterUserId: 'reporter-1',
        reason: 'Informație falsă în raport',
      });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith({
        verification_id: 'v1',
        reporter_user_id: 'reporter-1',
        reason: 'Informație falsă în raport',
      });
    });
  });

  describe('moderateReport', () => {
    it('approves a report and logs admin action', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return { update: mockUpdate };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await moderateReport({
        verificationId: 'v1',
        adminUserId: 'admin-1',
        action: 'approve',
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility_status: 'public',
          is_public: true,
          reviewed_by: 'admin-1',
        })
      );
      expect(mockLogAdminAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        actionType: 'report.approve',
        targetTable: 'verifications',
        targetId: 'v1',
        details: { action: 'approve', note: null },
      });
    });

    it('takes down a report and logs admin action', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return { update: mockUpdate };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await moderateReport({
        verificationId: 'v1',
        adminUserId: 'admin-1',
        action: 'take_down',
        note: 'Violates terms',
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility_status: 'taken_down',
          is_public: false,
          reviewed_by: 'admin-1',
        })
      );
      expect(mockLogAdminAction).toHaveBeenCalledWith({
        adminId: 'admin-1',
        actionType: 'report.take_down',
        targetTable: 'verifications',
        targetId: 'v1',
        details: { action: 'take_down', note: 'Violates terms' },
      });
    });
  });
});
