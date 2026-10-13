import { isOwnBrowser, markOwnBrowser } from '@/lib/analytics/own-visits';

describe('own-visit exclusion', () => {
  const globals = global as unknown as { window?: unknown };

  function browserWith(storage: Partial<Storage>) {
    globals.window = { localStorage: storage };
  }

  function workingStorage(): Partial<Storage> {
    const values = new Map<string, string>();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, String(value)),
    };
  }

  afterEach(() => {
    delete globals.window;
  });

  it('treats an unmarked browser as a regular visitor', () => {
    browserWith(workingStorage());

    expect(isOwnBrowser()).toBe(false);
  });

  it('marks the browser with the key Umami itself honours', () => {
    const storage = workingStorage();
    browserWith(storage);

    markOwnBrowser();

    expect(isOwnBrowser()).toBe(true);
    expect(storage.getItem!('umami.disabled')).not.toBeNull();
  });

  it('counts the visit, instead of throwing, where storage is blocked', () => {
    const refuse = () => {
      throw new Error('SecurityError');
    };
    browserWith({ getItem: refuse, setItem: refuse });

    expect(() => markOwnBrowser()).not.toThrow();
    expect(isOwnBrowser()).toBe(false);
  });

  it('does nothing on the server, where there is no window', () => {
    expect(() => markOwnBrowser()).not.toThrow();
    expect(isOwnBrowser()).toBe(false);
  });
});
