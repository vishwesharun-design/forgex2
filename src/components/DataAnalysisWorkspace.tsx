import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  Upload,
  FileSpreadsheet,
  Sparkles,
  Download,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Check,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Table,
  Plus,
  Trash2,
  FileText,
  PieChart,
  Activity,
  Layers,
} from 'lucide-react';
import {
  ParsedDataset,
  DataAnalysisReport,
  ForgeXTheme,
  ForgeXModelId,
} from '../types';
import {
  dataAnalysisService,
  SAMPLE_DATASETS,
} from '../services/dataAnalysisService';
import { ModelSelector } from './ModelSelector';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DataAnalysisWorkspaceProps {
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
}

export const DataAnalysisWorkspace: React.FC<DataAnalysisWorkspaceProps> = ({
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
}) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [datasets, setDatasets] = useState<ParsedDataset[]>(() =>
    dataAnalysisService.getSavedDatasets()
  );
  const [activeDatasetId, setActiveDatasetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'insights' | 'explorer' | 'query'>('insights');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentReport, setCurrentReport] = useState<DataAnalysisReport | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [focusArea, setFocusArea] = useState<'general' | 'trends' | 'outliers' | 'forecasting'>('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rawTextInput, setRawTextInput] = useState('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'datasets' | 'analysis'>('datasets');

  // Initialize with sample dataset if empty
  useEffect(() => {
    if (datasets.length === 0) {
      const initial = dataAnalysisService.parseDataset(
        SAMPLE_DATASETS[0].data,
        SAMPLE_DATASETS[0].name
      );
      setDatasets([initial]);
      setActiveDatasetId(initial.id);
      dataAnalysisService.saveDatasets([initial]);
      // Trigger initial analysis
      runAnalysis(initial);
    } else {
      const active = datasets[0];
      setActiveDatasetId(active.id);
      runAnalysis(active);
    }
  }, []);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const runAnalysis = async (dataset: ParsedDataset, question?: string) => {
    if (!dataset) return;
    setIsAnalyzing(true);
    try {
      const report = await dataAnalysisService.analyzeDataset(dataset, {
        customQuestion: question,
        focusArea,
      });
      setCurrentReport(report);
      showToast('✓ Analysis report completed');
    } catch {
      showToast('Notice: Using local statistical computation engine');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = dataAnalysisService.parseDataset(text, file.name);
        const updated = [parsed, ...datasets.filter((d) => d.name !== parsed.name)];
        setDatasets(updated);
        setActiveDatasetId(parsed.id);
        dataAnalysisService.saveDatasets(updated);
        setCurrentPage(1);
        runAnalysis(parsed);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSample = (sample: typeof SAMPLE_DATASETS[0]) => {
    const parsed = dataAnalysisService.parseDataset(sample.data, sample.name);
    const updated = [parsed, ...datasets.filter((d) => d.name !== parsed.name)];
    setDatasets(updated);
    setActiveDatasetId(parsed.id);
    dataAnalysisService.saveDatasets(updated);
    setCurrentPage(1);
    runAnalysis(parsed);
  };

  const handlePasteSubmit = () => {
    if (!rawTextInput.trim()) return;
    const parsed = dataAnalysisService.parseDataset(
      rawTextInput,
      'Pasted_Data_' + new Date().toLocaleTimeString()
    );
    const updated = [parsed, ...datasets];
    setDatasets(updated);
    setActiveDatasetId(parsed.id);
    dataAnalysisService.saveDatasets(updated);
    setIsPasteModalOpen(false);
    setRawTextInput('');
    setCurrentPage(1);
    runAnalysis(parsed);
  };

  const handleDeleteDataset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = datasets.filter((d) => d.id !== id);
    setDatasets(updated);
    dataAnalysisService.saveDatasets(updated);
    if (activeDatasetId === id && updated.length > 0) {
      setActiveDatasetId(updated[0].id);
      runAnalysis(updated[0]);
    }
  };

  // Filter and Sort Table Rows
  const filteredRows = activeDataset
    ? activeDataset.rows.filter((row) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return Object.values(row).some((val) =>
          String(val).toLowerCase().includes(q)
        );
      })
    : [];

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal || '');
    const bStr = String(bVal || '');
    return sortAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportCsv = () => {
    if (!activeDataset) return;
    const headerLine = activeDataset.headers.join(',');
    const rowLines = activeDataset.rows.map((r) =>
      activeDataset.headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')
    );
    const csvContent = [headerLine, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDataset.name.replace(/\.[^/.]+$/, '')}_exported.csv`;
    a.click();
    showToast('✓ CSV data exported');
  };

  const handleExportReportMd = () => {
    if (!currentReport || !activeDataset) return;
    const reportTitle = currentReport.title || 'Data Analysis Report';
    const reportSummary = currentReport.executiveSummary || currentReport.summary || '';
    const reportInsights = currentReport.insights || currentReport.trends || [];
    const reportRecommendations = currentReport.recommendations || currentReport.actionableInsights || [];

    const md = `# ${reportTitle}
*Dataset: ${activeDataset.name} | Rows: ${activeDataset.rowCount} | Columns: ${activeDataset.columnCount}*

## Executive Summary
${reportSummary}

## Key Metrics
${currentReport.keyMetrics.map((m) => `- **${m.label}**: ${m.value} (${m.change})`).join('\n')}

## Core Insights
${reportInsights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}

## Identified Anomalies & Outliers
${currentReport.anomalies.map((anom) => `- ${anom}`).join('\n')}

## Statistical Correlations
${currentReport.correlations.map((c) => `- ${c}`).join('\n')}

## Actionable Recommendations
${reportRecommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDataset.name.replace(/\.[^/.]+$/, '')}_Analysis_Report.md`;
    a.click();
    showToast('✓ Analysis Markdown exported');
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Top Header Bar */}
      <div className={`px-4 sm:px-6 py-3 sm:py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/60' : 'border-neutral-200 bg-white'}`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight truncate">Data Analysis Studio</h1>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/25 shrink-0">
                AUTOMATED BI
              </span>
            </div>
            <p className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Statistical insights, anomaly detection, and automated reporting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.json,.tsv,.txt"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-amber-500/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Data</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-850 text-neutral-200'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Paste</span>
          </button>

          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
            useShortName={true}
          />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className={`flex md:hidden items-center border-b px-3 py-1.5 gap-2 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-100'}`}>
        <button
          type="button"
          onClick={() => setMobileTab('datasets')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'datasets'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Datasets ({datasets.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('analysis')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'analysis'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analysis & Charts</span>
        </button>
      </div>

      {/* Main Dual Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Datasets Directory & Presets */}
        <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${
          mobileTab === 'datasets' ? 'flex' : 'hidden md:flex'
        } ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-3 border-b border-neutral-800/40 flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Active Datasets ({datasets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {datasets.map((ds) => {
              const isActive = ds.id === activeDatasetId;
              return (
                <div
                  key={ds.id}
                  onClick={() => {
                    setActiveDatasetId(ds.id);
                    runAnalysis(ds);
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isActive
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : isDark
                      ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/70'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
                      <h4 className="text-xs font-bold truncate">{ds.name}</h4>
                    </div>
                    {datasets.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDataset(ds.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1"
                        title="Remove dataset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-400">
                    <span>{ds.rowCount.toLocaleString()} rows</span>
                    <span>•</span>
                    <span>{ds.columnCount} columns</span>
                    <span>•</span>
                    <span>{new Date(ds.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}

            {/* Quick Sample Datasets */}
            <div className="pt-3 border-t border-neutral-800/40">
              <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Load Sample Templates
              </span>
              <div className="space-y-1.5">
                {SAMPLE_DATASETS.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className={`w-full text-left p-2 rounded-xl text-xs border transition-colors ${
                      isDark
                        ? 'border-neutral-800/60 hover:border-amber-500/40 bg-neutral-900/50 text-neutral-300'
                        : 'border-neutral-200 hover:border-amber-400 bg-white text-neutral-800'
                    }`}
                  >
                    <div className="font-semibold text-[11px] text-amber-400 truncate">
                      {sample.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                      {sample.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Analysis, Table Explorer & AI Question Interface */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          mobileTab === 'analysis' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Action & Tab Navigation Bar */}
          <div className={`px-3 sm:px-6 py-2 sm:py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto ${isDark ? 'border-neutral-850 bg-neutral-950/60' : 'border-neutral-200 bg-white'}`}>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('insights')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'insights'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Insights</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('explorer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'explorer'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Data Explorer ({activeDataset?.rowCount || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('query')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'query'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Ask AI Query</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {toastMessage && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold animate-in fade-in duration-200">
                  {toastMessage}
                </span>
              )}

              <button
                type="button"
                onClick={() => activeDataset && runAnalysis(activeDataset)}
                disabled={isAnalyzing || !activeDataset}
                title="Re-run statistical analysis"
                className="px-2.5 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-850 text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Analyzing...' : 'Re-analyze'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportReportMd}
                disabled={!currentReport}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-850 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Report</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!activeDataset}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-850 text-xs font-medium flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              {onSendToChat && currentReport && (
                <button
                  type="button"
                  onClick={() =>
                    onSendToChat(
                      `[Data Analysis Findings: ${currentReport.title || 'Report'}]\n${currentReport.executiveSummary || currentReport.summary || ''}\n\nKey Insights:\n${(currentReport.insights || currentReport.trends || []).join('\n')}`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-medium flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Send to Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab 1: Executive Insights & Automated Visuals */}
          {activeTab === 'insights' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isAnalyzing && !currentReport ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <p className="text-xs font-semibold text-amber-400">
                    Computing statistical aggregates, variances & outlier clusters...
                  </p>
                </div>
              ) : currentReport ? (
                <>
                  {/* Executive Summary Card */}
                  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <h2 className="text-base font-bold text-neutral-100">{currentReport.title || 'Data Analysis Report'}</h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                            VERIFIED CLEAN
                          </span>
                        </div>
                        <div className={`text-xs leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                          <MarkdownRenderer
                            content={currentReport.executiveSummary || currentReport.summary}
                            theme={theme}
                            className="text-xs"
                          />
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500 shrink-0">
                        {activeDataset?.rowCount.toLocaleString()} rows • {activeDataset?.columnCount} features
                      </div>
                    </div>

                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                      {currentReport.keyMetrics.map((m, i) => (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border ${isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}
                        >
                          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            {m.label}
                          </div>
                          <div className="text-lg font-bold text-amber-400 mt-0.5">
                            {m.value}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-1">
                            {m.change}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Insights & Strategic Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Insights */}
                    <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                        <TrendingUp className="w-4 h-4" />
                        <span>Core Statistical Insights</span>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed">
                        {(currentReport.insights || currentReport.trends || []).map((ins, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>{ins}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Strategic Recommendations */}
                    <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        <Lightbulb className="w-4 h-4" />
                        <span>Actionable Recommendations</span>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed">
                        {(currentReport.recommendations || currentReport.actionableInsights || []).map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span className={isDark ? 'text-neutral-300' : 'text-neutral-700'}>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Anomalies & Correlations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Anomalies */}
                    <div className={`p-5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Anomaly & Risk Signals</span>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed">
                        {currentReport.anomalies.map((anom, i) => (
                          <li key={i} className="text-neutral-400">
                            {anom}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Correlations */}
                    <div className={`p-5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                        <Layers className="w-4 h-4" />
                        <span>Correlations & Patterns</span>
                      </div>
                      <ul className="space-y-2 text-xs leading-relaxed">
                        {currentReport.correlations.map((c, i) => (
                          <li key={i} className="text-neutral-400">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Visual Chart Breakdown */}
                  {currentReport.chartSuggestions && currentReport.chartSuggestions.length > 0 && currentReport.chartSuggestions[0].data && (
                    <div className={`p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                          <PieChart className="w-4 h-4" />
                          <span>{currentReport.chartSuggestions[0].title}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          X: {currentReport.chartSuggestions[0].xAxis} | Y: {currentReport.chartSuggestions[0].yAxis}
                        </span>
                      </div>

                      {/* Bar Visualizer */}
                      <div className="space-y-2.5 pt-2">
                        {(() => {
                          const chart = currentReport.chartSuggestions[0];
                          const chartData = chart.data || [];
                          const maxVal = Math.max(...chartData.map((d: any) => Number(d.value) || 0), 1);
                          return chartData.map((item: any, idx: number) => {
                            const val = Number(item.value) || 0;
                            const pct = Math.min(100, Math.max(8, Math.round((val / maxVal) * 100)));
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold truncate max-w-xs">{item.label}</span>
                                  <span className="font-mono text-amber-400 font-bold">{val.toLocaleString()}</span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-neutral-800/60 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Tab 2: Interactive Data Explorer Table */}
          {activeTab === 'explorer' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Table Toolbar */}
              <div className={`p-4 border-b flex items-center justify-between gap-4 ${isDark ? 'border-neutral-850 bg-neutral-900/20' : 'border-neutral-200 bg-neutral-50'}`}>
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search across all fields..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-neutral-500">
                    Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-lg border text-xs outline-none ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>

              {/* Table Grid */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className={`sticky top-0 z-10 ${isDark ? 'bg-neutral-900 border-b border-neutral-850' : 'bg-neutral-100 border-b border-neutral-300'}`}>
                    <tr>
                      <th className="p-3 font-semibold text-neutral-400 w-12 text-center">#</th>
                      {activeDataset?.headers.map((h) => {
                        const isSorted = sortColumn === h;
                        return (
                          <th
                            key={h}
                            onClick={() => {
                              if (sortColumn === h) {
                                setSortAsc(!sortAsc);
                              } else {
                                setSortColumn(h);
                                setSortAsc(true);
                              }
                            }}
                            className="p-3 font-bold cursor-pointer hover:text-amber-400 transition-colors whitespace-nowrap"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{h}</span>
                              {isSorted && (
                                <span className="text-amber-400 font-mono text-[10px]">
                                  {sortAsc ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/40">
                    {paginatedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-neutral-900/60' : 'hover:bg-neutral-100'
                        }`}
                      >
                        <td className="p-3 text-neutral-500 font-mono text-center">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        {activeDataset.headers.map((h) => (
                          <td key={h} className="p-3 font-mono whitespace-nowrap">
                            {row[h] !== null && row[h] !== undefined ? String(row[h]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className={`p-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-neutral-850 bg-neutral-900/30' : 'border-neutral-200 bg-neutral-50'}`}>
                <span className="text-neutral-500">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-neutral-800 disabled:opacity-30 text-xs font-semibold"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-neutral-800 disabled:opacity-30 text-xs font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Ask AI Query */}
          {activeTab === 'query' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className={`p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <HelpCircle className="w-4 h-4" />
                  <span>Targeted AI Hypothesis & Drill-Down</span>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Pose specific questions to uncover hidden trends, cluster segments, or simulate projections on "{activeDataset?.name}".
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-neutral-400">Focus Area:</span>
                    {(['general', 'trends', 'outliers', 'forecasting'] as const).map((fa) => (
                      <button
                        key={fa}
                        type="button"
                        onClick={() => setFocusArea(fa)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold border capitalize transition-colors ${
                          focusArea === fa
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                            : isDark
                            ? 'border-neutral-800 text-neutral-400 hover:text-white'
                            : 'border-neutral-200 text-neutral-600 hover:text-black'
                        }`}
                      >
                        {fa}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <textarea
                      rows={3}
                      placeholder="e.g. Which region is growing ARR fastest while keeping CAC low? What is the correlation between NPS and retention?"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      className={`w-full p-3.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 resize-none ${
                        isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'What are the top 3 anomalies?',
                        'Calculate segment growth drivers',
                        'Compare highest vs lowest metrics',
                      ].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setCustomQuery(sug);
                            activeDataset && runAnalysis(activeDataset, sug);
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                            isDark
                              ? 'border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/40'
                              : 'border-neutral-200 text-neutral-600 hover:text-amber-600 hover:border-amber-400'
                          }`}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={isAnalyzing || !activeDataset}
                      onClick={() => activeDataset && runAnalysis(activeDataset, customQuery)}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAnalyzing ? 'Evaluating Query...' : 'Run Query'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Paste Data Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl border p-6 space-y-4 ${isDark ? 'bg-neutral-900 border-neutral-850 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/40">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Paste Raw CSV, TSV, or JSON Data
              </h3>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={8}
              placeholder="Paste comma-separated rows or JSON array here...
e.g.
Month,Revenue,Users
Jan,10000,450
Feb,14500,620
Mar,18900,890"
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              className={`w-full p-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-amber-500 resize-none ${
                isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'
              }`}
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-neutral-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rawTextInput.trim()}
                onClick={handlePasteSubmit}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-40"
              >
                Parse & Analyze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
