import http from 'http';
import zlib from 'zlib';
import type { AddressInfo } from 'net';
import { pinnedFetch, PinnedFetchError, guardedLookup } from '@/lib/verification/pinned-fetch';

/**
 * Runs against a real local HTTP server. The loopback address is what a real
 * caller must never reach, so each test chooses what `isBlockedAddress` says
 * about it: "allowed" to exercise the transport, "blocked" to prove the check
 * happens at connect time.
 */
let server: http.Server;
let base: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/big') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('x'.repeat(5000));
    } else if (req.url === '/gzip') {
      res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' });
      res.end(zlib.gzipSync('<p>comprimat</p>'));
    } else if (req.url === '/redirect') {
      res.writeHead(302, { location: 'http://example.com/next' });
      res.end();
    } else {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<p>Salut, România</p>');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const allow = { headers: {}, timeoutMs: 5000, maxBytes: 1000, isBlockedAddress: () => false };

describe('pinnedFetch', () => {
  it('returns the page as a Response when the address is allowed', async () => {
    const res = await pinnedFetch(`${base}/`, allow);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toBe('<p>Salut, România</p>');
  });

  it('refuses to connect when the resolved address is blocked', async () => {
    await expect(
      pinnedFetch(`${base}/`, { ...allow, isBlockedAddress: () => true })
    ).rejects.toEqual(new PinnedFetchError('BLOCKED'));
  });

  it('abandons a body larger than maxBytes', async () => {
    await expect(pinnedFetch(`${base}/big`, allow)).rejects.toEqual(new PinnedFetchError('TOO_LARGE'));
  });

  it('decompresses a gzip body', async () => {
    const res = await pinnedFetch(`${base}/gzip`, allow);
    expect(await res.text()).toBe('<p>comprimat</p>');
  });

  it('does not follow redirects, leaving the Location to the caller', async () => {
    const res = await pinnedFetch(`${base}/redirect`, allow);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://example.com/next');
  });
});

describe('guardedLookup', () => {
  it('rejects the whole answer when any address is blocked', (done) => {
    const lookup = guardedLookup((addr) => addr === '127.0.0.1' || addr === '::1', 3000);
    lookup('localhost', {}, (err) => {
      expect((err as NodeJS.ErrnoException | null)?.code).toBe('EBLOCKED');
      done();
    });
  });
});
