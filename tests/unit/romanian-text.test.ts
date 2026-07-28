import { normalizeRomanianDiacritics } from '@/lib/utils/romanian-text';

describe('normalizeRomanianDiacritics', () => {
  it('rewrites cedilla forms to the Romanian comma forms', () => {
    expect(normalizeRomanianDiacritics('instrucţiuni')).toBe('instrucțiuni');
    expect(normalizeRomanianDiacritics('Ştirea')).toBe('Știrea');
    expect(normalizeRomanianDiacritics('ŞTIRE URGENTĂ')).toBe('ȘTIRE URGENTĂ');
  });

  it('leaves text that already uses comma diacritics untouched', () => {
    const correct = 'Știrea despre instituțiile statului';
    expect(normalizeRomanianDiacritics(correct)).toBe(correct);
  });

  it('does not disturb other diacritics or plain text', () => {
    expect(normalizeRomanianDiacritics('măsuri în august 2025')).toBe('măsuri în august 2025');
  });

  it('handles both spellings mixed in one string', () => {
    expect(normalizeRomanianDiacritics('instrucţiuni și instrucțiuni')).toBe(
      'instrucțiuni și instrucțiuni'
    );
  });
});
