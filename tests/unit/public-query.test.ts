import { setReportVisibility } from '@/lib/verification/public-reports';
import { getPublicReportById, listPublicReports } from '@/lib/verification/public-reports-query';
import { createClient as createServerClient } from '@/lib/supabase/server';

const mockServerFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockServerFrom }),
}));

describe('Public Reports Query Helper & show_author Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('show_author Toggle Ownership Security', () => {
    it('allows the report owner to toggle show_author', async () => {
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
                const chain = {
                  eq: jest.fn().mockReturnThis(),
                  neq: jest.fn().mockReturnThis(),
                  in: jest.fn().mockReturnThis(),
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                  then: (cb: any) => Promise.resolve({ count: 0, error: null }).then(cb),
                };
                return chain;
              }
              return {
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                  data: { id: 'v1', user_id: 'user-owner', score: 90, is_public: true, visibility_status: 'public' },
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
              data: { tier: 'pro', created_at: new Date(Date.now() - 100 * 3600 * 1000).toISOString(), verifications_count: 5 },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await setReportVisibility({
        verificationId: 'v1',
        userId: 'user-owner',
        isPublic: true,
        showAuthor: true,
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          show_author: true,
        })
      );
    });

    it('rejects toggling show_author when user does not own the report', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'v1', user_id: 'user-owner', score: 90, is_public: true, visibility_status: 'public' },
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const result = await setReportVisibility({
        verificationId: 'v1',
        userId: 'attacker-user',
        isPublic: true,
        showAuthor: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Internal Fields Leak Prevention (Object.keys strict inspection)', () => {
    const FORBIDDEN_INTERNAL_KEYS = [
      'user_id',
      'userId',
      'email',
      'tier',
      'verifications_count',
      'verificationsCount',
      'verifications_reset',
      'verificationsReset',
      'gdpr_data_export_requested_at',
      'gdpr_deletion_requested_at',
      'reviewed_by',
      'reviewedBy',
      'reviewed_at',
      'reviewedAt',
      'monthly_count',
      'monthlyCount',
      'anonymous_hash',
      'anonymousHash',
    ];

    it('getPublicReportById NEVER returns forbidden internal fields in object keys', async () => {
      const mockRawDbRow = {
        id: 'v-public-1',
        user_id: 'secret-user-uuid-123',
        input_text: 'Public claim text',
        verdict: 'true',
        score: 90,
        visibility_status: 'public',
        show_author: true,
        language: 'ro',
        created_at: '2026-08-12T10:00:00Z',
        published_at: '2026-08-12T10:05:00Z',
        report_json: { executiveSummary: 'Test summary' },
        profiles: {
          username: 'johndoe',
          email: 'secret@domain.com',
          tier: 'pro',
          verifications_count: 42,
        },
      };

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockImplementation(() => ({
                single: jest.fn().mockResolvedValue({ data: mockRawDbRow, error: null }),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const report = await getPublicReportById('v-public-1');
      expect(report).not.toBeNull();

      if (report) {
        const keys = Object.keys(report);
        FORBIDDEN_INTERNAL_KEYS.forEach((forbiddenKey) => {
          expect(keys).not.toContain(forbiddenKey);
          expect((report as unknown as Record<string, unknown>)[forbiddenKey]).toBeUndefined();
        });

        expect(report.authorName).toBe('johndoe');
        expect(report.showAuthor).toBe(true);
      }
    });

    it('getPublicReportById sets authorName to null when show_author is false', async () => {
      const mockRawDbRow = {
        id: 'v-public-2',
        user_id: 'secret-user-uuid-456',
        input_text: 'Anonymous claim text',
        verdict: 'false',
        score: 10,
        visibility_status: 'public',
        show_author: false,
        language: 'ro',
        created_at: '2026-08-12T10:00:00Z',
        published_at: '2026-08-12T10:05:00Z',
        report_json: { executiveSummary: 'Test summary' },
        profiles: { username: 'secretuser' },
      };

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockImplementation(() => ({
                single: jest.fn().mockResolvedValue({ data: mockRawDbRow, error: null }),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const report = await getPublicReportById('v-public-2');
      expect(report).not.toBeNull();
      if (report) {
        expect(report.showAuthor).toBe(false);
        expect(report.authorName).toBeNull();
      }
    });

    it('listPublicReports NEVER returns forbidden internal fields in summary object keys', async () => {
      const mockRawDbRows = [
        {
          id: 'v-public-1',
          user_id: 'secret-user-uuid-123',
          input_text: 'Public claim 1',
          verdict: 'true',
          score: 90,
          created_at: '2026-08-12T10:00:00Z',
          published_at: '2026-08-12T10:05:00Z',
          show_author: true,
          profiles: { username: 'alice', email: 'alice@domain.com', tier: 'pro' },
        },
        {
          id: 'v-public-2',
          user_id: 'secret-user-uuid-456',
          input_text: 'Public claim 2',
          verdict: 'false',
          score: 20,
          created_at: '2026-08-12T11:00:00Z',
          published_at: '2026-08-12T11:05:00Z',
          show_author: false,
          profiles: { username: 'bob', email: 'bob@domain.com', tier: 'free' },
        },
      ];

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'verifications') {
          return {
            select: jest.fn().mockImplementation((_cols, options) => {
              if (options?.count === 'exact') {
                return {
                  eq: jest.fn().mockReturnThis(),
                  order: jest.fn().mockReturnThis(),
                  range: jest.fn().mockResolvedValue({ data: mockRawDbRows, count: 2, error: null }),
                };
              }
              return {
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: mockRawDbRows, count: 2, error: null }),
              };
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const { reports, totalCount } = await listPublicReports({ page: 1, limit: 10 });
      expect(totalCount).toBe(2);
      expect(reports.length).toBe(2);

      reports.forEach((report) => {
        const keys = Object.keys(report);
        FORBIDDEN_INTERNAL_KEYS.forEach((forbiddenKey) => {
          expect(keys).not.toContain(forbiddenKey);
          expect((report as unknown as Record<string, unknown>)[forbiddenKey]).toBeUndefined();
        });
      });

      expect(reports[0].authorName).toBe('alice');
      expect(reports[1].authorName).toBeNull();
    });
  });
});
