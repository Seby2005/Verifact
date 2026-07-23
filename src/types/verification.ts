// --- INPUT ----------------------------------------------------

export type InputType = 'text' | 'screenshot' | 'url';
export type Language = 'ro' | 'en' | 'unknown';
export type Verdict = 'true' | 'false' | 'partial' | 'unclear';
export type LayerStatus = 'success' | 'unavailable' | 'error' | 'skipped';

export interface VerificationInput {
  text: string;
  language: Language;
  inputType: InputType;
  isPublic: boolean;
  userId: string | null;
}

// --- STRATURI DE VERIFICARE -----------------------------------

export interface FactCheckResult {
  claimReviewed: string;
  rating: string;
  ratingValue: number;        // 0-1 normalizat (0=fals, 1=adevarat)
  publisher: string;
  publisherUrl: string;
  reviewUrl: string;
  reviewDate: string;
  claimant?: string;
  relevanceScore: number;     // 0-1, cât de relevanta e fa?a de afirma?ia noastra
}

export interface NewsArticle {
  title: string;
  source: string;
  sourceUrl: string;
  articleUrl: string;
  publishedAt: string;
  snippet: string;
  sentiment: 'confirms' | 'contradicts' | 'neutral' | 'unrelated';
  credibilityScore: number;   // 0-1
}

export interface OfficialSource {
  title: string;
  organization: string;
  organizationType: 'government' | 'international_org' | 'health_org' | 'statistics';
  documentUrl: string;
  publishedAt: string;
  relevantQuote: string;
  supportsOrDenies: 'supports' | 'denies' | 'neutral';
}

export interface SocialMediaPost {
  platform: 'twitter' | 'facebook' | 'youtube' | 'other';
  author: string;
  authorVerified: boolean;
  authorRole?: string;
  postUrl: string;
  postDate: string;
  content: string;
  isOriginalSource: boolean;
}

// --- REZULTATE PER STRAT --------------------------------------

export interface Layer1Result {
  status: LayerStatus;
  results: FactCheckResult[];
  layerScore: number;         // 0-1
  processingTime: number;     // ms
  error?: string;
}

export interface Layer2Result {
  status: LayerStatus;
  results: NewsArticle[];
  layerScore: number;
  processingTime: number;
  sourcesChecked: number;
  error?: string;
}

export interface Layer3Result {
  status: LayerStatus;
  results: OfficialSource[];
  layerScore: number;
  processingTime: number;
  error?: string;
}

export interface Layer4Result {
  status: LayerStatus;
  results: SocialMediaPost[];
  layerScore: number;
  processingTime: number;
  error?: string;
}

// --- SCORING --------------------------------------------------

export interface ScoreBreakdown {
  layer1Weight: 0.35;
  layer2Weight: 0.30;
  layer3Weight: 0.25;
  layer4Weight: 0.10;
  layer1Score: number;        // 0-100
  layer2Score: number;
  layer3Score: number;
  layer4Score: number;
  finalScore: number;         // 0-100
  availableLayers: number;    // 1-4
  adjustedForAvailability: boolean;
}

// --- RAPORTUL FINAL -------------------------------------------

export interface VerificationReport {
  id: string;
  inputText: string;
  inputType: InputType;
  language: Language;
  verdict: Verdict;
  score: number;              // 0-100
  confidenceLevel: 'high' | 'medium' | 'low';
  scoreBreakdown: ScoreBreakdown;
  executiveSummary: string;
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
  aiAnalysis: string;
  sources: CombinedSource[];
  disclaimer: string;
  processingTime: number;     // ms total
  createdAt: string;
  isPublic: boolean;
  userId: string | null;
  fromCache: boolean;
}

export interface CombinedSource {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
  sourceType: 'fact_check' | 'news' | 'official' | 'social';
  relevance: number;          // 0-1
  supports: boolean | null;
}

// --- CONTEXT ANALIZA AI ---------------------------------------

export interface AIAnalysisContext {
  inputText: string;
  language: Language;
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
  scoreBreakdown: ScoreBreakdown;
}

// --- REPORT BUILDER -------------------------------------------

export interface ReportBuilderParams {
  input: VerificationInput;
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
  scoreBreakdown: ScoreBreakdown;
  aiAnalysis: string;
  processingTime: number;
}

// --- API REQUEST/RESPONSE -------------------------------------

export interface VerifyAPIRequest {
  text: string;
  language: Language;
  isPublic: boolean;
  inputType: InputType;
}

export interface VerifyAPIResponse {
  success: true;
  report: VerificationReport;
}

export interface VerifyAPIError {
  success: false;
  error: string;
  code: 'RATE_LIMIT' | 'USAGE_LIMIT' | 'INPUT_INVALID' |
        'ALL_LAYERS_FAILED' | 'AI_ERROR' | 'SERVER_ERROR';
}
