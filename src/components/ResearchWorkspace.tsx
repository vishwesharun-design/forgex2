import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Search,
  Globe,
  Sparkles,
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
  History,
  Layers,
  FileText,
  ArrowRight,
  Zap
} from 'lucide-react';
import { DeepResearchReport, ForgeXModelId } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ResearchWorkspaceProps {
  isDark: boolean;
  selectedModelId: ForgeXModelId;
}

const STORAGE_KEY = 'forgex_deep_research_history';

const SAMPLE_TOPICS = [
  'Latest breakthroughs in humanoid robotics and embodied AI',
  'Commercial fusion energy timeline and reactor milestones',
  'CRISPR Cas-9 clinical approvals and emerging therapeutic trials',
  'Quantum computing quantum supremacy and fault-tolerant qubits',
  'Next-generation solid-state battery energy density benchmarks',
];

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  isDark,
  selectedModelId,
}) => {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'deep' | 'quick'>('deep');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [currentReport, setCurrentReport] = useState<DeepResearchReport | null>(null);
  const [history, setHistory] = useState<DeepResearchReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
          if (parsed.length > 0 && !currentReport) {
            setCurrentReport(parsed[0]);
          }
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (report: DeepResearchReport) => {
    setHistory((prev) => {
      const updated = [report, ...prev.filter((item) => item.id !== report.id)].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
    if (currentReport?.id === id) {
      setCurrentReport(null);
    }
  };

  const researchSteps = [
    { title: 'Decomposing Research Objectives & Sub-Topics', desc: 'Analyzing semantic entities and search parameters' },
    { title: 'Browsing Live Web & Querying Global Knowledge', desc: 'Crawling authoritative papers, portals, and reports' },
    { title: 'Cross-Referencing Verified Facts & Evidence', desc: 'Evaluating empirical data, metrics, and consensus' },
    { title: 'Synthesizing Intelligence Briefing & Citations', desc: 'Compiling structured executive report with sources' },
  ];

  const handleStartResearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setActiveStepIndex(0);

    // Step ticker for visual feedback during search
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < researchSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 1800);

    try {
      const res = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          depth,
          modelId: selectedModelId,
        }),
      });

      clearInterval(interval);

      if (!res.ok) {
        throw new Error(`Research query failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.report) {
        setCurrentReport(data.report);
        saveToHistory(data.report);
      } else {
        throw new Error(data.error || 'Failed to retrieve deep research report');
      }
    } catch (err: any) {
      clearInterval(interval);
      setErrorMsg(err.message || 'An error occurred while executing deep research');
    } finally {
      setIsLoading(false);
      setActiveStepIndex(3);
    }
  };

  const handleCopyReport = () => {
    if (!currentReport) return;
    const text = `# ${currentReport.query}\n\n${currentReport.answer}\n\n## Sources\n` +
      currentReport.sources.map((s) => `- [${s.title}](${s.url}) (${s.sourceDomain || 'Web'})`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                LIVE WEB GROUNDING
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
              Autonomous multi-vector web investigation & citation synthesis
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
            {/* Input Bar */}
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
                placeholder="Ask any complex question, topic, or market to research in-depth..."
                disabled={isLoading}
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
              />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  query.trim() && !isLoading
                    ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Investigating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Deep Research</span>
                  </>
                )}
              </button>
            </div>

            {/* Depth Selector & Preset Suggestions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Depth Mode */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-500 mr-1">Research Depth:</span>
                <button
                  type="button"
                  onClick={() => setDepth('deep')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all ${
                    depth === 'deep'
                      ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                      : isDark
                        ? 'bg-neutral-800/60 text-neutral-400 hover:text-white border border-transparent'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-transparent'
                  }`}
                >
                  <Zap className="w-3 h-3 shrink-0" />
                  <span>Deep Multi-Step (Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDepth('quick')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all ${
                    depth === 'quick'
                      ? 'bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/40'
                      : isDark
                        ? 'bg-neutral-800/60 text-neutral-400 hover:text-white border border-transparent'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-transparent'
                  }`}
                >
                  <Search className="w-3 h-3 shrink-0" />
                  <span>Quick Search</span>
                </button>
              </div>

              {/* Suggestions */}
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

        {/* History Drawer if toggled */}
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
                      <span>{item.sources.length} sources</span>
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

        {/* Loading / Multi-Step Autonomous Search Visualizer */}
        {isLoading && (
          <div className={`p-6 rounded-3xl border shadow-lg space-y-5 ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-inherit">
              <div className="flex items-center gap-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                <h2 className="text-sm font-bold tracking-wide">Live Web Autonomous Investigation</h2>
              </div>
              <span className="text-[11px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10">
                Step {activeStepIndex + 1} of 4
              </span>
            </div>

            <div className="space-y-3">
              {researchSteps.map((step, idx) => {
                const isCurrent = idx === activeStepIndex;
                const isPassed = idx < activeStepIndex;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : isPassed
                          ? isDark
                            ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-500'
                          : 'opacity-40 border-transparent'
                    }`}
                  >
                    <div className="mt-0.5">
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
                    <div>
                      <p className={`text-xs font-semibold ${isCurrent ? 'text-amber-400' : ''}`}>
                        {step.title}
                      </p>
                      <p className="text-[11px] text-neutral-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Deep Research Dossier */}
        {currentReport && !isLoading && (
          <div className="space-y-6">
            {/* Dossier Header Card */}
            <div className={`p-6 rounded-3xl border shadow-md space-y-4 ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-inherit">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 uppercase">
                      {currentReport.depth} Research Report
                    </span>
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(currentReport.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {currentReport.query}
                  </h2>
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

              {/* Key Findings Bullet Grid */}
              {currentReport.keyFindings && currentReport.keyFindings.length > 0 && (
                <div className={`p-4 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/60 border-amber-200'
                }`}>
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Key Research Takeaways & Empirical Evidence
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {currentReport.keyFindings.map((finding, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span className={isDark ? 'text-neutral-200' : 'text-neutral-800'}>
                          {finding}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grounded Web Sources Grid */}
              {currentReport.sources && currentReport.sources.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-400" />
                      Verified Web Citations ({currentReport.sources.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {currentReport.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 transition-all hover:border-amber-500/50 group ${
                          isDark ? 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-950' : 'bg-neutral-50 border-neutral-200 hover:bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[10px] text-neutral-500">
                            <span className="font-mono truncate">{src.sourceDomain || 'Web'}</span>
                            <ExternalLink className="w-3 h-3 group-hover:text-amber-400 transition-colors shrink-0" />
                          </div>
                          <p className="text-xs font-semibold line-clamp-2 group-hover:text-amber-400 transition-colors">
                            {src.title}
                          </p>
                        </div>
                        {src.snippet && (
                          <p className="text-[10px] text-neutral-500 line-clamp-2">
                            {src.snippet}
                          </p>
                        )}
                      </a>
                    ))}
                  </div>
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
                  Comprehensive Research Synthesis
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
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
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
