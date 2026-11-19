import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { normalizeCanonicalUrl, resolveRedirectUrl } from "./httpFetcher.ts";
import { tokenizeDistinguishingTerms } from "./evidenceDb.ts";
import type { RawDiscoveredSource, TokenUsage } from "./types.ts";

export interface SearchBatchResult {
  sources: RawDiscoveredSource[];
  providerErrors: string[];
  queriesExecuted: string[];
  tokenUsage: TokenUsage;
}

const OFFICIAL_DOMAIN_PATTERNS = [
  /\.gov(?:\.[a-z]{2})?$/i,
  /\.edu(?:\.[a-z]{2})?$/i,
  /\.int$/i,
  /\.mil$/i,
  /(?:^|\.)europa\.eu$/i,
  /(?:^|\.)un\.org$/i,
  /(?:^|\.)who\.int$/i,
  /(?:^|\.)imf\.org$/i,
  /(?:^|\.)worldbank\.org$/i,
  /(?:^|\.)oecd\.org$/i,
  /(?:^|\.)ilo\.org$/i,
  /(?:^|\.)weforum\.org$/i,
  /(?:^|\.)unesco\.org$/i,
  /(?:^|\.)wto\.org$/i,
  /(?:^|\.)iea\.org$/i,
  /(?:^|\.)ipcc\.ch$/i,
  /(?:^|\.)nih\.gov$/i,
  /(?:^|\.)cdc\.gov$/i,
  /(?:^|\.)bls\.gov$/i,
  /(?:^|\.)census\.gov$/i,
  /(?:^|\.)sec\.gov$/i,
  /(?:^|\.)nature\.com$/i,
  /(?:^|\.)science\.org$/i,
  /(?:^|\.)thelancet\.com$/i,
  /(?:^|\.)nejm\.org$/i,
  /(?:^|\.)arxiv\.org$/i,
  /(?:^|\.)doi\.org$/i,
];

const entityDomainCache = new Map<string, string[]>();

export function isOfficialDomain(domainOrUrl: string): boolean {
  let host = domainOrUrl.toLowerCase().trim();
  try {
    if (host.startsWith("http")) {
      host = new URL(host).hostname.toLowerCase();
    }
  } catch {
    // Use as-is
  }
  host = host.replace(/^www\./, "");
  return OFFICIAL_DOMAIN_PATTERNS.some((re) => re.test(host));
}

function addTokens(acc: TokenUsage, usageMetadata: any) {
  if (!usageMetadata) return;
  acc.promptTokens += Number(usageMetadata.promptTokenCount || 0);
  acc.candidateTokens += Number(usageMetadata.candidatesTokenCount || 0);
  acc.totalTokens += Number(usageMetadata.totalTokenCount || 0);
}

function decodeXml(str: string): string {
  return (str || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reconstructOpenAlexAbstract(invertedIndex?: Record<string, number[]>): string {
  if (!invertedIndex || typeof invertedIndex !== "object") return "";
  const words: Array<{ pos: number; word: string }> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      words.push({ pos, word });
    }
  }
  words.sort((a, b) => a.pos - b.pos);
  return words.map((w) => w.word).join(" ").slice(0, 1800);
}

function passesCandidateRelevance(
  query: string,
  title: string,
  snippet: string,
  provider: RawDiscoveredSource["provider"]
): boolean {
  if (provider === "google_search" || provider === "official_site" || provider === "internal_db") {
    return true;
  }
  const cleanQuery = query.replace(/\b(?:site|filetype):[^\s]+/gi, " ").trim();
  const queryTokens = tokenizeDistinguishingTerms(cleanQuery).filter((t) => !/^20\d{2}$/.test(t));
  if (queryTokens.length === 0) return true;

  const titleLower = title.toLowerCase();
  const hayLower = `${title} ${snippet}`.toLowerCase();

  let titleHits = 0;
  let hayHits = 0;
  for (const t of queryTokens) {
    if (titleLower.includes(t)) titleHits += 1;
    if (hayLower.includes(t)) hayHits += 1;
  }

  // Academic/encyclopedia feeds often match only generic words ("jobs", "economic"); require strong multi-token relevance
  if (queryTokens.length >= 3) {
    return titleHits >= 2 || hayHits >= Math.ceil(queryTokens.length * 0.6);
  }
  return hayHits >= queryTokens.length;
}

