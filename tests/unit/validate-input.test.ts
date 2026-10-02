import { validateVerifyInput, MAX_TEXT_LENGTH } from '@/lib/verification/validate-input';

describe('validateVerifyInput', () => {
  it('rejects a non-object body', () => {
    const r = validateVerifyInput(null);
    expect(r.success).toBe(false);
  });

  it('rejects text shorter than 10 chars', () => {
    const r = validateVerifyInput({ text: 'scurt' });
    expect(r.success).toBe(false);
  });

  it('accepts valid text and defaults language/inputType', () => {
    const r = validateVerifyInput({ text: 'acesta este un text suficient de lung' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.inputType).toBe('text');
      expect(r.data.language).toBe('unknown');
      expect(r.data.isPublic).toBe(false);
    }
  });

  it('truncates text over the max length', () => {
    const long = 'a'.repeat(MAX_TEXT_LENGTH + 500);
    const r = validateVerifyInput({ text: long });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.text.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });

  it('accepts a valid URL and skips the length rule', () => {
    const r = validateVerifyInput({ inputType: 'url', text: 'https://example.com/a' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.inputType).toBe('url');
  });

  it('rejects an invalid URL', () => {
    const r = validateVerifyInput({ inputType: 'url', text: 'not-a-url' });
    expect(r.success).toBe(false);
  });

  it('normalizes an unknown language to "unknown"', () => {
    const r = validateVerifyInput({ text: 'text destul de lung pentru test', language: 'de' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.language).toBe('unknown');
  });
});
