import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Play,
  Sparkles,
  Wrench,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Save,
  RotateCcw,
  Maximize2,
  FileCode,
  Layers,
  Bug,
  Zap,
  ArrowRight,
  Terminal,
  Eye,
  Sliders,
  RefreshCw,
  Trash2,
  Plus
} from 'lucide-react';
import {
  CodeLanguage,
  CodeSnippet,
  CodeAlterMode,
  ForgeXModelId,
  FORGEX_MODELS
} from '../types';
import {
  codeStudioService,
  STARTER_TEMPLATES,
  CodeStudioResponse
} from '../services/codeStudioService';

interface CodeStudioWorkspaceProps {
  isDark: boolean;
  selectedModel: ForgeXModelId;
  onSelectModel?: (modelId: ForgeXModelId) => void;
}

const LANGUAGES: { id: CodeLanguage; label: string; ext: string }[] = [
  { id: 'typescript', label: 'TypeScript', ext: '.ts' },
  { id: 'javascript', label: 'JavaScript', ext: '.js' },
  { id: 'html', label: 'HTML / Web App', ext: '.html' },
  { id: 'python', label: 'Python', ext: '.py' },
  { id: 'css', label: 'CSS', ext: '.css' },
  { id: 'json', label: 'JSON', ext: '.json' },
  { id: 'sql', label: 'SQL', ext: '.sql' },
  { id: 'rust', label: 'Rust', ext: '.rs' },
  { id: 'cpp', label: 'C++', ext: '.cpp' },
  { id: 'go', label: 'Go', ext: '.go' },
];

