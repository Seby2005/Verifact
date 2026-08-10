export type InputType = 'text' | 'screenshot' | 'url';
export type VerificationInputKind = InputType;
export type VerifyResponse =
  | { status: 'ok'; report: VerificationReport }
  | { status: 'not_implemented'; message: string }
  | { status: 'error'; message: string };
export type Language = 'ro' | 'en' | 'unknown';
export type Verdict = 'true' | 'false' | 'partial' | 'unclear';
export type LayerStatus = 'pending' | 'loading' | 'done' | 'unavailable' | 'error' | 'success' | 'skipped';

export interface OcrRequest {
  imageBase64: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface OcrResponse {
  success: boolean;
  text: string;
  confidence: number;
  error?: string;
}

export interface VerifyRequest {
  inputType: InputType;
  inputText: string;
  inputUrl?: string;
  language: 'ro' | 'en';
  isPublic: boolean;
}

export interface VerifyStatusEvent {
  step: 'layer1' | 'layer2' | 'layer3' | 'layer4' | 'analysis' | 'report';
  status: LayerStatus;
  label?: string;
  error?: string;
  progressPercentage?: number;
  count?: number;
}

export type VerifyStreamEvent =
  | { type: 'progress'; step: VerifyStatusEvent['step']; status: LayerStatus; count?: number; error?: string }
  | { type: 'report'; report: VerificationReport }
  | { type: 'error'; code?: string; error: string };

export interface VerifyAPIError {
  success?: boolean;
  error: string;
  code?: string;
  details?: unknown;
}

export interface VerificationInput {
  type?: InputType;
  inputType: InputType;
  text: string;
  url?: string;
  file?: File | null;
  language: Language;
  isPublic: boolean;
  userId?: string;
}

export interface FactCheckResult {
  title?: string;
  publisher: string;
  publisherUrl?: string;
  rating: string;
  ratingValue: number;
  url?: string;
  reviewUrl?: string;
  claimReviewed: string;
  claimant?: string;
  date?: string;
  reviewDate?: string;
  relevanceScore: number;
}

export interface NewsArticle {
  title: string;
  source: string;
  sourceUrl?: string;
  url?: string;
  articleUrl: string;
  publishedAt: string;
  snippet: string;
  credibilityScore: number;
  sentiment?: 'neutral' | 'positive' | 'negative' | 'unrelated' | 'confirms' | 'contradicts';
}

export interface OfficialSource {
  title: string;
  publisher?: string;
  organization?: string;
  organizationType?: string;
  documentUrl?: string;
  url?: string;
  publishedAt?: string;
  publishedDate?: string;
  snippet?: string;
  relevantQuote?: string;
  relevanceScore?: number;
  supportsOrDenies?: 'supports' | 'denies' | 'neutral';
}

export interface SocialMediaPost {
  platform: 'twitter' | 'facebook' | 'youtube' | 'other';
  author: string;
  authorVerified?: boolean;
  authorRole?: string;
  postUrl?: string;
  url?: string;
  postDate?: string;
  date?: string;
  content?: string;
  text?: string;
  isOriginalSource?: boolean;
}

export interface Layer1Result {
  status: LayerStatus;
  results: FactCheckResult[];
  matches?: FactCheckResult[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  error?: string;
}

export interface Layer2Result {
  status: LayerStatus;
  results: NewsArticle[];
  articles?: NewsArticle[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  sourcesChecked?: number;
  error?: string;
}

export interface Layer3Result {
  status: LayerStatus;
  results: OfficialSource[];
  sources?: OfficialSource[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  error?: string;
}

export interface Layer4Result {
  status: LayerStatus;
  results: SocialMediaPost[];
  posts?: SocialMediaPost[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  error?: string;
}

export interface ScoreBreakdown {
  finalScore: number;
  aiScore?: number;
  availableLayers: number;
  layer1Score?: number;
  layer2Score?: number;
  layer3Score?: number;
  layer4Score?: number;
  layerScores?: Record<string, number>;
  weights: {
    factCheck: number;
    news: number;
    official: number;
    ai?: number;
    social?: number;
  };
  layer1Weight?: number;
  layer2Weight?: number;
  layer3Weight?: number;
  layer4Weight?: number;
  adjustedForAvailability?: boolean;
}

export interface CombinedSource {
  title: string;
  publisher: string;
  publishedAt?: string;
  url: string;
  date?: string;
  type?: 'factcheck' | 'news' | 'official' | 'social';
  sourceType: 'fact_check' | 'official' | 'news' | 'social';
  supports?: boolean | null;
  relevance: number;
  tier?: 1 | 2 | 3;
  excerpt?: string;
}

export interface VerificationReport {
  id: string;
  claim?: string;
  inputText: string;
  /**
   * When the submitted text was noisy (a screenshot of a social post plus the
   * sharer's own caption), the core factual claim that was actually searched
   * and scored — as opposed to `inputText`, which is the raw submission.
   */
  verifiedClaim?: string;
  /**
   * The sharer's own opinion/interpretation, separated from the factual claim
   * above. Lets the report say "the shared post is true, but the added take is
   * not" instead of scoring the two together.
   */
  posterCommentary?: string;
  inputType: InputType;
  userId?: string;
  verdict: Verdict;
  score: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  keyTakeaways?: string[];
  processingTimeMs?: number;
  processingTime?: number;
  executiveSummary: string;
  aiAnalysis?: string | { summary: string; scoreAdjustment?: number };
  disclaimer?: string;
  layers?: {
    layer1: Layer1Result;
    layer2: Layer2Result;
    layer3: Layer3Result;
    layer4: Layer4Result;
    factCheck?: Layer1Result;
    news?: Layer2Result;
    official?: Layer3Result;
    social?: Layer4Result;
  };
  layer1?: Layer1Result;
  layer2?: Layer2Result;
  layer3?: Layer3Result;
  layer4?: Layer4Result;
  scoreBreakdown: ScoreBreakdown;
  sources: CombinedSource[];
  createdAt: string;
  isPublic: boolean;
  language: Language;
  fromCache?: boolean;
  aiAvailable?: boolean;
}

export interface AIAnalysisContext {
  claim?: string;
  inputText?: string;
  /** The sharer's separated opinion, so the analysis can address it apart from the claim. */
  commentary?: string;
  language?: Language;
  layers?: {
    layer1?: Layer1Result;
    layer2?: Layer2Result;
    layer3?: Layer3Result;
    layer4?: Layer4Result;
  };
  layer1?: Layer1Result;
  layer2?: Layer2Result;
  layer3?: Layer3Result;
  layer4?: Layer4Result;
  scoreBreakdown?: ScoreBreakdown;
}

export interface ReportBuilderParams {
  input: VerificationInput;
  /** The cleaned core claim actually verified, when it differs from input.text. */
  verifiedClaim?: string;
  /** The sharer's separated opinion/interpretation, if any. */
  posterCommentary?: string;
  layers?: {
    layer1: Layer1Result;
    layer2: Layer2Result;
    layer3: Layer3Result;
    layer4: Layer4Result;
  };
  layer1?: Layer1Result;
  layer2?: Layer2Result;
  layer3?: Layer3Result;
  layer4?: Layer4Result;
  finalScore?: number;
  verdict?: Verdict;
  executiveSummary?: string;
  scoreBreakdown?: ScoreBreakdown;
  aiAnalysis?: string | { summary: string; scoreAdjustment?: number };
  processingTimeMs?: number;
  processingTime?: number;
}
