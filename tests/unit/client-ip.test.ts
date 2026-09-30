import { describe, it, expect } from '@jest/globals';
import { getClientIp } from '@/lib/utils/client-ip';

describe('getClientIp', () => {
  it('should extract x-real-ip when present', () => {
    const req = new Request('https://verifact.ro/api/verify', {
      headers: {
        'x-real-ip': '203.0.113.195',
      },
    });
    expect(getClientIp(req)).toBe('203.0.113.195');
  });

  it('should extract x-vercel-forwarded-for first IP if x-real-ip is missing', () => {
    const req = new Request('https://verifact.ro/api/verify', {
      headers: {
        'x-vercel-forwarded-for': '198.51.100.10, 10.0.0.1',
      },
    });
    expect(getClientIp(req)).toBe('198.51.100.10');
  });

  it('should fall back to x-forwarded-for when vercel headers are absent', () => {
    const req = new Request('https://verifact.ro/api/verify', {
      headers: {
        'x-forwarded-for': '192.0.2.1, 10.0.0.2',
      },
    });
    expect(getClientIp(req)).toBe('192.0.2.1');
  });

  it('should default to 127.0.0.1 when no IP headers are present', () => {
    const req = new Request('https://verifact.ro/api/verify');
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
});
