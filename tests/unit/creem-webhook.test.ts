import { createHmac } from 'crypto';

// profiles: update(...).eq('id', ...).neq|eq(...) resolves; webhook_events: insert(...) resolves.
const mockFinal = jest.fn();
const mockEq = jest.fn(() => ({ neq: mockFinal, eq: mockFinal }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockInsert = jest.fn();
const mockFrom = jest.fn((table: string) =>
  table === 'webhook_events'
    ? { insert: mockInsert, delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
    : { update: mockUpdate }
);

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { POST } from '@/app/api/webhooks/creem/route';

const SECRET = 'test_creem_webhook_secret';
const PRO_PRODUCT = 'prod_pro_monthly';
const USER_ID = 'e9c3e210-9b43-4dc9-98fe-e1529dfb8cf8';
const PAYLOAD = {
  id: 'evt_1',
  eventType: 'checkout.completed',
  object: { status: 'completed', product: { id: PRO_PRODUCT }, metadata: { user_id: USER_ID } },
};

function makeRequest(body: object, headers: Record<string, string>) {
  return new Request('https://verifact.ro/api/webhooks/creem', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function signed(body: object, secret: string) {
  const raw = JSON.stringify(body);
  const sig = createHmac('sha256', secret).update(raw).digest('hex');
  return new Request('https://verifact.ro/api/webhooks/creem', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'creem-signature': sig },
    body: raw,
  });
}

describe('Creem webhook', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, NEXT_PUBLIC_CREEM_PRO_PRODUCT_ID: PRO_PRODUCT };
    mockFinal.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('rejects with 503 and does NOT touch profiles when the secret is unset', async () => {
    delete process.env.CREEM_WEBHOOK_SECRET;

    const res = await POST(makeRequest(PAYLOAD, {}) as never);

    expect(res.status).toBe(503);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects with 401 on an invalid signature, no DB write', async () => {
    process.env.CREEM_WEBHOOK_SECRET = SECRET;

    const res = await POST(makeRequest(PAYLOAD, { 'creem-signature': 'deadbeef' }) as never);

    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('processes a valid signature for the Pro product and activates Pro, never over a Business tier', async () => {
    process.env.CREEM_WEBHOOK_SECRET = SECRET;

    const res = await POST(signed(PAYLOAD, SECRET) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'evt_1', provider: 'creem' }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'pro' }));
    expect(mockEq).toHaveBeenCalledWith('id', USER_ID);
    expect(mockFinal).toHaveBeenCalledWith('tier', 'business');
  });

  it('ignores a purchase of any product other than Pro', async () => {
    process.env.CREEM_WEBHOOK_SECRET = SECRET;
    const other = { ...PAYLOAD, object: { ...PAYLOAD.object, product: { id: 'prod_something_else' } } };

    const res = await POST(signed(other, SECRET) as never);

    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('ignores an activation whose object is not paid', async () => {
    process.env.CREEM_WEBHOOK_SECRET = SECRET;
    const unpaid = { ...PAYLOAD, object: { ...PAYLOAD.object, status: 'pending' } };

    await POST(signed(unpaid, SECRET) as never);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('acknowledges a replayed event id without acting on it', async () => {
    process.env.CREEM_WEBHOOK_SECRET = SECRET;
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    const res = await POST(signed(PAYLOAD, SECRET) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.duplicate).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('downgrades only a pro account on cancellation, and ignores past_due', async () => {
    process.env.CREEM_WEBHOOK_SECRET = SECRET;

    await POST(signed({ ...PAYLOAD, id: 'evt_2', eventType: 'subscription.past_due' }, SECRET) as never);
    expect(mockUpdate).not.toHaveBeenCalled();

    await POST(signed({ ...PAYLOAD, id: 'evt_3', eventType: 'subscription.canceled' }, SECRET) as never);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'free' }));
    expect(mockFinal).toHaveBeenCalledWith('tier', 'pro');
  });
});
