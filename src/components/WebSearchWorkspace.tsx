import React, { useState } from 'react';
import {
  Search,
  Globe,
  Zap,
  BookOpen,
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Compass
} from 'lucide-react';
import { ForgeXTheme, ForgeXModelId } from '../types';
import { webSearchService, WebSearchResult } from '../services/webSearchService';
import { ModelSelector } from './ModelSelector';

interface WebSearchWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
  onOpenDeepResearch?: () => void;
}

export const WebSearchWorkspace: React.FC<WebSearchWorkspaceProps> = ({
  isDark,
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
  onOpenDeepResearch,
}) => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'fast' | 'deep'>('fast');
  const [isSearching, setIsSearching] = useState(false);
  const [currentResult, setCurrentResult] = useState<WebSearchResult | null>(null);
  const [history, setHistory] = useState<WebSearchResult[]>(() => webSearchService.getSearchHistory());
  const [copied, setCopied] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;

    if (searchMode === 'deep' && onOpenDeepResearch) {
      onOpenDeepResearch();
      return;
    }

    setIsSearching(true);
    setCurrentResult(null);

    try {
      const res = await webSearchService.search(query, searchMode);
      setCurrentResult(res);
      setHistory(webSearchService.getSearchHistory());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCurrentResult({
        query,
        summary: `Search failed: ${msg}`,
        sources: [],
        searchType: searchMode,
        timestamp: Date.now(),
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopy = () => {
    if (!currentResult) return;
    navigator.clipboard.writeText(
      `${currentResult.summary}\n\nSources:\n` +
        currentResult.sources.map((s) => `- ${s.title}: ${s.url}`).join('\n')
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Header */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              Web Search & Live Grounding
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Live Web Index
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Search the live web for verified facts, citations, real-time developments, and research briefings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Search History Panel */}
        <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-3 border-b border-neutral-800/40">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Recent Searches ({history.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-neutral-400" />
                <p className="text-xs font-medium text-neutral-400">No recent searches</p>
                <p className="text-[11px] text-neutral-500 mt-1">Queries will appear here automatically</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setQuery(item.query);
                    setCurrentResult(item);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    currentResult?.timestamp === item.timestamp
                      ? 'border-amber-500/80 bg-amber-500/10'
                      : isDark
                      ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/60'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <p className="text-xs font-semibold truncate">{item.query}</p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/30 text-[10px] text-neutral-400">
                    <span className="capitalize">{item.searchType} Search</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Search Interface & Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Input Bar */}
          <div className={`p-6 border-b ${isDark ? 'border-neutral-850 bg-neutral-900/20' : 'border-neutral-200 bg-white'}`}>
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchMode('fast')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    searchMode === 'fast'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : isDark
                      ? 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                      : 'bg-neutral-100 border border-neutral-200 text-neutral-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Fast Search</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('deep')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    searchMode === 'deep'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : isDark
                      ? 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                      : 'bg-neutral-100 border border-neutral-200 text-neutral-700'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Deep Research Mode</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-neutral-900/80 border-neutral-800 focus-within:border-amber-500'
                    : 'bg-white border-neutral-300 focus-within:border-amber-500'
                }`}>
                  <Search className="w-4 h-4 text-amber-400 shrink-0" />
                  <input
                    id="web-search-query-input"
                    type="text"
                    placeholder="Search query, technical paper, current news, company background..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    className={`w-full text-xs bg-transparent border-none focus:outline-none ${isDark ? 'text-white' : 'text-neutral-900'}`}
                  />
                </div>

                <button
                  id="web-search-submit-btn"
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || !query.trim()}
                  className="px-6 py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center gap-2 shrink-0 transition-all active:scale-95"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>{isSearching ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Result Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-amber-400">Scanning real-time web indexes & citation nodes...</p>
                <p className="text-[11px] text-neutral-500">Extracting grounded web summaries and source links</p>
              </div>
            ) : currentResult ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Result Action Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Grounded Web Findings
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Query: "{currentResult.query}"
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                        copied
                          ? 'border-emerald-500 text-emerald-400'
                          : isDark
                          ? 'border-neutral-800 hover:bg-neutral-850 text-neutral-300'
                          : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onSendToChat && (
                      <button
                        onClick={() =>
                          onSendToChat(
                            `[Web Search Findings for "${currentResult.query}"]:\n${currentResult.summary.slice(
                              0,
                              1500
                            )}`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Send to Chat</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sources Carousel / List */}
                {currentResult.sources.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Authoritative Web Sources ({currentResult.sources.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {currentResult.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all hover:border-amber-500/60 ${
                            isDark
                              ? 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-900'
                              : 'bg-white border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1 text-[10px] text-amber-400 font-semibold">
                              <span className="truncate max-w-[180px]">{new URL(src.url).hostname}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </div>
                            <p className="font-bold line-clamp-2 leading-tight">{src.title}</p>
                          </div>
                          {src.snippet && (
                            <p className="text-[11px] text-neutral-400 mt-2 line-clamp-2">{src.snippet}</p>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary View */}
                <div className={`p-6 rounded-2xl border leading-relaxed text-xs space-y-3 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed text-neutral-200">
                    {currentResult.summary}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <Globe className="w-12 h-12 text-neutral-500 opacity-40 mb-1" />
                <h3 className="text-sm font-bold text-neutral-300">Live Search & Grounding</h3>
                <p className="text-xs text-neutral-500 max-w-md">
                  Query real-time web indexes with source grounding, citations, and fast summarization.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
