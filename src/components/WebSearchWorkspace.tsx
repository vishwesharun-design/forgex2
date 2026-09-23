import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Zap,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Compass,
  Trash2,
  Clock,
} from 'lucide-react';
import { ForgeXTheme, ForgeXModelId } from '../types';
import { webSearchService, WebSearchResult } from '../services/webSearchService';
import { ModelSelector } from './ModelSelector';
import { MarkdownRenderer } from './MarkdownRenderer';

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
  const [mobileTab, setMobileTab] = useState<'search' | 'history'>('search');

  // Sync search history on mount and load first result
  useEffect(() => {
    const list = webSearchService.getSearchHistory();
    setHistory(list);
    if (list.length > 0 && !currentResult) {
      setCurrentResult(list[0]);
    }
    webSearchService.syncWithFirestore().then((cloudList) => {
      if (cloudList && cloudList.length > 0) {
        setHistory(cloudList);
      }
    }).catch(() => {});
  }, []);

  const executeSearch = async (targetQuery: string) => {
    if (!targetQuery.trim() || isSearching) return;

    if (searchMode === 'deep' && onOpenDeepResearch) {
      onOpenDeepResearch();
      return;
    }

    setMobileTab('search');
    setIsSearching(true);
    setCurrentResult(null);

    try {
      const res = await webSearchService.search(targetQuery, searchMode);
      setCurrentResult(res);
      setHistory(webSearchService.getSearchHistory());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCurrentResult({
        id: `err_${Date.now()}`,
        query: targetQuery,
        summary: `Search query failed: ${msg}`,
        sources: [
          {
            title: `Search "${targetQuery}" on Google`,
            url: `https://www.google.com/search?q=${encodeURIComponent(targetQuery)}`,
            snippet: 'Manual web fallback portal',
          },
        ],
        searchType: searchMode,
        timestamp: Date.now(),
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    executeSearch(query);
  };

  const handleDeleteItem = async (e: React.MouseEvent, idOrTimestamp: string | number) => {
    e.stopPropagation();
    const updated = await webSearchService.deleteSearch(idOrTimestamp);
    setHistory(updated);
    if (
      currentResult &&
      (currentResult.id === idOrTimestamp || currentResult.timestamp === idOrTimestamp)
    ) {
      setCurrentResult(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleClearAll = async () => {
    if (history.length === 0) return;
    if (window.confirm('Are you sure you want to delete all your search history? This cannot be undone.')) {
      await webSearchService.clearHistory();
      setHistory([]);
      setCurrentResult(null);
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
      <div className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 truncate">
              Web Search & Grounding
              <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold shrink-0">
                Live Web Index
              </span>
            </h1>
            <p className={`text-[11px] sm:text-xs truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Spelling correction, exact apps & grounded search
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
          />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className={`flex md:hidden items-center border-b px-3 py-1.5 gap-2 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-100'}`}>
        <button
          type="button"
          onClick={() => setMobileTab('search')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'search'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search & Results</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('history')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'history'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History ({history.length})</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Search History Panel */}
        <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${
          mobileTab === 'history' ? 'flex' : 'hidden md:flex'
        } ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-3 border-b border-neutral-800/40 flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Recent Searches ({history.length})
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[10px] font-semibold text-neutral-400 hover:text-red-400 transition-colors"
                title="Clear all search history"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-neutral-400" />
                <p className="text-xs font-medium text-neutral-400">No recent searches</p>
                <p className="text-[11px] text-neutral-500 mt-1">Your private search history will appear here</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => {
                    setQuery(item.query);
                    setCurrentResult(item);
                    setMobileTab('search');
                  }}
                  className={`group relative p-3 rounded-xl border cursor-pointer transition-all ${
                    currentResult?.timestamp === item.timestamp
                      ? 'border-amber-500/80 bg-amber-500/10'
                      : isDark
                      ? 'border-neutral-850 hover:border-neutral-750 bg-neutral-900/60'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{item.query}</p>
                      {item.didYouMean && (
                        <p className="text-[10px] text-amber-400 font-medium truncate mt-0.5">
                          ↳ {item.didYouMean}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id || item.timestamp)}
                      title="Delete this search"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

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
        <div className={`flex-1 flex flex-col overflow-hidden ${
          mobileTab === 'search' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Search Input Bar */}
          <div className={`p-4 sm:p-6 border-b ${isDark ? 'border-neutral-850 bg-neutral-900/20' : 'border-neutral-200 bg-white'}`}>
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
                  <span>Fast Search & Grounding</span>
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

              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`flex-1 flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-neutral-900/80 border-neutral-800 focus-within:border-amber-500'
                    : 'bg-white border-neutral-300 focus-within:border-amber-500'
                }`}>
                  <Search className="w-4 h-4 text-amber-400 shrink-0" />
                  <input
                    id="web-search-query-input"
                    type="text"
                    placeholder="Search any app, query, paper, tool (e.g., nootbooclm, Claude, DeepSeek)..."
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
                  className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center gap-2 shrink-0 transition-all active:scale-95"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{isSearching ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Result Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-amber-400">Searching live web indexes, Wikipedia, and app registries...</p>
                <p className="text-[11px] text-neutral-500">Checking spelling, locating exact official applications, and extracting citations</p>
              </div>
            ) : currentResult ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Result Action Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide shrink-0">
                      Findings
                    </span>
                    <span className="text-[11px] text-neutral-500 truncate max-w-[160px] sm:max-w-none">
                      "{currentResult.query}"
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
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
                      <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onSendToChat && (
                      <button
                        type="button"
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
                        <span className="hidden sm:inline">Send to Chat</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, currentResult.id || currentResult.timestamp)}
                      title="Delete this search from history"
                      className="px-2.5 py-1 rounded-lg border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Did You Mean Spelling Correction Banner */}
                {(currentResult.didYouMean || currentResult.correctedQuery) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="text-xs">
                        <span>Did you mean: </span>
                        <button
                          type="button"
                          onClick={() => executeSearch(currentResult.didYouMean || currentResult.correctedQuery!)}
                          className="font-bold underline text-white hover:text-amber-300 transition-colors"
                        >
                          {currentResult.didYouMean || currentResult.correctedQuery}
                        </button>
                        <span className="text-neutral-400 ml-2 text-[11px] block sm:inline">
                          (Spelling corrected from "{currentResult.query}")
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => executeSearch(currentResult.didYouMean || currentResult.correctedQuery!)}
                      className="text-xs font-semibold px-3 py-1 rounded-xl bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors shadow-sm self-start sm:self-auto"
                    >
                      Search Exact Topic
                    </button>
                  </div>
                )}

                {/* Exact Application Spotlight Card */}
                {currentResult.exactApp && (
                  <div className={`p-4 sm:p-5 rounded-2xl border ${
                    isDark
                      ? 'bg-gradient-to-br from-neutral-900/90 via-neutral-900/60 to-amber-950/20 border-amber-500/30'
                      : 'bg-gradient-to-br from-white via-amber-50/20 to-amber-100/30 border-amber-300/80'
                  } shadow-md`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                            Exact Application
                          </span>
                          {currentResult.exactApp.developer && (
                            <span className="text-[11px] text-neutral-400">
                              by <strong className="text-neutral-200">{currentResult.exactApp.developer}</strong>
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold mt-1 text-white flex items-center gap-2">
                          {currentResult.exactApp.name}
                          <span className="text-xs font-normal text-amber-400/80">({currentResult.exactApp.category})</span>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={currentResult.exactApp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                          <span>Launch Official App</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
                      {currentResult.exactApp.description}
                    </p>

                    {currentResult.exactApp.access && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 border-t border-neutral-800/40 pt-2">
                        <span className="font-semibold text-neutral-300">Access:</span>
                        <span>{currentResult.exactApp.access}</span>
                        <span className="text-neutral-600 hidden sm:inline">•</span>
                        <a
                          href={currentResult.exactApp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span className="truncate max-w-[200px]">{currentResult.exactApp.url}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Sources Carousel / List */}
                {currentResult.sources.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Authoritative Web Sources ({currentResult.sources.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {currentResult.sources.map((src, sIdx) => {
                        let hostname = '';
                        try {
                          hostname = new URL(src.url).hostname;
                        } catch {
                          hostname = src.url;
                        }
                        return (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all hover:border-amber-500/60 ${
                              isDark
                                ? 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-900'
                                : 'bg-white border-neutral-200 hover:bg-neutral-50'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1 text-[10px] text-amber-400 font-semibold">
                                <span className="truncate max-w-[180px]">{hostname}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </div>
                              <p className="font-bold line-clamp-2 leading-tight">{src.title}</p>
                            </div>
                            {src.snippet && (
                              <p className="text-[11px] text-neutral-400 mt-2 line-clamp-2">{src.snippet}</p>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grounded Summary View */}
                <div className={`p-4 sm:p-6 rounded-2xl border leading-relaxed text-xs space-y-3 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <MarkdownRenderer content={currentResult.summary} theme={theme} className="text-xs" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-10">
                <Globe className="w-12 h-12 text-neutral-500 opacity-40 mb-1" />
                <h3 className="text-sm font-bold text-neutral-300">Live Search & Grounding</h3>
                <p className="text-xs text-neutral-500 max-w-md px-4">
                  Query real-time web indexes with spelling correction, exact application detection, citations, and fast summarization.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
