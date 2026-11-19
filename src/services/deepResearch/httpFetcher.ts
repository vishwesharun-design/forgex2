import type { FetchedDocument } from "./types.ts";

interface CacheEntry {
  doc: FetchedDocument;
  cachedAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 300;
const documentCache = new Map<string, CacheEntry>();

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const STRIP_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "source",
  "oc",
  "hl",
  "gl",
  "ceid",
  "ved",
  "usg",
  "si",
  "_hsenc",
  "_hsmi",
  "mkt_tok",
  "igshid",
]);

export function isValidExternalHttpUrl(rawUrl: string): { valid: boolean; reason?: string; parsed?: URL } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, reason: "Empty URL" };
  }
  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { valid: false, reason: "URL exceeds maximum length" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: "Malformed URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}` };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^fc00:|^fe80:/i.test(host)
  ) {
    return { valid: false, reason: "Private or local network host blocked" };
  }

  return { valid: true, parsed };
}

export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    // Normalize protocol and host casing/www prefix
    if (u.protocol === "http:") u.protocol = "https:";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.hash = "";

    // Remove tracking & session query params
    for (const key of Array.from(u.searchParams.keys())) {
      if (STRIP_QUERY_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        u.searchParams.delete(key);
      }
    }
    // Sort remaining query parameters deterministically
    const sorted = Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    u.search = "";
    for (const [k, v] of sorted) {
      u.searchParams.append(k, v);
    }

    // Normalize common academic/print URL suffixes
    if (u.hostname === "arxiv.org") {
      u.pathname = u.pathname.replace(/\.pdf$/i, "");
    }

    let normalized = u.toString();
    if (normalized.endsWith("/") && u.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return rawUrl.trim();
  }
}

export function getDocumentGroupAndVersion(
  rawUrl: string,
  title?: string
): { canonicalUrl: string; documentGroupKey: string; versionTag: string } {
  const canonicalUrl = normalizeCanonicalUrl(rawUrl);
  try {
    const u = new URL(canonicalUrl);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname;
    const isPdf = /\.pdf(?:$|\?)/i.test(canonicalUrl) || /\/pdf\//i.test(path);

    // 1. arXiv papers (abs vs pdf vs v1/v2 versions share one documentGroupKey)
    if (host === "arxiv.org") {
      const m = path.match(/^\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})(v\d+)?/i);
      if (m) {
        const arxivId = m[1];
        const ver = m[2] || "latest";
        return {
          canonicalUrl,
          documentGroupKey: `arxiv:${arxivId}`,
          versionTag: `${isPdf ? "pdf" : "html"}:${ver}`,
        };
      }
    }

    // 2. DOI links
    if (host === "doi.org" || host === "dx.doi.org") {
      const doi = decodeURIComponent(path.replace(/^\/+/, "")).toLowerCase();
      if (doi) {
        return {
          canonicalUrl,
          documentGroupKey: `doi:${doi}`,
          versionTag: isPdf ? "pdf" : "html",
        };
      }
    }

    // 3. Publication slug normalization (e.g. /publications/report-title vs /docs/WEF_Report_Title.pdf)
    const cleanPath = path
      .replace(/\.(?:html?|aspx?|php|pdf)$/i, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    const segments = cleanPath.split("/").filter(Boolean);
    const lastSeg = segments[segments.length - 1] || "";
    const normalizedTitleSlug = (title || lastSeg)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !["the", "and", "for", "of", "pdf", "html", "full"].includes(w))
      .slice(0, 7)
      .join("-");

    // Group same publisher root domain + same slug/path
    const rootDomain = host.split(".").slice(-2).join(".");
    if (normalizedTitleSlug.length >= 12) {
      return {
        canonicalUrl,
        documentGroupKey: `${rootDomain}:${normalizedTitleSlug}`,
        versionTag: isPdf ? "pdf" : "html",
      };
    }

    return {
      canonicalUrl,
      documentGroupKey: `${host}${cleanPath || "/"}`,
      versionTag: isPdf ? "pdf" : "html",
    };
  } catch {
    return {
      canonicalUrl,
      documentGroupKey: canonicalUrl,
      versionTag: /\.pdf/i.test(rawUrl) ? "pdf" : "html",
    };
  }
}

