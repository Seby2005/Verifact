import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { VerdictHeader } from '@/components/report/VerdictHeader';
import { ScoreBreakdown } from '@/components/report/ScoreBreakdown';
import { LayerDetails } from '@/components/report/LayerDetails';
import { SourcesList } from '@/components/report/SourcesList';
import { ShareButtons } from '@/components/report/ShareButtons';
import type { VerificationReport } from '@/types/verification';
import styles from './report.module.css';

interface ReportPageProps { params: { id: string }; }

async function getReport(id: string): Promise<VerificationReport | null> {
  const supabase = createAdminClient();
  type VerificationRow = { report_json: Record<string, unknown> };
  const { data, error } = await (supabase.from('verifications') as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        single: () => Promise<{ data: VerificationRow | null; error: unknown }>;
      };
    };
  }).select('report_json').eq('id', id).single();
  if (error || !data) return null;
  return data.report_json as unknown as VerificationReport;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const report = await getReport(params.id);
  if (!report) return { title: 'Raport negasit - AI Fact-Checker' };
  const labels: Record<string,string> = { true: 'Probabil Adevarat', partial: 'Partial Adevarat', unclear: 'Neclar', false: 'Probabil Fals' };
  const title = labels[report.verdict] + ' (' + report.score + '%) - AI Fact-Checker';
  const description = report.executiveSummary.slice(0, 160);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://factcheck-ai.vercel.app';
  return { title, description, openGraph: { title, description, url: appUrl + '/reports/' + params.id, siteName: 'AI Fact-Checker', type: 'article' }, twitter: { card: 'summary', title, description } };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const report = await getReport(params.id);
  if (!report) notFound();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://factcheck-ai.vercel.app';
  const reportUrl = appUrl + '/reports/' + params.id;
  const ratingValue = Math.round((report.score / 100) * 4 + 1);
  const verdictNames: Record<string,string> = { true: 'Adevarat', partial: 'Partial Adevarat', unclear: 'Neclar', false: 'Fals' };
  const jsonLd = { '@context': 'https://schema.org', '@type': 'ClaimReview', url: reportUrl, claimReviewed: report.inputText, datePublished: report.createdAt, reviewRating: { '@type': 'Rating', ratingValue: String(ratingValue), bestRating: '5', worstRating: '1', alternateName: verdictNames[report.verdict] }, author: { '@type': 'Organization', name: 'AI Fact-Checker', url: appUrl } };
  
  const layer1 = report.layer1 || report.layers?.layer1;
  const layer2 = report.layer2 || report.layers?.layer2;
  const layer3 = report.layer3 || report.layers?.layer3;
  const layer4 = report.layer4 || report.layers?.layer4;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className={styles.main}>
        <VerdictHeader
          verdict={report.verdict}
          score={report.score}
          inputText={report.inputText || report.claim || ''}
          confidenceLevel={report.confidenceLevel ?? 'medium'}
          availableLayers={Array.isArray(report.scoreBreakdown?.availableLayers) ? report.scoreBreakdown.availableLayers.length : 4}
          processingTime={report.processingTimeMs ?? report.processingTime ?? 0}
          createdAt={report.createdAt}
        />
        <div className={styles.content}>
          <section className={styles.summaryCard} aria-labelledby="summary-heading">
            <h2 id="summary-heading" className={styles.summaryHeading}>Rezumat executiv</h2>
            <p className={styles.summaryText}>{report.executiveSummary}</p>
          </section>
          {report.scoreBreakdown && <ScoreBreakdown breakdown={report.scoreBreakdown} />}
          {layer1 && layer2 && layer3 && layer4 && (
            <LayerDetails
              layer1={layer1}
              layer2={layer2}
              layer3={layer3}
              layer4={layer4}
              aiAnalysis={typeof report.aiAnalysis === 'string' ? report.aiAnalysis : report.executiveSummary}
            />
          )}
          {report.sources && <SourcesList sources={report.sources} />}
          <ShareButtons reportId={report.id} reportUrl={reportUrl} disclaimer={report.disclaimer || 'Acest raport este generat de AI.'} />
        </div>
      </main>
    </>
  );
}