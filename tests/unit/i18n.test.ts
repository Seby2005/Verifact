import { getTranslation } from '@/i18n/language';
import { ro } from '@/i18n/dictionaries/ro';
import { en } from '@/i18n/dictionaries/en';

describe('i18n core and dictionaries', () => {
  it('should return nested translation keys correctly from Romanian dictionary', () => {
    const title = getTranslation(ro, 'header.nav.disinformation');
    expect(title).toBe('Dezinformare');
  });

  it('should return nested translation keys correctly from English dictionary', () => {
    const title = getTranslation(en, 'header.nav.disinformation');
    expect(title).toBe('Disinformation');
  });

  it('should format string parameters correctly', () => {
    const formatted = getTranslation(ro, 'footer.copyright', { year: 2026 });
    expect(formatted).toBe('© 2026 Verifact. Licență MIT.');

    const formattedEn = getTranslation(en, 'footer.copyright', { year: 2026 });
    expect(formattedEn).toBe('© 2026 Verifact. MIT License.');
  });

  it('should return key if translation path does not exist', () => {
    const missing = getTranslation(ro, 'header.nonexistent.key');
    expect(missing).toBe('header.nonexistent.key');
  });

  it('should return key if dictionary node is not a string', () => {
    const notString = getTranslation(ro, 'header.nav');
    expect(notString).toBe('header.nav');
  });

  it('should have matching translation keys between RO and EN dictionaries', () => {
    function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      return Object.keys(obj).reduce((acc: string[], key: string) => {
        const pre = prefix.length ? `${prefix}.` : '';
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          acc.push(...getKeys(obj[key] as Record<string, unknown>, `${pre}${key}`));
        } else {
          acc.push(`${pre}${key}`);
        }
        return acc;
      }, []);
    }

    const roKeys = getKeys(ro as unknown as Record<string, unknown>).sort();
    const enKeys = getKeys(en as unknown as Record<string, unknown>).sort();

    expect(roKeys).toEqual(enKeys);
  });

  it('should translate glossary and resource keys in both RO and EN', () => {
    expect(getTranslation(ro, 'glossaryPage.title')).toBe('Glosar de dezinformare');
    expect(getTranslation(en, 'glossaryPage.title')).toBe('Disinformation Glossary');

    expect(getTranslation(ro, 'glossaryPage.terms.0.title')).toBe(
      'Dezinformare (vs. misinformare, vs. malinformare)'
    );
    expect(getTranslation(en, 'glossaryPage.terms.0.title')).toBe(
      'Disinformation (vs. misinformation vs. malinformation)'
    );

    expect(getTranslation(ro, 'resourcesPage.title')).toBe('Ghiduri și resurse educaționale');
    expect(getTranslation(en, 'resourcesPage.title')).toBe('Educational Guides & Resources');

    expect(getTranslation(ro, 'publishModal.title')).toBe('Publică acest raport în galeria publică');
    expect(getTranslation(en, 'publishModal.title')).toBe('Publish this report to public gallery');
  });
});