export async function resolveRedirectUrl(rawUrl: string, signal?: AbortSignal): Promise<string> {
  const validation = isValidExternalHttpUrl(rawUrl);
  if (!validation.valid) return rawUrl;

  try {
    const u = validation.parsed!;
    // Only resolve known search redirect wrappers quickly
    if (u.hostname !== "vertexaisearch.cloud.google.com") {
      return rawUrl;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const onParent = () => controller.abort();
    signal?.addEventListener("abort", onParent, { once: true });

    try {
      const res = await fetch(rawUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": BROWSER_USER_AGENT },
      });
      const loc = res.headers.get("location");
      if (loc) {
        const resolved = new URL(loc, rawUrl).toString();
        if (isValidExternalHttpUrl(resolved).valid) return resolved;
      }
      if (res.url && res.url !== rawUrl && isValidExternalHttpUrl(res.url).valid) {
        return res.url;
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onParent);
    }
  } catch {
    // Keep original URL on failure
  }
  return rawUrl;
}

export function sanitizeUntrustedWebText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/gi, "[redacted-directive]")
    .replace(/disregard\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions?|prompts?)/gi, "[redacted-directive]")
    .replace(/(?:system\s+prompt|developer\s+message|reveal\s+(?:your\s+)?(?:api\s*key|secrets?|env))/gi, "[redacted-directive]")
    .replace(/<\|(?:im_start|im_end|system|user|assistant)\|>/gi, "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 && code < 1114111 ? String.fromCodePoint(code) : " ";
    });
}

function extractMetaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]?.trim()) {
        return decodeHtmlEntities(m[1].trim());
      }
    }
  }
  return undefined;
}

function extractJsonLdMetadata(html: string): {
  title?: string;
  publisher?: string;
  datePublished?: string;
} {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const scriptTag of scripts.slice(0, 5)) {
    const inner = scriptTag.replace(/<\/?script[^>]*>/gi, "").trim();
    if (!inner) continue;
    try {
      const parsed = JSON.parse(inner);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const datePublished =
          typeof node.datePublished === "string"
            ? node.datePublished
            : typeof node.dateModified === "string"
              ? node.dateModified
              : undefined;
        const publisher =
          typeof node.publisher?.name === "string"
            ? node.publisher.name
            : typeof node.author?.name === "string"
              ? node.author.name
              : undefined;
        const title =
          typeof node.headline === "string"
            ? node.headline
            : typeof node.name === "string"
              ? node.name
              : undefined;
        if (datePublished || publisher || title) {
          return { title, publisher, datePublished };
        }
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  }
  return {};
}

export function normalizeDateString(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim();
  const isoMatch = cleaned.match(/\b(20\d{2}|19\d{2})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?\b/);
  if (isoMatch) return isoMatch[0];
  const pdfDateMatch = cleaned.match(/^D:(20\d{2}|19\d{2})(\d{2})?(\d{2})?/);
  if (pdfDateMatch) {
    const yr = pdfDateMatch[1];
    const mo = pdfDateMatch[2] || "01";
    const dy = pdfDateMatch[3] || "01";
    return `${yr}-${mo}-${dy}`;
  }
  const monthYearMatch = cleaned.match(
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{0,2},?\s*(20\d{2}|19\d{2})\b/i
  );
  if (monthYearMatch) return monthYearMatch[0];
  const parsedMs = Date.parse(cleaned);
  if (Number.isFinite(parsedMs) && parsedMs > 0) {
    return new Date(parsedMs).toISOString().split("T")[0];
  }
  return undefined;
}