/**
 * Dynamically discovers official website domains for target organizations/entities
 * via Wikidata official website property (P856) + News RSS publisher URLs.
 */
export async function discoverOfficialDomains(
  entities: string[],
  titles: string[],
  signal?: AbortSignal
): Promise<string[]> {
  const candidates = Array.from(
    new Set(
      [...entities, ...titles]
        .map((s) => s.trim())
        .filter((s) => s.length >= 3)
    )
  ).slice(0, 4);

  const domains = new Set<string>();

  await Promise.all(
    candidates.map(async (entity) => {
      const cacheKey = entity.toLowerCase();
      const cached = entityDomainCache.get(cacheKey);
      if (cached) {
        cached.forEach((d) => domains.add(d));
        return;
      }

      const foundForEntity: string[] = [];
      try {
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(entity)}&language=en&limit=2&format=json`;
        const sRes = await fetch(searchUrl, {
          headers: { "User-Agent": "ForgeX-ResearchAgent/2.0" },
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(3500)]) : AbortSignal.timeout(3500),
        });
        if (sRes.ok) {
          const sData = (await sRes.json()) as any;
          const ids = (sData?.search || []).map((x: any) => x?.id).filter(Boolean).slice(0, 2);
          if (ids.length > 0) {
            const entUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=claims&format=json`;
            const eRes = await fetch(entUrl, {
              headers: { "User-Agent": "ForgeX-ResearchAgent/2.0" },
              signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(3500)]) : AbortSignal.timeout(3500),
            });
            if (eRes.ok) {
              const eData = (await eRes.json()) as any;
              for (const id of ids) {
                const p856 = eData?.entities?.[id]?.claims?.P856;
                if (Array.isArray(p856)) {
                  for (const claim of p856) {
                    const val = claim?.mainsnak?.datavalue?.value;
                    if (typeof val === "string") {
                      try {
                        const host = new URL(val).hostname.toLowerCase().replace(/^www\./, "");
                        if (host && !host.includes("wikidata.org") && !host.includes("wikipedia.org")) {
                          foundForEntity.push(host);
                          domains.add(host);
                        }
                      } catch {}
                    }
                  }
                }
              }
            }
          }
        }
      } catch {
        // Non-fatal
      }

      entityDomainCache.set(cacheKey, foundForEntity);
    })
  );

  return Array.from(domains);
}

/**
 * Discovers official publications directly from a publisher domain via its sitemap.xml index
 * (and publications/reports sitemaps), scoring URL slugs against the query/title tokens.
 */
