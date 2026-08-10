import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Link,
  Font,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { VerificationReport, Verdict } from '@/types/verification';
import type { ReportSynthesis } from '@/lib/ai/report-synthesis';
import { sourceHref } from '@/components/verify/ReportView/sourceLink';

/**
 * The downloadable PDF report. Rendered server-side with @react-pdf so it is a
 * real file (not the browser's print dialog), embeds a font that carries
 * Romanian diacritics, and keeps every source link clickable.
 */

// Fonts are served from /public and fetched by @react-pdf at render time. The
// default PDF fonts (Helvetica) lack ș/ț/ă, so Inter (UI) + Source Serif (the
// claim and quotes) are registered explicitly.
const FONT_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let fontsRegistered = false;
function ensureFonts(): void {
  if (fontsRegistered) return;
  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${FONT_BASE}/fonts/Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${FONT_BASE}/fonts/Inter-SemiBold.ttf`, fontWeight: 600 },
      { src: `${FONT_BASE}/fonts/Inter-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: 'SourceSerif',
    fonts: [{ src: `${FONT_BASE}/fonts/SourceSerif-Regular.ttf`, fontWeight: 400 }],
  });
  // Long URLs and Romanian words should not be hyphenated mid-word.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const COLOR = {
  ink: '#17140f',
  inkSecondary: '#524d44',
  inkMuted: '#8a8478',
  paperShade: '#ece9e1',
  line: '#e5e3db',
  lineStrong: '#d6d2c8',
  accent: '#c0392b',
};

const VERDICT_COLOR: Record<Verdict, string> = {
  true: '#1a6b54',
  partial: '#986516',
  unclear: '#4d5866',
  false: '#a63a39',
};

const VERDICT_WORD: Record<'ro' | 'en', Record<Verdict, string>> = {
  ro: { true: 'Probabil adevărat', partial: 'Parțial adevărat', unclear: 'Neclar', false: 'Probabil fals' },
  en: { true: 'Likely true', partial: 'Partly true', unclear: 'Unclear', false: 'Likely false' },
};

export function verdictWordFor(verdict: Verdict, locale: 'ro' | 'en'): string {
  return VERDICT_WORD[locale][verdict];
}

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
    seePassage: 'Vezi pasajul exact →',
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
    seePassage: 'Go to the exact passage →',
    disclaimerLabel: 'Note',
  },
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: 46,
    fontFamily: 'Inter',
    fontSize: 9.5,
    lineHeight: 1.5,
    color: COLOR.inkSecondary,
  },
  masthead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1.5,
    borderBottomColor: COLOR.ink,
    paddingBottom: 9,
    marginBottom: 18,
  },
  brand: { fontSize: 15, fontWeight: 700, color: COLOR.ink },
  bracket: { color: COLOR.accent, fontWeight: 700 },
  docKind: { fontSize: 8, color: COLOR.inkMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  metaRight: { fontSize: 8, color: COLOR.inkMuted, textAlign: 'right', lineHeight: 1.5 },
  verdictWord: { fontSize: 21, fontWeight: 700, letterSpacing: -0.3 },
  score: { fontSize: 9, color: COLOR.inkMuted, marginTop: 3 },
  section: { marginTop: 18 },
  label: {
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLOR.inkMuted,
    marginBottom: 5,
    fontWeight: 600,
  },
  claim: { fontFamily: 'SourceSerif', fontSize: 14, lineHeight: 1.4, color: COLOR.ink },
  commentaryBox: {
    marginTop: 12,
    backgroundColor: COLOR.paperShade,
    borderRadius: 6,
    padding: 12,
  },
  commentaryText: { fontFamily: 'SourceSerif', fontSize: 11, color: COLOR.inkSecondary },
  commentaryNote: { fontSize: 8, color: COLOR.inkMuted, marginTop: 6 },
  body: { fontSize: 9.5, color: COLOR.inkSecondary },
  bullet: { flexDirection: 'row', marginBottom: 4 },
  bulletDot: { color: COLOR.accent, marginRight: 6 },
  consensusRow: { marginBottom: 6 },
  consensusKey: { fontWeight: 600, color: COLOR.ink },
  source: {
    paddingVertical: 9,
    borderBottomWidth: 0.75,
    borderBottomColor: COLOR.line,
  },
  sourceHead: { flexDirection: 'row' },
  sourceIndex: { width: 20, fontSize: 8, color: COLOR.inkMuted, fontWeight: 600 },
  sourceBody: { flex: 1 },
  sourceTitle: { fontSize: 10, fontWeight: 600, color: COLOR.ink, textDecoration: 'none' },
  sourceMeta: { fontSize: 8, color: COLOR.inkMuted, marginTop: 1 },
  stancePill: { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  takeaway: { fontSize: 9, color: COLOR.inkSecondary, marginTop: 4 },
  quote: {
    fontFamily: 'SourceSerif',
    fontSize: 9,
    color: COLOR.inkSecondary,
    marginTop: 5,
    paddingLeft: 9,
    borderLeftWidth: 1,
    borderLeftColor: COLOR.lineStrong,
  },
  passageLink: { fontSize: 8, color: COLOR.accent, marginTop: 4, textDecoration: 'none' },
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 46,
    right: 46,
    borderTopWidth: 0.75,
    borderTopColor: COLOR.line,
    paddingTop: 8,
  },
  disclaimer: { fontSize: 7.5, color: COLOR.inkMuted, lineHeight: 1.45 },
});

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