function extractDocumentLinksFromHtml(html: string, baseUrl: string): string[] {
  const discovered = new Set<string>();
  const hrefMatches = html.matchAll(/<a[^>]+href=["']([^"'#][^"']*)["']/gi);
  for (const m of hrefMatches) {
    const href = m[1]?.trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
    try {
      const resolved = new URL(href, baseUrl).toString();
      if (isValidExternalHttpUrl(resolved).valid) {
        discovered.add(resolved);
      }
    } catch {}
    if (discovered.size >= 80) break;
  }
  return Array.from(discovered);
}

function extractDocumentLinksFromMarkdown(text: string, baseUrl: string): string[] {
  const discovered = new Set<string>();
  const urlMatches = text.match(/https?:\/\/[^\s)"\]<>]+/gi) || [];
  let baseRoot = "";
  try {
    baseRoot = new URL(baseUrl).hostname.replace(/^www\./, "").split(".").slice(-2).join(".");
  } catch {}

  for (const raw of urlMatches) {
    const cleaned = raw.replace(/[.,;]+$/, "");
    if (!isValidExternalHttpUrl(cleaned).valid) continue;
    try {
      const u = new URL(cleaned);
      const isSameFamily = baseRoot && u.hostname.includes(baseRoot);
      const isPdf = /\.pdf(?:$|\?)/i.test(cleaned);
      if (isPdf || isSameFamily) {
        discovered.add(cleaned);
      }
    } catch {}
    if (discovered.size >= 60) break;
  }
  return Array.from(discovered);
}

function extractHtmlDocument(html: string, finalUrl: string): {
  title: string;
  publisher?: string;
  publicationDate?: string;
  canonicalUrl: string;
  description?: string;
  text: string;
  discoveredLinks: string[];
} {
  const jsonLd = extractJsonLdMetadata(html);
  const rawTitle =
    extractMetaContent(html, ["citation_title", "og:title", "twitter:title"]) ||
    jsonLd.title ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    "";
  const title = decodeHtmlEntities(rawTitle.replace(/\s+/g, " ").trim());

  const publisher =
    extractMetaContent(html, [
      "og:site_name",
      "citation_publisher",
      "citation_journal_title",
      "dc.publisher",
      "publisher",
      "author",
    ]) || jsonLd.publisher;

  const rawDate =
    extractMetaContent(html, [
      "citation_publication_date",
      "citation_date",
      "article:published_time",
      "og:updated_time",
      "dc.date",
      "dc.date.issued",
      "pubdate",
      "date",
      "last-modified",
    ]) || jsonLd.datePublished;

  let publicationDate = normalizeDateString(rawDate);

  const canonicalHref = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
  let canonicalUrl = normalizeCanonicalUrl(finalUrl);
  if (canonicalHref) {
    try {
      const resolved = new URL(canonicalHref, finalUrl).toString();
      if (isValidExternalHttpUrl(resolved).valid) {
        canonicalUrl = normalizeCanonicalUrl(resolved);
      }
    } catch {
      // Keep finalUrl
    }
  }

  const description = extractMetaContent(html, ["description", "og:description", "citation_abstract"]);
  const discoveredLinks = extractDocumentLinksFromHtml(html, finalUrl);

  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(?:nav|footer|aside|header)[\s\S]*?<\/(?:nav|footer|aside|header)>/gi, " ")
    .replace(/<(?:br|p|div|h[1-6]|li|tr|section|article)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const cleanText = sanitizeUntrustedWebText(decodeHtmlEntities(stripped)).slice(0, 95000);

  if (!publicationDate) {
    const headerSample = cleanText.slice(0, 2200);
    const fallbackDateMatch = headerSample.match(
      /(?:Published|Updated|Release[d]?|Date)\s*[:\-]?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},?\s*20\d{2}|20\d{2}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})/i
    );
    if (fallbackDateMatch) {
      publicationDate = normalizeDateString(fallbackDateMatch[1]) || fallbackDateMatch[1];
    }
  }

  return {
    title,
    publisher,
    publicationDate,
    canonicalUrl,
    description,
    text: cleanText,
    discoveredLinks,
  };
}

