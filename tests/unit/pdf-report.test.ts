import { renderReportPdf, verdictWordFor, getReportFilename } from '@/lib/pdf/ReportDocument';
import type { VerificationReport } from '@/types/verification';
import type { ReportSynthesis } from '@/lib/ai/report-synthesis';

const mockReport: VerificationReport = {
  id: 'test-report-123',
  inputText: 'Afirmație de test pentru verificare PDF',
  inputType: 'text',
  createdAt: '2026-08-10T12:00:00Z',
  verdict: 'partial',
  score: 61,
  confidenceLevel: 'medium',
  executiveSummary: 'Sinteză executivă de test',
  verifiedClaim: 'Afirmație de test pentru verificare PDF',
  claim: 'Afirmație de test pentru verificare PDF',
  scoreBreakdown: {
    finalScore: 61,
    layer1Score: 60,
    layer2Score: 65,
    layer3Score: 50,
    layer4Score: 50,
    aiScore: 60,
    layer1Weight: 0.35,
    layer2Weight: 0.3,
    layer3Weight: 0.25,
    layer4Weight: 0.1,
    availableLayers: 2,
    adjustedForAvailability: false,
    weights: { factCheck: 0.35, news: 0.3, official: 0.25, social: 0.1, ai: 0.22 }
  },
  sources: [
    { title: 'Sursă de test', url: 'https://example.com/test', publisher: 'test.com', sourceType: 'news', relevance: 0.9, excerpt: 'Pasaj de test' }
  ],
  disclaimer: 'Precizare de test',
  isPublic: false,
  language: 'ro'
};

const mockSynthesis: ReportSynthesis = {
  verdictRationale: 'Explicație de test',
  whatToRemember: ['Punct 1 de reținut', 'Punct 2 de reținut'],
  agreements: 'Convergență surse',
  contradictions: 'Diferențe surse',
  commentaryAssessment: 'Analiză comentariu',
  sourceInsights: [
    { index: 1, stance: 'context', takeaway: 'Sursă utilă' }
  ]
};

describe('getReportFilename', () => {
  it('formats filename with verified claim title', () => {
    const filename = getReportFilename(mockReport);
    expect(filename).toBe('Raport Verifact - Afirmație de test pentru verificare PDF.pdf');
  });

  it('strips invalid characters and truncates long claims', () => {
    const report: VerificationReport = {
      ...mockReport,
      verifiedClaim: 'Atacuri cu drone asupra rafinăriilor de petrol din Rusia / Ucraina: detalii complete?'
    };
    const filename = getReportFilename(report);
    expect(filename).not.toContain('/');
    expect(filename).not.toContain(':');
    expect(filename).not.toContain('?');
    expect(filename.startsWith('Raport Verifact - ')).toBe(true);
    expect(filename.endsWith('.pdf')).toBe(true);
  });
});

describe('verdictWordFor', () => {
  it('returns correct localized verdict words', () => {
    expect(verdictWordFor('true', 'ro')).toBe('Probabil adevărat');
    expect(verdictWordFor('partial', 'ro')).toBe('Parțial adevărat');
    expect(verdictWordFor('false', 'en')).toBe('Likely false');
  });
});

describe('renderReportPdf', () => {
  it('renders a non-empty PDF buffer without throwing', async () => {
    const pdfBuffer = await renderReportPdf({ report: mockReport, synthesis: mockSynthesis, locale: 'ro' });
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.slice(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
