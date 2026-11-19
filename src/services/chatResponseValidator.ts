/**
 * Normal Chat Response Relevance & Constraint Validator
 * Guards against off-topic reference dumps, irrelevant citations, and missed
 * explicit formatting instructions (sentence count, bullet count, context switch).
 */

export interface ChatSourceLike {
  title?: string;
  url?: string;
  snippet?: string;
  sourceDomain?: string;
}

export interface ChatValidationOptions {
  searchedWeb?: boolean;
  allowedVaultTitles?: string[];
  groundingSources?: ChatSourceLike[];
}

export interface ChatValidationResult {
  isValid: boolean;
  offTopic: boolean;
  formatMismatch: boolean;
  malformedToolOutput: boolean;
  issues: string[];
  hasStrictConstraint: boolean;
  sanitizedSources: ChatSourceLike[];
}

const VALIDATOR_STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'for', 'to', 'in', 'of', 'with',
  'how', 'what', 'why', 'when', 'where', 'who', 'can', 'you', 'me', 'my', 'your', 'do',
  'does', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'this', 'that',
  'these', 'those', 'from', 'by', 'as', 'it', 'its', 'into', 'about', 'explain', 'tell',
  'give', 'make', 'create', 'write', 'please', 'help', 'need', 'want', 'use', 'using',
  'all', 'but', 'one', 'two', 'three', 'four', 'five', 'exactly', 'sentence', 'sentences',
  'bullet', 'bullets', 'point', 'points', 'answer', 'question', 'first', 'previous',
  'ignore', 'topic', 'simple', 'accurate', 'explanation', 'year', 'old', 'remaining',
  'remain', 'many', 'multiplied', 'divided', 'plus', 'minus', 'times', 'equals', 'equal',
]);

const KNOWN_CORPUS_DUMP_HEADERS = [
  '### [Distributed Systems, Networking, Docker, Kubernetes & Linux]',
  '### [Rust, Go, C++ & Java Concurrency and Memory Models]',
  '### [Algorithms, Data Structures & Exact Complexity Reference]',
  '### [Full-Stack Web, React 19, TypeScript & Modern APIs]',
  '### [Python, FastAPI, NumPy, Pandas & PyTorch Patterns]',
  '### [SQL, PostgreSQL, Normalization, ACID & Query Optimization]',
  '### [Cybersecurity, OWASP Top 10, Cryptography & Auth Standards]',
  '### [Artificial Intelligence (AI), Machine Learning, Deep Learning & LLMs]',
  '### [Mathematics: Algebra, Calculus, Linear Algebra & Probability]',
  '### [Physics Laws, Equations & Exact SI Fundamental Constants]',
  '### [Chemistry, Periodic Trends, Biology & Biochemistry Reference]',
  '### [Economics, Finance, Valuation & Quantitative Formulas]',
  '### [Astronomy, Space Exploration, Earth Science & Climate]',
  '### [Computer Architecture, Operating Systems, Cloud & Blockchain]',
  '### [ForgeX Platform Capabilities, Models & User Workflows]',
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseCountToken(raw: string): number | null {
  const clean = (raw || '').trim().toLowerCase();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  if (clean in NUMBER_WORDS) return NUMBER_WORDS[clean];
  return null;
}

export function extractFormatConstraints(userQuery: string): {
  exactSentences?: number;
  exactBullets?: number;
  ignorePreviousTopic: boolean;
} {
  const q = (userQuery || '').trim();
  const sentenceMatch = q.match(
    /\b(?:in\s+)?(?:exactly\s+|only\s+)?(one|two|three|four|five|\d+)\s+sentences?\b/i
  );
  const exactSentences = sentenceMatch
    ? parseCountToken(sentenceMatch[1]) ?? undefined
    : undefined;

  const bulletMatch = q.match(
    /\b(?:exactly\s+)?(one|two|three|four|five|six|seven|eight|\d+)\s+bullet\s*points?\b/i
  );
  const exactBullets = bulletMatch
    ? parseCountToken(bulletMatch[1]) ?? undefined
    : undefined;

  const ignorePreviousTopic = /\b(?:ignore|forget|disregard)\s+(?:the\s+)?(?:previous|earlier|above|last)\s+(?:topic|question|conversation|context|messages?)\b/i.test(
    q
  );

  return {
    ...(exactSentences ? { exactSentences } : {}),
    ...(exactBullets ? { exactBullets } : {}),
    ignorePreviousTopic,
  };
}

export function countSentences(text: string): number {
  const stripped = (text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\b(?:e\.g|i\.e|vs|Dr|Mr|Mrs|Ms|Prof|U\.S|U\.K|etc)\./gi, (m) =>
      m.replace(/\./g, '')
    )
    .replace(/(\d)\.(\d)/g, '$1_$2')
    .trim();

  if (!stripped) return 0;

  const parts = stripped
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z0-9]/i.test(s));

  return parts.length;
}

export function countBulletPoints(text: string): number {
  const lines = (text || '').split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    if (/^\s*(?:[-*•]|\d+[.)])\s+\S/.test(line)) {
      count += 1;
    }
  }
  return count;
}

function extractMeaningfulTerms(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !VALIDATOR_STOPWORDS.has(t));
}

