import { GET, POST } from '@/app/api/admin/oportunitati/route';
import { PATCH } from '@/app/api/admin/oportunitati/[id]/route';
import { requireAdmin, AuthorizationError } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { aggregateDailyOpportunities, saveOpportunities } from '@/lib/opportunities/trends-service';

jest.mock('@/lib/auth/admin', () => ({
  requireAdmin: jest.fn(),
  logAdminAction: jest.fn().mockResolvedValue(undefined),
  AuthorizationError: class AuthorizationError extends Error {
    constructor(message: string, public readonly status: 401 | 403) {
      super(message);
      this.name = 'AuthorizationError';
    }
  },
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/opportunities/trends-service', () => ({
  aggregateDailyOpportunities: jest.fn(),
  saveOpportunities: jest.fn(),
}));

describe('Admin Opportunities API Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/oportunitati', () => {
    it('returns 403 when user is not an admin', async () => {
      (requireAdmin as jest.Mock).mockRejectedValue(
        new AuthorizationError('Admin privileges required', 403)
      );

      const request = new Request('http://localhost:3000/api/admin/oportunitati');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Admin privileges required');
    });

    it('returns opportunities matching the requested status for authenticated admin', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        role: 'admin',
      });

      const mockOpportunities = [
        {
          id: 'opp-1',
          title: 'Alegeri 2026',
          source_name: 'Google Trends',
          trend_rank: 1,
          status: 'new',
          fetched_at: '2026-08-14T06:00:00.000Z',
        },
      ];

      const mockOrder2 = jest.fn().mockResolvedValue({ data: mockOpportunities, error: null });
      const mockOrder1 = jest.fn().mockReturnValue({ order: mockOrder2 });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder1 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const request = new Request('http://localhost:3000/api/admin/oportunitati?status=new');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.opportunities).toHaveLength(1);
      expect(data.opportunities[0].title).toBe('Alegeri 2026');
      expect(mockEq).toHaveBeenCalledWith('status', 'new');
    });
  });

  describe('POST /api/admin/oportunitati', () => {
    it('returns 403 when caller is not admin', async () => {
      (requireAdmin as jest.Mock).mockRejectedValue(
        new AuthorizationError('Admin privileges required', 403)
      );

      const response = await POST();
      expect(response.status).toBe(403);
    });

    it('triggers aggregation and returns updated opportunities for admin', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        role: 'admin',
      });

      (aggregateDailyOpportunities as jest.Mock).mockResolvedValue([
        { title: 'Trend Nou', source_url: 'https://trends.google.com', source_name: 'Google Trends', trend_rank: 1 },
      ]);
      (saveOpportunities as jest.Mock).mockResolvedValue({
        success: true,
        totalFetched: 1,
        inserted: 1,
        skippedDuplicates: 0,
        errors: [],
      });

      const mockOpportunities = [
        {
          id: 'opp-2',
          title: 'Trend Nou',
          source_name: 'Google Trends',
          trend_rank: 1,
          status: 'new',
        },
      ];

      const mockOrder2 = jest.fn().mockResolvedValue({ data: mockOpportunities, error: null });
      const mockOrder1 = jest.fn().mockReturnValue({ order: mockOrder2 });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder1 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const response = await POST();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.opportunities).toHaveLength(1);
      expect(aggregateDailyOpportunities).toHaveBeenCalledTimes(1);
      expect(saveOpportunities).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /api/admin/oportunitati/[id]', () => {
    it('rejects invalid status payloads with 400', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        role: 'admin',
      });

      const request = new Request('http://localhost:3000/api/admin/oportunitati/opp-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'invalid_status' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'opp-1' }) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Status invalid');
    });

    it('successfully updates status to reviewed or dismissed for authenticated admin', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123' },
        role: 'admin',
      });

      const updatedRecord = {
        id: 'opp-1',
        title: 'Alegeri 2026',
        status: 'reviewed',
      };

      const mockSelect = jest.fn().mockResolvedValue({ data: [updatedRecord], error: null });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate });

      (createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom });

      const request = new Request('http://localhost:3000/api/admin/oportunitati/opp-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewed' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'opp-1' }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('reviewed');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'reviewed' });
      expect(mockEq).toHaveBeenCalledWith('id', 'opp-1');
    });
  });
});
