/**
 * Heuristic sanitization for noisy OCR extractions (e.g., screenshots from TikTok, Facebook, Instagram, X).
 * Strips phone status bars, battery/telecom icons, and platform interface chrome
 * before sending to LLM extraction or fallback query generation.
 */

const STATUS_BAR_REGEX = /\b(?:\d{1,2}:\d{2}(?::\d{2})?|\d{1,3}%|5G[\.\s]?\d*|4G|LTE|Wi-Fi|VOLTE)\b/gi;

const SOCIAL_CHROME_REGEX = /\b(?:Urmărește|Urmărești|Distribuie|Distribuiri|Comentarii|Comentează|Apreciază|Aprecieri|Partajează|For You|Pentru tine|TikTok|Reels|Live|Trimite|Salvează|Vezi traducerea|See translation|Following|Friends|Inbox|Profile|Home|Explore|Search|Share|Comment|Like|Follow|Subscribe)\b/gi;

const ARTIFACT_SYMBOLS_REGEX = /[↓↑✓くボбоIIIཁملԺ«»„”~#@&_—+=]+/g;

/**
 * Strips known social media UI noise and phone status indicators line by line.
 */
export function sanitizeOcrText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  const lines = rawText.split(/\r?\n/);
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line is purely UI indicators (e.g. "08:45", "5G. 67", "LIVE", "STEM", "Q", "Home")
    const withoutStatus = trimmed
      .replace(STATUS_BAR_REGEX, '')
      .replace(SOCIAL_CHROME_REGEX, '')
      .replace(ARTIFACT_SYMBOLS_REGEX, '')
      .trim();

    // If line has no meaningful alphanumeric characters left, skip it
    const alphaCount = (withoutStatus.match(/[\p{L}\p{N}]/gu) || []).length;
    if (alphaCount < 3) {
      continue;
    }

    // Skip standalone short platform navigation words or counters (e.g. "655", "114", "99+", "less")
    if (/^(?:\d+|\d+\+|\+|-|less|more|translate|parodie)$/i.test(withoutStatus)) {
      continue;
    }

    // Clean inline status bar & chrome tokens from remaining sentences
    const cleanedLine = trimmed
      .replace(STATUS_BAR_REGEX, ' ')
      .replace(SOCIAL_CHROME_REGEX, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (cleanedLine.length > 0) {
      cleanedLines.push(cleanedLine);
    }
  }

  return cleanedLines.join('\n');
}

/**
 * Extracts the longest coherent sentences/paragraph from sanitized text.
 * Used as high-quality fallback when LLM claim extraction is unavailable or times out.
 */
export function extractLongestCoherentText(sanitizedText: string): string {
  if (!sanitizedText || sanitizedText.trim().length === 0) return '';

  const paragraphs = sanitizedText
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 15);

  if (paragraphs.length === 0) {
    const lines = sanitizedText
      .split(/\n/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length >= 15);

    if (lines.length === 0) return sanitizedText.trim();
    lines.sort((a, b) => b.length - a.length);
    return lines[0];
  }

  // Sort by length descending, pick the longest substantial paragraph
  paragraphs.sort((a, b) => b.length - a.length);
  return paragraphs[0];
}