export async function searchOfficialPublisherDomain(params: {
  domain: string;
  query: string;
  targetTitles?: string[];
  signal?: AbortSignal;
}): Promise<{ sources: RawDiscoveredSource[]; error?: string }> {
  const { domain, query, targetTitles = [], signal } = params;
  const cleanDomain = domain.replace(/^www\./, "").toLowerCase().trim();
  if (!cleanDomain) return { sources: [] };

  const searchPhrase = targetTitles.length > 0 ? `${targetTitles.join(" ")} ${query}` : query;
  const tokens = tokenizeDistinguishingTerms(searchPhrase);
  const yearTokens = Array.from(new Set(searchPhrase.match(/\b20\d{2}\b/g) || []));
  const allMatchTokens = Array.from(new Set([...tokens, ...yearTokens]));
  if (allMatchTokens.length === 0) return { sources: [] };

  const candidateSitemaps: string[] = [];
  const discoveredUrls: Array<{ url: string; score: number }> = [];

  const fetchText = async (u: string, timeoutMs = 4500): Promise<string | null> => {
    try {
      const res = await fetch(u, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ForgeX-ResearchAgent/2.0)",
          Accept: "application/xml,text/xml,text/plain,*/*",
        },
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  };

  // Try www.<domain> and bare <domain> sitemap.xml
  let rootXml =
    (await fetchText(`https://www.${cleanDomain}/sitemap.xml`)) ||
    (await fetchText(`https://${cleanDomain}/sitemap.xml`));

  if (!rootXml) {
    // Check robots.txt for custom Sitemap directives
    const robotsTxt =
      (await fetchText(`https://www.${cleanDomain}/robots.txt`, 3000)) ||
      (await fetchText(`https://${cleanDomain}/robots.txt`, 3000));
    if (robotsTxt) {
      const smMatches = robotsTxt.matchAll(/^Sitemap:\s*(https?:\/\/\S+)/gim);
      for (const m of smMatches) {
        if (m[1]) candidateSitemaps.push(m[1].trim());
      }
      if (candidateSitemaps.length > 0) {
        rootXml = await fetchText(candidateSitemaps[0]);
      }
    }
  }

  if (!rootXml) {
    return { sources: [] };
  }

  const scoreUrlSlug = (u: string): number => {
    const lower = u.toLowerCase();
    let score = 0;
    for (const tok of allMatchTokens) {
      if (lower.includes(tok)) {
        score += /^20\d{2}$/.test(tok) ? 4 : 3;
      }
    }
    if (/\/(?:publications|reports|research|documents|papers|policy|insights|resources)\//i.test(lower)) {
      score += 2;
    }
    if (/\.pdf(?:$|\?)/i.test(lower)) {
      score += 2;
    }
    return score;
  };

  if (/<sitemapindex/i.test(rootXml)) {
    const childLocs = Array.from(rootXml.matchAll(/<loc>([^<]+)<\/loc>/gi))
      .map((m) => decodeXml(m[1]))
      .filter(Boolean);

    // Prioritize publication / report / document / research / latest sitemaps
    const prioritized = childLocs.sort((a, b) => {
      const rank = (u: string) => {
        const l = u.toLowerCase();
        let r = 0;
        if (/publication|report|document|research|paper|series|insight/.test(l)) r += 10;
        if (/2025|2026/.test(l)) r += 5;
        if (/media|video|podcast|tag|author|topic/.test(l)) r -= 4;
        return r;
      };
      return rank(b) - rank(a);
    });

    const childXmls = await Promise.all(
      prioritized.slice(0, 4).map((smUrl) => fetchText(smUrl, 5000))
    );

    for (const xml of childXmls) {
      if (!xml) continue;
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
        const u = decodeXml(m[1]);
        if (!u) continue;
        const sc = scoreUrlSlug(u);
        if (sc >= 6) {
          discoveredUrls.push({ url: u, score: sc });
        }
      }
    }
  } else {
    for (const m of rootXml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      const u = decodeXml(m[1]);
      if (!u) continue;
      const sc = scoreUrlSlug(u);
      if (sc >= 6) {
        discoveredUrls.push({ url: u, score: sc });
      }
    }
  }

  discoveredUrls.sort((a, b) => b.score - a.score);
  const uniqueUrls = new Set<string>();
  const sources: RawDiscoveredSource[] = [];

  for (const item of discoveredUrls) {
    const canonical = normalizeCanonicalUrl(item.url);
    if (uniqueUrls.has(canonical)) continue;
    uniqueUrls.add(canonical);

    const slugTitle = item.url
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/\.(?:pdf|html?)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();

    sources.push({
      title: slugTitle ? `${slugTitle} (${cleanDomain})` : `${cleanDomain} Official Publication`,
      url: item.url,
      snippet: `Official publication URL discovered directly from ${cleanDomain} sitemap matching "${query}".`,
      sourceDomain: cleanDomain,
      publisher: cleanDomain,
      provider: "official_site",
      queryUsed: `site:${cleanDomain} ${query}`,
      isOfficialHint: true,
    });

    if (sources.length >= 5) break;
  }

  return { sources };
}