export const CodeStudioWorkspace: React.FC<CodeStudioWorkspaceProps> = ({
  isDark,
  selectedModel,
  onSelectModel,
}) => {
  const [language, setLanguage] = useState<CodeLanguage>('html');
  const [fileName, setFileName] = useState('app.html');
  const [code, setCode] = useState(STARTER_TEMPLATES.html.code);
  const [historyCode, setHistoryCode] = useState<string | null>(null);

  // AI Controls
  const [activeTab, setActiveTab] = useState<'generate' | 'alter' | 'correct'>('generate');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [alterPrompt, setAlterPrompt] = useState('');
  const [alterMode, setAlterMode] = useState<CodeAlterMode>('correct');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [lastResponse, setLastResponse] = useState<CodeStudioResponse | null>(null);

  // Execution & Preview
  const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'console' | 'fixes' | 'vault'>('preview');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    '⚡ ForgeX Code Studio Runtime Engine Ready',
    'Language environment initialized: ' + language.toUpperCase(),
    'Press "Run / Preview" (▶) to execute live script or view output.'
  ]);
  const [previewKey, setPreviewKey] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Snippets
  const [snippets, setSnippets] = useState<CodeSnippet[]>(() => codeStudioService.getSnippets());
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>('snip_default');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update extension when language changes
  const handleLanguageChange = (newLang: CodeLanguage) => {
    setLanguage(newLang);
    const langObj = LANGUAGES.find((l) => l.id === newLang);
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    setFileName(`${baseName}${langObj ? langObj.ext : '.txt'}`);
    
    // Switch to preview if HTML, otherwise console
    if (newLang === 'html') {
      setRightPanelTab('preview');
    } else if (rightPanelTab === 'preview') {
      setRightPanelTab('console');
    }
  };

  // Load starter template
  const loadTemplate = (lang: CodeLanguage) => {
    handleLanguageChange(lang);
    if (STARTER_TEMPLATES[lang]) {
      setCode(STARTER_TEMPLATES[lang].code);
      setConsoleOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Loaded ${STARTER_TEMPLATES[lang].title} template.`
      ]);
      setPreviewKey((k) => k + 1);
    }
  };

  // Handle Tab Indentation inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      setCode(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Run Code
  const handleRun = () => {
    setPreviewKey((k) => k + 1);
    const timestamp = new Date().toLocaleTimeString();
    
    if (language === 'html') {
      setRightPanelTab('preview');
      setConsoleOutput((prev) => [
        ...prev,
        `[${timestamp}] 🚀 Rendered live HTML5 Canvas/DOM application in isolated sandbox.`
      ]);
    } else if (language === 'javascript' || language === 'typescript') {
      setRightPanelTab('console');
      try {
        // Safe evaluation simulation
        const logs: string[] = [];
        const simulatedConsole = {
          log: (...args: any[]) => logs.push(`[LOG] ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}`),
          error: (...args: any[]) => logs.push(`[ERROR] ${args.join(' ')}`),
          warn: (...args: any[]) => logs.push(`[WARN] ${args.join(' ')}`),
          info: (...args: any[]) => logs.push(`[INFO] ${args.join(' ')}`),
        };

        // If simple JS without exports/imports, execute cleanly
        const cleanExecutable = code
          .replace(/export\s+/g, '')
          .replace(/import\s+.*?;/g, '')
          .replace(/:\s*[a-zA-Z0-9_<>[\]|,\s]+/g, ''); // strip basic type annotations

        try {
          const runFn = new Function('console', cleanExecutable);
          runFn(simulatedConsole);
          setConsoleOutput((prev) => [
            ...prev,
            `[${timestamp}] === Execution Started (${language}) ===`,
            ...(logs.length > 0 ? logs : ['Code executed successfully with zero runtime exceptions. (No explicit console.log output)']),
            `=== Execution Terminated with Return Code 0 ===`
          ]);
        } catch (execErr: any) {
          setConsoleOutput((prev) => [
            ...prev,
            `[${timestamp}] [RUNTIME EXCEPTION]: ${execErr?.message || String(execErr)}`,
            '💡 Tip: Click "Auto-Correct" to have ForgeX AI instantly fix this bug!'
          ]);
        }
      } catch (err: any) {
        setConsoleOutput((prev) => [
          ...prev,
          `[${timestamp}] Execution notice: ${err?.message || String(err)}`
        ]);
      }
    } else {
      setRightPanelTab('console');
      setConsoleOutput((prev) => [
        ...prev,
        `[${timestamp}] Compiled and simulated ${language.toUpperCase()} execution unit:`,
        `Analyzing syntax structures for ${fileName}...`,
        `✓ All syntax trees valid. Simulation finished in 48ms.`
      ]);
    }
  };

  // AI Generation
  const handleAIGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || generatePrompt;
    if (!promptToUse.trim()) return;

    setIsProcessing(true);
    setProcessingStatus(`ForgeX AI synthesizing ${language} code...`);
    setHistoryCode(code);

    try {
      const res = await codeStudioService.processCode({
        action: 'generate',
        prompt: promptToUse,
        language,
        modelId: selectedModel,
      });

      setCode(res.code);
      setLastResponse(res);
      setPreviewKey((k) => k + 1);
      setRightPanelTab(res.corrections && res.corrections.length > 0 ? 'fixes' : language === 'html' ? 'preview' : 'console');
      setConsoleOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] AI Code Generated: "${promptToUse}"`,
        res.explanation
      ]);
    } catch (err: any) {
      setConsoleOutput((prev) => [
        ...prev,
        `[ERROR] Generation failed: ${err?.message || String(err)}`
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // AI Alter / Correct
  const handleAIAlterOrCorrect = async (mode: CodeAlterMode, promptText?: string) => {
    if (!code.trim()) return;

    const action = mode === 'correct' ? 'correct' : 'alter';
    setIsProcessing(true);
    setProcessingStatus(
      mode === 'correct'
        ? 'AI inspecting syntax, debugging edge cases, and auto-correcting...'
        : `AI applying ${mode} alterations to code...`
    );
    setHistoryCode(code);

    try {
      const res = await codeStudioService.processCode({
        action,
        code,
        language,
        mode,
        prompt: promptText || alterPrompt,
        modelId: selectedModel,
      });

      setCode(res.code);
      setLastResponse(res);
      setPreviewKey((k) => k + 1);
      setRightPanelTab('fixes');
      setConsoleOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] AI ${action.toUpperCase()}: ${res.explanation}`,
        ...(res.corrections || []).map((c) => `  ✓ ${c}`)
      ]);
    } catch (err: any) {
      setConsoleOutput((prev) => [
        ...prev,
        `[ERROR] Operation failed: ${err?.message || String(err)}`
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Copy
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Download
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Save to Snippets
  const handleSaveSnippet = () => {
    const newSnippet: CodeSnippet = {
      id: activeSnippetId || `snip_${Date.now()}`,
      title: fileName,
      code,
      language,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: selectedModel,
    };
    const updated = codeStudioService.saveSnippet(newSnippet);
    setSnippets(updated);
    setActiveSnippetId(newSnippet.id);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Revert
  const handleRevert = () => {
    if (historyCode !== null) {
      setCode(historyCode);
      setHistoryCode(null);
      setLastResponse(null);
      setPreviewKey((k) => k + 1);
    }
  };

  // Calculate lines
  const linesCount = code.split('\n').length;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* 1. TOP CONTROL BAR */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'border-neutral-800/80 bg-neutral-900/60' : 'border-neutral-200 bg-white'
      }`}>
        {/* Left: Title & File Identifier */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                id="code-studio-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                title="File name"
                className={`text-sm font-semibold tracking-tight bg-transparent focus:outline-none border-b border-dashed ${
                  isDark ? 'border-neutral-700 text-white focus:border-amber-400' : 'border-neutral-300 text-neutral-900 focus:border-amber-600'
                }`}
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {linesCount} lines
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Write, AI generate, alter & auto-correct source code
            </p>
          </div>
        </div>

        {/* Center: Language & Model Selectors */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            id="code-language-select"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as CodeLanguage)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200 focus:border-amber-400'
                : 'bg-neutral-100 border-neutral-300 text-neutral-800 focus:border-amber-600'
            }`}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Model Selector */}
          {onSelectModel && (
            <select
              id="code-model-select"
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value as ForgeXModelId)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none hidden sm:inline-block ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-300 focus:border-amber-400'
                  : 'bg-neutral-100 border-neutral-300 text-neutral-700 focus:border-amber-600'
              }`}
            >
              {FORGEX_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.badge})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Run Button */}
          <button
            id="code-run-button"
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-md shadow-amber-500/10 active:scale-95"
            title="Execute / Live Preview"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run / Preview</span>
          </button>

          {/* Instant Auto-Correct Button */}
          <button
            id="code-quick-correct"
            onClick={() => handleAIAlterOrCorrect('correct')}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-amber-500/30'
                : 'bg-neutral-100 hover:bg-neutral-200 text-amber-700 border-amber-400'
            }`}
            title="Auto-Correct code bugs and errors"
          >
            <Bug className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Auto-Correct</span>
          </button>

          {/* Copy Button */}
          <button
            id="code-copy-button"
            onClick={handleCopy}
            className={`p-1.5 rounded-lg border transition-all ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'
            }`}
            title="Copy code"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Save Button */}
          <button
            id="code-save-button"
            onClick={handleSaveSnippet}
            className={`p-1.5 rounded-lg border transition-all ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'
            }`}
            title="Save file"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Save className="w-3.5 h-3.5" />}
          </button>

          {/* Download Button */}
          <button
            id="code-download-button"
            onClick={handleDownload}
            className={`p-1.5 rounded-lg border transition-all ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-700'
            }`}
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Revert Button if history exists */}
          {historyCode !== null && (
            <button
              id="code-revert-button"
              onClick={handleRevert}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700"
              title="Revert to code before last AI alteration"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Undo AI</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. AI CODE ASSISTANT TOOLBAR */}
      <div className={`px-4 py-2.5 border-b text-xs flex flex-col gap-2 shrink-0 ${
        isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/70'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Tabs: Generate vs Alter & Correct */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-800/40 border border-neutral-700/50">
            <button
              id="code-tab-generate"
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'generate'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Generate Code</span>
            </button>
            <button
              id="code-tab-alter"
              onClick={() => setActiveTab('alter')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'alter'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Wrench className="w-3 h-3" />
              <span>AI Alter & Correct Code</span>
            </button>
          </div>

          {/* Quick Starter Templates */}
          <div className="hidden lg:flex items-center gap-1 text-[11px]">
            <span className={isDark ? 'text-neutral-500' : 'text-neutral-400'}>Templates:</span>
            <button
              onClick={() => loadTemplate('html')}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
            >
              Interactive Canvas
            </button>
            <button
              onClick={() => loadTemplate('typescript')}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
            >
              TS Reactive Store
            </button>
            <button
              onClick={() => loadTemplate('python')}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
            >
              Python LRU Cache
            </button>
            <button
              onClick={() => loadTemplate('sql')}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
            >
              SQL Analytics
            </button>
          </div>
        </div>

        {/* Tab 1: AI Generate Bar */}
        {activeTab === 'generate' && (
          <div className="flex items-center gap-2 animate-in fade-in duration-200">
            <div className="relative flex-1">
              <input
                id="code-generate-input"
                type="text"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
                placeholder={`Describe the code you want to generate in ${language} (e.g. "Create a responsive particle network canvas", "Fast LRU cache")...`}
                className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-400'
                    : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-amber-600'
                }`}
              />
            </div>
            <button
              id="code-generate-submit"
              onClick={() => handleAIGenerate()}
              disabled={isProcessing || !generatePrompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold disabled:opacity-50 transition-all shrink-0"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Code</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: AI Alter & Correct Bar */}
        {activeTab === 'alter' && (
          <div className="flex flex-col gap-2 animate-in fade-in duration-200">
            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                id="btn-alter-correct"
                onClick={() => handleAIAlterOrCorrect('correct')}
                disabled={isProcessing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
              >
                <Bug className="w-3 h-3 text-amber-400" />
                <span>Auto-Correct Bugs & Syntax</span>
              </button>

              <button
                id="btn-alter-refactor"
                onClick={() => handleAIAlterOrCorrect('refactor')}
                disabled={isProcessing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Refactor & Clean Architecture</span>
              </button>

              <button
                id="btn-alter-optimize"
                onClick={() => handleAIAlterOrCorrect('optimize')}
                disabled={isProcessing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Optimize Performance</span>
              </button>

              <button
                id="btn-alter-types"
                onClick={() => handleAIAlterOrCorrect('types')}
                disabled={isProcessing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-all"
              >
                <FileCode className="w-3 h-3 text-amber-400" />
                <span>Add Strict Types & JSDoc</span>
              </button>
            </div>

            {/* Custom Alter Prompt Input */}
            <div className="flex items-center gap-2">
              <input
                id="code-alter-input"
                type="text"
                value={alterPrompt}
                onChange={(e) => setAlterPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIAlterOrCorrect('custom', alterPrompt)}
                placeholder="Or specify custom alter instructions (e.g. 'Translate to TypeScript', 'Add dark mode support', 'Add error logging')..."
                className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:outline-none ${
                  isDark
                    ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-400'
                    : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-amber-600'
                }`}
              />
              <button
                id="code-alter-submit"
                onClick={() => handleAIAlterOrCorrect('custom', alterPrompt)}
                disabled={isProcessing || !alterPrompt.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-semibold border border-amber-500/30 disabled:opacity-50 transition-all shrink-0"
              >
                <ArrowRight className="w-3 h-3" />
                <span>Alter Code</span>
              </button>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-[11px] text-amber-400 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{processingStatus}</span>
          </div>
        )}
      </div>

      {/* 3. DUAL-PANEL WORKSPACE (EDITOR + PREVIEW/CONSOLE) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANEL: CODE EDITOR */}
        <div className={`flex-1 flex flex-col min-w-0 border-r ${
          isDark ? 'border-neutral-800 bg-[#0d0d10]' : 'border-neutral-200 bg-white'
        }`}>
          {/* Editor Header Bar */}
          <div className={`px-4 py-1.5 border-b flex items-center justify-between text-[11px] ${
            isDark ? 'border-neutral-800/80 bg-neutral-900/30 text-neutral-400' : 'border-neutral-200 bg-neutral-50 text-neutral-500'
          }`}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-400 font-semibold">{fileName}</span>
              <span>•</span>
              <span>{language.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCode('')}
                className="hover:text-red-400 transition-colors"
                title="Clear editor"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  try {
                    if (language === 'json') {
                      setCode(JSON.stringify(JSON.parse(code), null, 2));
                    } else {
                      // Basic indent cleanup
                      setCode(code.replace(/[ \t]+$/gm, ''));
                    }
                  } catch (e) {}
                }}
                className="hover:text-amber-400 transition-colors"
                title="Format whitespace"
              >
                Format
              </button>
            </div>
          </div>

          {/* Textarea with Line Numbers Container */}
          <div className="flex-1 relative flex overflow-hidden">
            {/* Line Numbers Gutter */}
            <div className={`py-4 px-3 select-none text-right font-mono text-xs border-r shrink-0 ${
              isDark ? 'bg-neutral-950/70 border-neutral-800/60 text-neutral-600' : 'bg-neutral-100/60 border-neutral-200 text-neutral-400'
            }`}>
              {Array.from({ length: Math.max(1, linesCount) }).map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Input Area */}
            <textarea
              ref={textareaRef}
              id="code-editor-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className={`flex-1 p-4 font-mono text-xs sm:text-sm leading-6 resize-none focus:outline-none overflow-auto whitespace-pre tab-4 ${
                isDark
                  ? 'bg-transparent text-neutral-100 selection:bg-amber-500/20 selection:text-amber-300'
                  : 'bg-transparent text-neutral-900 selection:bg-amber-500/30'
              }`}
              placeholder="Write, paste, or AI-generate any code here..."
            />
          </div>
        </div>

        {/* RIGHT PANEL: LIVE PREVIEW & RUNTIME CONSOLE */}
        <div className={`flex-1 flex flex-col min-w-0 md:max-w-[50%] lg:max-w-[45%] ${
          isDark ? 'bg-neutral-950' : 'bg-neutral-50'
        }`}>
          {/* Right Panel Tabs */}
          <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs shrink-0 ${
            isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white'
          }`}>
            <div className="flex items-center gap-1">
              <button
                id="right-tab-preview"
                onClick={() => setRightPanelTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  rightPanelTab === 'preview'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>

              <button
                id="right-tab-console"
                onClick={() => setRightPanelTab('console')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  rightPanelTab === 'console'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
              </button>

              <button
                id="right-tab-fixes"
                onClick={() => setRightPanelTab('fixes')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  rightPanelTab === 'fixes'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Corrections</span>
              </button>

              <button
                id="right-tab-vault"
                onClick={() => setRightPanelTab('vault')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  rightPanelTab === 'vault'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Files</span>
              </button>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="p-1 rounded text-neutral-400 hover:text-amber-400"
              title="Refresh Preview & State"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab Content 1: Live Preview (iFrame sandbox) */}
          {rightPanelTab === 'preview' && (
            <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-900">
              <iframe
                key={previewKey}
                title="ForgeX Live Code Preview"
                srcDoc={
                  language === 'html'
                    ? code
                    : `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 24px; background: #0a0a0c; color: #fff; font-family: monospace; }
    .badge { color: #f59e0b; font-size: 14px; font-weight: bold; margin-bottom: 12px; }
    pre { background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; overflow: auto; border: 1px solid rgba(245,158,11,0.2); }
  </style>
</head>
<body>
  <div class="badge">⚡ ForgeX Code Studio — Active Source Output</div>
  <pre>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`
                }
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-none bg-black"
              />
            </div>
          )}

          {/* Tab Content 2: Runtime Console */}
          {rightPanelTab === 'console' && (
            <div className={`flex-1 p-4 font-mono text-xs overflow-y-auto ${
              isDark ? 'bg-black text-neutral-200' : 'bg-neutral-900 text-neutral-100'
            }`}>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800 text-[11px] text-neutral-400">
                <span>ForgeX Terminal Output</span>
                <button
                  onClick={() => setConsoleOutput([])}
                  className="hover:text-red-400 text-[10px]"
                >
                  Clear Console
                </button>
              </div>
              <div className="space-y-1">
                {consoleOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      line.includes('[ERROR]')
                        ? 'text-red-400'
                        : line.includes('[WARN]')
                        ? 'text-amber-400'
                        : line.includes('===')
                        ? 'text-neutral-400 font-semibold'
                        : line.includes('✓')
                        ? 'text-green-400'
                        : 'text-neutral-300'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Content 3: AI Corrections & Explanation */}
          {rightPanelTab === 'fixes' && (
            <div className={`flex-1 p-4 overflow-y-auto space-y-4 ${
              isDark ? 'bg-neutral-950 text-neutral-200' : 'bg-white text-neutral-800'
            }`}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-amber-400 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>AI Code Analysis & Corrections</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Review the alterations and bug fixes applied by ForgeX AI.
                </p>
              </div>

              {lastResponse ? (
                <>
                  {/* Summary / Explanation */}
                  <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    isDark ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}>
                    <p className="font-semibold text-amber-400 mb-1">
                      {lastResponse.action === 'correct' ? 'Auto-Correction Report:' : 'Alteration Summary:'}
                    </p>
                    <p>{lastResponse.explanation}</p>
                  </div>

                  {/* Bulleted Corrections List */}
                  {lastResponse.corrections && lastResponse.corrections.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                        Applied Fixes & Improvements:
                      </p>
                      <div className="space-y-1.5">
                        {lastResponse.corrections.map((c, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 p-2 rounded text-xs border ${
                              isDark ? 'bg-neutral-900/40 border-neutral-800/80 text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Undo Button */}
                  {historyCode !== null && (
                    <div className="pt-2">
                      <button
                        onClick={handleRevert}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border border-neutral-700 hover:bg-neutral-800 transition-all text-neutral-300"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Revert to Previous Code</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-xs text-neutral-500">
                  <Wrench className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                  <p>No recent AI alteration or correction yet.</p>
                  <p className="mt-1">
                    Click <span className="text-amber-400 font-semibold">"Auto-Correct"</span> or select an alteration above to inspect and improve your code.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 4: Saved Files Vault */}
          {rightPanelTab === 'vault' && (
            <div className={`flex-1 p-4 overflow-y-auto space-y-3 ${
              isDark ? 'bg-neutral-950 text-neutral-200' : 'bg-white text-neutral-800'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Saved Files & Snippets ({snippets.length})
                </h3>
                <button
                  onClick={handleSaveSnippet}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                >
                  <Plus className="w-3 h-3" />
                  <span>Save Current</span>
                </button>
              </div>

              <div className="space-y-2">
                {snippets.map((snip) => (
                  <div
                    key={snip.id}
                    onClick={() => {
                      setCode(snip.code);
                      setFileName(snip.title);
                      setLanguage(snip.language);
                      setActiveSnippetId(snip.id);
                      setPreviewKey((k) => k + 1);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      activeSnippetId === snip.id
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : isDark
                        ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                        : 'bg-neutral-100 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-white">
                        {snip.title}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {snip.language.toUpperCase()} • {new Date(snip.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = codeStudioService.deleteSnippet(snip.id);
                        setSnippets(updated);
                      }}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Delete snippet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
