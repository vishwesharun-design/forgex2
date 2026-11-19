import { GoogleGenAI } from "@google/genai";
import type { DeepResearchReport, ForgeXModelId } from "../../types.ts";
import {
  assessResearchCompleteness,
  evaluatePublicationStatuses,
  runEvidenceExtractionAgent,
  runFactCheckingAgent,
  runReportGenerator,
  runResearchAnalyst,
  runResearchPlanner,
  runSearchAgent,
  runSourceVerificationAgent,
} from "./agents.ts";
import {
  searchInternalEvidenceDatabase,
  upsertVerifiedEvidenceToDatabase,
} from "./evidenceDb.ts";
import { normalizeCanonicalUrl } from "./httpFetcher.ts";
import type {
  ResearchPipelineConfig,
  ResearchProgressEvent,
  ResearchSessionState,
  VerifiedSourceRecord,
} from "./types.ts";

export interface ExecuteDeepResearchOptions {
  query: string;
  depth?: "deep" | "quick";
  maxSources?: number;
  concurrency?: number;
  modelId?: string;
  planSteps?: string[];
  projectContext?: string;
  apiKeys: string[];
  simulateSearchFailure?: boolean;
  onProgress?: (event: ResearchProgressEvent) => void;
  signal?: AbortSignal;
}

function createGenAiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export async function executeDeepResearchPipeline(
  options: ExecuteDeepResearchOptions
): Promise<DeepResearchReport> {
  const {
    query,
    depth = "deep",
    maxSources,
    concurrency,
    modelId = "forge-2-ultra",
    planSteps,
    projectContext,
    apiKeys,
    simulateSearchFailure = false,
    onProgress,
    signal,
  } = options;

  const cleanQuery = query.trim();
  const resolvedDepth: "deep" | "quick" = depth === "quick" ? "quick" : "deep";
  const resolvedMaxSources = Math.max(
    3,
    Math.min(30, Number(maxSources) || (resolvedDepth === "quick" ? 6 : 14))
  );
  const resolvedConcurrency = Math.max(2, Math.min(5, Number(concurrency) || 4));

  const config: ResearchPipelineConfig = {
    depth: resolvedDepth,
    maxSources: resolvedMaxSources,
    concurrency: resolvedConcurrency,
    modelId,
    simulateSearchFailure,
  };

  const state: ResearchSessionState = {
    id: `research_${Date.now()}`,
    originalQuery: cleanQuery,
    originalInstructions: cleanQuery,
    currentDate: new Date().toISOString().split("T")[0],
    config,
    projectContext: projectContext?.trim() || undefined,
    phase: "planning",
    plan: null,
    officialDomains: [],
    executedQueries: [],
    searchProviderErrors: [],
    discoveredSources: [],
    verifiedSources: [],
    allSourceRecords: [],
    evidenceRecords: [],
    publicationVerifications: [],
    analystOutput: null,
    factCheck: null,
    metrics: {
      queriesExecuted: 0,
      searchResultsRetrieved: 0,
      uniqueUrlsDiscovered: 0,
      sourcesOpened: 0,
      sourcesVerified: 0,
      sourcesPartiallyVerified: 0,
      sourcesRejected: 0,
      duplicateSources: 0,
      evidenceExtracted: 0,
      questionsCompleted: 0,
      questionsRemaining: 0,
      internalDbHits: 0,
      externalFallbackTriggered: false,
      completenessRounds: 0,
    },
    tokenUsage: {
      promptTokens: 0,
      candidateTokens: 0,
      totalTokens: 0,
    },
    startedAt: Date.now(),
  };

  const ai = apiKeys.length > 0 ? createGenAiClient(apiKeys[0]) : null;
  const totalSteps = Array.isArray(planSteps) && planSteps.length > 0 ? planSteps.length : 5;

  const emit = (
    phase: ResearchSessionState["phase"],
    phaseLabel: string,
    stepIndex: number,
    completedCount: number,
    label: string
  ) => {
    state.phase = phase;
    state.metrics.tokensUsed = { ...state.tokenUsage };
    state.metrics.durationMs = Date.now() - state.startedAt;
    onProgress?.({
      type: "step",
      phase,
      phaseLabel,
      stepIndex,
      completedCount: Math.min(totalSteps, completedCount),
      totalSteps,
      label,
      sourcesFound: state.metrics.sourcesVerified + state.metrics.sourcesPartiallyVerified,
      metrics: { ...state.metrics },
      executedQueries: [...state.executedQueries],
      recentSources: state.allSourceRecords.slice(0, 20),
    });
  };

  try {
    // ------------------------------------------------------------------------
    // AGENT 1: RESEARCH PLANNER
    // ------------------------------------------------------------------------
    emit("planning", "Agent 1: Research Planner", 0, 0, "Decomposing objective & preserving instructions");
    state.plan = await runResearchPlanner({
      ai,
      query: cleanQuery,
      customPlanSteps: planSteps,
      currentDate: state.currentDate,
      tokenUsage: state.tokenUsage,
      signal,
    });
    state.metrics.questionsRemaining = state.plan.subQuestions.length;
    if (signal?.aborted) throw new Error("Research cancelled");

    // ------------------------------------------------------------------------
    // SYSTEM A: INTERNAL EVIDENCE DATABASE SEARCH (Separate from External Web)
    // ------------------------------------------------------------------------
    const internalResult = searchInternalEvidenceDatabase({
      query: cleanQuery,
      plan: state.plan,
    });

    if (internalResult.matchedSources.length > 0 || internalResult.matchedEvidence.length > 0) {
      state.metrics.internalDbHits = internalResult.matchedEvidence.length || internalResult.matchedSources.length;

      for (const src of internalResult.matchedSources) {
        state.allSourceRecords.push(src);
        if (src.verificationStatus === "VERIFIED") state.metrics.sourcesVerified += 1;
        else if (src.verificationStatus === "PARTIALLY_VERIFIED") state.metrics.sourcesPartiallyVerified += 1;

        state.verifiedSources.push({
          source: src,
          contentForExtraction: internalResult.matchedContentByUrl.get(src.url) || src.snippet || "",
          matchedSubQuestionIds: [state.plan.subQuestions[0]?.id || "sq_1"],
        });
      }

      for (const ev of internalResult.matchedEvidence) {
        state.evidenceRecords.push(ev);
      }
      state.metrics.evidenceExtracted = state.evidenceRecords.length;
    }

    emit(
      "planning",
      "Agent 1: Research Planner",
      0,
      1,
      internalResult.isSufficient
        ? `Internal DB hit (${internalResult.matchedEvidence.length} verified records)`
        : `Internal DB checked (${internalResult.matchedEvidence.length} hits); missing items queued for external search`
    );

    // ------------------------------------------------------------------------
    // SYSTEM B: AUTOMATIC EXTERNAL LIVE WEB DISCOVERY FALLBACK
    // Runs whenever Internal DB is empty, partial, or missing any publication/sub-question
    // ------------------------------------------------------------------------
    if (!internalResult.isSufficient) {
      state.metrics.externalFallbackTriggered = true;

      emit(
        "searching",
        "Agent 2: External Live Web Discovery",
        1,
        1,
        "Searching official publisher domains, live web & scholarly indices"
      );

      await runSearchAgent({
        ai,
        state,
        missingSubQuestions: internalResult.missingSubQuestions,
        missingTitles: internalResult.missingPublicationTitles,
        discoveryRound: 1,
        signal,
      });
      if (signal?.aborted) throw new Error("Research cancelled");
      emit(
        "searching",
        "Agent 2: External Live Web Discovery",
        1,
        2,
        `Executed ${state.metrics.queriesExecuted} external queries (${state.metrics.uniqueUrlsDiscovered} URLs discovered)`
      );

      // AGENT 3: SOURCE VERIFICATION & DEDUPLICATION
      emit(
        "verifying_sources",
        "Agent 3: Source Verification Agent",
        2,
        2,
        `Opening & verifying candidate URLs (with official reader & PDF support)`
      );
      const newlyVerified = await runSourceVerificationAgent({ ai, state, signal });
      if (signal?.aborted) throw new Error("Research cancelled");
      emit(
        "verifying_sources",
        "Agent 3: Source Verification Agent",
        2,
        3,
        `Verified ${state.metrics.sourcesVerified} sources (${state.metrics.sourcesPartiallyVerified} partial, ${state.metrics.sourcesRejected} rejected)`
      );

      // AGENT 4: EVIDENCE EXTRACTION
      emit(
        "extracting_evidence",
        "Agent 4: Evidence Extraction Agent",
        3,
        3,
        `Extracting structured claims & statistics from ${newlyVerified.length} newly verified sources`
      );
      await runEvidenceExtractionAgent({ ai, state, sourcesToExtract: newlyVerified, signal });
      if (signal?.aborted) throw new Error("Research cancelled");

      // ----------------------------------------------------------------------
      // COMPLETENESS CHECK & ITERATIVE MISSING-ITEM FOLLOW-UP LOOP
      // ----------------------------------------------------------------------
      const maxCompletenessRounds = resolvedDepth === "quick" ? 1 : 2;
      for (let round = 1; round <= maxCompletenessRounds; round++) {
        if (signal?.aborted || state.config.simulateSearchFailure) break;

        const completeness = assessResearchCompleteness(state);
        if (
          completeness.missingSubQuestions.length === 0 &&
          completeness.missingPublicationTitles.length === 0
        ) {
          break;
        }

        state.metrics.completenessRounds = (state.metrics.completenessRounds || 0) + 1;

        // First check uninspected official sub-links/PDFs already extracted from verified official pages
        const inspectedUrlSet = new Set(
          state.allSourceRecords.flatMap((s) =>
            [s.url, s.canonicalUrl, s.originalUrl].filter(Boolean).map((u) => normalizeCanonicalUrl(String(u)))
          )
        );
        const uninspectedOfficialLinks = state.discoveredSources.filter(
          (d) =>
            !inspectedUrlSet.has(normalizeCanonicalUrl(d.url)) &&
            (d.isOfficialHint || /\.pdf(?:$|\?)/i.test(d.url))
        );

        let roundVerified: VerifiedSourceRecord[] = [];
        if (uninspectedOfficialLinks.length > 0) {
          roundVerified = await runSourceVerificationAgent({
            ai,
            state,
            candidatesOverride: uninspectedOfficialLinks.slice(0, 6),
            signal,
          });
        }

        // If still missing items or no uninspected official sub-links yielded new verified sources, run targeted follow-up search
        if (roundVerified.length === 0) {
          emit(
            "searching",
            `Completeness Follow-Up (Round ${round})`,
            2,
            3,
            `Searching for ${completeness.missingSubQuestions.length} missing sub-question(s)`
          );
          const extraCandidates = await runSearchAgent({
            ai,
            state,
            missingSubQuestions: completeness.missingSubQuestions,
            missingTitles: completeness.missingPublicationTitles,
            discoveryRound: round + 1,
            signal,
          });
          if (extraCandidates.length > 0) {
            roundVerified = await runSourceVerificationAgent({
              ai,
              state,
              candidatesOverride: extraCandidates,
              signal,
            });
          }
        }

        if (roundVerified.length > 0) {
          await runEvidenceExtractionAgent({
            ai,
            state,
            sourcesToExtract: roundVerified,
            signal,
          });
        } else {
          break;
        }
      }
    }

    // Final completeness & publication discovery status evaluation
    assessResearchCompleteness(state);
    evaluatePublicationStatuses(state);

    // Persist newly verified relevant sources & evidence back into Internal Evidence DB
    if (!state.config.simulateSearchFailure && state.verifiedSources.length > 0) {
      const freshVerified = state.verifiedSources.filter((v) => !v.source.fromInternalDb);
      const freshEvidence = state.evidenceRecords.filter((e) => !e.fromInternalDb);
      if (freshVerified.length > 0 || freshEvidence.length > 0) {
        upsertVerifiedEvidenceToDatabase({
          query: cleanQuery,
          plan: state.plan,
          verifiedSources: freshVerified.map((v) => ({
            source: v.source,
            contentForExtraction: v.contentForExtraction,
          })),
          evidenceRecords: freshEvidence,
        });
      }
    }

    // ------------------------------------------------------------------------
    // AGENT 5: RESEARCH ANALYST
    // ------------------------------------------------------------------------
    emit(
      "analyzing",
      "Agent 5: Research Analyst",
      3,
      4,
      `Cross-analyzing ${state.evidenceRecords.length} evidence records`
    );
    state.analystOutput = await runResearchAnalyst({ ai, state, signal });
    if (signal?.aborted) throw new Error("Research cancelled");

    // ------------------------------------------------------------------------
    // AGENT 6: INDEPENDENT FACT-CHECKING AGENT
    // ------------------------------------------------------------------------
    emit(
      "fact_checking",
      "Agent 6: Independent Fact-Checking Agent",
      4,
      4,
      "Auditing claims, dates, statistics, and publication verification statuses"
    );
    state.factCheck = await runFactCheckingAgent({
      ai,
      state,
      analystOutput: state.analystOutput,
      signal,
    });
    if (signal?.aborted) throw new Error("Research cancelled");

    // ------------------------------------------------------------------------
    // AGENT 7: REPORT GENERATOR
    // ------------------------------------------------------------------------
    emit(
      "generating_report",
      "Agent 7: Report Generator",
      4,
      4,
      "Compiling final cited report from verified evidence"
    );
    const finalMarkdown = await runReportGenerator({
      ai,
      state,
      analystOutput: state.analystOutput,
      factCheck: state.factCheck,
      signal,
    });

    const isSearchFailure =
      state.discoveredSources.length === 0 &&
      (state.metrics.internalDbHits || 0) === 0 &&
      state.searchProviderErrors.length > 0;
    const finalPhase = isSearchFailure ? "failed" : "completed";

    state.metrics.tokensUsed = { ...state.tokenUsage };
    state.metrics.durationMs = Date.now() - state.startedAt;

    emit(
      finalPhase,
      isSearchFailure ? "Search Providers Unavailable" : "Completed",
      totalSteps - 1,
      totalSteps,
      isSearchFailure ? "Search failed — reported honestly" : "Research complete"
    );

    const verifiedOnlySources = state.verifiedSources.map((v) => v.source);
    const findingsMatches = finalMarkdown.match(/(?:^|\n)[-*•]\s+([^\n]+)/g);
    const keyFindings = findingsMatches
      ? findingsMatches
          .slice(0, 6)
          .map((line) => line.replace(/^[\s\n-*•]+/, "").trim())
      : [`Completed verified research synthesis for "${cleanQuery}".`];

    return {
      id: state.id,
      query: cleanQuery,
      depth: resolvedDepth,
      timestamp: Date.now(),
      answer: finalMarkdown,
      summary:
        finalMarkdown.split("\n\n")[0]?.replace(/^#+\s*/, "") ||
        `Research report on ${cleanQuery}`,
      keyFindings,
      sources: verifiedOnlySources,
      allDiscoveredSources: state.allSourceRecords,
      searchQueriesUsed: state.executedQueries,
      steps: (state.plan?.steps || []).map((title, idx) => ({
        id: String(idx + 1),
        title,
        status: "completed" as const,
      })),
      modelId: modelId as ForgeXModelId,
      plan: state.plan || undefined,
      evidenceRecords: state.evidenceRecords,
      contradictoryFindings: state.analystOutput?.contradictoryFindings || [],
      unresolvedQuestions: state.analystOutput?.unresolvedQuestions || [],
      publicationVerifications:
        state.publicationVerifications.length > 0 ? state.publicationVerifications : undefined,
      factCheck: state.factCheck || undefined,
      metrics: { ...state.metrics },
      failureReason: isSearchFailure
        ? `Search providers failed: ${state.searchProviderErrors.join("; ")}`
        : undefined,
      searchProviderErrors:
        state.searchProviderErrors.length > 0 ? state.searchProviderErrors : undefined,
    };
  } catch (err: any) {
    if (signal?.aborted || String(err?.message || "").includes("Research cancelled")) {
      throw err;
    }

    const errMsg = err?.message || String(err);
    state.metrics.tokensUsed = { ...state.tokenUsage };
    state.metrics.durationMs = Date.now() - state.startedAt;

    const partialFindings = state.evidenceRecords
      .slice(0, 8)
      .map(
        (e) =>
          `- ${e.claim}${e.exactStatistic ? ` (${e.exactStatistic} ${e.unit || ""})` : ""} — [${e.sourceTitle}](${e.sourceUrl})`
      )
      .join("\n");

    const failureAnswer =
      `## Research Pipeline Interrupted: ${state.phase}\n\n` +
      `An error occurred while investigating **"${cleanQuery}"**:\n` +
      `> **Failure Reason:** ${errMsg}\n\n` +
      `### Completed Progress Preserved\n` +
      `- Internal DB hits: ${state.metrics.internalDbHits || 0}\n` +
      `- Queries executed: ${state.metrics.queriesExecuted}\n` +
      `- Unique URLs discovered: ${state.metrics.uniqueUrlsDiscovered}\n` +
      `- Sources verified: ${state.metrics.sourcesVerified} (${state.metrics.sourcesPartiallyVerified} partial)\n` +
      `- Evidence records extracted: ${state.metrics.evidenceExtracted}\n\n` +
      (partialFindings
        ? `### Preserved Verified Evidence\n${partialFindings}`
        : `No verified evidence records were completed before the interruption.`);

    return {
      id: state.id,
      query: cleanQuery,
      depth: resolvedDepth,
      timestamp: Date.now(),
      answer: failureAnswer,
      summary: `Research interrupted during ${state.phase}: ${errMsg}`,
      keyFindings: [`Research interrupted during ${state.phase}: ${errMsg}`],
      sources: state.verifiedSources.map((v) => v.source),
      allDiscoveredSources: state.allSourceRecords,
      searchQueriesUsed: state.executedQueries,
      steps: (state.plan?.steps || []).map((title, idx) => ({
        id: String(idx + 1),
        title,
        status: "completed" as const,
      })),
      modelId: modelId as ForgeXModelId,
      plan: state.plan || undefined,
      evidenceRecords: state.evidenceRecords,
      contradictoryFindings: state.analystOutput?.contradictoryFindings || [],
      unresolvedQuestions: state.analystOutput?.unresolvedQuestions || [],
      publicationVerifications:
        state.publicationVerifications.length > 0 ? state.publicationVerifications : undefined,
      factCheck: state.factCheck || undefined,
      metrics: { ...state.metrics },
      failureReason: errMsg,
      searchProviderErrors:
        state.searchProviderErrors.length > 0 ? state.searchProviderErrors : undefined,
    };
  }
}