async function searchGoogleGrounding(
  ai: GoogleGenAI,
  query: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ sources: RawDiscoveredSource[]; queriesUsed: string[]; error?: string; tokens: TokenUsage }> {
  const tokens: TokenUsage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };
  const queriesUsed: string[] = [query];
  const timeoutMs = options?.timeoutMs ?? 15000;
  const models = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  let lastError = "";

  for (const model of models) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const reqPromise = ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  `Search Google for authoritative, primary, and recent sources answering: ${query}\n` +
                  `Prioritize official organization reports, government/statistical agencies, academic papers, and original PDFs. ` +
                  `Summarize only what the search results return with publication dates and exact titles.`,
              },
            ],
          },
        ],
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const response = await Promise.race([
        reqPromise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Google Search grounding (${model}) timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);

      addTokens(tokens, response.usageMetadata);
      const meta = response.candidates?.[0]?.groundingMetadata;
      if (Array.isArray(meta?.webSearchQueries)) {
        for (const q of meta.webSearchQueries) {
          if (typeof q === "string" && q.trim() && !queriesUsed.includes(q.trim())) {
            queriesUsed.push(q.trim());
          }
        }
      }

      const groundingSupports = Array.isArray(meta?.groundingSupports) ? meta.groundingSupports : [];
      const chunkIndexToSnippets = new Map<number, string[]>();
      for (const sup of groundingSupports) {
        const segText = sup?.segment?.text;
        const indices = Array.isArray(sup?.groundingChunkIndices) ? sup.groundingChunkIndices : [];
        if (segText) {
          for (const idx of indices) {
            if (typeof idx === "number") {
              const arr = chunkIndexToSnippets.get(idx) || [];
              arr.push(String(segText).trim());
              chunkIndexToSnippets.set(idx, arr);
            }
          }
        }
      }

      const chunks = Array.isArray(meta?.groundingChunks) ? meta.groundingChunks : [];
      const resolvedSources: RawDiscoveredSource[] = [];

      await Promise.all(
        chunks.slice(0, 10).map(async (chunk: any, idx: number) => {
          const rawUri = chunk?.web?.uri;
          if (!rawUri || typeof rawUri !== "string") return;

          const uri = await resolveRedirectUrl(rawUri, options?.signal);
          let domain = "web";
          try {
            domain = new URL(uri).hostname.replace(/^www\./, "");
          } catch {}
          const title = String(chunk?.web?.title || domain || "Web Source").trim();
          const supportSnippets = chunkIndexToSnippets.get(idx) || [];
          const snippet = supportSnippets.join(" ").slice(0, 600) || title;

          resolvedSources.push({
            title,
            url: uri,
            snippet,
            sourceDomain: domain === "vertexaisearch.cloud.google.com" ? title : domain,
            provider: "google_search",
            queryUsed: query,
            isOfficialHint: isOfficialDomain(title) || isOfficialDomain(uri),
          });
        })
      );

      if (resolvedSources.length > 0 || (response.text || "").trim().length > 0) {
        return { sources: resolvedSources, queriesUsed, tokens };
      }
    } catch (err: any) {
      lastError = `Google Search grounding (${model}) failed for "${query}": ${err?.message || String(err)}`;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    sources: [],
    queriesUsed,
    error: lastError || `Google Search grounding returned no results for "${query}"`,
    tokens,
  };
}

async function searchOpenAlex(
  query: string,
  page = 1,
  perPage = 5,
  signal?: AbortSignal
): Promise<{ sources: RawDiscoveredSource[]; error?: string }> {
  try {
    const cleanQ = query.replace(/\b(?:site|filetype):[^\s]+/gi, " ").trim();
    if (!cleanQ) return { sources: [] };

    const url = `https://api.openalex.org/works?search=${encodeURIComponent(cleanQ)}&page=${page}&per-page=${perPage}&sort=relevance_score:desc`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ForgeX-ResearchAgent/2.0 (mailto:research@forgex.app)" },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { sources: [], error: `OpenAlex HTTP ${res.status}` };
    }
    const data = (await res.json()) as any;
    const results = Array.isArray(data?.results) ? data.results : [];
    const sources: RawDiscoveredSource[] = [];

    for (const work of results) {
      const targetUrl =
        work?.open_access?.oa_url ||
        work?.primary_location?.pdf_url ||
        work?.primary_location?.landing_page_url ||
        work?.doi;
      const title = String(work?.display_name || work?.title || "").trim();
      if (!targetUrl || !title) continue;

      const abstractText = reconstructOpenAlexAbstract(work?.abstract_inverted_index);
      const snippet = abstractText || `Scholarly work published ${work?.publication_date || work?.publication_year || ""}`;

      if (!passesCandidateRelevance(cleanQ, title, snippet, "openalex")) {
        continue;
      }

      let domain = "openalex.org";
      try {
        domain = new URL(targetUrl).hostname.replace(/^www\./, "");
      } catch {}

      const publisher =
        work?.primary_location?.source?.display_name ||
        work?.primary_location?.source?.host_organization_name ||
        undefined;

      sources.push({
        title,
        url: targetUrl,
        pdfUrl: work?.primary_location?.pdf_url || work?.open_access?.oa_url || undefined,
        snippet,
        abstractText,
        sourceDomain: domain,
        publisher,
        publicationDate: work?.publication_date || (work?.publication_year ? String(work.publication_year) : undefined),
        provider: "openalex",
        queryUsed: query,
        isOfficialHint: isOfficialDomain(domain) || Boolean(work?.doi),
      });
    }
    return { sources };
  } catch (err: any) {
    return { sources: [], error: `OpenAlex error: ${err?.message || String(err)}` };
  }
}

