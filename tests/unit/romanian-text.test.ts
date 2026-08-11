import { normalizeRomanianDiacritics, stripMarkdown } from '@/lib/utils/romanian-text';

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

describe('stripMarkdown', () => {
  it('removes ### headers and heading labels without deleting text content', () => {
    expect(stripMarkdown('### Rezumat: Afirmația este falsă.')).toBe('Afirmația este falsă.');
    expect(stripMarkdown('### 1. Punct cheie de reținut')).toBe('1. Punct cheie de reținut');
  });

  it('removes bold and italic markdown syntax', () => {
    expect(stripMarkdown('**Afirmația** este *falsă*.')).toBe('Afirmația este falsă.');
  });

  it('handles empty input gracefully', () => {
    expect(stripMarkdown('')).toBe('');
  });
});
