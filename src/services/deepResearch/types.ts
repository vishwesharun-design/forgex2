import type {
  ContradictoryFinding,
  EvidenceRecord,
  FactCheckResult,
  PublicationVerificationRecord,
  ResearchMetrics,
  ResearchPhase,
  ResearchPlan,
  ResearchSource,
} from "../../types.ts";

export interface RawDiscoveredSource {
  title: string;
  url: string;
  snippet: string;
  sourceDomain: string;
  publisher?: string;
  publicationDate?: string;
  provider:
    | "google_search"
    | "official_site"
    | "openalex"
    | "crossref"
    | "arxiv"
    | "wikipedia"
    | "news_rss"
    | "internal_db";
  queryUsed: string;
  isOfficialHint?: boolean;
  abstractText?: string;
  pdfUrl?: string;
  discoveryRound?: number;
}

export interface FetchedDocument {
  requestedUrl: string;
  finalUrl: string;
  canonicalUrl: string;
  documentGroupKey?: string;
  versionTag?: string;
  httpStatus: number;
  ok: boolean;
  contentAccessed: boolean;
  contentType: "html" | "pdf" | "api" | "unknown";
  title: string;
  publisher?: string;
  publicationDate?: string;
  description?: string;
  text: string;
  wordCount: number;
  pageCount?: number;
  discoveredLinks?: string[];
  viaReaderFallback?: boolean;
  error?: string;
  fromCache?: boolean;
}

export interface VerifiedSourceRecord {
  source: ResearchSource;
  fetchedDoc?: FetchedDocument;
  contentForExtraction: string;
  matchedSubQuestionIds: string[];
}

export interface AnalystOutput {
  synthesisMarkdown: string;
  keyComparisons: string[];
  contradictoryFindings: ContradictoryFinding[];
  limitations: string[];
  unresolvedQuestions: string[];
  resolvedSubQuestionIds: string[];
  chartCandidates: Array<{
    title: string;
    subtitle?: string;
    type: "bar" | "line";
    unit: string;
    data: Array<{ label: string; value: number }>;
  }>;
}

export interface TokenUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface ResearchPipelineConfig {
  depth: "deep" | "quick";
  maxSources: number;
  concurrency: number;
  modelId: string;
  simulateSearchFailure?: boolean;
}

export interface ResearchSessionState {
  id: string;
  originalQuery: string;
  originalInstructions: string;
  currentDate: string;
  config: ResearchPipelineConfig;
  projectContext?: string;
  phase: ResearchPhase;
  plan: ResearchPlan | null;
  officialDomains: string[];
  executedQueries: string[];
  searchProviderErrors: string[];
  discoveredSources: RawDiscoveredSource[];
  verifiedSources: VerifiedSourceRecord[];
  allSourceRecords: ResearchSource[];
  evidenceRecords: EvidenceRecord[];
  publicationVerifications: PublicationVerificationRecord[];
  analystOutput: AnalystOutput | null;
  factCheck: FactCheckResult | null;
  metrics: ResearchMetrics;
  tokenUsage: TokenUsage;
  startedAt: number;
}

export interface ResearchProgressEvent {
  type: "step" | "phase" | "metrics" | "source" | "complete" | "error";
  phase: ResearchPhase;
  phaseLabel: string;
  stepIndex: number;
  completedCount: number;
  totalSteps: number;
  label: string;
  sourcesFound: number;
  metrics: ResearchMetrics;
  executedQueries?: string[];
  recentSources?: ResearchSource[];
}