async function searchCrossref(
  query: string,
  offset = 0,
  rows = 5,
  signal?: AbortSignal
): Promise<{ sources: RawDiscoveredSource[]; error?: string }> {
  try {
    const cleanQ = query.replace(/\b(?:site|filetype):[^\s]+/gi, " ").trim();
    if (!cleanQ) return { sources: [] };

    const url = `https://api.crossref.org/works?query=${encodeURIComponent(cleanQ)}&offset=${offset}&rows=${rows}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ForgeX-ResearchAgent/2.0" },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { sources: [], error: `Crossref HTTP ${res.status}` };
    }
    const data = (await res.json()) as any;
    const items = Array.isArray(data?.message?.items) ? data.message.items : [];
    const sources: RawDiscoveredSource[] = [];

    for (const item of items) {
      const title = Array.isArray(item?.title) ? String(item.title[0] || "").trim() : "";
      const targetUrl = item?.URL || (item?.DOI ? `https://doi.org/${item.DOI}` : "");
      if (!title || !targetUrl) continue;

      const abstractClean = item?.abstract ? decodeXml(String(item.abstract)).slice(0, 1400) : "";
      if (!passesCandidateRelevance(cleanQ, title, abstractClean, "crossref")) {
        continue;
      }

      const dateParts =
        item?.published?.["date-parts"]?.[0] ||
        item?.["published-print"]?.["date-parts"]?.[0] ||
        item?.["published-online"]?.["date-parts"]?.[0];
      const pubDate = Array.isArray(dateParts)
        ? dateParts.map((n: number, i: number) => (i === 0 ? String(n) : String(n).padStart(2, "0"))).join("-")
        : undefined;

      let domain = "doi.org";
      try {
        domain = new URL(targetUrl).hostname.replace(/^www\./, "");
      } catch {}

      sources.push({
        title,
        url: targetUrl,
        snippet: abstractClean || `${item?.publisher || "Crossref"} (${pubDate || "n.d."})`,
        abstractText: abstractClean || undefined,
        sourceDomain: domain,
        publisher: item?.publisher || undefined,
        publicationDate: pubDate,
        provider: "crossref",
        queryUsed: query,
        isOfficialHint: true,
      });
    }

    return { sources };
  } catch (err: any) {
    return { sources: [], error: `Crossref error: ${err?.message || String(err)}` };
  }
}

async function searchArxiv(
  query: string,
  start = 0,
  maxResults = 4,
  signal?: AbortSignal
): Promise<{ sources: RawDiscoveredSource[]; error?: string }> {
  try {
    const cleanQ = query.replace(/\b(?:site|filetype):[^\s]+/gi, " ").trim();
    if (!cleanQ) return { sources: [] };

    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(cleanQ)}&start=${start}&max_results=${maxResults}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ForgeX-ResearchAgent/2.0" },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(4500)]) : AbortSignal.timeout(4500),
    });
    if (!res.ok) {
      return { sources: [], error: `arXiv HTTP ${res.status}` };
    }
    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const sources: RawDiscoveredSource[] = [];

    for (const entry of entries) {
      const title = decodeXml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
      const idUrl = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim()?.slice(0, 10);
      const summary = decodeXml(entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || "");
      if (!title || !idUrl) continue;

      if (!passesCandidateRelevance(cleanQ, title, summary, "arxiv")) {
        continue;
      }

      const pdfUrl = idUrl.replace("/abs/", "/pdf/");
      sources.push({
        title,
        url: idUrl,
        pdfUrl,
        snippet: summary.slice(0, 800),
        abstractText: summary,
        sourceDomain: "arxiv.org",
        publisher: "arXiv",
        publicationDate: published,
        provider: "arxiv",
        queryUsed: query,
        isOfficialHint: true,
      });
    }
    return { sources };
  } catch (err: any) {
    return { sources: [], error: `arXiv error: ${err?.message || String(err)}` };
  }
}

