import React, { useState, useRef } from 'react';
import {
  BarChart3,
  Upload,
  Sparkles,
  Table as TableIcon,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Trash2,
  Search,
  ArrowRight,
  Copy,
  Check,
  Filter,
  PieChart as PieChartIcon
} from 'lucide-react';
import { DataDataset, ForgeXTheme, ForgeXModelId } from '../types';
import { dataLabService } from '../services/dataLabService';
import { ModelSelector } from './ModelSelector';

interface DataLabWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
}

export const DataLabWorkspace: React.FC<DataLabWorkspaceProps> = ({
  isDark,
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
}) => {
  const [datasets, setDatasets] = useState<DataDataset[]>(() => dataLabService.getDatasets());
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => datasets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'preview' | 'columns' | 'insights' | 'charts'>('preview');
  const [queryInput, setQueryInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedChartCol, setSelectedChartCol] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const file = files[0];
      const text = await file.text();
      const dataset = dataLabService.parseCSV(text, file.name);
      dataLabService.addDataset(dataset);
      const updated = dataLabService.getDatasets();
      setDatasets(updated);
      setSelectedDatasetId(dataset.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not parse CSV: ${msg}`);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = dataLabService.deleteDataset(id);
    setDatasets(updated);
    if (selectedDatasetId === id && updated.length > 0) {
      setSelectedDatasetId(updated[0].id);
    }
  };

  const handleRunQuery = async () => {
    if (!activeDataset || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await dataLabService.queryDataset(activeDataset, queryInput.trim());
      setAnalysisResult(res);
      setActiveTab('insights');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAnalysisResult(`Analysis failed: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered rows for table view
  const filteredRows = (activeDataset?.rows || []).filter((row) => {
    if (!tableSearch.trim()) return true;
    const s = tableSearch.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(s));
  });

  const numericCols = (activeDataset?.columns || []).filter((c) => c.type === 'numeric');
  const currentChartCol = selectedChartCol || numericCols[0]?.name || '';

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Header */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              Data Lab & Analytics
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Quantitative Engine
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Upload CSV datasets, analyze column distributions, calculate statistical variance, and generate neural insights.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload CSV</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
          />
        </div>
      </div>

      {/* Main Dual Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Datasets List */}
        <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-3 border-b border-neutral-800/40">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Datasets ({datasets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {datasets.map((ds) => {
              const isSelected = activeDataset?.id === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => setSelectedDatasetId(ds.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : isDark
                      ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/70'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold truncate">{ds.fileName}</span>
                    </div>
                    {datasets.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(ds.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete dataset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/30 text-[10px] text-neutral-400">
                    <span>{ds.rowCount} rows</span>
                    <span>{ds.columnCount} columns</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Dataset Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action Tabs Bar */}
          <div className={`px-6 py-3 border-b flex items-center justify-between gap-2 ${isDark ? 'border-neutral-850 bg-neutral-950/60' : 'border-neutral-200 bg-white'}`}>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'preview', label: 'Data Table', icon: TableIcon },
                { id: 'columns', label: 'Column Stats', icon: Filter },
                { id: 'charts', label: 'Visual Charts', icon: TrendingUp },
                { id: 'insights', label: 'AI Insights', icon: Sparkles },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : isDark
                        ? 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                        : 'bg-neutral-100 border border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunQuery}
                disabled={isAnalyzing || !activeDataset}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAnalyzing ? 'Analyzing...' : 'Generate AI Insights'}</span>
              </button>
            </div>
          </div>

          {/* Natural Language Query Bar */}
          <div className={`px-6 py-3 border-b flex items-center gap-2 ${isDark ? 'border-neutral-850 bg-neutral-900/30' : 'border-neutral-200 bg-neutral-50'}`}>
            <Search className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              id="datalab-query-input"
              type="text"
              placeholder="Ask a quantitative question (e.g. 'Which product has highest ROI? What is the correlation between revenue and ad spend?')"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunQuery();
              }}
              className={`w-full text-xs bg-transparent border-none focus:outline-none ${isDark ? 'text-white' : 'text-neutral-900'}`}
            />
          </div>

          {/* Main Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!activeDataset ? (
              <div className="text-center py-20 text-neutral-400">No active dataset selected.</div>
            ) : activeTab === 'preview' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-amber-400">{activeDataset.fileName}</span>
                    <span className="text-neutral-500">
                      ({filteredRows.length} of {activeDataset.rowCount} rows displayed)
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search table rows..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'
                    }`}
                  />
                </div>

                <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-white'}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-neutral-800 bg-neutral-900/90' : 'border-neutral-200 bg-neutral-100'}`}>
                        {activeDataset.columns.map((col) => (
                          <th key={col.name} className="p-3 font-bold text-neutral-400 whitespace-nowrap">
                            {col.name} <span className="text-[10px] font-mono text-amber-400/80">({col.type})</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.slice(0, 100).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={`border-b last:border-none transition-colors ${
                            isDark
                              ? 'border-neutral-850/60 hover:bg-neutral-850/40'
                              : 'border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          {activeDataset.columns.map((col) => (
                            <td key={col.name} className="p-3 whitespace-nowrap font-mono text-[11px]">
                              {String(row[col.name] !== undefined ? row[col.name] : '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'columns' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDataset.columns.map((col) => (
                  <div
                    key={col.name}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-neutral-900/60 border-neutral-850' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-400">{col.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {col.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                      <div>
                        <span>Non-Null:</span>{' '}
                        <strong className="text-neutral-200">{col.nonNullCount}</strong>
                      </div>
                      <div>
                        <span>Unique:</span>{' '}
                        <strong className="text-neutral-200">{col.uniqueCount}</strong>
                      </div>
                      {col.type === 'numeric' && (
                        <>
                          <div>
                            <span>Min:</span> <strong className="text-neutral-200">{col.min}</strong>
                          </div>
                          <div>
                            <span>Max:</span> <strong className="text-neutral-200">{col.max}</strong>
                          </div>
                          <div>
                            <span>Mean:</span> <strong className="text-neutral-200">{col.mean}</strong>
                          </div>
                          <div>
                            <span>Median:</span> <strong className="text-neutral-200">{col.median}</strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'charts' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-neutral-400">Select Metric Column:</span>
                  <select
                    value={currentChartCol}
                    onChange={(e) => setSelectedChartCol(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  >
                    {numericCols.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} (numeric)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Data Bar Visualization */}
                <div className={`p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-neutral-900/60 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Distribution Trend: {currentChartCol}
                  </h4>
                  <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-neutral-800 overflow-x-auto">
                    {activeDataset.rows.slice(0, 30).map((row, idx) => {
                      const val = Number(row[currentChartCol]) || 0;
                      const maxVal = Math.max(
                        ...activeDataset.rows.map((r) => Number(r[currentChartCol]) || 0),
                        1
                      );
                      const heightPercent = Math.max(5, Math.min(100, Math.round((val / maxVal) * 100)));

                      return (
                        <div key={idx} className="flex-1 min-w-[28px] flex flex-col items-center gap-1.5 group">
                          <div className="text-[9px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            {val}
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all group-hover:brightness-125"
                          />
                          <span className="text-[9px] font-mono text-neutral-500 truncate max-w-[28px]">
                            {idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-neutral-500 text-center">
                    Visualizing 30 sequential records against column scale.
                  </p>
                </div>
              </div>
            ) : (
              /* Insights Tab */
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Statistical Synthesis Report
                    </span>
                    <span className="text-[11px] text-neutral-500">Dataset: {activeDataset.fileName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                        copied
                          ? 'border-emerald-500 text-emerald-400'
                          : isDark
                          ? 'border-neutral-850 hover:bg-neutral-850 text-neutral-300'
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
                            `[Data Lab Analysis for ${activeDataset.fileName}]:\n${analysisResult.slice(
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

                {isAnalyzing ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-amber-400">Computing variance, trends, and correlations...</p>
                  </div>
                ) : analysisResult ? (
                  <div className={`p-6 rounded-2xl border leading-relaxed text-xs space-y-3 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed text-neutral-200">
                      {analysisResult}
                    </pre>
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-2">
                    <Sparkles className="w-10 h-10 text-amber-400/40 mx-auto" />
                    <h3 className="text-sm font-bold">No Analysis Generated Yet</h3>
                    <p className="text-xs text-neutral-500">
                      Click "Generate AI Insights" above to calculate statistical trends and patterns.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
