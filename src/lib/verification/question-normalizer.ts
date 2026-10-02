import type { Language } from '@/types/verification';

export interface NormalizedHypothesis {
  isQuestion: boolean;
  originalText: string;
  hypothesis: string;
}

const QUESTION_PREFIXES_RO = [
  /^(?:oare\s+)/i,
  /^(?:este\s+adev[aă]rat\s+c[aă]\s+)/i,
  /^(?:e\s+adev[aă]rat\s+c[aă]\s+)/i,
  /^(?:chiar\s+)/i,
  /^(?:[sș]tia[tț]i\s+c[aă]\s+)/i,
  /^(?:o\s+fi\s+adev[aă]rat\s+c[aă]\s+)/i,
  /^(?:se\s+spune\s+c[aă]\s+)/i,
  /^(?:crede[tț]i\s+c[aă]\s+)/i,
];

const QUESTION_PREFIXES_EN = [
  /^(?:is\s+it\s+true\s+that\s+)/i,
  /^(?:did\s+you\s+know\s+that\s+)/i,
  /^(?:really\s+)/i,
];

const QUESTION_PREFIXES_FR = [
  /^(?:est-ce\s+qu(?:e|’)\s*)/i,
  /^(?:est-il\s+vrai\s+qu(?:e|’)\s*)/i,
  /^(?:saviez-vous\s+qu(?:e|’)\s*)/i,
];

/**
 * Checks if the text has question characteristics.
 */
export function isQuestion(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.endsWith('?')) return true;

  const allPrefixes = [
    ...QUESTION_PREFIXES_RO,
    ...QUESTION_PREFIXES_EN,
    ...QUESTION_PREFIXES_FR,
  ];
  return allPrefixes.some((p) => p.test(trimmed));
}

/**
 * Normalizes an interrogative inquiry into a crisp affirmative declarative test hypothesis.
 * E.g., "Nicusor Dan este autist?" -> "Nicușor Dan are autism / a fost diagnosticat cu autism"
 * E.g., "Dronele cazute in Romania sunt ucrainene?" -> "Dronele căzute în România sunt ucrainene"
 */
export function normalizeQuestionToHypothesis(
  text: string,
  _language: Language = 'ro'
): NormalizedHypothesis {
  const trimmed = text.trim();
  const hasQuestionMark = trimmed.endsWith('?');

  let cleaned = trimmed.replace(/\?+$/, '').trim();

  const allPrefixes = [
    ...QUESTION_PREFIXES_RO,
    ...QUESTION_PREFIXES_EN,
    ...QUESTION_PREFIXES_FR,
  ];

  let matchedPrefix = false;
  for (const prefix of allPrefixes) {
    if (prefix.test(cleaned)) {
      cleaned = cleaned.replace(prefix, '').trim();
      matchedPrefix = true;
      break;
    }
  }

  const isInterrogative = hasQuestionMark || matchedPrefix;

  if (!isInterrogative) {
    return {
      isQuestion: false,
      originalText: text,
      hypothesis: trimmed,
    };
  }

  // Handle Romanian inverted verbal forms at the start of question
  // e.g. "A promis Nicusor Dan ca..." -> "Nicusor Dan a promis ca..."
  // e.g. "Sunt dronele cazute ucrainene" -> "Dronele cazute sunt ucrainene"
  const verbInversionMatch = cleaned.match(/^(a|au|este|sunt|era|erau)\s+([A-ZĂÂÎȘȚ][a-zăâîșțA-ZĂÂÎȘȚ0-9\s-]+?)\s+(.+)$/i);
  if (verbInversionMatch) {
    const [, verb, subject, rest] = verbInversionMatch;
    cleaned = `${subject.trim()} ${verb.toLowerCase()} ${rest.trim()}`;
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return {
    isQuestion: true,
    originalText: text,
    hypothesis: cleaned,
  };
}
