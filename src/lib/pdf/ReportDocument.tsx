import {
  PDFDocument,
  PDFFont,
  PDFName,
  PDFString,
  LineCapStyle,
  rgb,
  setCharacterSpacing,
  type RGB,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { VerificationReport, Verdict } from '@/types/verification';
import type { ReportSynthesis } from '@/lib/ai/report-synthesis';
import { sourceHref } from '@/components/verify/ReportView/sourceLink';
import { sansRegular, sansSemiBold, sansBold } from './font-data';

/**
 * The downloadable PDF report, drawn with pdf-lib — pure JavaScript, no React
 * and no WebAssembly, so it renders in any environment (an earlier @react-pdf
 * implementation threw React #31 on Vercel's serverless runtime). Fonts are
 * embedded from base64 (font-data.ts) so Romanian diacritics render and nothing
 * is fetched at request time.
 *
 * The layout is design 3d, "Pași de verificare": the claim, three verdict
 * tiles, then the verification told as a numbered timeline that ends in the
 * conclusion. Everything is laid out in the design's own px units on an
 * enlarged page, which is then scaled down to A4 by SCALE.
 */

const VERDICT_WORD: Record<'ro' | 'en' | 'fr', Record<Verdict, string>> = {
  ro: { true: 'Probabil adevărat', partial: 'Parțial adevărat', unclear: 'Neclar', false: 'Probabil fals' },
  en: { true: 'Likely true', partial: 'Partly true', unclear: 'Unclear', false: 'Likely false' },
  fr: { true: 'Probablement vrai', partial: 'Partiellement vrai', unclear: 'Incertain', false: 'Probablement faux' },
};

export function verdictWordFor(verdict: Verdict, locale: 'ro' | 'en' | 'fr'): string {
  return VERDICT_WORD[locale][verdict];
}

/**
 * Generates a human-friendly filename for the report PDF download,
 * e.g., "Raport Verifact - Ukrainian military attacks on Russian energy.pdf".
 */
export function getReportFilename(report: VerificationReport): string {
  const rawClaim = report.verifiedClaim || report.claim || report.inputText || '';
  let cleanClaim = rawClaim
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();

  if (cleanClaim.length > 50) {
    cleanClaim = cleanClaim.slice(0, 50).replace(/\s+\S*$/, '').trim();
  }

  if (!cleanClaim) {
    const shortId = report.id ? String(report.id).slice(0, 8) : 'export';
    return `Raport Verifact - ${shortId}.pdf`;
  }

  return `Raport Verifact - ${cleanClaim}.pdf`;
}

function hex(value: string): RGB {
  const channel = (i: number) => parseInt(value.slice(i, i + 2), 16) / 255;
  return rgb(channel(1), channel(3), channel(5));
}

const INK = hex('#111111');
const BODY = hex('#3a3a40');
const MUTED = hex('#6b6b73');
const FAINT = hex('#8a8a92');
const WHITE = hex('#ffffff');
const ON_INK_MUTED = hex('#a1a1aa');
const TILE = hex('#f5f5f7');
const LINE = hex('#ececee');
const WARN_BG = hex('#fff4db');
const WARN_INK = hex('#6b4a00');
const ALERT_BG = hex('#fde8e8');
const ALERT_INK = hex('#c22b31');

/** Per verdict: the solid fill that carries white text, and the darker tone for text on white. */
const VERDICT_TONE: Record<Verdict, { fill: RGB; ink: RGB }> = {
  true: { fill: hex('#2f7d5b'), ink: hex('#256b4c') },
  partial: { fill: hex('#c0892e'), ink: hex('#8f6212') },
  unclear: { fill: hex('#6c7480'), ink: hex('#555c66') },
  false: { fill: hex('#e5484d'), ink: ALERT_INK },
};

type Stance = 'confirms' | 'contradicts' | 'context';

const STANCE_DOT: Record<Stance, RGB> = {
  confirms: VERDICT_TONE.true.fill,
  contradicts: VERDICT_TONE.false.fill,
  context: FAINT,
};

/** A source's stance, from the synthesis wording (any locale) or else the source's own flag. */
function stanceOf(insightStance: string | undefined, supports: boolean | null | undefined): Stance {
  if (insightStance) {
    if (/confirm/i.test(insightStance)) return 'confirms';
    if (/contr/i.test(insightStance)) return 'contradicts';
    return 'context';
  }
  return supports === true ? 'confirms' : supports === false ? 'contradicts' : 'context';
}

const STRINGS = {
  ro: {
    report: 'Raport',
    reportId: 'ID raport',
    quote: (s: string) => `„${s}”`,
    verdict: 'Verdict',
    veracity: 'Veridicitate',
    confidence: 'Încredere',
    confidenceWord: { low: 'Scăzută', medium: 'Medie', high: 'Ridicată' },
    commentaryLabel: 'Comentariul distribuitorului (neverificat)',
    commentaryNote: 'Verdictul se referă la afirmația factuală de mai sus, nu la această interpretare.',
    stepBreakdown: 'Am descompus afirmația',
    stepSources: 'Am căutat surse',
    stepMissing: 'Ce nu am găsit',
    stepFraming: 'Cum a fost prezentată',
    stepConclusion: 'Concluzia',
    subVerdict: { true: 'Adevărat', false: 'Fals', partial: 'Parțial', unverified: 'Neverificat' },
    stance: { confirms: 'confirmă', contradicts: 'contrazice', context: 'context' },
    agreementsLabel: 'Convergență',
    contradictionsLabel: 'Diferențe',
    seePassage: 'Vezi pasajul exact',
    rememberLabel: 'Ce e de reținut',
    journalistsLabel: 'Pentru jurnaliști',
    disclaimerLabel: 'Precizare legală și metodologie',
  },
  en: {
    report: 'Report',
    reportId: 'Report ID',
    quote: (s: string) => `“${s}”`,
    verdict: 'Verdict',
    veracity: 'Veracity',
    confidence: 'Confidence',
    confidenceWord: { low: 'Low', medium: 'Medium', high: 'High' },
    commentaryLabel: "The sharer's commentary (unverified)",
    commentaryNote: 'The verdict concerns the factual claim above, not this interpretation.',
    stepBreakdown: 'We broke the claim down',
    stepSources: 'We searched for sources',
    stepMissing: 'What we did not find',
    stepFraming: 'How it was presented',
    stepConclusion: 'The conclusion',
    subVerdict: { true: 'True', false: 'False', partial: 'Partial', unverified: 'Unverified' },
    stance: { confirms: 'confirms', contradicts: 'contradicts', context: 'context' },
    agreementsLabel: 'Agreement',
    contradictionsLabel: 'Differences',
    seePassage: 'Go to the exact passage',
    rememberLabel: 'What to remember',
    journalistsLabel: 'For journalists',
    disclaimerLabel: 'Legal disclaimer & methodology',
  },
  fr: {
    report: 'Rapport',
    reportId: 'ID du rapport',
    quote: (s: string) => `« ${s} »`,
    verdict: 'Verdict',
    veracity: 'Véracité',
    confidence: 'Confiance',
    confidenceWord: { low: 'Faible', medium: 'Moyenne', high: 'Élevée' },
    commentaryLabel: 'Commentaire du diffuseur (non vérifié)',
    commentaryNote: 'Le verdict concerne l’affirmation factuelle ci-dessus, et non cette interprétation.',
    stepBreakdown: 'Nous avons décomposé l’affirmation',
    stepSources: 'Nous avons cherché des sources',
    stepMissing: 'Ce que nous n’avons pas trouvé',
    stepFraming: 'Comment elle a été présentée',
    stepConclusion: 'La conclusion',
    subVerdict: { true: 'Vrai', false: 'Faux', partial: 'Partiel', unverified: 'Non vérifié' },
    stance: { confirms: 'confirme', contradicts: 'contredit', context: 'contexte' },
    agreementsLabel: 'Convergences',
    contradictionsLabel: 'Divergences',
    seePassage: 'Consulter le passage exact',
    rememberLabel: 'Points essentiels à retenir',
    journalistsLabel: 'Pour les journalistes',
    disclaimerLabel: 'Mentions légales & méthodologie',
  },
} as const;

function dataUriToBytes(uri: string): Uint8Array {
  const base64 = uri.slice(uri.indexOf(',') + 1);
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function formatDate(iso: string | undefined, locale: 'ro' | 'en' | 'fr'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const intlLocale = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'ro-RO';
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

interface DocProps {
  report: VerificationReport;
  synthesis: ReportSynthesis;
  locale: 'ro' | 'en' | 'fr';
}

/** Printed size of one design px, in pt. Lower it to fit more on a page. */
const SCALE = 0.8;
const PAGE_W = 595.28 / SCALE; // A4, in design px
const PAGE_H = 841.89 / SCALE;
const MARGIN = 44;
const BOTTOM = 60; // the flow stops here; page numbers sit below
const CONTENT_W = PAGE_W - MARGIN * 2;
const MARKER = 32; // diameter of a timeline step's circle
const STEP_INDENT = MARKER + 16;
/** Baseline offset below a line's centre, in em: (ascent − descent) / 2 for the sans. */
const BASELINE = 0.36;

interface Style {
  font: PDFFont;
  size: number;
  color: RGB;
  /** Line height as a multiple of the size. */
  lh: number;
  /** Letter spacing in em. */
  tracking: number;
}
/** A run inside a paragraph that overrides the paragraph's font or colour. */
interface Span {
  text: string;
  font?: PDFFont;
  color?: RGB;
}
interface Line {
  pieces: Array<{ text: string; font: PDFFont; color: RGB; x: number }>;
  width: number;
}
/** Something already measured that can be painted with its top-left corner at (x, top). */
interface Box {
  w: number;
  h: number;
  draw: (x: number, top: number) => void;
}
interface Card {
  body: Box;
  w: number;
  fill: RGB;
}

export async function renderReportPdf({ report, synthesis, locale }: DocProps): Promise<Buffer> {
  const t = STRINGS[locale];
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // Ligatures stay off: a full (non-subset) embed only records the advances of
  // glyphs reachable from the cmap, so an "fi" ligature would be drawn with the
  // default 1em advance and leave a gap after it.
  const embed = (dataUri: string) =>
    doc.embedFont(dataUriToBytes(dataUri), { subset: false, features: { liga: false } });
  const reg = await embed(sansRegular);
  const semi = await embed(sansSemiBold);
  const bold = await embed(sansBold);

  const pages: ReturnType<typeof doc.addPage>[] = [];
  let page = doc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);
  // The flow cursor: `y` is the top edge of the next thing drawn, inside the
  // column that starts at `x` and is `w` wide.
  let y = PAGE_H - MARGIN;
  let x = MARGIN;
  let w = CONTENT_W;
  // Top of the open timeline step's rail on the current page, if a step is open.
  let rail: number | null = null;

  const drawRail = (from: number, to: number): void => {
    page.drawRectangle({ x: MARGIN + MARKER / 2 - 1, y: to, width: 2, height: from - to, color: LINE });
  };

  const newPage = () => {
    if (rail !== null) {
      drawRail(rail, BOTTOM);
      rail = PAGE_H - MARGIN;
    }
    page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    y = PAGE_H - MARGIN;
  };

  const need = (h: number) => {
    if (y - h < BOTTOM) newPage();
  };

  const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();

  const style = (font: PDFFont, size: number, color: RGB, lh: number, tracking = 0): Style => ({
    font,
    size,
    color,
    lh,
    tracking,
  });

  // Text width as the sum of its characters' advances, memoised per font at
  // size 1. Shaping whole strings is the slow part of a render, and a PDF viewer
  // places glyphs by advance alone (no kerning), so this is also what gets drawn.
  const advances = new Map<PDFFont, Map<string, number>>();
  const measure = (str: string, font: PDFFont, size: number): number => {
    let cache = advances.get(font);
    if (!cache) advances.set(font, (cache = new Map()));
    let total = 0;
    for (const ch of str) {
      let unit = cache.get(ch);
      if (unit === undefined) cache.set(ch, (unit = font.widthOfTextAtSize(ch, 1)));
      total += unit;
    }
    return total * size;
  };

  /** Wraps plain or mixed-style text to `maxW`; a token wider than the column is cut to fit. */
  const layout = (content: string | Span[], s: Style, maxW: number): Line[] => {
    const spans = typeof content === 'string' ? [{ text: content }] : content;
    const lines: Line[] = [];
    let pieces: Line['pieces'] = [];
    let cursor = 0;

    for (const span of spans) {
      const font = span.font ?? s.font;
      const color = span.color ?? s.color;
      const widthOf = (str: string) => measure(str, font, s.size) + s.tracking * s.size * str.length;
      const space = widthOf(' ');

      const add = (word: string): void => {
        const wordW = widthOf(word);
        if (cursor > 0 && cursor + space + wordW > maxW) {
          lines.push({ pieces, width: cursor });
          pieces = [];
          cursor = 0;
        }
        const str = cursor > 0 ? ` ${word}` : word;
        const last = pieces[pieces.length - 1];
        if (last && last.font === font && last.color === color) last.text += str;
        else pieces.push({ text: str, font, color, x: cursor });
        cursor += cursor > 0 ? space + wordW : wordW;
      };

      for (let word of clean(span.text).split(' ')) {
        if (!word) continue;
        while (widthOf(word) > maxW && word.length > 1) {
          let n = word.length - 1;
          while (n > 1 && widthOf(word.slice(0, n)) > maxW) n--;
          add(word.slice(0, n));
          word = word.slice(n);
        }
        add(word);
      }
    }
    if (pieces.length > 0) lines.push({ pieces, width: cursor });
    return lines;
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
      /* link error ignored */
    }
  };

  const drawLine = (line: Line, s: Style, lx: number, top: number, link?: string): void => {
    const lineH = s.size * s.lh;
    const baseline = top - lineH / 2 - s.size * BASELINE;
    if (s.tracking) page.pushOperators(setCharacterSpacing(s.tracking * s.size));
    for (const piece of line.pieces) {
      page.drawText(piece.text, { x: lx + piece.x, y: baseline, size: s.size, font: piece.font, color: piece.color });
    }
    if (s.tracking) page.pushOperators(setCharacterSpacing(0));
    if (link) addLink(lx, top - lineH, lx + line.width, top, link);
  };

  const roundRect = (bx: number, top: number, bw: number, bh: number, radius: number, fill?: RGB, stroke?: RGB): void => {
    const r = Math.min(radius, bw / 2, bh / 2);
    const path =
      `M ${r} 0 H ${bw - r} A ${r} ${r} 0 0 1 ${bw} ${r} V ${bh - r} A ${r} ${r} 0 0 1 ${bw - r} ${bh} ` +
      `H ${r} A ${r} ${r} 0 0 1 0 ${bh - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    page.drawSvgPath(path, { x: bx, y: top, color: fill, borderColor: stroke, borderWidth: stroke ? 1 : 0 });
  };

  // ── Boxes: measured first, painted once they are known to fit ─────────────

  const textBox = (content: string | Span[], s: Style, maxW: number, link?: string): Box => {
    const lines = layout(content, s, maxW);
    const lineH = s.size * s.lh;
    return {
      w: Math.max(0, ...lines.map((l) => l.width)),
      h: lines.length * lineH,
      draw: (bx, top) => lines.forEach((line, i) => drawLine(line, s, bx, top - i * lineH, link)),
    };
  };

  const stack = (boxes: Box[], gap: number): Box => ({
    w: Math.max(0, ...boxes.map((b) => b.w)),
    h: boxes.reduce((sum, b) => sum + b.h, 0) + gap * Math.max(0, boxes.length - 1),
    draw: (bx, top) => {
      let cy = top;
      for (const b of boxes) {
        b.draw(bx, cy);
        cy -= b.h + gap;
      }
    },
  });

  /** `body` padded inside a rounded rectangle `bw` wide. */
  const boxed = (body: Box, bw: number, padX: number, padY: number, radius: number, fill?: RGB, stroke?: RGB): Box => {
    const h = body.h + padY * 2;
    return {
      w: bw,
      h,
      draw: (bx, top) => {
        roundRect(bx, top, bw, h, radius, fill, stroke);
        body.draw(bx + padX, top - padY);
      },
    };
  };

  // ── Flow: these advance the cursor and break pages ────────────────────────

  /** Keeps `box` whole: it moves to the next page rather than splitting. */
  const place = (box: Box): void => {
    need(box.h);
    box.draw(x, y);
    y -= box.h;
  };

  /** Running text; may break across pages between lines. */
  const para = (content: string | Span[], s: Style): void => {
    const lineH = s.size * s.lh;
    for (const line of layout(content, s, w)) {
      need(lineH);
      drawLine(line, s, x, y);
      y -= lineH;
    }
  };

  /** Cards side by side, all stretched to the tallest — a CSS grid or flex-wrap row. */
  const placeRow = (cards: Card[], gap: number, padX: number, padY: number, radius: number): void => {
    const h = Math.max(...cards.map((c) => c.body.h)) + padY * 2;
    need(h);
    let bx = x;
    for (const card of cards) {
      roundRect(bx, y, card.w, h, radius, card.fill);
      card.body.draw(bx + padX, y - padY);
      bx += card.w + gap;
    }
    y -= h;
  };

  const tone = VERDICT_TONE[report.verdict];
  let stepCount = 0;

  /**
   * One step of the verification timeline: a numbered marker on the rail, the
   * title, then `items` 10pt apart. A step with nothing to show is skipped, so
   * the numbering stays continuous. The closing step carries a check mark in
   * the verdict colour and ends the rail.
   */
  const step = (title: string, items: Array<() => void>, closing = false): void => {
    if (items.length === 0 && !closing) return;
    need(96); // never strand a marker and title at the foot of a page
    const cx = MARGIN + MARKER / 2;
    const cy = y - MARKER / 2;
    page.drawCircle({ x: cx, y: cy, size: MARKER / 2, color: closing ? tone.fill : INK });
    if (closing) {
      page.drawSvgPath('M -5.5 0.5 L -1.5 4.5 L 5.5 -4', {
        x: cx,
        y: cy,
        borderColor: WHITE,
        borderWidth: 2,
        borderLineCap: LineCapStyle.Round,
      });
    } else {
      const label = String(++stepCount);
      page.drawText(label, { x: cx - measure(label, bold, 13) / 2, y: cy - 4.6, size: 13, font: bold, color: WHITE });
    }

    rail = closing ? null : y - MARKER;
    x = MARGIN + STEP_INDENT;
    w = CONTENT_W - STEP_INDENT;
    y -= 4;
    para(title, style(bold, 19, INK, 1.25, -0.01));
    for (const item of items) {
      y -= 10;
      item();
    }
    if (rail !== null) {
      y -= 30;
      drawRail(rail, y);
      rail = null;
    }
    x = MARGIN;
    w = CONTENT_W;
  };

  const bodyText = style(reg, 15, BODY, 1.6);
  const claim = report.verifiedClaim ?? report.claim ?? report.inputText ?? '';
  const sources = report.sources ?? [];
  const insightBy = new Map(synthesis.sourceInsights.map((s) => [s.index, s]));

  // ── Header ────────────────────────────────────────────────────────────────
  const wordmark = textBox('verifact', style(bold, 20, INK, 1.2, -0.02), w);
  const dateline = textBox(
    [t.report, formatDate(report.createdAt ?? new Date().toISOString(), locale)].filter(Boolean).join(' · '),
    style(reg, 12, FAINT, 1.2),
    w
  );
  wordmark.draw(x, y);
  dateline.draw(x + w - dateline.w, y - (wordmark.h - dateline.h) / 2);
  y -= wordmark.h + 36;

  // ── Claim ─────────────────────────────────────────────────────────────────
  // Long claims step down a size so the headline never swallows the first page.
  const claimSize = claim.length > 320 ? 20 : claim.length > 160 ? 24 : 30;
  para(t.quote(claim), style(semi, claimSize, INK, 1.2, -0.025));
  y -= 24;

  // ── Verdict tiles ─────────────────────────────────────────────────────────
  const tileW = (w - 8 * 2) / 3;
  const tile = (label: string, value: string, fill: RGB, labelColor: RGB, valueColor: RGB): Card => ({
    w: tileW,
    fill,
    body: stack(
      [
        textBox(label, style(reg, 12, labelColor, 1.2), tileW - 32),
        textBox(value, style(bold, 20, valueColor, 1.2, -0.02), tileW - 32),
      ],
      4
    ),
  });
  placeRow(
    [
      tile(t.verdict, verdictWordFor(report.verdict, locale), tone.fill, WHITE, WHITE),
      tile(t.veracity, `${Math.round(report.score)} / 100`, TILE, MUTED, INK),
      tile(t.confidence, t.confidenceWord[report.confidenceLevel || 'medium'], TILE, MUTED, INK),
    ],
    8,
    16,
    16,
    18
  );

  // ── Commentary ────────────────────────────────────────────────────────────
  if (report.posterCommentary) {
    y -= 24;
    para(t.commentaryLabel, style(semi, 12, MUTED, 1.4));
    y -= 6;
    para(t.quote(report.posterCommentary), bodyText);
    y -= 6;
    para(t.commentaryNote, style(reg, 12, FAINT, 1.5));
    if (synthesis.commentaryAssessment) {
      y -= 6;
      para(synthesis.commentaryAssessment, style(reg, 13, MUTED, 1.5));
    }
  }
  y -= 36;

  // ── 1 · Sub-claims ────────────────────────────────────────────────────────
  step(
    t.stepBreakdown,
    (synthesis.subClaims ?? []).map((sc) => () => {
      const verdictTone =
        sc.verdict === 'true' || sc.verdict === 'false' || sc.verdict === 'partial'
          ? VERDICT_TONE[sc.verdict]
          : VERDICT_TONE.unclear;
      const tag = textBox(t.subVerdict[sc.verdict], style(bold, 13, verdictTone.ink, 1.4), w);
      const innerW = w - 28;
      const text = stack(
        [
          textBox(sc.subClaim, style(semi, 15, INK, 1.4), innerW - tag.w - 12),
          textBox(sc.explanation, style(reg, 13, MUTED, 1.45), innerW - tag.w - 12),
        ],
        4
      );
      const body: Box = {
        w: innerW,
        h: text.h,
        draw: (bx, top) => {
          text.draw(bx, top);
          tag.draw(bx + innerW - tag.w, top);
        },
      };
      place(boxed(body, w, 14, 14, 14, TILE));
    })
  );

  // ── 2 · Sources ───────────────────────────────────────────────────────────
  const sourceItems: Array<() => void> = [];
  for (const paragraph of (synthesis.deepReasoning ?? '').split(/\n{2,}/)) {
    if (paragraph.trim()) sourceItems.push(() => para(paragraph, bodyText));
  }
  sources.forEach((s, i) => {
    sourceItems.push(() => {
      const insight = insightBy.get(i + 1);
      const stance = stanceOf(insight?.stance, s.supports);
      const innerW = w - 28;
      const textW = innerW - 20; // past the stance dot
      const meta = [s.publisher, formatDate(s.date, locale), t.stance[stance]].filter(Boolean).join(' · ');
      const head = stack(
        [
          textBox(s.title, style(semi, 14, INK, 1.35), textW, s.url),
          textBox(meta, style(reg, 12, FAINT, 1.4), textW),
        ],
        2
      );
      const rows: Box[] = [head];
      if (insight?.takeaway && clean(insight.takeaway) !== clean(s.title)) {
        rows.push(textBox(insight.takeaway, style(reg, 13, MUTED, 1.45), textW));
      }
      if (s.excerpt) {
        rows.push(textBox(`${t.seePassage} →`, style(semi, 12, INK, 1.4), textW, sourceHref(s.url, s.excerpt, true, s.siteUrl)));
      }
      const text = stack(rows, 6);
      const body: Box = {
        w: innerW,
        h: text.h,
        draw: (bx, top) => {
          page.drawCircle({ x: bx + 4, y: top - head.h / 2, size: 4, color: STANCE_DOT[stance] });
          text.draw(bx + 20, top);
        },
      };
      place(boxed(body, w, 14, 12, 14, undefined, LINE));
    });
  });
  const consensus: Span[] = [];
  const crossSource = synthesis.crossSourceAnalysis;
  if (crossSource?.agreements) {
    consensus.push({ text: `${t.agreementsLabel}:`, font: semi, color: INK }, { text: crossSource.agreements });
  }
  if (crossSource?.contradictions) {
    consensus.push({ text: `${t.contradictionsLabel}:`, font: semi, color: INK }, { text: crossSource.contradictions });
  }
  if (consensus.length > 0) sourceItems.push(() => para(consensus, bodyText));
  step(t.stepSources, sourceItems);

  // ── 3 · Missing evidence ──────────────────────────────────────────────────
  const toolkit = synthesis.investigatorToolkit;
  const missingEvidence = toolkit?.missingEvidence ?? [];
  step(
    t.stepMissing,
    missingEvidence.length === 0
      ? []
      : [
          () => {
            // flex-wrap: chips share a row while they fit, else start the next one.
            const rows: Card[][] = [[]];
            let used = 0;
            for (const item of missingEvidence) {
              const body = textBox(item, style(reg, 14, WARN_INK, 1.4), w - 24);
              const chipW = body.w + 24;
              if (used > 0 && used + 8 + chipW > w) {
                rows.push([]);
                used = 0;
              }
              rows[rows.length - 1].push({ body, w: chipW, fill: WARN_BG });
              used += (used > 0 ? 8 : 0) + chipW;
            }
            rows.forEach((row, i) => {
              if (i > 0) y -= 8;
              placeRow(row, 8, 12, 8, 12);
            });
          },
        ]
  );

  // ── 4 · Manipulation techniques, motive and impact ────────────────────────
  const framingItems: Array<() => void> = [];
  for (const tech of synthesis.manipulationAnalysis?.techniques ?? []) {
    framingItems.push(() => {
      const name = textBox(tech.name, style(bold, 13, ALERT_INK, 1.3), w - 24);
      need(name.h + 12 + 10 + bodyText.size * bodyText.lh * 2); // the pill stays with its description
      place(boxed(name, name.w + 24, 12, 6, 99, ALERT_BG));
    });
    framingItems.push(() => para([tech.description, tech.manifestationInClaim].filter(Boolean).join(' '), bodyText));
  }
  const narrative = synthesis.narrativeAndImpact;
  const motiveText = narrative
    ? [narrative.originAndPropagation, narrative.motiveAssessment, narrative.publicImpact].filter(Boolean).join(' ')
    : '';
  if (motiveText) framingItems.push(() => para(motiveText, bodyText));
  step(t.stepFraming, framingItems);

  // ── ✓ · Conclusion ────────────────────────────────────────────────────────
  const conclusionItems: Array<() => void> = [];
  if (synthesis.verdictRationale) {
    // A short "Label:" opening is set in ink, as the design does for the rationale.
    const lead = /^([^:.!?]{2,40}:)\s+(.+)$/.exec(clean(synthesis.verdictRationale));
    const rationale: Span[] = lead
      ? [{ text: lead[1], font: semi, color: INK }, { text: lead[2] }]
      : [{ text: synthesis.verdictRationale }];
    conclusionItems.push(() => para(rationale, bodyText));
  }
  const remember = synthesis.whatToRemember ?? [];
  if (remember.length > 0) {
    conclusionItems.push(() => {
      const innerW = w - 36;
      const body = stack(
        [
          textBox(t.rememberLabel, style(semi, 12, ON_INK_MUTED, 1.4), innerW),
          ...remember.map((item) => textBox(item, style(reg, 15, WHITE, 1.5), innerW)),
        ],
        8
      );
      place(boxed(body, w, 18, 18, 16, INK));
    });
  }
  step(t.stepConclusion, conclusionItems, true);

  // ── For journalists, disclaimer ───────────────────────────────────────────
  y -= 36;
  need(72);
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: LINE });
  y -= 24;
  const journalistFaq = toolkit?.journalistFaq ?? [];
  if (journalistFaq.length > 0) {
    para(t.journalistsLabel, style(bold, 15, INK, 1.3));
    y -= 14;
    const cardW = (w - 8) / 2;
    for (let i = 0; i < journalistFaq.length; i += 2) {
      if (i > 0) y -= 8;
      placeRow(
        journalistFaq.slice(i, i + 2).map((faq) => ({
          w: cardW,
          fill: TILE,
          body: stack(
            [
              textBox(faq.question, style(semi, 14, INK, 1.35), cardW - 28),
              textBox(faq.answer, style(reg, 13, MUTED, 1.5), cardW - 28),
            ],
            4
          ),
        })),
        8,
        14,
        14,
        14
      );
    }
    y -= 20;
  }
  place(
    textBox(`${t.disclaimerLabel}: ${report.disclaimer ?? ''} ${t.reportId}: ${report.id}`, style(reg, 12, FAINT, 1.55), w)
  );

  // ── Page Numbers Footers ────────────────────────────────────────────────
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    const pageNumStr =
      locale === 'ro'
        ? `Pagina ${idx + 1} din ${totalPages}`
        : locale === 'fr'
        ? `Page ${idx + 1} sur ${totalPages}`
        : `Page ${idx + 1} of ${totalPages}`;
    p.drawText(pageNumStr, {
      x: PAGE_W - MARGIN - reg.widthOfTextAtSize(pageNumStr, 9.5),
      y: 26,
      size: 9.5,
      font: reg,
      color: FAINT,
    });
    const footerBrand =
      locale === 'fr'
        ? 'Rapport de Fact-Checking Verifact'
        : locale === 'ro'
        ? 'Raport de Fact-Checking Verifact'
        : 'Verifact AI Fact-Checking Report';
    p.drawText(footerBrand, {
      x: MARGIN,
      y: 26,
      size: 9.5,
      font: reg,
      color: FAINT,
    });
    p.scale(SCALE, SCALE);
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
