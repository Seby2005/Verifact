import http from 'http';
import https from 'https';
import { lookup as dnsLookup } from 'dns';
import type { LookupAddress, LookupOptions } from 'dns';
import zlib from 'zlib';
import type { Readable } from 'stream';

/**
 * GET over plain Node http/https for fetching a user-supplied URL, closing the
 * gaps a bare `fetch` leaves in the SSRF guard (see url-extract.ts):
 *
 * - The address is checked inside the connection's own DNS lookup, so the IP
 *   that was checked is the IP that is dialled. With `fetch`, the guard and
 *   the request each resolved the name, and a DNS server answering "public"
 *   then "internal" could slip a request past the check.
 * - The lookup has its own short timeout, so a resolver that never answers
 *   cannot hold the function for the whole request budget.
 * - The body is read up to `maxBytes` (after decompression) and the request is
 *   abandoned past that, so a huge page or a gzip bomb cannot exhaust memory.
 *
 * Redirects are never followed here; the caller re-validates each Location.
 * The result is a standard Response (body already buffered).
 */
export interface PinnedFetchOptions {
  headers: Record<string, string>;
  timeoutMs: number;
  maxBytes: number;
  /** True for an address that must never be connected to. */
  isBlockedAddress: (address: string) => boolean;
  /** DNS answer deadline, separate from the overall timeout. */
  lookupTimeoutMs?: number;
}

export class PinnedFetchError extends Error {
  constructor(readonly reason: 'BLOCKED' | 'TOO_LARGE' | 'NETWORK') {
    super(`pinned fetch failed: ${reason}`);
    this.name = 'PinnedFetchError';
  }
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * A `lookup` for http.request that resolves once, refuses the whole answer if
 * any address is blocked, and gives up after `timeoutMs`.
 */
export function guardedLookup(isBlockedAddress: (address: string) => boolean, timeoutMs: number) {
  return (hostname: string, options: LookupOptions, callback: LookupCallback): void => {
    let settled = false;
    const finish: LookupCallback = (err, address, family) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(err, address, family);
    };
    const timer = setTimeout(() => {
      finish(Object.assign(new Error(`DNS lookup timed out for ${hostname}`), { code: 'ETIMEOUT' }), '');
    }, timeoutMs);

    dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return finish(err, '');
      const list = addresses as LookupAddress[];
      if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
        return finish(Object.assign(new Error('blocked address'), { code: 'EBLOCKED' }), '');
      }
      if (options.all) return finish(null, list);
      finish(null, list[0].address, list[0].family);
    });
  };
}

export async function pinnedFetch(rawUrl: string, options: PinnedFetchOptions): Promise<Response> {
  const url = new URL(rawUrl);
  const client = url.protocol === 'https:' ? https : http;
  const signal = AbortSignal.timeout(options.timeoutMs);

  return new Promise<Response>((resolve, reject) => {
    const request = client.request(
      url,
      {
        method: 'GET',
        headers: { ...options.headers, 'Accept-Encoding': 'gzip, deflate, br' },
        lookup: guardedLookup(options.isBlockedAddress, options.lookupTimeoutMs ?? 3000),
        // No pooled keep-alive socket: every request dials afresh, so it always
        // goes through the guarded lookup above.
        agent: false,
        signal,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const headers = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          if (value === undefined) continue;
          headers.set(name, Array.isArray(value) ? value.join(', ') : value);
        }

        // A redirect or error page is answered from its status and headers;
        // its body is never needed.
        if (status < 200 || status >= 300) {
          res.resume();
          headers.delete('content-encoding');
          resolve(new Response(null, { status: status >= 200 && status <= 599 ? status : 502, headers }));
          return;
        }

        const declared = Number(res.headers['content-length'] ?? 0);
        if (declared > options.maxBytes) {
          res.destroy();
          reject(new PinnedFetchError('TOO_LARGE'));
          return;
        }

        const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase();
        let body: Readable = res;
        if (encoding === 'gzip' || encoding === 'x-gzip') body = res.pipe(zlib.createGunzip());
        else if (encoding === 'deflate') body = res.pipe(zlib.createInflate());
        else if (encoding === 'br') body = res.pipe(zlib.createBrotliDecompress());
        headers.delete('content-encoding');
        headers.delete('content-length');

        const chunks: Buffer[] = [];
        let received = 0;
        body.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > options.maxBytes) {
            res.destroy();
            body.destroy();
            reject(new PinnedFetchError('TOO_LARGE'));
            return;
          }
          chunks.push(chunk);
        });
        body.on('end', () => resolve(new Response(new Uint8Array(Buffer.concat(chunks)), { status, headers })));
        body.on('error', () => reject(new PinnedFetchError('NETWORK')));
      }
    );

    request.on('error', (err: NodeJS.ErrnoException) => {
      reject(new PinnedFetchError(err.code === 'EBLOCKED' ? 'BLOCKED' : 'NETWORK'));
    });
    request.end();
  });
}