async function searchWikipedia(
  query: string,
  limit = 3,
  signal?: AbortSignal
): Promise<{ sources: RawDiscoveredSource[]; error?: string }> {
  try {
    const cleanQ = query.replace(/\b(?:site|filetype):[^\s]+/gi, " ").trim();
    if (!cleanQ) return { sources: [] };

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&srlimit=${limit}&format=json`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "ForgeX-ResearchAgent/2.0" },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(3500)]) : AbortSignal.timeout(3500),
    });
    if (!res.ok) return { sources: [], error: `Wikipedia HTTP ${res.status}` };
    const data = (await res.json()) as any;
    const hits = Array.isArray(data?.query?.search) ? data.query.search : [];
    const sources: RawDiscoveredSource[] = [];
    for (const h of hits) {
      if (!h?.title) continue;
      const snippet = decodeXml(String(h.snippet || ""));
      if (!passesCandidateRelevance(cleanQ, String(h.title), snippet, "wikipedia")) {
        continue;
      }
      const slug = encodeURIComponent(String(h.title).replace(/\s+/g, "_"));
      sources.push({
        title: String(h.title),
        url: `https://en.wikipedia.org/wiki/${slug}`,
        snippet,
        sourceDomain: "wikipedia.org",
        publisher: "Wikipedia",
        publicationDate: h.timestamp ? String(h.timestamp).slice(0, 10) : undefined,
        provider: "wikipedia",
        queryUsed: query,
        isOfficialHint: false,
      });
    }
    return { sources };
  } catch (err: any) {
    return { sources: [], error: `Wikipedia error: ${err?.message || String(err)}` };
  }
}

async function searchNewsRss(
  query: string,
  limit = 5,
  signal?: AbortSignal
): Promise<{ sources: RawDiscoveredSource[]; discoveredPublisherDomains: string[]; error?: string }> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ForgeX-ResearchAgent/2.0" },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(4000)]) : AbortSignal.timeout(4000),
    });
    if (!res.ok) return { sources: [], discoveredPublisherDomains: [], error: `Google News RSS HTTP ${res.status}` };
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    const sources: RawDiscoveredSource[] = [];
    const discoveredPublisherDomains = new Set<string>();

    for (const block of items.slice(0, limit)) {
      const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
      const link = decodeXml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
      const pubRaw = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
      const sourceTag = block.match(/<source(?:\s+url="([^"]*)")?>([\s\S]*?)<\/source>/i);
      const publisher = decodeXml(sourceTag?.[2] || "");
      if (!title || !link) continue;

      let pubDate: string | undefined;
      if (pubRaw) {
        const ms = Date.parse(pubRaw);
        if (Number.isFinite(ms)) pubDate = new Date(ms).toISOString().split("T")[0];
      }

      let domain = "news.google.com";
      try {
        domain = new URL(sourceTag?.[1] || link).hostname.replace(/^www\./, "");
      } catch {}

      if (sourceTag?.[1]) {
        try {
          const pubHost = new URL(sourceTag[1]).hostname.replace(/^www\./, "").toLowerCase();
          if (pubHost && pubHost !== "news.google.com") {
            discoveredPublisherDomains.add(pubHost);
          }
        } catch {}
      }

      sources.push({
        title,
        url: link,
        snippet: publisher ? `${title} (${publisher})` : title,
        sourceDomain: domain,
        publisher: publisher || domain,
        publicationDate: pubDate,
        provider: "news_rss",
        queryUsed: query,
        isOfficialHint: isOfficialDomain(domain),
      });
    }
    return { sources, discoveredPublisherDomains: Array.from(discoveredPublisherDomains) };
  } catch (err: any) {
    return { sources: [], discoveredPublisherDomains: [], error: `News RSS error: ${err?.message || String(err)}` };
  }
}

