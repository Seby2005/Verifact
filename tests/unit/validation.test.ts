import { Language } from '@/types/verification';

// Pure utility functions to test validation logic
export function validateFile(file: { name: string; size: number; type: string }): { isValid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      isValid: false,
      error: `Fișierul încărcat are ${(file.size / (1024 * 1024)).toFixed(1)} MB. Dimensiunea maximă permisă este 10 MB.`,
    };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const nameLower = file.name.toLowerCase();
  const validExt = nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.webp');

  if (!allowedTypes.includes(file.type) && !validExt) {
    return {
      isValid: false,
      error: 'Format fișier nepermis. Vă rugăm încărcați doar imagini JPEG, PNG sau WEBP.',
    };
  }

  return { isValid: true };
}

export function validateText(text: string): { isValid: boolean; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return { isValid: false, error: 'Textul trebuie să conțină minim 10 caractere.' };
  }
  if (text.length > 2000) {
    return { isValid: false, error: 'Textul depășește limita maximă de 2000 caractere.' };
  }
  return { isValid: true };
}

export function validateUrl(url: string): boolean {
  if (!url || !url.trim()) return false;
  const pattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i;
  return pattern.test(url.trim());
}

export function detectLanguage(str: string): Language {
  if (!str || str.trim().length < 10) return 'ro';
  const roWords = ['și', 'sau', 'este', 'sunt', 'pentru', 'despre', 'după', 'care', 'stire', 'guvern'];
  const enWords = ['the', 'is', 'are', 'and', 'for', 'about', 'after', 'which', 'news', 'government'];

  const lower = str.toLowerCase();
  let roCount = 0;
  let enCount = 0;

  roWords.forEach((w) => {
    if (lower.includes(` ${w} `) || lower.startsWith(`${w} `)) roCount++;
  });
  enWords.forEach((w) => {
    if (lower.includes(` ${w} `) || lower.startsWith(`${w} `)) enCount++;
  });

  if (roCount > enCount) return 'ro';
  if (enCount > roCount) return 'en';
  return 'ro';
}

describe('Verification Flow Validation Logic', () => {
  describe('File Validation', () => {
    it('should pass for valid JPEG image under 10MB', () => {
      const result = validateFile({ name: 'test.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' });
      expect(result.isValid).toBe(true);
    });

    it('should pass for valid PNG image under 10MB', () => {
      const result = validateFile({ name: 'screenshot.png', size: 5 * 1024 * 1024, type: 'image/png' });
      expect(result.isValid).toBe(true);
    });

    it('should reject file over 10MB with explicit error message specifying file size', () => {
      const result = validateFile({ name: 'huge_image.png', size: 12 * 1024 * 1024, type: 'image/png' });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('12.0 MB');
      expect(result.error).toContain('10 MB');
    });

    it('should reject invalid file types (e.g. PDF or TXT)', () => {
      const result = validateFile({ name: 'document.pdf', size: 1 * 1024 * 1024, type: 'application/pdf' });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Format fișier nepermis');
    });
  });

  describe('Text Validation', () => {
    it('should reject text under 10 characters', () => {
      const result = validateText('scurt');
      expect(result.isValid).toBe(false);
    });

    it('should accept valid text between 10 and 2000 characters', () => {
      const result = validateText('Aceasta este o știre care trebuie verificată atent.');
      expect(result.isValid).toBe(true);
    });

    it('should reject text over 2000 characters', () => {
      const longText = 'a'.repeat(2001);
      const result = validateText(longText);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('depășește limita');
    });
  });

  describe('URL Validation', () => {
    it('should validate proper HTTP/HTTPS URLs', () => {
      expect(validateUrl('https://www.digi24.ro/stiri/stire-test')).toBe(true);
      expect(validateUrl('http://g4media.ro/articol')).toBe(true);
    });

    it('should reject malformed or non-URL strings', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('http://')).toBe(false);
    });
  });

  describe('Language Detection', () => {
    it('should detect Romanian for Romanian text', () => {
      const lang = detectLanguage('Guvernul este pregătit pentru noi măsuri după știre');
      expect(lang).toBe('ro');
    });

    it('should detect English for English text', () => {
      const lang = detectLanguage('The government is preparing about news and rules');
      expect(lang).toBe('en');
    });
  });
});
