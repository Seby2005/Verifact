export type Locale = 'ro' | 'en' | 'fr';

export interface TranslationParams {
  [key: string]: string | number;
}

/**
 * Safely resolves a nested dot-separated key (e.g. "header.nav.reports") in a dictionary.
 * Supports string interpolation for placeholders like {param}.
 */
export function getTranslation(
  dict: Record<string, unknown>,
  key: string,
  params?: TranslationParams
): string {
  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  if (params) {
    return current.replace(/\{(\w+)\}/g, (_, match: string) => {
      return match in params ? String(params[match]) : `{${match}}`;
    });
  }

  return current;
}