export function filterRelevantSources(
  userQuery: string,
  sources: ChatSourceLike[],
  searchedWeb: boolean
): ChatSourceLike[] {
  if (!Array.isArray(sources) || sources.length === 0) return [];
  if (!searchedWeb) return [];

  const queryTerms = extractMeaningfulTerms(userQuery);
  return sources.filter((src) => {
    const url = (src.url || '').trim();
    if (!url || url.includes('google.com/search') || url.includes('duckduckgo.com/?q=')) {
      return false;
    }
    if (queryTerms.length === 0) return true;
    const hay = `${src.title || ''} ${src.snippet || ''} ${src.sourceDomain || ''}`.toLowerCase();
    // If Wikipedia/DDG fallback citation has zero overlap with query terms, drop it
    if ((src.sourceDomain || '').includes('wikipedia.org') || url.includes('wikipedia.org')) {
      return queryTerms.some((t) => hay.includes(t));
    }
    return true;
  });
}

export function validateChatResponse(
  userQuery: string,
  replyText: string,
  options: ChatValidationOptions = {}
): ChatValidationResult {
  const issues: string[] = [];
  const reply = (replyText || '').trim();
  const qLower = (userQuery || '').toLowerCase();
  const rLower = reply.toLowerCase();
  const constraints = extractFormatConstraints(userQuery);
  const hasStrictConstraint = Boolean(
    constraints.exactSentences || constraints.exactBullets || constraints.ignorePreviousTopic
  );

  if (!reply) {
    return {
      isValid: false,
      offTopic: true,
      formatMismatch: false,
      malformedToolOutput: true,
      issues: ['Response text is empty.'],
      hasStrictConstraint,
      sanitizedSources: [],
    };
  }

  let offTopic = false;
  let malformedToolOutput = false;
  let formatMismatch = false;

  // 1. Detect accidental training corpus / RAG raw dumps
  const matchedDumpHeader = KNOWN_CORPUS_DUMP_HEADERS.find((hdr) => reply.includes(hdr));
  if (matchedDumpHeader) {
    const allowedMatch =
      /\b(?:docker|kubernetes|rust|golang|c\+\+|java|tcp|udp|algorithm|react|typescript|python|sql|cybersecurity|oauth|jwt|transformer|calculus|thermodynamics|finance|capm|black hole|cpu|gpu|forgex)\b/i.test(
        qLower
      );
    if (!allowedMatch) {
      offTopic = true;
      malformedToolOutput = true;
      issues.push(`Unrelated technical reference dump detected (${matchedDumpHeader}).`);
    }
  }

  // 2. Detect raw appended Wikipedia/source dump when web search was NOT requested
  if (!options.searchedWeb && /\n###\s*🌐\s*Sources\b/i.test(reply)) {
    malformedToolOutput = true;
    issues.push('Unexpected unrequested external source list appended to normal chat reply.');
  }

  // 3. Detect severe topic drift on unmistakable plain queries
  const queryIsNonCS =
    !/\b(?:docker|kubernetes|k8s|rust|golang|java|c\+\+|distributed\s+systems|microservices|redis|kafka|nginx|blockchain)\b/i.test(
      qLower
    );
  const replyIsHeavyTechDump =
    /\bdistributed\s+systems\b/i.test(rLower) &&
    /\bkubernetes\b/i.test(rLower) &&
    /\bdocker\b/i.test(rLower);
  if (queryIsNonCS && replyIsHeavyTechDump) {
    offTopic = true;
    malformedToolOutput = true;
    issues.push('Reply drifted into unrelated systems/container technical documentation.');
  }

  // 4. Domain sanity check for "Ignore the previous topic" or basic topic anchors
  if (constraints.ignorePreviousTopic) {
    // Strip the "Ignore the previous topic." prefix and check overlap with the remaining prompt
    const afterIgnore = userQuery
      .replace(
        /^.*?\b(?:ignore|forget|disregard)\s+(?:the\s+)?(?:previous|earlier|above|last)\s+(?:topic|question|conversation|context|messages?)[.!\s]*/i,
        ''
      )
      .trim();
    const targetTerms = extractMeaningfulTerms(afterIgnore);
    if (targetTerms.length > 0 && !targetTerms.some((t) => rLower.includes(t))) {
      offTopic = true;
      issues.push('Reply did not address the new topic after context reset instruction.');
    }
  }

  // 5. Explicit formatting constraint verification
  if (constraints.exactSentences !== undefined) {
    const actualSentences = countSentences(reply);
    if (actualSentences !== constraints.exactSentences) {
      formatMismatch = true;
      issues.push(
        `Expected exactly ${constraints.exactSentences} sentence(s), got ${actualSentences}.`
      );
    }
  }

  if (constraints.exactBullets !== undefined) {
    const actualBullets = countBulletPoints(reply);
    if (actualBullets !== constraints.exactBullets) {
      formatMismatch = true;
      issues.push(
        `Expected exactly ${constraints.exactBullets} bullet point(s), got ${actualBullets}.`
      );
    }
  }

  const sanitizedSources = filterRelevantSources(
    userQuery,
    options.groundingSources || [],
    Boolean(options.searchedWeb)
  );

  return {
    isValid: !offTopic && !malformedToolOutput && !formatMismatch,
    offTopic,
    formatMismatch,
    malformedToolOutput,
    issues,
    hasStrictConstraint,
    sanitizedSources,
  };
}
