import fs from "fs";
import path from "path";
import type {
  EvidenceRecord,
  ResearchPlan,
  ResearchSource,
  ResearchSubQuestion,
} from "../../types.ts";
import { getDocumentGroupAndVersion, normalizeCanonicalUrl } from "./httpFetcher.ts";

export interface StoredSourceEntry {
  canonicalUrl: string;
  documentGroupKey: string;
  versionsTracked: string[];
  aliases: string[];
  source: ResearchSource;
  topicTokens: string[];
  excerptText: string;
  savedAt: number;
}

export interface StoredEvidenceEntry {
  record: EvidenceRecord;
  canonicalSourceUrl: string;
  documentGroupKey: string;
  topicTokens: string[];
  savedAt: number;
}

export interface StoredResearchSummary {
  id: string;
  query: string;
  objective: string;
  topicTokens: string[];
  verifiedUrls: string[];
  resolvedSubQuestions: string[];
  savedAt: number;
}

interface EvidenceDbSchema {
  version: number;
  updatedAt: number;
  sources: Record<string, StoredSourceEntry>;
  evidence: Record<string, StoredEvidenceEntry>;
  summaries: Record<string, StoredResearchSummary>;
}

export interface InternalDbSearchResult {
  matchedSources: ResearchSource[];
  matchedEvidence: EvidenceRecord[];
  matchedContentByUrl: Map<string, string>;
  missingSubQuestions: ResearchSubQuestion[];
  missingPublicationTitles: string[];
  isSufficient: boolean;
  totalStoredSources: number;
  totalStoredEvidence: number;
}

const GENERIC_STOP_TOKENS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "what", "when", "where", "which",
  "report", "reports", "research", "study", "paper", "analysis", "data", "overview",
  "summary", "details", "information", "find", "about", "into", "their", "there",
  "including", "expected", "future", "global", "world", "latest", "recent", "official",
]);

const DB_FILENAME = ".forgex-evidence-db.json";
const MAX_STORED_SOURCES = 400;
const MAX_STORED_EVIDENCE = 1500;
const MAX_STORED_SUMMARIES = 120;
const DB_FRESHNESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDbFilePath(): string {
  return path.join(process.cwd(), DB_FILENAME);
}

let inMemoryDb: EvidenceDbSchema | null = null;

function createEmptyDb(): EvidenceDbSchema {
  return {
    version: 1,
    updatedAt: Date.now(),
    sources: {},
    evidence: {},
    summaries: {},
  };
}

function loadDb(): EvidenceDbSchema {
  if (inMemoryDb) return inMemoryDb;
  const dbPath = getDbFilePath();
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf8");
      const parsed = JSON.parse(raw) as EvidenceDbSchema;
      if (parsed && typeof parsed === "object" && parsed.sources && parsed.evidence) {
        inMemoryDb = parsed;
        return inMemoryDb;
      }
    }
  } catch {
    // Fall back to fresh in-memory store if disk file corrupt or unreadable
  }
  inMemoryDb = createEmptyDb();
  return inMemoryDb;
}

