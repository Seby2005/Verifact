export type InputType = 'text' | 'screenshot' | 'url';
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
}

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
  url?: string;
  documentUrl: string;
  publishedAt?: string;
  publishedDate?: string;
  snippet?: string;
  relevantQuote?: string;
  relevanceScore?: number;
  supportsOrDenies?: 'supports' | 'denies' | 'neutral';
}

export interface SocialMediaPost {
  author: string;
  handle?: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'youtube' | 'other';
  content: string;
  snippet?: string;
  text?: string;
  url?: string;
  postUrl?: string;
  date?: string;
  postDate?: string;
  authorRole?: string;
  isVerifiedAuthor?: boolean;
  authorVerified?: boolean;
  isOriginalSource?: boolean;
}

export interface Layer1Result {
  status: LayerStatus;
  matches?: FactCheckResult[];
  results: FactCheckResult[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  error?: string;
  sourcesChecked?: number;
}

export interface Layer2Result {
  status: LayerStatus;
  articles?: NewsArticle[];
  results: NewsArticle[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  error?: string;
  sourcesChecked?: number;
}

export interface Layer3Result {
  status: LayerStatus;
  sources?: OfficialSource[];
  results: OfficialSource[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  error?: string;
  sourcesChecked?: number;
}

export interface Layer4Result {
  status: LayerStatus;
  posts?: SocialMediaPost[];
  results: SocialMediaPost[];
  summary?: string;
  layerScore: number;
  processingTime?: number;
  error?: string;
  sourcesChecked?: number;
}

export interface ScoreBreakdown {
  factCheckScore?: number;
  newsScore?: number;
  officialScore?: number;
  socialScore?: number;
  aiScore?: number;
  finalScore: number;
  confidenceLevel?: string;
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
}

export interface VerificationReport {
  id: string;
  claim?: string;
  inputText: string;
  inputType: InputType;
  userId?: string;
  verdict: Verdict;
  score: number;
  confidenceLevel: 'low' | 'medium' | 'high';
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
}

export interface ReportBuilderParams {
  input: VerificationInput;
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
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
  scoreBreakdown: ScoreBreakdown;
  aiAnalysis: {
    summary: string;
    scoreAdjustment?: number;
  } | string;
  processingTimeMs?: number;
  processingTime?: number;
}

export interface AIAnalysisContext {
  claim?: string;
  inputText?: string;
  input?: VerificationInput;
  language: Language;
  layers: {
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
  scoreBreakdown?: ScoreBreakdown;
}

export interface VerifyAPIResponse {
  reportId: string;
  verdict: Verdict;
  score: number;
  report: VerificationReport;
}
