import React, { useState, useEffect, useRef } from 'react';
import {
  CircleDashed,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Telescope,
  Copy,
  Check,
  Globe,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Database,
  Search,
} from 'lucide-react';
import {
  ChatMessage,
  EvidenceRecord,
  ForgeXTheme,
  ResearchSource,
  SourceVerificationStatus,
} from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface InlineDeepResearchCardProps {
  message: ChatMessage;
  theme: ForgeXTheme;
  onStart: (messageId: string, steps: string[]) => void;
  onCancel: (messageId: string) => void;
  onUpdateSteps: (messageId: string, steps: string[]) => void;
  onCopy: (content: string, id: string) => void;
  copiedMessageId: string | null;
  renderSourcePills: (sources: any[] | undefined, messageId: string) => React.ReactNode;
  onOpenInCodeStudio?: (code: string, lang: any) => void;
  onOpenInImageStudio?: () => void;
  onViewImageFullscreen?: (url: string, prompt: string) => void;
}

function getVerificationBadgeClass(status?: SourceVerificationStatus) {
  switch (status) {
    case 'VERIFIED':
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    case 'PARTIALLY_VERIFIED':
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    case 'INACCESSIBLE':
      return 'bg-orange-500/15 text-orange-500 border-orange-500/30';
    case 'INVALID':
      return 'bg-red-500/15 text-red-500 border-red-500/30';
    case 'DUPLICATE':
      return 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30';
    default:
      return 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30';
  }
}

