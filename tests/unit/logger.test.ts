import { logger } from '@/lib/utils/logger';

describe('logger', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  function parseLastCall(spy: jest.SpyInstance): Record<string, unknown> {
    const line = spy.mock.calls[spy.mock.calls.length - 1][0];
    return JSON.parse(line);
  }

  it('logs at error level via console.error with level/message/timestamp', () => {
    logger.error('something failed');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const entry = parseLastCall(errorSpy);
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('something failed');
    expect(typeof entry.timestamp).toBe('string');
    expect(new Date(entry.timestamp as string).toString()).not.toBe('Invalid Date');
  });

  it('logs at warn level via console.warn', () => {
    logger.warn('careful');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(parseLastCall(warnSpy).level).toBe('warn');
  });

  it('logs at info level via console.log', () => {
    logger.info('starting up');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(parseLastCall(logSpy).level).toBe('info');
  });

  it('logs at debug level via console.log', () => {
    logger.debug('trace detail');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(parseLastCall(logSpy).level).toBe('debug');
  });

  it('includes context when provided', () => {
    logger.error('save failed', { service: 'db-operations', userId: 'user-1' });

    const entry = parseLastCall(errorSpy);
    expect(entry.context).toEqual({ service: 'db-operations', userId: 'user-1' });
  });

  it('omits the context key entirely when no context is given', () => {
    logger.error('plain message');

    const entry = parseLastCall(errorSpy);
    expect('context' in entry).toBe(false);
  });

  it('expands an Error value in context into name/message/stack', () => {
    const err = new Error('boom');

    logger.error('operation failed', { service: 'gemini', error: err });

    const entry = parseLastCall(errorSpy);
    const context = entry.context as { error: { name: string; message: string; stack: string } };
    expect(context.error.name).toBe('Error');
    expect(context.error.message).toBe('boom');
    expect(typeof context.error.stack).toBe('string');
  });

  it('produces valid, single-line JSON', () => {
    logger.info('event', { a: 1, b: 'two', c: [1, 2, 3] });

    const line = logSpy.mock.calls[0][0];
    expect(line.includes('\n')).toBe(false);
    expect(() => JSON.parse(line)).not.toThrow();
  });
});
