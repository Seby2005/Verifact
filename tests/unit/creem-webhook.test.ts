import { createHmac } from 'crypto';

const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ update: mockUpdate }));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { POST } from '@/app/api/webhooks/creem/route';

const SECRET = 'test_creem_webhook_secret';
const USER_ID = 'e9c3e210-9b43-4dc9-98fe-e1529dfb8cf8';
const PAYLOAD = { eventType: 'checkout.completed', object: { metadata: { user_id: USER_ID } } };

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

describe('Creem webhook — fail-closed signature verification', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    mockEq.mockResolvedValue({ error: null });
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

  it('processes a valid signature and activates Pro', async () => {
    process.env.CREEM_WEBHOOK_SECRET = SECRET;

    const res = await POST(signed(PAYLOAD, SECRET) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'pro' }));
    expect(mockEq).toHaveBeenCalledWith('id', USER_ID);
  });
});