async function extractPdfDocument(buffer: ArrayBuffer): Promise<{
  title: string;
  publisher?: string;
  publicationDate?: string;
  text: string;
  pageCount: number;
}> {
  const { extractText, getMeta, getDocumentProxy } = await import("unpdf");
  const uint8 = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);
  const [textResult, metaResult] = await Promise.all([
    extractText(pdf, { mergePages: true }),
    getMeta(pdf).catch(() => ({ info: {} as Record<string, any> })),
  ]);

  const info = (metaResult as any)?.info || {};
  const rawText = typeof textResult?.text === "string" ? textResult.text : "";
  const cleanText = sanitizeUntrustedWebText(rawText).slice(0, 240000);

  let title = typeof info.Title === "string" && info.Title.trim().length > 3 ? info.Title.trim() : "";
  if (!title && cleanText) {
    const firstLines = cleanText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 6 && l.length < 140);
    title = firstLines[0] || "";
  }

  const publisher =
    typeof info.Author === "string" && info.Author.trim()
      ? info.Author.trim()
      : typeof info.Creator === "string" && info.Creator.trim()
        ? info.Creator.trim()
        : undefined;

  let publicationDate =
    normalizeDateString(info.CreationDate) || normalizeDateString(info.ModDate);

  if (!publicationDate && cleanText) {
    const coverText = cleanText.slice(0, 3000);
    const coverDate = coverText.match(
      /\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*20\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\b/i
    );
    if (coverDate) {
      publicationDate = normalizeDateString(coverDate[0]) || coverDate[0];
    }
  }

  return {
    title,
    publisher,
    publicationDate,
    text: cleanText,
    pageCount: textResult?.totalPages || 0,
  };
}

/**
 * Fallback retrieval via r.jina.ai reader for bot-protected official sites (e.g. HTTP 403 / Cloudflare)
 * or client-rendered SPAs that return near-empty HTML to raw Node fetch.
 */
