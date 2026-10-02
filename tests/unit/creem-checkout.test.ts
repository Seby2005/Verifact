const mockGetAuthenticatedUser = jest.fn();

jest.mock('@/lib/supabase/auth-helpers', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

import { POST } from '@/app/api/checkout/creem/route';

const USER = { id: 'e9c3e210-9b43-4dc9-98fe-e1529dfb8cf8', email: 'client@example.com' };

function makeRequest(billing: 'monthly' | 'yearly') {
  return new Request('https://verifact.ro/api/checkout/creem', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ billing }),
  });
}

describe('Creem checkout — yearly never falls back to the monthly product', () => {
  const OLD_ENV = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.CREEM_API_KEY = 'creem_test_key';
    process.env.NEXT_PUBLIC_CREEM_PRO_PRODUCT_ID = 'prod_monthly';
    delete process.env.NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID;
    delete process.env.CREEM_PRO_YEARLY_PRODUCT_ID;
    mockGetAuthenticatedUser.mockResolvedValue(USER);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    global.fetch = originalFetch;
  });

  it('fails with a configuration error instead of billing the monthly product', async () => {
    const res = await POST(makeRequest('yearly'));

    expect(res.status).toBe(500);
    // The customer picked the cheaper yearly plan; silently charging them the
    // monthly product would over-bill them.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('still creates a monthly checkout when monthly is requested', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'ch_1', checkout_url: 'https://creem.io/c/ch_1' }),
    });

    const res = await POST(makeRequest('monthly'));

    expect(res.status).toBe(200);
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(sent.product_id).toBe('prod_monthly');
  });

  it('uses the yearly product when one is configured', async () => {
    process.env.NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID = 'prod_yearly';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'ch_2', checkout_url: 'https://creem.io/c/ch_2' }),
    });

    const res = await POST(makeRequest('yearly'));

    expect(res.status).toBe(200);
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(sent.product_id).toBe('prod_yearly');
    expect(sent.metadata.billing).toBe('yearly');
  });
});