export const InlineDeepResearchCard: React.FC<InlineDeepResearchCardProps> = ({
  message,
  theme,
  onStart,
  onCancel,
  onUpdateSteps,
  onCopy,
  copiedMessageId,
  renderSourcePills,
  onOpenInCodeStudio,
  onOpenInImageStudio,
  onViewImageFullscreen,
}) => {
  const isDark = theme === 'dark';
  const dr = message.deepResearch!;
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [isFactCheckExpanded, setIsFactCheckExpanded] = useState(false);
  const [expandedSourceUrls, setExpandedSourceUrls] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [draftSteps, setDraftSteps] = useState<string[]>(dr.steps);
  const [countdown, setCountdown] = useState<number>(60);
  const [runningElapsed, setRunningElapsed] = useState<number>(0);
  const autoStartedRef = useRef<boolean>(false);
  const onStartRef = useRef(onStart);
  const draftStepsRef = useRef(draftSteps);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    draftStepsRef.current = draftSteps;
  }, [draftSteps]);

  // Sync draft steps when async /api/deep-research/plan replaces initial placeholder steps
  useEffect(() => {
    if (!isEditing) {
      setDraftSteps(dr.steps);
    }
  }, [dr.steps, isEditing]);

  // 60-second auto-start countdown during 'planning' phase (paused while user edits steps)
  useEffect(() => {
    if (dr.status !== 'planning' || isEditing) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!autoStartedRef.current) {
            autoStartedRef.current = true;
            setTimeout(() => onStartRef.current(message.id, draftStepsRef.current), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [dr.status, isEditing, message.id]);

  // Elapsed seconds counter during 'running' phase
  useEffect(() => {
    if (dr.status !== 'running') {
      setRunningElapsed(0);
      return;
    }
    const secTimer = setInterval(() => {
      setRunningElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(secTimer);
  }, [dr.status]);

  const completedStepsCount = Math.max(0, Math.min(dr.steps.length, dr.completedStepsCount ?? 0));

  const handleSaveEdit = () => {
    const cleaned = draftSteps.map((s) => s.trim()).filter(Boolean);
    const nextSteps = cleaned.length > 0 ? cleaned : dr.steps;
    setDraftSteps(nextSteps);
    onUpdateSteps(message.id, nextSteps);
    setIsEditing(false);
  };

  const toggleSourceDetail = (url: string) => {
    setExpandedSourceUrls((prev) => ({ ...prev, [url]: !prev[url] }));
  };

  if (dr.status === 'cancelled') {
    return (
      <div
        className={`w-full max-w-3xl min-w-0 rounded-xl border px-3.5 py-2.5 text-xs flex items-center justify-between gap-3 ${
          isDark
            ? 'bg-neutral-500/[0.06] border-neutral-800/80 text-neutral-400'
            : 'bg-neutral-500/[0.04] border-neutral-200/80 text-neutral-600'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Telescope className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span className="truncate">
            Research cancelled for &ldquo;{dr.query}&rdquo;
          </span>
        </div>
        <button
          type="button"
          onClick={() => onStart(message.id, draftSteps)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
            isDark
              ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
              : 'border-neutral-300 hover:bg-neutral-200/70 text-neutral-800'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          <span>Run anyway</span>
        </button>
      </div>
    );
  }

  if (dr.status === 'planning') {
    return (
      <div className="w-full max-w-3xl min-w-0 flex flex-col gap-2 animate-in fade-in duration-200">
        <button
          type="button"
          onClick={() => setIsPlanExpanded((p) => !p)}
          className={`inline-flex items-center gap-1 text-xs font-medium w-fit transition-colors cursor-pointer ${
            isDark
              ? 'text-neutral-400 hover:text-neutral-200'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <span>
            {dr.planDurationSec
              ? `Planned in ${dr.planDurationSec}s`
              : 'Preparing research plan'}
          </span>
          {isPlanExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {isPlanExpanded && (
          <div
            className={`rounded-2xl border p-4 sm:p-5 transition-all ${
              isDark
                ? 'bg-neutral-500/[0.05] border-neutral-800/80 text-neutral-100'
                : 'bg-neutral-500/[0.03] border-neutral-200/80 text-neutral-900'
            }`}
          >
            <h4 className="text-[15px] font-semibold tracking-tight mb-3.5">
              Research &lsquo;{dr.query}&rsquo;
            </h4>

            <div className="space-y-3 mb-5">
              {draftSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CircleDashed
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  />
                  {isEditing ? (
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => {
                        const updated = [...draftSteps];
                        updated[idx] = e.target.value;
                        setDraftSteps(updated);
                      }}
                      className={`flex-1 text-[13px] px-2.5 py-1 rounded-lg border outline-none transition-colors ${
                        isDark
                          ? 'bg-neutral-950 border-neutral-700 text-white focus:border-sky-500'
                          : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-sky-500'
                      }`}
                    />
                  ) : (
                    <span
                      className={`text-[13.5px] leading-snug ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`}
                    >
                      {step}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-sky-500/60 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                      : 'border-sky-500/60 bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                      : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  Edit
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setDraftSteps(dr.steps);
                      setIsEditing(false);
                    } else {
                      onCancel(message.id);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                      : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      handleSaveEdit();
                    }
                    autoStartedRef.current = true;
                    onStart(message.id, draftSteps);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    isDark
                      ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  <span>Start</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-semibold border ${
                      isDark
                        ? 'border-neutral-300 text-neutral-900'
                        : 'border-white/35 text-white'
                    }`}
                  >
                    {countdown}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (dr.status === 'running') {
    const totalCount = Math.max(1, dr.steps.length);
    const pct = Math.max(0, Math.min(100, Math.round((completedStepsCount / totalCount) * 100)));
    const m = dr.metrics;

    return (
      <div className="w-full max-w-3xl min-w-0 py-2 flex flex-col gap-3 animate-in fade-in duration-200">
        {/* Real Progress Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`h-2 w-40 rounded-full overflow-hidden ${
              isDark ? 'bg-neutral-800' : 'bg-neutral-200/80'
            }`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-neutral-500 tabular-nums">
            {completedStepsCount}/{dr.steps.length} steps
            {m
              ? ` · ${m.queriesExecuted} queries · ${m.sourcesOpened} opened · ${m.sourcesVerified} verified · ${m.evidenceExtracted} evidence`
              : dr.sourcesFound && dr.sourcesFound > 0
              ? ` · ${dr.sourcesFound} sources`
              : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Telescope className="w-4 h-4 text-sky-500 shrink-0 animate-pulse" />
            <span
              className={`text-sm font-medium truncate ${
                isDark ? 'animate-text-shimmer-dark' : 'animate-text-shimmer-light'
              }`}
            >
              {dr.phaseLabel
                ? dr.phaseLabel
                : completedStepsCount >= dr.steps.length
                ? `Finalizing research for “${dr.query}”`
                : `Researching “${dr.query}”`}
            </span>
            <span className="text-xs text-neutral-400 tabular-nums shrink-0">
              {runningElapsed}s
            </span>
          </div>
          <button
            type="button"
            onClick={() => onCancel(message.id)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-500'
            }`}
          >
            Stop
          </button>
        </div>

        {/* Live Search Queries */}
        {dr.executedQueries && dr.executedQueries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
            <Search className="w-3 h-3 text-neutral-400 shrink-0" />
            {dr.executedQueries.slice(-4).map((q, i) => (
              <span
                key={i}
                className={`text-[11px] px-2 py-0.5 rounded-full border truncate max-w-[220px] ${
                  isDark
                    ? 'bg-neutral-500/[0.06] border-neutral-800 text-neutral-300'
                    : 'bg-neutral-500/[0.04] border-neutral-200 text-neutral-600'
                }`}
                title={q}
              >
                {q}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2 pl-1">
          {dr.steps.map((step, idx) => {
            const done = idx < completedStepsCount;
            const active = idx === completedStepsCount;
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 text-xs transition-all duration-300 ${
                  done
                    ? 'text-neutral-700 dark:text-neutral-200'
                    : active
                    ? 'text-neutral-900 dark:text-white font-medium'
                    : 'text-neutral-400 dark:text-neutral-600 opacity-65'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 transition-transform duration-200 scale-100" />
                ) : (
                  <CircleDashed
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      active ? 'text-sky-500 animate-spin-slow' : ''
                    }`}
                  />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        {/* Live Source Feed */}
        {dr.sources && dr.sources.length > 0 && (
          <div
            className={`mt-1 rounded-xl border p-2.5 space-y-1.5 ${
              isDark ? 'bg-neutral-500/[0.04] border-neutral-800/80' : 'bg-neutral-500/[0.03] border-neutral-200/80'
            }`}
          >
            <div className="text-[11px] font-medium text-neutral-500">
              Live Source Verification ({dr.sources.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {dr.sources.slice(-6).map((src, i) => (
                <div key={src.url + i} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={`truncate ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    {src.title || src.sourceDomain || src.url}
                  </span>
                  {src.verificationStatus && (
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 ${getVerificationBadgeClass(
                        src.verificationStatus
                      )}`}
                    >
                      {src.verificationStatus}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // status === 'completed' || status === 'failed'
  const isFailed = dr.status === 'failed';
  const metrics = dr.metrics;
  const factCheck = dr.factCheck;
  const sources: ResearchSource[] = Array.isArray(dr.sources) ? dr.sources : [];
  const evidenceRecords: EvidenceRecord[] = Array.isArray(dr.evidenceRecords) ? dr.evidenceRecords : [];

  return (
    <div
      className={`relative w-full max-w-3xl min-w-0 py-1 transition-colors text-sm sm:text-[15px] leading-[1.75] ${
        isDark ? 'text-neutral-100' : 'text-neutral-900'
      }`}
    >
      {/* Top Status & Toggles Row (blends cleanly into background, no heavy box) */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={() => setIsStepsExpanded((p) => !p)}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 -ml-2 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60'
          }`}
        >
          <Telescope className={`w-3.5 h-3.5 shrink-0 ${isFailed ? 'text-amber-500' : 'text-sky-500'}`} />
          <span>
            {isFailed ? 'Research completed with issues' : 'Researched the requested topic'}
            {dr.researchDurationSec ? ` · ${dr.researchDurationSec}s` : ''}
          </span>
          {isStepsExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {factCheck && (
          <button
            type="button"
            onClick={() => setIsFactCheckExpanded((p) => !p)}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
              factCheck.overallReliability === 'HIGH'
                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                : factCheck.overallReliability === 'MODERATE'
                ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>
              Fact-Check: {factCheck.overallReliability} ({factCheck.verifiedClaimsCount}/
              {factCheck.checkedClaimsCount})
            </span>
          </button>
        )}

        {sources.length > 0 && (
          <button
            type="button"
            onClick={() => setIsSourcesExpanded((p) => !p)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
            }`}
          >
            <Database className="w-3 h-3 text-sky-500 shrink-0" />
            <span>Inspect Sources ({sources.length})</span>
            {isSourcesExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}

        {isFailed && (
          <button
            type="button"
            onClick={() => onStart(message.id, draftSteps)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-neutral-800/70 text-neutral-300'
                : 'hover:bg-neutral-200/70 text-neutral-700'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Quiet Execution Metrics Line (matches background, no box) */}
      {metrics && (
        <div
          className={`mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] tabular-nums ${
            isDark ? 'text-neutral-400' : 'text-neutral-500'
          }`}
        >
          <span>{metrics.queriesExecuted} queries</span>
          <span>·</span>
          <span>{metrics.sourcesOpened} opened</span>
          <span>·</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{metrics.sourcesVerified} verified</span>
          {metrics.sourcesPartiallyVerified > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-600 dark:text-amber-400">{metrics.sourcesPartiallyVerified} partial</span>
            </>
          )}
          {metrics.sourcesRejected > 0 && (
            <>
              <span>·</span>
              <span className="text-orange-600 dark:text-orange-400">{metrics.sourcesRejected} rejected</span>
            </>
          )}
          <span>·</span>
          <span>{metrics.evidenceExtracted} evidence records</span>
        </div>
      )}

      {/* Failure or Fact-Check Warnings Notice */}
      {(dr.failureReason || (factCheck?.warnings && factCheck.warnings.length > 0)) && (
        <div
          className={`mb-3 pl-3 border-l-2 border-amber-500/60 text-xs flex items-start gap-2 ${
            isDark ? 'text-amber-300' : 'text-amber-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div className="space-y-1 min-w-0">
            {dr.failureReason && <p className="font-medium break-words">{dr.failureReason}</p>}
            {factCheck?.warnings?.map((w, idx) => (
              <p key={idx} className="opacity-90 break-words">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Research Plan Steps */}
      {isStepsExpanded && dr.steps.length > 0 && (
        <div
          className={`mb-3.5 p-3 rounded-xl border space-y-1.5 text-xs ${
            isDark
              ? 'bg-neutral-500/[0.04] border-neutral-800/80 text-neutral-300'
              : 'bg-neutral-500/[0.03] border-neutral-200/80 text-neutral-700'
          }`}
        >
          {dr.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible Fact-Check Claim Audit */}
      {isFactCheckExpanded && factCheck && factCheck.findings && factCheck.findings.length > 0 && (
        <div
          className={`mb-3.5 p-3 rounded-xl border space-y-2 text-xs ${
            isDark
              ? 'bg-neutral-500/[0.04] border-neutral-800/80 text-neutral-300'
              : 'bg-neutral-500/[0.03] border-neutral-200/80 text-neutral-700'
          }`}
        >
          <div className="font-semibold text-[11px] uppercase tracking-wider text-neutral-500">
            Independent Fact-Check Audit ({factCheck.verifiedClaimsCount} verified, {factCheck.rejectedClaimsCount} rejected)
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {factCheck.findings.map((finding, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg border ${
                  isDark ? 'bg-neutral-500/[0.04] border-neutral-800/70' : 'bg-neutral-500/[0.03] border-neutral-200/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                      finding.status === 'SUPPORTED'
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : finding.status === 'PARTIALLY_SUPPORTED'
                        ? 'bg-sky-500/15 text-sky-500 border-sky-500/30'
                        : 'bg-red-500/15 text-red-500 border-red-500/30'
                    }`}
                  >
                    {finding.status}
                  </span>
                  {finding.publicationDate && (
                    <span className="text-[10px] text-neutral-500">{finding.publicationDate}</span>
                  )}
                </div>
                <p className="font-medium leading-snug mb-1">{finding.claim}</p>
                <p className="text-[11px] text-neutral-500">{finding.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Source Discovery & Verification Inspector */}
      {isSourcesExpanded && sources.length > 0 && (
        <div
          className={`mb-3.5 p-3 rounded-xl border space-y-2 text-xs ${
            isDark
              ? 'bg-neutral-500/[0.04] border-neutral-800/80 text-neutral-300'
              : 'bg-neutral-500/[0.03] border-neutral-200/80 text-neutral-700'
          }`}
        >
          <div className="font-semibold text-[11px] uppercase tracking-wider text-neutral-500">
            Source Verification & Extracted Evidence
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sources.map((src, idx) => {
              const expanded = Boolean(expandedSourceUrls[src.url]);
              const linkedEvidence = evidenceRecords.filter((e) => e.sourceUrl === src.url);
              return (
                <div
                  key={src.url + idx}
                  className={`p-2.5 rounded-lg border ${
                    isDark ? 'bg-neutral-500/[0.04] border-neutral-800/70' : 'bg-neutral-500/[0.03] border-neutral-200/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSourceDetail(src.url)}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 font-medium">
                        {expanded ? (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                        )}
                        <span className="truncate">{src.extractedTitle || src.title || src.url}</span>
                      </div>
                      <div className="text-[11px] text-neutral-500 pl-5 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{src.publisher || src.sourceDomain || 'Unknown publisher'}</span>
                        {src.publicationDate && <span>· {src.publicationDate}</span>}
                        {src.contentType && <span>· {src.contentType.toUpperCase()}</span>}
                        {linkedEvidence.length > 0 && (
                          <span className="text-sky-500">· {linkedEvidence.length} evidence</span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {src.verificationStatus && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getVerificationBadgeClass(
                            src.verificationStatus
                          )}`}
                        >
                          {src.verificationStatus}
                        </span>
                      )}
                      {src.url && src.url !== '#' && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-neutral-800/40 text-neutral-400 hover:text-sky-500"
                          title={src.url}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div
                      className={`mt-2 pt-2 border-t text-[11px] space-y-1.5 pl-5 ${
                        isDark ? 'border-neutral-800' : 'border-neutral-200'
                      }`}
                    >
                      <div className="break-all text-neutral-500">{src.url}</div>
                      {src.statusReason && (
                        <div className="text-neutral-400">
                          Status detail: <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>{src.statusReason}</span>
                        </div>
                      )}
                      {linkedEvidence.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {linkedEvidence.map((ev) => (
                            <div
                              key={ev.id}
                              className={`p-2 rounded border ${
                                isDark ? 'bg-neutral-500/[0.04] border-neutral-800/70' : 'bg-neutral-500/[0.03] border-neutral-200/70'
                              }`}
                            >
                              <div className="font-medium">{ev.claim}</div>
                              {ev.exactStatistic && (
                                <div className="text-emerald-500 font-semibold mt-0.5">
                                  Stat: {ev.exactStatistic} {ev.unit || ''}{' '}
                                  {ev.referencePeriod ? `(${ev.referencePeriod})` : ''}
                                </div>
                              )}
                              <div className="text-neutral-500 italic mt-0.5 line-clamp-3">
                                &ldquo;{ev.relevantPassage}&rdquo;
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Markdown Deep Research Report (directly on background, no box) */}
      <div className="relative min-w-0">
        <MarkdownRenderer
          content={message.content}
          theme={theme}
          onOpenInCodeStudio={(code, lang) => onOpenInCodeStudio?.(code, lang)}
          onOpenInImageStudio={() => onOpenInImageStudio?.()}
          onViewImageFullscreen={(url, prompt) => onViewImageFullscreen?.(url, prompt)}
        />
      </div>

      {/* Sources Pills */}
      {message.groundingSources && message.groundingSources.length > 0
        ? renderSourcePills(message.groundingSources, message.id)
        : null}

      {/* Minimal Borderless Reply Footer Actions matching normal chat messages */}
      <div
        className={`mt-2.5 flex items-center gap-2 text-xs ${
          isDark ? 'text-neutral-400' : 'text-neutral-500'
        }`}
      >
        <button
          type="button"
          onClick={() => onCopy(message.content, message.id)}
          title="Copy response"
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            isDark
              ? 'hover:bg-neutral-800/70 hover:text-neutral-100 text-neutral-400'
              : 'hover:bg-neutral-200/70 hover:text-neutral-900 text-neutral-500'
          }`}
        >
          {copiedMessageId === message.id ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                Copied
              </span>
            </>
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
            isDark ? 'text-sky-400/90' : 'text-sky-600'
          }`}
        >
          <Globe className="w-3 h-3" />
          <span>Deep Research</span>
        </span>
      </div>
    </div>
  );
};