export async function executeSearchQuery(params: {
  ai: GoogleGenAI | null;
  query: string;
  includeGoogleGrounding?: boolean;
  includeAcademic?: boolean;
  includeEncyclopedia?: boolean;
  includeNews?: boolean;
  officialDomains?: string[];
  targetTitles?: string[];
  page?: number;
  simulateSearchFailure?: boolean;
  signal?: AbortSignal;
}): Promise<SearchBatchResult> {
  const {
    ai,
    query,
    includeGoogleGrounding = true,
    includeAcademic = true,
    includeEncyclopedia = false,
    includeNews = true,
    officialDomains = [],
    targetTitles = [],
    page = 1,
    simulateSearchFailure = false,
    signal,
  } = params;

  const cleanQ = query.trim();
  if (!cleanQ) {
    return {
      sources: [],
      providerErrors: [],
      queriesExecuted: [],
      tokenUsage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
    };
  }

  if (simulateSearchFailure) {
    return {
      sources: [],
      providerErrors: [
        "Google Search Grounding unavailable (simulated provider outage: 503 Service Unavailable)",
        "OpenAlex API unavailable (simulated provider outage: 503 Service Unavailable)",
        "Crossref API unavailable (simulated provider outage: 503 Service Unavailable)",
        "arXiv API unavailable (simulated provider outage: 503 Service Unavailable)",
      ],
      queriesExecuted: [cleanQ],
      tokenUsage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
    };
  }

  const providerErrors: string[] = [];
  const queriesExecuted: string[] = [cleanQ];
  const tokenUsage: TokenUsage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };
  const allSources: RawDiscoveredSource[] = [];

  const tasks: Array<Promise<void>> = [];

  if (includeGoogleGrounding && ai && page === 1) {
    tasks.push(
      searchGoogleGrounding(ai, cleanQ, { signal }).then((res) => {
        addTokens(tokenUsage, {
          promptTokenCount: res.tokens.promptTokens,
          candidatesTokenCount: res.tokens.candidateTokens,
          totalTokenCount: res.tokens.totalTokens,
        });
        for (const q of res.queriesUsed) {
          if (!queriesExecuted.includes(q)) queriesExecuted.push(q);
        }
        if (res.error) providerErrors.push(res.error);
        allSources.push(...res.sources);
      })
    );
  } else if (includeGoogleGrounding && !ai && page === 1) {
    providerErrors.push("Google Search Grounding skipped: no Gemini API key configured.");
  }

  if (page === 1 && officialDomains.length > 0) {
    for (const domain of officialDomains.slice(0, 2)) {
      tasks.push(
        searchOfficialPublisherDomain({
          domain,
          query: cleanQ,
          targetTitles,
          signal,
        }).then((res) => {
          if (res.error) providerErrors.push(res.error);
          allSources.push(...res.sources);
        })
      );
    }
  }

  if (includeAcademic) {
    tasks.push(
      searchOpenAlex(cleanQ, page, 5, signal).then((res) => {
        if (res.error) providerErrors.push(res.error);
        allSources.push(...res.sources);
      })
    );
    tasks.push(
      searchCrossref(cleanQ, (page - 1) * 5, 4, signal).then((res) => {
        if (res.error) providerErrors.push(res.error);
        allSources.push(...res.sources);
      })
    );
    if (page === 1) {
      tasks.push(
        searchArxiv(cleanQ, 0, 3, signal).then((res) => {
          if (res.error) providerErrors.push(res.error);
          allSources.push(...res.sources);
        })
      );
    }
  }

  if (includeEncyclopedia && page === 1) {
    tasks.push(
      searchWikipedia(cleanQ, 2, signal).then((res) => {
        if (res.error) providerErrors.push(res.error);
        allSources.push(...res.sources);
      })
    );
  }

  if (includeNews && page === 1) {
    tasks.push(
      searchNewsRss(cleanQ, 4, signal).then(async (res) => {
        if (res.error) providerErrors.push(res.error);
        allSources.push(...res.sources);
        // If News RSS uncovered an official publisher domain we haven't queried yet, inspect its sitemap too
        const newDomains = res.discoveredPublisherDomains.filter(
          (d) => !officialDomains.includes(d) && isOfficialDomain(d)
        );
        if (newDomains.length > 0) {
          const siteRes = await searchOfficialPublisherDomain({
            domain: newDomains[0],
            query: cleanQ,
            targetTitles,
            signal,
          });
          allSources.push(...siteRes.sources);
        }
      })
    );
  }

  await Promise.allSettled(tasks);

  // Deduplicate by canonical URL within this batch, keeping official / google_search hits first
  const seenCanonical = new Set<string>();
  const deduped: RawDiscoveredSource[] = [];
  for (const src of allSources) {
    if (!src.url) continue;
    const canonical = normalizeCanonicalUrl(src.url);
    if (seenCanonical.has(canonical)) continue;
    seenCanonical.add(canonical);
    deduped.push(src);
  }

  return {
    sources: deduped,
    providerErrors,
    queriesExecuted,
    tokenUsage,
  };
}
