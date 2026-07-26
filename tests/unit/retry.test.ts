import { withRetry, fetchWithRetry, isTransientError } from '@/lib/utils/retry';

describe('isTransientError', () => {
  it.each([
    ['Fact Check API error: 429 Too Many Requests', true],
    ['HTTP 500 Internal Server Error', true],
    ['Official Search API error: 503 Service Unavailable', true],
    ['The operation was aborted due to timeout', true],
    ['connect ECONNRESET', true],
    ['404 Not Found', false],
    ['Invalid API key', false],
    ['prepayment credits are depleted', false],
  ])('%s -> %s', (message, expected) => {
    expect(isTransientError(new Error(message))).toBe(expected);
  });

  it('inspects error.cause for a nested ECONNRESET code (Node fetch failure shape)', () => {
    const cause = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const error = new Error('fetch failed', { cause });
    expect(isTransientError(error)).toBe(true);
  });

  it('inspects a plain-object cause with a code property', () => {
    const error = new Error('fetch failed');
    (error as unknown as { cause: unknown }).cause = { code: 'ECONNRESET' };
    expect(isTransientError(error)).toBe(true);
  });

  it('treats non-Error values as their string form', () => {
    expect(isTransientError('503 from a raw string rejection')).toBe(true);
    expect(isTransientError('totally unrelated')).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns the result immediately on success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure and returns the eventual success', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(fn, { attempts: 3, baseDelayMs: 1 });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-transient error', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow('401 Unauthorized');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all attempts on a persistent transient error', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('500 Internal Server Error'));

    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toThrow('500 Internal Server Error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects isRetryable to exclude errors that only look transient (e.g. quota/billing)', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('429: billing hard limit reached'));

    await expect(
      withRetry(fn, {
        attempts: 3,
        baseDelayMs: 1,
        isRetryable: (_error, message) => !message.includes('billing'),
      })
    ).rejects.toThrow('billing hard limit reached');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchWithRetry', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns the response immediately on success', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://example.com', {}, { attempts: 3, baseDelayMs: 1 });

    expect(result.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns a non-retryable error status immediately without retrying', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('bad request', { status: 400 }));

    const result = await fetchWithRetry('https://example.com', {}, { attempts: 3, baseDelayMs: 1 });

    expect(result.status).toBe(400);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries a 503 and returns the eventual success', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    global.fetch = fetchMock;

    const result = await fetchWithRetry('https://example.com', {}, { attempts: 3, baseDelayMs: 1 });

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns the last response as-is after exhausting attempts on a persistent 429', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('rate limited', { status: 429 }));

    const result = await fetchWithRetry('https://example.com', {}, { attempts: 3, baseDelayMs: 1 });

    expect(result.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('calls the init thunk fresh on every attempt instead of reusing one signal', async () => {
    const initFactory = jest.fn(() => ({ signal: AbortSignal.timeout(5000) }));
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await fetchWithRetry('https://example.com', initFactory, { attempts: 3, baseDelayMs: 1 });

    expect(initFactory).toHaveBeenCalledTimes(2);
  });

  it('retries a network-level throw and eventually succeeds', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('connect ECONNRESET'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://example.com', {}, { attempts: 3, baseDelayMs: 1 });

    expect(result.status).toBe(200);
  });

  it('re-throws a non-transient network error immediately without retrying', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Invalid URL'));

    await expect(
      fetchWithRetry('https://example.com', {}, { attempts: 3, baseDelayMs: 1 })
    ).rejects.toThrow('Invalid URL');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws the last network error after exhausting attempts on a persistent failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(
      fetchWithRetry('https://example.com', {}, { attempts: 3, baseDelayMs: 1 })
    ).rejects.toThrow('ETIMEDOUT');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