async function fetchViaReaderFallback(
  rawUrl: string,
  signal?: AbortSignal
): Promise<FetchedDocument | null> {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    // Do not route Google News redirects or localhost/private hosts through reader fallback
    if (host === "news.google.com" || host === "vertexaisearch.cloud.google.com") {
      return null;
    }

    const readerUrl = `https://r.jina.ai/${rawUrl}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    const onParent = () => controller.abort();
    signal?.addEventListener("abort", onParent, { once: true });

    try {
      const res = await fetch(readerUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "text/plain, text/markdown;q=0.9, */*;q=0.8",
          "X-Return-Format": "markdown",
        },
      });
      if (!res.ok) return null;

      const body = await res.text();
      if (!body || body.length < 150) return null;

      // Parse structured Jina Reader header lines
      const titleMatch = body.match(/^Title:\s*(.+)$/m);
      const finalUrlMatch = body.match(/^(?:Final URL|URL Source):\s*(https?:\/\/\S+)$/m);
      const pubTimeMatch = body.match(/^Published Time:\s*(.+)$/m);
      const mdMarker = body.indexOf("Markdown Content:");
      const rawMarkdown = mdMarker >= 0 ? body.slice(mdMarker + "Markdown Content:".length).trim() : body;

      const finalUrl =
        finalUrlMatch?.[1] && isValidExternalHttpUrl(finalUrlMatch[1]).valid
          ? finalUrlMatch[1].trim()
          : rawUrl;
      const title = titleMatch?.[1]?.trim() || "";
      let publicationDate = normalizeDateString(pubTimeMatch?.[1]?.trim());

      const discoveredLinks = extractDocumentLinksFromMarkdown(rawMarkdown, finalUrl);

      // Clean excessive navigation noise from Markdown while keeping substantive prose
      const cleanText = sanitizeUntrustedWebText(
        rawMarkdown
          .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
          .replace(/\[([^\]]*)\]\([^)]+\)/g, (_m, label) => (label ? String(label) : ""))
      ).slice(0, 95000);

      const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
      if (wordCount < 35) return null;

      if (!publicationDate) {
        const sample = cleanText.slice(0, 2500);
        const dm = sample.match(
          /\b(?:Published|Released|Date)\s*[:\-]?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s*20\d{2}|20\d{2}-\d{2}-\d{2})/i
        );
        if (dm) publicationDate = normalizeDateString(dm[1]) || dm[1];
      }

      const grouping = getDocumentGroupAndVersion(finalUrl, title);
      let publisherHost = host.replace(/^www\./, "");
      try {
        publisherHost = new URL(finalUrl).hostname.replace(/^www\./, "");
      } catch {}

      return {
        requestedUrl: rawUrl,
        finalUrl,
        canonicalUrl: grouping.canonicalUrl,
        documentGroupKey: grouping.documentGroupKey,
        versionTag: grouping.versionTag,
        httpStatus: 200,
        ok: true,
        contentAccessed: true,
        contentType: "html",
        title,
        publisher: publisherHost,
        publicationDate,
        text: cleanText,
        wordCount,
        discoveredLinks,
        viaReaderFallback: true,
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onParent);
    }
  } catch {
    return null;
  }
}

export function extractKeywordWindows(
  fullText: string,
  keywords: string[],
  maxChars = 11000
): string {
  if (!fullText) return "";
  if (fullText.length <= maxChars) return fullText;

  // Include opening executive summary / key findings header
  const headSize = Math.min(3200, Math.floor(maxChars * 0.30));
  const windows: Array<{ start: number; end: number }> = [{ start: 0, end: headSize }];

  const lower = fullText.toLowerCase();
  const cleanKeywords = Array.from(
    new Set(
      keywords
        .flatMap((k) => k.toLowerCase().split(/\s+/))
        .map((w) => w.replace(/[^a-z0-9.-]/g, ""))
        .filter((w) => w.length >= 3 && !["the", "and", "for", "with", "from", "that", "this", "what", "report"].includes(w))
    )
  ).slice(0, 20);

  const chunkSize = 1000;
  const step = 650;
  const scoredChunks: Array<{ start: number; end: number; score: number }> = [];

  for (let pos = headSize; pos < fullText.length; pos += step) {
    const end = Math.min(fullText.length, pos + chunkSize);
    const slice = lower.slice(pos, end);
    let score = 0;

    for (const kw of cleanKeywords) {
      if (slice.includes(kw)) score += 3;
    }
    const numberMatches = slice.match(/\b\d+(?:[.,]\d+)?\s*(?:%|percent|million|billion|trillion|thousand)\b/g);
    if (numberMatches) score += Math.min(10, numberMatches.length * 2);
    if (
      /\b(?:methodology|survey|findings|key findings|net|created|displaced|fastest-growing|fastest-declining|growth|decline|outlook|forecast|projection|published)\b/.test(
        slice
      )
    ) {
      score += 4;
    }

    if (score >= 4) {
      scoredChunks.push({ start: pos, end, score });
    }
  }

  scoredChunks.sort((a, b) => b.score - a.score);

  let usedChars = headSize;
  for (const chunk of scoredChunks) {
    if (usedChars >= maxChars) break;
    const overlaps = windows.some((w) => chunk.start < w.end && chunk.end > w.start);
    if (overlaps) continue;
    windows.push({ start: chunk.start, end: chunk.end });
    usedChars += chunk.end - chunk.start;
  }

  windows.sort((a, b) => a.start - b.start);
  return windows
    .map((w) => fullText.slice(w.start, w.end).trim())
    .join("\n\n[...]\n\n")
    .slice(0, maxChars);
}

export async function fetchAndExtractDocument(
  rawUrl: string,
  options?: { timeoutMs?: number; signal?: AbortSignal; allowReaderFallback?: boolean }
): Promise<FetchedDocument> {
  const validation = isValidExternalHttpUrl(rawUrl);
  if (!validation.valid) {
    return {
      requestedUrl: rawUrl,
      finalUrl: rawUrl,
      canonicalUrl: rawUrl,
      httpStatus: 0,
      ok: false,
      contentAccessed: false,
      contentType: "unknown",
      title: "",
      text: "",
      wordCount: 0,
      error: validation.reason || "Invalid URL",
    };
  }

  const effectiveUrl = await resolveRedirectUrl(rawUrl, options?.signal);
  const normalizedKey = normalizeCanonicalUrl(effectiveUrl);
  const cached = documentCache.get(normalizedKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.doc, fromCache: true };
  }

  const isLikelyPdf = /\.pdf(?:$|\?)/i.test(effectiveUrl);
  const timeoutMs = options?.timeoutMs ?? (isLikelyPdf ? 18000 : 11000);
  const allowReaderFallback = options?.allowReaderFallback ?? true;
  const maxRetries = 1;
  let lastError = "";
  let lastStatus = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (options?.signal?.aborted) {
      throw new Error("Research cancelled");
    }
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 350));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onParentAbort = () => controller.abort();
    options?.signal?.addEventListener("abort", onParentAbort, { once: true });

    try {
      const response = await fetch(effectiveUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
      });

      lastStatus = response.status;
      const finalUrl = response.url || effectiveUrl;

      const finalValidation = isValidExternalHttpUrl(finalUrl);
      if (!finalValidation.valid) {
        return {
          requestedUrl: rawUrl,
          finalUrl,
          canonicalUrl: finalUrl,
          httpStatus: response.status,
          ok: false,
          contentAccessed: false,
          contentType: "unknown",
          title: "",
          text: "",
          wordCount: 0,
          error: `Redirect target blocked: ${finalValidation.reason}`,
        };
      }

      if (response.status === 429 || response.status === 503 || response.status === 502 || response.status === 504) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      // Bot-protected official sites often return 403 / 401 / 406 to raw Node fetch
      if ((response.status === 403 || response.status === 401 || response.status === 406) && allowReaderFallback) {
        const readerDoc = await fetchViaReaderFallback(finalUrl, options?.signal);
        if (readerDoc) {
          cacheDocument(normalizedKey, readerDoc);
          return readerDoc;
        }
      }

      if (!response.ok) {
        const grouping = getDocumentGroupAndVersion(finalUrl);
        return {
          requestedUrl: rawUrl,
          finalUrl,
          canonicalUrl: grouping.canonicalUrl,
          documentGroupKey: grouping.documentGroupKey,
          versionTag: grouping.versionTag,
          httpStatus: response.status,
          ok: false,
          contentAccessed: false,
          contentType: "unknown",
          title: "",
          text: "",
          wordCount: 0,
          error: `HTTP ${response.status} ${response.statusText || ""}`.trim(),
        };
      }

      const contentTypeHeader = (response.headers.get("content-type") || "").toLowerCase();
      const isPdfUrl = /\.pdf(?:$|\?)/i.test(finalUrl);

      if (contentTypeHeader.includes("application/pdf") || isPdfUrl) {
        const buf = await response.arrayBuffer();
        if (buf.byteLength > 25 * 1024 * 1024) {
          const grouping = getDocumentGroupAndVersion(finalUrl);
          return {
            requestedUrl: rawUrl,
            finalUrl,
            canonicalUrl: grouping.canonicalUrl,
            documentGroupKey: grouping.documentGroupKey,
            versionTag: grouping.versionTag,
            httpStatus: response.status,
            ok: false,
            contentAccessed: false,
            contentType: "pdf",
            title: "",
            text: "",
            wordCount: 0,
            error: "PDF exceeds 25MB extraction limit",
          };
        }
        try {
          const pdfData = await extractPdfDocument(buf);
          const wordCount = pdfData.text ? pdfData.text.split(/\s+/).filter(Boolean).length : 0;
          const grouping = getDocumentGroupAndVersion(finalUrl, pdfData.title);
          const doc: FetchedDocument = {
            requestedUrl: rawUrl,
            finalUrl,
            canonicalUrl: grouping.canonicalUrl,
            documentGroupKey: grouping.documentGroupKey,
            versionTag: grouping.versionTag,
            httpStatus: response.status,
            ok: true,
            contentAccessed: wordCount >= 20,
            contentType: "pdf",
            title: pdfData.title,
            publisher: pdfData.publisher,
            publicationDate: pdfData.publicationDate,
            text: pdfData.text,
            wordCount,
            pageCount: pdfData.pageCount,
            error: wordCount < 20 ? "PDF text extraction returned minimal readable text" : undefined,
          };
          cacheDocument(normalizedKey, doc);
          return doc;
        } catch (pdfErr: any) {
          const grouping = getDocumentGroupAndVersion(finalUrl);
          return {
            requestedUrl: rawUrl,
            finalUrl,
            canonicalUrl: grouping.canonicalUrl,
            documentGroupKey: grouping.documentGroupKey,
            versionTag: grouping.versionTag,
            httpStatus: response.status,
            ok: false,
            contentAccessed: false,
            contentType: "pdf",
            title: "",
            text: "",
            wordCount: 0,
            error: `Failed PDF extraction: ${pdfErr?.message || "corrupt or encrypted PDF"}`,
          };
        }
      }

      if (contentTypeHeader.includes("application/json")) {
        const jsonText = await response.text();
        const sanitized = sanitizeUntrustedWebText(jsonText).slice(0, 40000);
        const grouping = getDocumentGroupAndVersion(finalUrl);
        const doc: FetchedDocument = {
          requestedUrl: rawUrl,
          finalUrl,
          canonicalUrl: grouping.canonicalUrl,
          documentGroupKey: grouping.documentGroupKey,
          versionTag: grouping.versionTag,
          httpStatus: response.status,
          ok: true,
          contentAccessed: sanitized.length > 30,
          contentType: "api",
          title: "",
          text: sanitized,
          wordCount: sanitized.split(/\s+/).filter(Boolean).length,
        };
        cacheDocument(normalizedKey, doc);
        return doc;
      }

      const html = await response.text();
      if (
        html.length < 20000 &&
        /just a moment\.\.\.|cf-browser-verification|enable javascript and cookies to continue|access denied|attention required!\s*\|\s*cloudflare/i.test(
          html
        )
      ) {
        if (allowReaderFallback) {
          const readerDoc = await fetchViaReaderFallback(finalUrl, options?.signal);
          if (readerDoc) {
            cacheDocument(normalizedKey, readerDoc);
            return readerDoc;
          }
        }
        const grouping = getDocumentGroupAndVersion(finalUrl);
        return {
          requestedUrl: rawUrl,
          finalUrl,
          canonicalUrl: grouping.canonicalUrl,
          documentGroupKey: grouping.documentGroupKey,
          versionTag: grouping.versionTag,
          httpStatus: 403,
          ok: false,
          contentAccessed: false,
          contentType: "html",
          title: "",
          text: "",
          wordCount: 0,
          error: "Blocked by bot/JS verification challenge",
        };
      }

      const extracted = extractHtmlDocument(html, finalUrl);
      const wordCount = extracted.text ? extracted.text.split(/\s+/).filter(Boolean).length : 0;

      // JS-rendered SPA shell -> recover rendered text via reader fallback
      if (wordCount < 45 && allowReaderFallback) {
        const readerDoc = await fetchViaReaderFallback(finalUrl, options?.signal);
        if (readerDoc && readerDoc.wordCount > wordCount) {
          cacheDocument(normalizedKey, readerDoc);
          return readerDoc;
        }
      }

      const grouping = getDocumentGroupAndVersion(extracted.canonicalUrl || finalUrl, extracted.title);
      const doc: FetchedDocument = {
        requestedUrl: rawUrl,
        finalUrl,
        canonicalUrl: grouping.canonicalUrl,
        documentGroupKey: grouping.documentGroupKey,
        versionTag: grouping.versionTag,
        httpStatus: response.status,
        ok: true,
        contentAccessed: wordCount >= 25,
        contentType: "html",
        title: extracted.title,
        publisher: extracted.publisher,
        publicationDate: extracted.publicationDate,
        description: extracted.description,
        text: extracted.text,
        wordCount,
        discoveredLinks: extracted.discoveredLinks,
        error: wordCount < 25 ? "Page returned insufficient readable content (possible JS-only app)" : undefined,
      };
      cacheDocument(normalizedKey, doc);
      return doc;
    } catch (err: any) {
      lastError = err?.name === "AbortError" ? `Timeout after ${timeoutMs}ms` : err?.message || "Network fetch error";
      if (options?.signal?.aborted) throw new Error("Research cancelled");
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener("abort", onParentAbort);
    }
  }

  // Final reader fallback after transient errors (e.g., 429/503) for non-PDF HTML URLs
  if (allowReaderFallback && !isLikelyPdf) {
    const readerDoc = await fetchViaReaderFallback(effectiveUrl, options?.signal);
    if (readerDoc) {
      cacheDocument(normalizedKey, readerDoc);
      return readerDoc;
    }
  }

  const grouping = getDocumentGroupAndVersion(effectiveUrl);
  return {
    requestedUrl: rawUrl,
    finalUrl: effectiveUrl,
    canonicalUrl: grouping.canonicalUrl,
    documentGroupKey: grouping.documentGroupKey,
    versionTag: grouping.versionTag,
    httpStatus: lastStatus,
    ok: false,
    contentAccessed: false,
    contentType: "unknown",
    title: "",
    text: "",
    wordCount: 0,
    error: lastError || "Failed to retrieve source",
  };
}

function cacheDocument(key: string, doc: FetchedDocument) {
  if (documentCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = documentCache.keys().next().value;
    if (oldestKey) documentCache.delete(oldestKey);
  }
  documentCache.set(key, { doc, cachedAt: Date.now() });
}