function persistDb(db: EvidenceDbSchema): void {
  db.updatedAt = Date.now();
  inMemoryDb = db;
  const dbPath = getDbFilePath();
  try {
    const tmpPath = `${dbPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmpPath, dbPath);
  } catch {
    // Non-fatal in read-only environments; in-memory DB stays consistent
  }
}

export function tokenizeDistinguishingTerms(text: string): string[] {
  const words = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !GENERIC_STOP_TOKENS.has(w));
  return Array.from(new Set(words));
}

function computeTokenOverlap(queryTokens: string[], hayText: string): number {
  if (queryTokens.length === 0) return 0;
  const lower = hayText.toLowerCase();
  let matched = 0;
  for (const t of queryTokens) {
    if (lower.includes(t)) matched += 1;
  }
  return matched / queryTokens.length;
}

function titleMatchesText(requestedTitle: string, hayText: string): boolean {
  const tokens = tokenizeDistinguishingTerms(requestedTitle);
  if (tokens.length === 0) return false;
  const lower = hayText.toLowerCase();
  const hits = tokens.filter((t) => lower.includes(t)).length;
  return hits >= Math.max(2, Math.ceil(tokens.length * 0.7));
}

/**
 * Searches ONLY the Internal Evidence Database (previously verified sources & extracted claims).
 * NEVER concludes that information or a publication does not exist on a miss; instead returns
 * explicit missing sub-questions and unverified publication titles so External Live Web Discovery
 * automatically runs as fallback.
 */
export function searchInternalEvidenceDatabase(params: {
  query: string;
  plan: ResearchPlan;
  now?: number;
}): InternalDbSearchResult {
  const { query, plan, now = Date.now() } = params;
  const db = loadDb();

  const storedSources = Object.values(db.sources);
  const storedEvidence = Object.values(db.evidence);

  const coreText = `${query} ${plan.objective} ${plan.exactTitlesToVerify.join(" ")} ${plan.targetEntities.join(" ")}`;
  const coreTokens = tokenizeDistinguishingTerms(coreText);
  const yearHints = Array.from(new Set((coreText.match(/\b20\d{2}\b/g) || [])));

  const matchedSources: ResearchSource[] = [];
  const matchedContentByUrl = new Map<string, string>();
  const matchedSourceUrls = new Set<string>();

  for (const entry of storedSources) {
    if (now - entry.savedAt > DB_FRESHNESS_TTL_MS) continue;
    if (!entry.source || entry.source.verificationStatus === "INVALID" || entry.source.verificationStatus === "INACCESSIBLE") {
      continue;
    }

    const hay = `${entry.source.title} ${entry.source.publisher || ""} ${entry.source.url} ${entry.excerptText.slice(0, 1800)}`;
    const overlap = computeTokenOverlap(coreTokens, hay);
    const hasYear = yearHints.length === 0 || yearHints.some((y) => hay.includes(y));
    const exactTitleHit =
      plan.exactTitlesToVerify.length > 0 &&
      plan.exactTitlesToVerify.some((t) => titleMatchesText(t, hay));

    if ((overlap >= 0.55 && hasYear) || exactTitleHit) {
      matchedSourceUrls.add(entry.canonicalUrl);
      matchedSourceUrls.add(entry.source.url);
      matchedSources.push({
        ...entry.source,
        fromInternalDb: true,
      });
      if (entry.excerptText) {
        matchedContentByUrl.set(entry.source.url, entry.excerptText);
      }
    }
  }

  const matchedEvidence: EvidenceRecord[] = [];
  for (const evEntry of storedEvidence) {
    if (now - evEntry.savedAt > DB_FRESHNESS_TTL_MS) continue;
    const ev = evEntry.record;
    const linkedToMatchedSource =
      matchedSourceUrls.has(evEntry.canonicalSourceUrl) || matchedSourceUrls.has(ev.sourceUrl);
    const evHay = `${ev.claim} ${ev.exactStatistic || ""} ${ev.relevantPassage} ${ev.sourceTitle}`;
    const overlap = computeTokenOverlap(coreTokens, evHay);
    const hasYear = yearHints.length === 0 || yearHints.some((y) => `${evHay} ${ev.referencePeriod || ""} ${ev.publicationDate || ""}`.includes(y));

    if ((linkedToMatchedSource && overlap >= 0.25) || (overlap >= 0.65 && hasYear)) {
      matchedEvidence.push({
        ...ev,
        fromInternalDb: true,
      });
    }
  }

  // Evaluate sub-question coverage strictly from matched internal evidence
  const missingSubQuestions: ResearchSubQuestion[] = [];
  for (const sq of plan.subQuestions) {
    const sqTokens = tokenizeDistinguishingTerms(`${sq.question} ${(sq.targetMetrics || []).join(" ")}`);
    const covered = matchedEvidence.some((ev) => {
      const hay = `${ev.claim} ${ev.exactStatistic || ""} ${ev.unit || ""} ${ev.relevantPassage}`.toLowerCase();
      if (sqTokens.length === 0) return false;
      const hits = sqTokens.filter((t) => hay.includes(t)).length;
      return hits >= Math.max(2, Math.ceil(sqTokens.length * 0.45));
    });
    if (!covered) {
      missingSubQuestions.push(sq);
    }
  }

  // Evaluate exact publication title coverage strictly
  const missingPublicationTitles: string[] = [];
  for (const reqTitle of plan.exactTitlesToVerify) {
    const foundInDb = matchedSources.some((src) => {
      const hay = `${src.title} ${src.extractedTitle || ""} ${src.url} ${matchedContentByUrl.get(src.url) || ""}`;
      return src.contentAccessed && titleMatchesText(reqTitle, hay);
    });
    if (!foundInDb) {
      missingPublicationTitles.push(reqTitle);
    }
  }

  const isSufficient =
    matchedSources.length > 0 &&
    matchedEvidence.length >= Math.max(2, plan.subQuestions.length) &&
    missingSubQuestions.length === 0 &&
    missingPublicationTitles.length === 0;

  return {
    matchedSources,
    matchedEvidence,
    matchedContentByUrl,
    missingSubQuestions,
    missingPublicationTitles,
    isSufficient,
    totalStoredSources: storedSources.length,
    totalStoredEvidence: storedEvidence.length,
  };
}

/**
 * Adds verified relevant sources & extracted evidence into the Internal Evidence Database.
 * Never persists unverified/rejected/unrelated sources.
 */
export function upsertVerifiedEvidenceToDatabase(params: {
  query: string;
  plan: ResearchPlan;
  verifiedSources: Array<{ source: ResearchSource; contentForExtraction: string }>;
  evidenceRecords: EvidenceRecord[];
}): { addedSources: number; addedEvidence: number } {
  const { query, plan, verifiedSources, evidenceRecords } = params;
  const db = loadDb();
  const now = Date.now();
  let addedSources = 0;
  let addedEvidence = 0;

  const validSourceUrlSet = new Set<string>();

  for (const item of verifiedSources) {
    const src = item.source;
    if (!src?.url) continue;
    // Never pollute the evidence DB with low-relevance or rejected sources
    if (
      src.verificationStatus !== "VERIFIED" &&
      !(src.verificationStatus === "PARTIALLY_VERIFIED" && (src.relevanceScore ?? 0) >= 0.35)
    ) {
      continue;
    }

    const grouping = getDocumentGroupAndVersion(src.canonicalUrl || src.url, src.title);
    const canonical = normalizeCanonicalUrl(grouping.canonicalUrl);
    validSourceUrlSet.add(src.url);
    validSourceUrlSet.add(canonical);

    const existing = db.sources[canonical];
    const versions = new Set<string>(existing?.versionsTracked || []);
    if (src.versionTag || grouping.versionTag) {
      versions.add(src.versionTag || grouping.versionTag);
    }
    const aliases = new Set<string>(existing?.aliases || []);
    aliases.add(src.url);
    if (src.originalUrl) aliases.add(src.originalUrl);

    const excerptText = (item.contentForExtraction || existing?.excerptText || "").slice(0, 6000);
    const topicTokens = tokenizeDistinguishingTerms(
      `${src.title} ${src.publisher || ""} ${plan.objective} ${excerptText.slice(0, 1200)}`
    );

    db.sources[canonical] = {
      canonicalUrl: canonical,
      documentGroupKey: src.documentGroupKey || grouping.documentGroupKey,
      versionsTracked: Array.from(versions),
      aliases: Array.from(aliases).slice(0, 12),
      source: {
        ...src,
        canonicalUrl: canonical,
        documentGroupKey: src.documentGroupKey || grouping.documentGroupKey,
        versionTag: src.versionTag || grouping.versionTag,
      },
      topicTokens,
      excerptText,
      savedAt: now,
    };
    addedSources += 1;
  }

  for (const ev of evidenceRecords) {
    if (!ev?.claim || !ev?.sourceUrl) continue;
    if (!validSourceUrlSet.has(ev.sourceUrl) && !validSourceUrlSet.has(normalizeCanonicalUrl(ev.sourceUrl))) {
      continue;
    }
    const canonicalSourceUrl = normalizeCanonicalUrl(ev.sourceUrl);
    const grouping = getDocumentGroupAndVersion(canonicalSourceUrl, ev.sourceTitle);
    const evHash = `${canonicalSourceUrl}::${ev.claim.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80)}`;
    const topicTokens = tokenizeDistinguishingTerms(`${ev.claim} ${ev.relevantPassage} ${ev.sourceTitle}`);

    db.evidence[evHash] = {
      record: ev,
      canonicalSourceUrl,
      documentGroupKey: grouping.documentGroupKey,
      topicTokens,
      savedAt: now,
    };
    addedEvidence += 1;
  }

  if (addedSources > 0 || addedEvidence > 0) {
    const summaryId = `sum_${now}_${Math.random().toString(36).slice(2, 7)}`;
    db.summaries[summaryId] = {
      id: summaryId,
      query,
      objective: plan.objective,
      topicTokens: tokenizeDistinguishingTerms(`${query} ${plan.objective}`),
      verifiedUrls: Array.from(validSourceUrlSet),
      resolvedSubQuestions: plan.subQuestions.map((s) => s.question),
      savedAt: now,
    };
  }

  // Enforce bounded size (evict oldest entries)
  const sourceKeys = Object.keys(db.sources);
  if (sourceKeys.length > MAX_STORED_SOURCES) {
    sourceKeys
      .sort((a, b) => db.sources[a].savedAt - db.sources[b].savedAt)
      .slice(0, sourceKeys.length - MAX_STORED_SOURCES)
      .forEach((k) => delete db.sources[k]);
  }
  const evKeys = Object.keys(db.evidence);
  if (evKeys.length > MAX_STORED_EVIDENCE) {
    evKeys
      .sort((a, b) => db.evidence[a].savedAt - db.evidence[b].savedAt)
      .slice(0, evKeys.length - MAX_STORED_EVIDENCE)
      .forEach((k) => delete db.evidence[k]);
  }
  const sumKeys = Object.keys(db.summaries);
  if (sumKeys.length > MAX_STORED_SUMMARIES) {
    sumKeys
      .sort((a, b) => db.summaries[a].savedAt - db.summaries[b].savedAt)
      .slice(0, sumKeys.length - MAX_STORED_SUMMARIES)
      .forEach((k) => delete db.summaries[k]);
  }

  persistDb(db);
  return { addedSources, addedEvidence };
}

export function getInternalEvidenceDbStats(): {
  sourcesCount: number;
  evidenceCount: number;
  summariesCount: number;
} {
  const db = loadDb();
  return {
    sourcesCount: Object.keys(db.sources).length,
    evidenceCount: Object.keys(db.evidence).length,
    summariesCount: Object.keys(db.summaries).length,
  };
}
