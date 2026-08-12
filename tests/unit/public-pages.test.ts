import { createClient as createServerClient } from '@/lib/supabase/server';

// Mock Supabase Server client
const mockServerFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockServerFrom }),
}));

// Helper logic mimicking /rapoarte/[id] page query
async function getPublicReport(id: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('verifications')
      .select('id, input_text, verdict, score, is_public, visibility_status, show_author, language, created_at, published_at, report_json, profiles(username)')
      .eq('id', id)
      .eq('visibility_status', 'public')
      .single();

    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    if (row.visibility_status !== 'public') return null;

    return row;
  } catch {
    return null;
  }
}

describe('Public Pages — 404 Safeguard & Visibility Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null (404 notFound) for a report with visibility_status = "pending_review"', async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'verifications') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation((field: string, val: string) => {
            if (field === 'visibility_status' && val === 'public') {
              // Filtering eq('visibility_status', 'public') returns null for pending_review
              return {
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } }),
              };
            }
            return {
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'v-pending', visibility_status: 'pending_review', is_public: false },
                error: null,
              }),
            };
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const report = await getPublicReport('v-pending');
    expect(report).toBeNull();
  });

  it('returns null (404 notFound) for private, taken_down, or rejected reports', async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'verifications') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } }),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    expect(await getPublicReport('v-private')).toBeNull();
    expect(await getPublicReport('v-takedown')).toBeNull();
    expect(await getPublicReport('v-rejected')).toBeNull();
  });

  it('returns report data successfully for visibility_status = "public"', async () => {
    const mockPublicRow = {
      id: 'v-public',
      input_text: 'Test public claim',
      verdict: 'true',
      score: 90,
      is_public: true,
      visibility_status: 'public',
      show_author: true,
      profiles: { username: 'testuser' },
    };

    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'verifications') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue({ data: mockPublicRow, error: null }),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const report = await getPublicReport('v-public');
    expect(report).not.toBeNull();
    expect(report?.id).toBe('v-public');
    expect(report?.visibility_status).toBe('public');
  });
});
