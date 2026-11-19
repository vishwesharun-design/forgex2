import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Search,
  Globe,
  Cpu,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  Loader2,
  Clock,
  Trash2,
  ChevronRight,
  ChevronDown,
  History,
  Zap,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Database,
  Layers,
  FileSearch,
} from 'lucide-react';
import {
  DeepResearchReport,
  EvidenceRecord,
  ForgeXModelId,
  ResearchMetrics,
  ResearchPhase,
  ResearchSource,
  SourceVerificationStatus,
} from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { authService } from '../services/authService';

interface ResearchWorkspaceProps {
  isDark: boolean;
  selectedModelId: ForgeXModelId;
}

function getResearchStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_deep_research_history_${partition}`;
}

const SAMPLE_TOPICS = [
  'World Economic Forum Future of Jobs Report 2025 key findings and job projections',
  'Commercial fusion energy timeline and reactor milestones 2025-2026',
  'CRISPR clinical approvals and therapeutic trial outcomes',
  'Next-generation solid-state battery energy density benchmarks',
];

const PIPELINE_PHASES: Array<{ key: ResearchPhase; title: string; desc: string }> = [
  { key: 'planning', title: 'Agent 1 · Research Planner', desc: 'Decomposing objective, constraints, dates & sub-questions' },
  { key: 'searching', title: 'Agent 2 · Search Agent', desc: 'Running multi-query official-first web & scholarly discovery' },
  { key: 'verifying_sources', title: 'Agent 3 · Source Verification', desc: 'Fetching live pages/PDFs, checking HTTP status, dates & duplicates' },
  { key: 'extracting_evidence', title: 'Agent 4 · Evidence Extraction', desc: 'Extracting structured claims, statistics, units & methodologies' },
  { key: 'analyzing', title: 'Agent 5 · Research Analyst', desc: 'Cross-comparing sources, contradictions & methodological differences' },
  { key: 'fact_checking', title: 'Agent 6 · Independent Fact-Check', desc: 'Auditing every claim, statistic, date & URL against evidence' },
  { key: 'generating_report', title: 'Agent 7 · Report Generator', desc: 'Compiling cited Markdown report strictly from verified evidence' },
];

function statusBadgeStyle(status?: SourceVerificationStatus) {
  switch (status) {
    case 'VERIFIED':
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    case 'PARTIALLY_VERIFIED':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'INACCESSIBLE':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'INVALID':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'DUPLICATE':
      return 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30';
    default:
      return 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30';
  }
}

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  isDark,
  selectedModelId,
}) => {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'deep' | 'quick'>('deep');
  const [maxSources, setMaxSources] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(false);

  // Real live pipeline state from SSE
  const [livePhase, setLivePhase] = useState<ResearchPhase>('planning');
  const [livePhaseLabel, setLivePhaseLabel] = useState<string>('Initializing pipeline...');
  const [liveMetrics, setLiveMetrics] = useState<ResearchMetrics | null>(null);
  const [liveQueries, setLiveQueries] = useState<string[]>([]);
  const [liveSources, setLiveSources] = useState<ResearchSource[]>([]);

  const [currentReport, setCurrentReport] = useState<DeepResearchReport | null>(null);
  const [history, setHistory] = useState<DeepResearchReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dossier inspection state
  const [sourceFilter, setSourceFilter] = useState<'all' | 'verified' | 'partial' | 'rejected' | 'duplicate'>('all');
  const [expandedSourceUrls, setExpandedSourceUrls] = useState<Record<string, boolean>>({});
  const [showEvidenceDb, setShowEvidenceDb] = useState(false);
  const [showFactCheckAudit, setShowFactCheckAudit] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadUserHistory = () => {
      try {
        const key = getResearchStorageKey();
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setHistory(parsed);
            if (parsed.length > 0) {
              setCurrentReport(parsed[0]);
            } else {
              setCurrentReport(null);
            }
            return;
          }
        }
        setHistory([]);
        setCurrentReport(null);
      } catch {
        // Ignore
      }
    };

    loadUserHistory();
    const handleAuth = () => loadUserHistory();
    window.addEventListener('forgex:auth_changed', handleAuth);
    return () => window.removeEventListener('forgex:auth_changed', handleAuth);
  }, []);

  const saveToHistory = (report: DeepResearchReport) => {
    setHistory((prev) => {
      const updated = [report, ...prev.filter((item) => item.id !== report.id)].slice(0, 30);
      try {
        const key = getResearchStorageKey();
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        const key = getResearchStorageKey();
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
    if (currentReport?.id === id) {
      setCurrentReport(null);
    }
  };

  const handleCancelResearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleStartResearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMsg(null);
    setCurrentReport(null);
    setLivePhase('planning');
    setLivePhaseLabel('Starting Agent 1 · Research Planner');
    setLiveMetrics(null);
    setLiveQueries([]);
    setLiveSources([]);
    setExpandedSourceUrls({});
    setSourceFilter('all');

    try {
      const rawKey = localStorage.getItem('forgex_api_key') || '';
      const storedApiKey = rawKey.startsWith('AIza') ? rawKey : undefined;
      const res = await fetch('/api/deep-research/stream', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({
          query: q,
          depth,
          maxSources,
          modelId: selectedModelId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Research query failed with status ${res.status}`);
      }

      let finalReport: DeepResearchReport | null = null;
      const contentType = res.headers.get('content-type') || '';

      const handleResearchEvent = (jsonText: string) => {
        const evt = JSON.parse(jsonText);
        if (evt.type === 'step' || evt.type === 'phase' || evt.type === 'metrics') {
          if (evt.phase) setLivePhase(evt.phase);
          if (evt.phaseLabel || evt.label) setLivePhaseLabel(evt.phaseLabel || evt.label);
          if (evt.metrics) setLiveMetrics(evt.metrics);
          if (Array.isArray(evt.executedQueries)) setLiveQueries(evt.executedQueries);
          if (Array.isArray(evt.recentSources)) setLiveSources(evt.recentSources);
        } else if (evt.type === 'complete') {
          finalReport = evt.report;
        } else if (evt.type === 'error') {
          throw new Error(evt.error || 'Failed to retrieve deep research report');
        }
      };

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const rawEvent of events) {
            const line = rawEvent.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            const jsonText = line.slice(5).trim();
            if (!jsonText) continue;
            handleResearchEvent(jsonText);
          }
        }

        if (buffer.trim()) {
          const trailingLine = buffer.split('\n').find((l) => l.startsWith('data:'));
          if (trailingLine) {
            const jsonText = trailingLine.slice(5).trim();
            if (jsonText) handleResearchEvent(jsonText);
          }
        }
      } else {
        const data = await res.json();
        finalReport = data.report || null;
      }

      if (finalReport && finalReport.answer) {
        setCurrentReport(finalReport);
        saveToHistory(finalReport);
      } else {
        throw new Error('Failed to retrieve deep research report');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      let msg = String(err?.message || 'An error occurred while executing deep research');
      for (let i = 0; i < 3; i++) {
        const trimmed = msg.trim();
        if (!trimmed.startsWith('{')) break;
        try {
          const parsed = JSON.parse(trimmed);
          const inner = parsed?.error?.message || parsed?.message;
          if (typeof inner === 'string' && inner.trim()) msg = inner;
          else break;
        } catch {
          break;
        }
      }
      if (/503|unavailable|high demand/i.test(msg)) {
        msg = 'The AI model is temporarily experiencing high demand (503). Please try again in a few seconds.';
      }
      setErrorMsg(msg);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!currentReport) return;
    const text =
      `# ${currentReport.query}\n\n${currentReport.answer}\n\n## Sources\n` +
      currentReport.sources
        .map((s) => `- [${s.title}](${s.url}) (${s.publisher || s.sourceDomain || 'Web'}, ${s.verificationStatus || 'VERIFIED'})`)
        .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSourceExpand = (url: string) => {
    setExpandedSourceUrls((prev) => ({ ...prev, [url]: !prev[url] }));
  };

  const allInspectionSources: ResearchSource[] = currentReport
    ? currentReport.allDiscoveredSources && currentReport.allDiscoveredSources.length > 0
      ? currentReport.allDiscoveredSources
      : currentReport.sources
    : [];

  const filteredSources = allInspectionSources.filter((s) => {
    const st = s.verificationStatus || 'VERIFIED';
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'verified') return st === 'VERIFIED';
    if (sourceFilter === 'partial') return st === 'PARTIALLY_VERIFIED';
    if (sourceFilter === 'rejected') return st === 'INACCESSIBLE' || st === 'INVALID';
    if (sourceFilter === 'duplicate') return st === 'DUPLICATE';
    return true;
  });

  const activePhaseIdx = Math.max(
    0,
    PIPELINE_PHASES.findIndex((p) => p.key === livePhase)
  );

  const getEvidenceForSource = (sourceUrl: string): EvidenceRecord[] => {
    if (!currentReport?.evidenceRecords) return [];
    return currentReport.evidenceRecords.filter((e) => e.sourceUrl === sourceUrl);
  };

  return (
    <div className={`flex-1 h-full min-h-0 overflow-y-auto flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Workspace Header */}
      <div className={`border-b px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md ${
        isDark ? 'bg-neutral-950/90 border-neutral-800/80' : 'bg-white/90 border-neutral-200'
      }`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-neutral-950 shadow-md shadow-amber-500/20 shrink-0">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">Deep Research Engine</h1>
              <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono shrink-0">
                7-AGENT VERIFIED PIPELINE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
              Multi-query search, live source verification, evidence extraction & independent fact-checking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                showHistory
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : isDark
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({history.length})</span>
            </button>
          )}

          {currentReport && (
            <button
              type="button"
              onClick={() => {
                setCurrentReport(null);
                setQuery('');
                inputRef.current?.focus();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800' : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Investigation</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Search & Topic Input Card */}
        <div className={`p-5 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-neutral-900/90 border-neutral-800/90' : 'bg-white border-neutral-200'
        }`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartResearch();
            }}
            className="flex flex-col gap-3"
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
              isDark
                ? 'bg-neutral-950 border-neutral-800 focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20'
                : 'bg-neutral-50 border-neutral-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
            }`}>
              <Search className="w-5 h-5 text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask any complex research question, report title, or multi-part comparison..."
                disabled={isLoading}
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleCancelResearch}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 transition-all shrink-0 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    query.trim()
                      ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Deep Research</span>
                </button>
              )}
            </div>

            {/* Depth & Max Source Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500">Depth:</span>
                <button
                  type="button"
                  onClick={() => {
                    setDepth('deep');
                    setMaxSources(15);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all ${
                    depth === 'deep'
                      ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                      : isDark
                        ? 'bg-neutral-800/60 text-neutral-400 hover:text-white border border-transparent'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-transparent'
                  }`}
                >
                  <Zap className="w-3 h-3 shrink-0" />
                  <span>Deep Multi-Step</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDepth('quick');
                    setMaxSources(8);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all ${
                    depth === 'quick'
                      ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                      : isDark
                        ? 'bg-neutral-800/60 text-neutral-400 hover:text-white border border-transparent'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-transparent'
                  }`}
                >
                  <Search className="w-3 h-3 shrink-0" />
                  <span>Quick</span>
                </button>

                <span className="text-xs text-neutral-500 ml-2">Max Sources:</span>
                {[8, 15, 25].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMaxSources(count)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      maxSources === count
                        ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                        : isDark
                          ? 'bg-neutral-800/60 text-neutral-400 hover:text-white border border-transparent'
                          : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-transparent'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto text-xs text-neutral-400 py-1">
                <span className="shrink-0 text-neutral-500 font-medium">Try:</span>
                {SAMPLE_TOPICS.slice(0, 2).map((topic, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(topic);
                      handleStartResearch(topic);
                    }}
                    className={`truncate max-w-[240px] px-2.5 py-1 rounded-lg border text-left transition-colors ${
                      isDark
                        ? 'bg-neutral-950/60 border-neutral-800 hover:border-amber-500/40 text-neutral-300'
                        : 'bg-neutral-50 border-neutral-200 hover:border-amber-500/40 text-neutral-700'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* History Drawer */}
        {showHistory && (
          <div className={`p-4 rounded-3xl border space-y-3 ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Previous Research Dossiers
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setCurrentReport(item);
                    setShowHistory(false);
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all group ${
                    currentReport?.id === item.id
                      ? 'border-amber-500/60 bg-amber-500/5'
                      : isDark
                        ? 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                        : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold truncate group-hover:text-amber-400 transition-colors">
                      {item.query}
                    </p>
                    <p className="text-[10px] text-neutral-500 flex items-center gap-2 mt-0.5">
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{item.sources.length} verified sources</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteHistory(item.id, e)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => handleStartResearch()}
              className="font-semibold underline ml-4 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Live 7-Agent Investigation Monitor (REAL metrics only) */}
        {isLoading && (
          <div className={`p-6 rounded-3xl border shadow-lg space-y-5 ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4 border-inherit">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold tracking-wide">{livePhaseLabel}</h2>
                  <p className="text-[11px] text-neutral-500">Live execution metrics from active agents</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                Phase {activePhaseIdx + 1} / {PIPELINE_PHASES.length}
              </span>
            </div>

            {/* Real Execution Metrics Counters */}
            {liveMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {[
                  { label: 'Queries Executed', value: liveMetrics.queriesExecuted },
                  { label: 'URLs Discovered', value: liveMetrics.uniqueUrlsDiscovered },
                  { label: 'Sources Opened', value: liveMetrics.sourcesOpened },
                  { label: 'Verified Sources', value: liveMetrics.sourcesVerified + liveMetrics.sourcesPartiallyVerified },
                  { label: 'Evidence Records', value: liveMetrics.evidenceExtracted },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`p-2.5 rounded-2xl border ${
                      isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <p className="text-[10px] text-neutral-500">{stat.label}</p>
                    <p className="text-base font-bold font-mono tabular-nums text-amber-400">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 7-Agent Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PIPELINE_PHASES.map((phase, idx) => {
                const isCurrent = idx === activePhaseIdx;
                const isPassed = idx < activePhaseIdx;
                return (
                  <div
                    key={phase.key}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : isPassed
                          ? isDark
                            ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-500'
                          : 'opacity-45 border-transparent'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-600 flex items-center justify-center text-[9px]">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-amber-400' : ''}`}>
                        {phase.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 line-clamp-1">{phase.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Search Query Chips */}
            {liveQueries.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Executed Search Queries ({liveQueries.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {liveQueries.slice(0, 10).map((q, i) => (
                    <span
                      key={i}
                      className={`text-[11px] px-2.5 py-1 rounded-full border font-mono ${
                        isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                      }`}
                    >
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Live Source Discovery Feed */}
            {liveSources.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Live Source Verification Log
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {liveSources.map((src, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        isDark ? 'bg-neutral-950/60 border-neutral-800/80' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{src.title}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{src.url}</p>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${statusBadgeStyle(src.verificationStatus)}`}>
                        {src.verificationStatus || 'DISCOVERED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed Deep Research Dossier */}
        {currentReport && !isLoading && (
          <div className="space-y-6">
            {/* Dossier Header & Real Metrics Card */}
            <div className={`p-6 rounded-3xl border shadow-md space-y-5 ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-inherit">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 uppercase">
                      {currentReport.depth} Research Report
                    </span>
                    {currentReport.factCheck && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold inline-flex items-center gap-1 ${
                        currentReport.factCheck.overallReliability === 'HIGH'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : currentReport.factCheck.overallReliability === 'MODERATE'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        FACT-CHECK: {currentReport.factCheck.overallReliability}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(currentReport.timestamp).toLocaleTimeString()}
                      {currentReport.metrics?.durationMs ? ` · ${(currentReport.metrics.durationMs / 1000).toFixed(1)}s` : ''}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">{currentReport.query}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      copied
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied Dossier' : 'Copy Full Report'}</span>
                  </button>
                </div>
              </div>

              {/* Honest Research Execution Metrics Bar */}
              {currentReport.metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { label: 'Queries Run', val: currentReport.metrics.queriesExecuted },
                    { label: 'URLs Found', val: currentReport.metrics.uniqueUrlsDiscovered },
                    { label: 'Opened', val: currentReport.metrics.sourcesOpened },
                    { label: 'Verified', val: currentReport.metrics.sourcesVerified },
                    { label: 'Rejected / Dup', val: currentReport.metrics.sourcesRejected + currentReport.metrics.duplicateSources },
                    { label: 'Evidence Extracted', val: currentReport.metrics.evidenceExtracted },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className={`px-3 py-2 rounded-2xl border ${
                        isDark ? 'bg-neutral-950/60 border-neutral-800/80' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="text-[10px] text-neutral-500">{m.label}</div>
                      <div className="text-sm font-bold font-mono tabular-nums">{m.val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Failure or Fact-Check Warnings */}
              {((currentReport.factCheck?.warnings && currentReport.factCheck.warnings.length > 0) ||
                currentReport.failureReason) && (
                <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/30 space-y-1.5 text-xs">
                  <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Verification & Reliability Notices</span>
                  </div>
                  {currentReport.failureReason && (
                    <p className="text-red-400">{currentReport.failureReason}</p>
                  )}
                  {currentReport.factCheck?.warnings.map((w, idx) => (
                    <p key={idx} className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Executed Queries */}
              {currentReport.searchQueriesUsed && currentReport.searchQueriesUsed.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-neutral-500 font-medium mr-1">Queries:</span>
                  {currentReport.searchQueriesUsed.slice(0, 8).map((q, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-full border font-mono ${
                        isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                      }`}
                    >
                      {q}
                    </span>
                  ))}
                </div>
              )}

              {/* Expandable Source Discovery & Verification Panel */}
              {allInspectionSources.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-400" />
                      Source Discovery & Verification Inspector ({allInspectionSources.length})
                    </h3>
                    <div className="flex flex-wrap items-center gap-1">
                      {(
                        [
                          { id: 'all', label: 'All' },
                          { id: 'verified', label: 'Verified' },
                          { id: 'partial', label: 'Partial' },
                          { id: 'rejected', label: 'Rejected' },
                          { id: 'duplicate', label: 'Duplicate' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSourceFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                            sourceFilter === tab.id
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : isDark
                                ? 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:text-neutral-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredSources.map((src, i) => {
                      const isExpanded = Boolean(expandedSourceUrls[src.url]);
                      const linkedEvidence = getEvidenceForSource(src.url);
                      return (
                        <div
                          key={`${src.url}_${i}`}
                          className={`rounded-2xl border transition-all ${
                            isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSourceExpand(src.url)}
                            className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusBadgeStyle(src.verificationStatus)}`}>
                                  {src.verificationStatus || 'VERIFIED'}
                                </span>
                                <span className="text-[11px] font-medium text-neutral-400 truncate">
                                  {src.publisher || src.sourceDomain || 'Web'}
                                </span>
                                {src.publicationDate && (
                                  <span className="text-[10px] font-mono text-neutral-500">
                                    · {src.publicationDate}
                                  </span>
                                )}
                                {linkedEvidence.length > 0 && (
                                  <span className="text-[10px] font-mono text-sky-400">
                                    · {linkedEvidence.length} evidence
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold truncate">{src.title}</p>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className={`px-3 pb-3 pt-2 border-t text-xs space-y-2 ${
                              isDark ? 'border-neutral-800/80' : 'border-neutral-200'
                            }`}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                                <div>
                                  <span className="text-neutral-500">Publisher: </span>
                                  <span>{src.publisher || src.sourceDomain || 'Unknown'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Publication Date: </span>
                                  <span>{src.publicationDate || 'Not specified'}</span>
                                </div>
                                <div className="sm:col-span-2 break-all">
                                  <span className="text-neutral-500">URL: </span>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>{src.url}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                </div>
                                {src.statusReason && (
                                  <div className="sm:col-span-2 text-neutral-400">
                                    <span className="text-neutral-500">Verification Log: </span>
                                    <span>{src.statusReason}</span>
                                  </div>
                                )}
                              </div>

                              {linkedEvidence.length > 0 ? (
                                <div className="space-y-1.5 pt-1">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                                    Extracted Evidence from this Source
                                  </p>
                                  {linkedEvidence.map((ev) => (
                                    <div
                                      key={ev.id}
                                      className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                                        isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                                      }`}
                                    >
                                      <p className="font-medium">{ev.claim}</p>
                                      <div className="flex flex-wrap gap-2 text-[10px] font-mono text-amber-400">
                                        {ev.exactStatistic && <span>Stat: {ev.exactStatistic} {ev.unit || ''}</span>}
                                        {ev.referencePeriod && <span>Period: {ev.referencePeriod}</span>}
                                        {ev.geographicScope && <span>Scope: {ev.geographicScope}</span>}
                                        {ev.methodology && <span>Method: {ev.methodology}</span>}
                                      </div>
                                      <p className="text-[10px] italic text-neutral-400">
                                        &ldquo;{ev.relevantPassage}&rdquo;
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                src.snippet && (
                                  <p className="text-[11px] text-neutral-400">{src.snippet}</p>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evidence Database & Fact-Check Audit Toggles */}
              <div className="flex flex-wrap gap-2 pt-2">
                {currentReport.evidenceRecords && currentReport.evidenceRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowEvidenceDb((p) => !p)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      showEvidenceDb
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                        : isDark
                          ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Evidence Database ({currentReport.evidenceRecords.length})</span>
                  </button>
                )}
                {currentReport.factCheck && (
                  <button
                    type="button"
                    onClick={() => setShowFactCheckAudit((p) => !p)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      showFactCheckAudit
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                        : isDark
                          ? 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <FileSearch className="w-3.5 h-3.5" />
                    <span>
                      Fact-Check Audit ({currentReport.factCheck.verifiedClaimsCount} supported / {currentReport.factCheck.rejectedClaimsCount} rejected)
                    </span>
                  </button>
                )}
              </div>

              {showEvidenceDb && currentReport.evidenceRecords && (
                <div className={`p-4 rounded-2xl border space-y-2 max-h-80 overflow-y-auto ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  {currentReport.evidenceRecords.map((ev) => (
                    <div key={ev.id} className="pb-2 border-b border-neutral-800/40 last:border-0 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{ev.claim}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                          {ev.evidenceConfidence}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {ev.exactStatistic ? `${ev.exactStatistic} ${ev.unit || ''} · ` : ''}
                        {ev.sourceTitle} ({ev.publicationDate || 'n.d.'})
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {showFactCheckAudit && currentReport.factCheck && (
                <div className={`p-4 rounded-2xl border space-y-2 max-h-80 overflow-y-auto ${
                  isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  {currentReport.factCheck.findings.length === 0 ? (
                    <p className="text-xs text-neutral-500">No individual claim audits recorded.</p>
                  ) : (
                    currentReport.factCheck.findings.map((f, idx) => (
                      <div key={idx} className="pb-2 border-b border-neutral-800/40 last:border-0 text-xs space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{f.claim}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
                            f.status === 'SUPPORTED'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : f.status === 'PARTIALLY_SUPPORTED'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-red-500/15 text-red-400'
                          }`}>
                            {f.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">{f.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* In-depth Markdown Analysis Document */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-md ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <div className="flex items-center gap-2 mb-6 border-b pb-4 border-inherit">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Verified Research Synthesis
                </h3>
              </div>

              <div className="max-w-none text-sm leading-relaxed space-y-4">
                <MarkdownRenderer content={currentReport.answer} theme={isDark ? 'dark' : 'light'} />
              </div>
            </div>

            {/* Follow-up Inquiry Prompt Bar */}
            <div className={`p-4 rounded-3xl border flex items-center gap-3 ${
              isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                placeholder="Ask a deeper follow-up question regarding this report..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val.trim()) {
                      handleStartResearch(`${currentReport.query}: ${val.trim()}`);
                    }
                  }
                }}
                className="w-full bg-transparent text-xs focus:outline-none placeholder:text-neutral-500"
              />
              <span className="text-[10px] text-neutral-500 shrink-0 hidden sm:inline">Press Enter to investigate</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