function stanceColor(stance: string): string {
  if (/confirm/i.test(stance)) return VERDICT_COLOR.true;
  if (/contra|contrad/i.test(stance)) return VERDICT_COLOR.false;
  return COLOR.inkMuted;
}

interface DocProps {
  report: VerificationReport;
  synthesis: ReportSynthesis;
  locale: 'ro' | 'en';
}

function ReportPdf({ report, synthesis, locale }: DocProps): React.ReactElement {
  const t = STRINGS[locale];
  const verdictColor = VERDICT_COLOR[report.verdict];
  const claim = report.verifiedClaim ?? report.claim ?? report.inputText ?? '';
  const sources = report.sources ?? [];
  const insightByIndex = new Map(synthesis.sourceInsights.map((s) => [s.index, s]));

  return (
    <Document title={`${t.docKind} — Verifact`} author="Verifact">
      <Page size="A4" style={styles.page}>
        <View style={styles.masthead} fixed>
          <View>
            <Text style={styles.brand}>
              <Text style={styles.bracket}>[</Text>Verifact<Text style={styles.bracket}>]</Text>
            </Text>
            <Text style={styles.docKind}>{t.docKind}</Text>
          </View>
          <Text style={styles.metaRight}>
            {t.generatedOn} {formatDate(report.createdAt ?? new Date().toISOString(), locale)}
            {'\n'}
            {t.reportId}: {report.id}
          </Text>
        </View>

        <View>
          <Text style={[styles.verdictWord, { color: verdictColor }]}>
            {verdictWordFor(report.verdict, locale)}
          </Text>
          <Text style={styles.score}>
            {t.scoreLabel}: {report.score}/100
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.claimLabel}</Text>
          <Text style={styles.claim}>&ldquo;{claim}&rdquo;</Text>
        </View>

        {report.posterCommentary ? (
          <View style={styles.commentaryBox}>
            <Text style={styles.label}>{t.commentaryLabel}</Text>
            <Text style={styles.commentaryText}>&ldquo;{report.posterCommentary}&rdquo;</Text>
            <Text style={styles.commentaryNote}>{t.commentaryNote}</Text>
            {synthesis.commentaryAssessment ? (
              <Text style={[styles.commentaryNote, { color: COLOR.inkSecondary }]}>
                {synthesis.commentaryAssessment}
              </Text>
            ) : null}
          </View>
        ) : null}

        {synthesis.verdictRationale ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t.rationaleLabel}</Text>
            <Text style={styles.body}>{synthesis.verdictRationale}</Text>
          </View>
        ) : null}

        {synthesis.whatToRemember.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t.rememberLabel}</Text>
            {synthesis.whatToRemember.map((item, i) => (
              <View style={styles.bullet} key={i}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {synthesis.agreements || synthesis.contradictions ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t.sourcesConsensusLabel}</Text>
            {synthesis.agreements ? (
              <Text style={[styles.body, styles.consensusRow]}>
                <Text style={styles.consensusKey}>{t.agreementsLabel}: </Text>
                {synthesis.agreements}
              </Text>
            ) : null}
            {synthesis.contradictions ? (
              <Text style={[styles.body, styles.consensusRow]}>
                <Text style={styles.consensusKey}>{t.contradictionsLabel}: </Text>
                {synthesis.contradictions}
              </Text>
            ) : null}
          </View>
        ) : null}

        {sources.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.label}>{t.sourcesLabel(sources.length)}</Text>
            {sources.map((source, i) => {
              const insight = insightByIndex.get(i + 1);
              const href = sourceHref(source.url, source.excerpt, true);
              const meta = [source.publisher, formatDate(source.date, locale)].filter(Boolean).join(' · ');
              return (
                <View style={styles.source} key={source.url ?? i} wrap={false}>
                  <View style={styles.sourceHead}>
                    <Text style={styles.sourceIndex}>{String(i + 1).padStart(2, '0')}</Text>
                    <View style={styles.sourceBody}>
                      <Link src={source.url} style={styles.sourceTitle}>
                        {source.title}
                      </Link>
                      <Text style={styles.sourceMeta}>
                        {meta}
                        {insight ? (
                          <Text style={[styles.stancePill, { color: stanceColor(insight.stance) }]}>
                            {'   '}
                            {insight.stance}
                          </Text>
                        ) : null}
                      </Text>
                      {insight?.takeaway ? <Text style={styles.takeaway}>{insight.takeaway}</Text> : null}
                      {source.excerpt ? (
                        <Text style={styles.quote}>&ldquo;{source.excerpt.slice(0, 260)}&rdquo;</Text>
                      ) : null}
                      {source.excerpt ? (
                        <Link src={href} style={styles.passageLink}>
                          {t.seePassage}
                        </Link>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.disclaimer}>
            <Text style={{ fontWeight: 600 }}>{t.disclaimerLabel}: </Text>
            {report.disclaimer}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Renders the report to a PDF Buffer, ready to stream as an attachment. */
export async function renderReportPdf(props: DocProps): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<ReportPdf {...props} />);
}
