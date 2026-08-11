import { PDFDocument, PDFFont, PDFName, PDFString, rgb, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { VerificationReport, Verdict } from '@/types/verification';
import type { ReportSynthesis } from '@/lib/ai/report-synthesis';
import { sourceHref } from '@/components/verify/ReportView/sourceLink';
import { interRegular, interBold, sourceSerif } from './font-data';

/**
 * The downloadable PDF report, drawn with pdf-lib — pure JavaScript, no React
 * and no WebAssembly, so it renders in any environment (an earlier @react-pdf
 * implementation threw React #31 on Vercel's serverless runtime). Fonts are
 * embedded from base64 (font-data.ts) so Romanian diacritics render and nothing
 * is fetched at request time.
 */

const VERDICT_WORD: Record<'ro' | 'en', Record<Verdict, string>> = {
  ro: { true: 'Probabil adevărat', partial: 'Parțial adevărat', unclear: 'Neclar', false: 'Probabil fals' },
  en: { true: 'Likely true', partial: 'Partly true', unclear: 'Unclear', false: 'Likely false' },
};

export function verdictWordFor(verdict: Verdict, locale: 'ro' | 'en'): string {
  return VERDICT_WORD[locale][verdict];
}

const INK = rgb(0.09, 0.078, 0.059);
const INK_SEC = rgb(0.322, 0.302, 0.267);
const INK_MUTED = rgb(0.541, 0.518, 0.471);
const LINE = rgb(0.898, 0.89, 0.859);
const LINE_STRONG = rgb(0.839, 0.824, 0.784);
const ACCENT = rgb(0.753, 0.224, 0.169);

const VERDICT_COLOR: Record<Verdict, RGB> = {
  true: rgb(0.102, 0.42, 0.329),
  partial: rgb(0.596, 0.396, 0.086),
  unclear: rgb(0.302, 0.345, 0.4),
  false: rgb(0.651, 0.227, 0.224),
};

const STRINGS = {
  ro: {
    docKind: 'Raport de verificare',
    generatedOn: 'Generat la',
    reportId: 'ID raport',
    scoreLabel: 'Scor de veridicitate',
    claimLabel: 'Afirmația verificată',
    commentaryLabel: 'Comentariul distribuitorului (neverificat)',
    commentaryNote: 'Verdictul se referă la afirmația factuală de mai sus, nu la această interpretare.',
    rationaleLabel: 'De ce acest verdict',
    rememberLabel: 'Ce e de reținut',
    sourcesConsensusLabel: 'Ce spun sursele',
    agreementsLabel: 'Convergență',
    contradictionsLabel: 'Diferențe',
    sourcesLabel: (n: number) => `Surse citate (${n})`,
    seePassage: 'Vezi pasajul exact',
    disclaimerLabel: 'Precizare',
  },
  en: {
    docKind: 'Verification report',
    generatedOn: 'Generated on',
    reportId: 'Report ID',
    scoreLabel: 'Veracity score',
    claimLabel: 'Verified claim',
    commentaryLabel: "The sharer's commentary (unverified)",
    commentaryNote: 'The verdict concerns the factual claim above, not this interpretation.',
    rationaleLabel: 'Why this verdict',
    rememberLabel: 'What to remember',
    sourcesConsensusLabel: 'What the sources say',
    agreementsLabel: 'Agreement',
    contradictionsLabel: 'Differences',
    sourcesLabel: (n: number) => `Cited sources (${n})`,
    seePassage: 'Go to the exact passage',
    disclaimerLabel: 'Note',
  },
} as const;

function dataUriToBytes(uri: string): Uint8Array {
  const base64 = uri.slice(uri.indexOf(',') + 1);
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function formatDate(iso: string | undefined, locale: 'ro' | 'en'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function stanceColor(stance: string): RGB {
  if (/confirm/i.test(stance)) return VERDICT_COLOR.true;
  if (/contra|contrad/i.test(stance)) return VERDICT_COLOR.false;
  return INK_MUTED;
}

interface DocProps {
  report: VerificationReport;
  synthesis: ReportSynthesis;
  locale: 'ro' | 'en';
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 46;
const CONTENT_W = PAGE_W - MARGIN * 2;

export async function renderReportPdf({ report, synthesis, locale }: DocProps): Promise<Buffer> {
  const t = STRINGS[locale];
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(dataUriToBytes(interRegular), { subset: false });
  const bold = await doc.embedFont(dataUriToBytes(interBold), { subset: false });
  const serif = await doc.embedFont(dataUriToBytes(sourceSerif), { subset: false });

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const need = (h: number) => {
    if (y - h < MARGIN + 30) newPage();
  };
  const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();

  const wrap = (str: string, font: PDFFont, size: number, maxW: number): string[] => {
    const out: string[] = [];
    const words = clean(str).split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    return out;
  };

  interface TextOpts {
    font?: PDFFont;
    size?: number;
    color?: RGB;
    x?: number;
    maxW?: number;
    lh?: number;
    gap?: number;
  }
  const drawText = (str: string, o: TextOpts = {}): void => {
    const font = o.font ?? reg;
    const size = o.size ?? 9.5;
    const color = o.color ?? INK_SEC;
    const x = o.x ?? MARGIN;
    const maxW = o.maxW ?? CONTENT_W;
    const lineHeight = size * (o.lh ?? 1.45);
    for (const line of wrap(str, font, size, maxW)) {
      need(lineHeight);
      page.drawText(line, { x, y: y - size, size, font, color });
      y -= lineHeight;
    }
    y -= o.gap ?? 0;
  };

  const drawLabel = (str: string): void => {
    need(16);
    page.drawText(str.toUpperCase(), { x: MARGIN, y: y - 7.5, size: 7.5, font: bold, color: INK_MUTED });
    y -= 7.5 * 1.3 + 5;
  };

  const addLink = (x1: number, y1: number, x2: number, y2: number, url: string): void => {
    try {
      const annot = doc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x1, y1, x2, y2],
        Border: [0, 0, 0],
        A: doc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(url) }),
      });
      const ref = doc.context.register(annot);
      const existing = page.node.Annots();
      if (existing) existing.push(ref);
      else page.node.set(PDFName.of('Annots'), doc.context.obj([ref]));
    } catch {
      /* a missing link annotation must never break the document */
    }
  };

  const drawLink = (str: string, url: string, o: TextOpts = {}): void => {
    const font = o.font ?? reg;
    const size = o.size ?? 10;
    const color = o.color ?? ACCENT;
    const x = o.x ?? MARGIN;
    const maxW = o.maxW ?? CONTENT_W;
    const lineHeight = size * (o.lh ?? 1.35);
    for (const line of wrap(str, font, size, maxW)) {
      need(lineHeight);
      const w = font.widthOfTextAtSize(line, size);
      page.drawText(line, { x, y: y - size, size, font, color });
      addLink(x, y - size - 1.5, x + w, y + 1.5, url);
      y -= lineHeight;
    }
    y -= o.gap ?? 0;
  };

  const rule = (color: RGB, thickness: number): void => {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness, color });
  };

  const claim = report.verifiedClaim ?? report.claim ?? report.inputText ?? '';
  const sources = report.sources ?? [];
  const insightBy = new Map(synthesis.sourceInsights.map((s) => [s.index, s]));

  // ── Masthead ──────────────────────────────────────────────────────────────
  const brandSize = 15;
  let bx = MARGIN;
  page.drawText('[', { x: bx, y: y - brandSize, size: brandSize, font: bold, color: ACCENT });
  bx += bold.widthOfTextAtSize('[', brandSize);
  page.drawText('Verifact', { x: bx, y: y - brandSize, size: brandSize, font: bold, color: INK });
  bx += bold.widthOfTextAtSize('Verifact', brandSize);
  page.drawText(']', { x: bx, y: y - brandSize, size: brandSize, font: bold, color: ACCENT });

  const dateStr = `${t.generatedOn} ${formatDate(report.createdAt ?? new Date().toISOString(), locale)}`;
  const idStr = `${t.reportId}: ${report.id}`;
  page.drawText(dateStr, { x: PAGE_W - MARGIN - reg.widthOfTextAtSize(dateStr, 8), y: y - 8, size: 8, font: reg, color: INK_MUTED });
  page.drawText(idStr, { x: PAGE_W - MARGIN - reg.widthOfTextAtSize(idStr, 8), y: y - 19, size: 8, font: reg, color: INK_MUTED });

  y -= brandSize + 4;
  page.drawText(t.docKind.toUpperCase(), { x: MARGIN, y: y - 8, size: 8, font: reg, color: INK_MUTED });
  y -= 8 + 9;
  rule(INK, 1.5);
  y -= 18;

  // ── Verdict ───────────────────────────────────────────────────────────────
  need(36);
  page.drawText(verdictWordFor(report.verdict, locale), { x: MARGIN, y: y - 21, size: 21, font: bold, color: VERDICT_COLOR[report.verdict] });
  y -= 21 * 1.15;
  page.drawText(`${t.scoreLabel}: ${report.score}/100`, { x: MARGIN, y: y - 9, size: 9, font: reg, color: INK_MUTED });
  y -= 9 * 1.4 + 16;

  // ── Claim ─────────────────────────────────────────────────────────────────
  drawLabel(t.claimLabel);
  drawText(`“${claim}”`, { font: serif, size: 14, color: INK, lh: 1.4, gap: 16 });

  // ── Commentary (screenshot case) ──────────────────────────────────────────
  if (report.posterCommentary) {
    drawLabel(t.commentaryLabel);
    drawText(`“${report.posterCommentary}”`, { font: serif, size: 11, color: INK_SEC, gap: 3 });
    drawText(t.commentaryNote, { font: reg, size: 8, color: INK_MUTED, gap: 2 });
    if (synthesis.commentaryAssessment) drawText(synthesis.commentaryAssessment, { font: reg, size: 8.5, color: INK_SEC, gap: 0 });
    y -= 16;
  }

  // ── Rationale ─────────────────────────────────────────────────────────────
  if (synthesis.verdictRationale) {
    drawLabel(t.rationaleLabel);
    drawText(synthesis.verdictRationale, { gap: 16 });
  }

  // ── What to remember ──────────────────────────────────────────────────────
  if (synthesis.whatToRemember.length > 0) {
    drawLabel(t.rememberLabel);
    for (const item of synthesis.whatToRemember) {
      need(12);
      page.drawText('•', { x: MARGIN, y: y - 9.5, size: 9.5, font: reg, color: ACCENT });
      drawText(item, { x: MARGIN + 12, maxW: CONTENT_W - 12, gap: 2 });
    }
    y -= 14;
  }

  // ── What the sources say ──────────────────────────────────────────────────
  if (synthesis.agreements || synthesis.contradictions) {
    drawLabel(t.sourcesConsensusLabel);
    if (synthesis.agreements) drawText(`${t.agreementsLabel}: ${synthesis.agreements}`, { gap: 4 });
    if (synthesis.contradictions) drawText(`${t.contradictionsLabel}: ${synthesis.contradictions}`, { gap: 4 });
    y -= 12;
  }

  // ── Sources ───────────────────────────────────────────────────────────────
  if (sources.length > 0) {
    drawLabel(t.sourcesLabel(sources.length));
    sources.forEach((s, i) => {
      need(46);
      const bodyX = MARGIN + 20;
      const bodyW = CONTENT_W - 20;
      page.drawText(String(i + 1).padStart(2, '0'), { x: MARGIN, y: y - 9, size: 8, font: bold, color: INK_MUTED });
      drawLink(s.title, s.url, { font: bold, size: 10, color: INK, x: bodyX, maxW: bodyW, lh: 1.3, gap: 1 });

      const insight = insightBy.get(i + 1);
      const meta =
        [s.publisher, formatDate(s.date, locale)].filter(Boolean).join(' · ') +
        (insight ? `    ${insight.stance.toUpperCase()}` : '');
      // The stance word is drawn separately in colour, after the muted meta.
      const metaBase = [s.publisher, formatDate(s.date, locale)].filter(Boolean).join(' · ');
      page.drawText(metaBase, { x: bodyX, y: y - 8, size: 8, font: reg, color: INK_MUTED });
      if (insight) {
        const mw = reg.widthOfTextAtSize(`${metaBase}    `, 8);
        page.drawText(insight.stance.toUpperCase(), { x: bodyX + mw, y: y - 8, size: 7, font: bold, color: stanceColor(insight.stance) });
      }
      y -= 8 * 1.3 + 2;

      if (insight?.takeaway) drawText(insight.takeaway, { font: reg, size: 9, color: INK_SEC, x: bodyX, maxW: bodyW, gap: 2 });
      if (s.excerpt) drawText(`“${s.excerpt.slice(0, 260)}”`, { font: serif, size: 9, color: INK_SEC, x: bodyX + 9, maxW: bodyW - 9, gap: 2 });
      if (s.excerpt) drawLink(`${t.seePassage} →`, sourceHref(s.url, s.excerpt, true), { font: reg, size: 8, color: ACCENT, x: bodyX, maxW: bodyW, gap: 5 });

      need(8);
      page.drawLine({ start: { x: bodyX, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75, color: LINE });
      y -= 9;
    });
  }

  // ── Disclaimer ────────────────────────────────────────────────────────────
  y -= 8;
  need(34);
  rule(LINE_STRONG, 0.75);
  y -= 11;
  drawText(`${t.disclaimerLabel}: ${report.disclaimer ?? ''}`, { font: reg, size: 7.5, color: INK_MUTED, lh: 1.45 });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
