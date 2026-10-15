import { sanitizeOcrText } from '@/lib/verification/ocr-cleaner';

describe('sanitizeOcrText', () => {
  it.each([
    'Rețelele 5G au răspândit coronavirusul.',
    'TikTok va fi interzis în România de la anul.',
    'Ședința a început la ora 12:00 în plenul Parlamentului.',
    'Cota de TVA a crescut de la 19% la 21%.',
  ])('leaves an ordinary sentence untouched: %s', (claim) => {
    expect(sanitizeOcrText(claim)).toBe(claim);
  });

  it('drops lines that are only status bar or interface chrome', () => {
    const ocr = ['12:45  84%  5G', 'Pentru tine', 'Gata cu schimbarea orei din 2026!', 'Distribuie'].join('\n');

    expect(sanitizeOcrText(ocr)).toBe('Gata cu schimbarea orei din 2026!');
  });

  it('strips chrome out of a line where OCR ran the status bar into the caption', () => {
    const ocr = '12:45 84% 5G LIVE For You TikTok Urmărește Gata cu schimbarea orei! Comentarii 1.2k Distribuie 450';

    const cleaned = sanitizeOcrText(ocr);

    expect(cleaned).toContain('Gata cu schimbarea orei!');
    expect(cleaned).not.toMatch(/TikTok|For You|Urmărește|Distribuie|12:45/);
  });
});
