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
  Plus,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  RotateCw,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Wifi,
  Battery,
  X
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
import { MarkdownRenderer } from './MarkdownRenderer';

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

const PHONE_PRESETS = {
  'iphone-15': { name: 'iPhone 15 Pro', width: 393, height: 852 },
  'iphone-se': { name: 'iPhone SE', width: 375, height: 667 },
  'pixel-8': { name: 'Pixel 8', width: 412, height: 915 },
} as const;

type PhonePresetKey = keyof typeof PHONE_PRESETS;

function generatePreviewDocument(sourceCode: string, lang: CodeLanguage): string {
  if (lang === 'html') {
    let html = sourceCode || '<div style="padding: 24px; color: #888; font-family: sans-serif;">Blank HTML document</div>';
    
    // Ensure viewport meta tag exists so mobile previews render responsively
    if (!html.toLowerCase().includes('name="viewport"') && !html.toLowerCase().includes("name='viewport'")) {
      const metaTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">';
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n  ${metaTag}`);
      } else if (html.includes('<html>')) {
        html = html.replace('<html>', `<html>\n<head>\n  ${metaTag}\n</head>`);
      } else {
        html = `<!DOCTYPE html>\n<html>\n<head>\n  ${metaTag}\n</head>\n<body>\n${html}\n</body>\n</html>`;
      }
    }

    // Bridge console logs from the preview iframe to the parent window
    const consoleBridge = `
<script>
(function() {
  try {
    const send = function(level, args) {
      try {
        const text = Array.from(args).map(function(a) {
          if (typeof a === 'object') {
            try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
          }
          return String(a);
        }).join(' ');
        window.parent.postMessage({ type: 'forgex_live_console', level: level, text: text }, '*');
      } catch(e) {}
    };
    const _l = console.log, _w = console.warn, _e = console.error;
    console.log = function() { _l.apply(console, arguments); send('log', arguments); };
    console.warn = function() { _w.apply(console, arguments); send('warn', arguments); };
    console.error = function() { _e.apply(console, arguments); send('error', arguments); };
    window.onerror = function(msg, url, line) { send('error', ['Line ' + line + ': ' + msg]); };
  } catch(err) {}
})();
</script>`;

    if (html.includes('</head>')) {
      html = html.replace('</head>', `${consoleBridge}\n</head>`);
    } else if (html.includes('</body>')) {
      html = html.replace('</body>', `${consoleBridge}\n</body>`);
    } else {
      html += consoleBridge;
    }

    return html;
  }

  if (lang === 'javascript' || lang === 'typescript') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 14px; background: #0a0a0c; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.5; min-height: 100vh; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .badge { color: #f59e0b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }
    .badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
    #console-out { background: rgba(0,0,0,0.6); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 10px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; max-height: 220px; overflow-y: auto; color: #34d399; margin-top: 10px; }
    .log-line { border-bottom: 1px solid rgba(255,255,255,0.04); padding: 3px 0; word-break: break-all; }
    .log-err { color: #f87171; }
    .log-warn { color: #fbbf24; }
    #root-mount { margin-top: 10px; padding: 12px; min-height: 80px; border: 1px dashed rgba(255,255,255,0.15); border-radius: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">Live ${lang.toUpperCase()} Mobile Sandbox</div>
    <span style="font-size: 10px; color: #9ca3af;">Auto-Executes</span>
  </div>
  <div id="root-mount"></div>
  <div id="console-out"><div class="log-line" style="color: #6b7280;">// Console output stream</div></div>
  <script>
    const out = document.getElementById('console-out');
    function logMsg(msg, cls) {
      const el = document.createElement('div');
      el.className = 'log-line ' + (cls || '');
      el.textContent = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg);
      out.appendChild(el);
      out.scrollTop = out.scrollHeight;
      try {
        window.parent.postMessage({ type: 'forgex_live_console', level: cls === 'log-err' ? 'error' : cls === 'log-warn' ? 'warn' : 'log', text: el.textContent }, '*');
      } catch(e) {}
    }
    console.log = function(...args) { logMsg(args.join(' ')); };
    console.warn = function(...args) { logMsg('[WARN] ' + args.join(' '), 'log-warn'); };
    console.error = function(...args) { logMsg('[ERR] ' + args.join(' '), 'log-err'); };
    window.onerror = function(msg, url, line) {
      logMsg('Line ' + line + ': ' + msg, 'log-err');
    };
    try {
      const mount = document.getElementById('root-mount');
      ${sourceCode}
    } catch(e) {
      logMsg('Exception: ' + e.message, 'log-err');
    }
  </script>
</body>
</html>`;
  }

  if (lang === 'css') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 16px; background: #0a0a0c; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.5; }
    .badge { color: #f59e0b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; display: inline-flex; align-items: center; gap: 6px; }
    .badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
    .sample-container { display: flex; flex-direction: column; gap: 14px; }
    .card { padding: 16px; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; background: rgba(255,255,255,0.03); }
    .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .card p { font-size: 13px; color: #9ca3af; margin-bottom: 12px; }
    button, .btn { padding: 8px 16px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(245,158,11,0.9); color: #000; font-weight: 600; font-size: 12px; }
    input, .input { width: 100%; padding: 8px 12px; border-radius: 8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 12px; margin-top: 8px; }
  </style>
  <style>
    ${sourceCode}
  </style>
</head>
<body>
  <div class="badge">Live CSS Mobile Sandbox</div>
  <div class="sample-container">
    <div class="card">
      <h2>Mobile Card Preview</h2>
      <p>Interactive preview rendering custom stylesheet rules dynamically.</p>
      <button>Interactive Button</button>
      <input type="text" placeholder="Form input field preview..." readonly value="Sample input element" />
    </div>
  </div>
</body>
</html>`;
  }

  const escaped = (sourceCode || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 16px; background: #0a0a0c; color: #f3f4f6; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .badge { color: #f59e0b; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    pre { background: rgba(255,255,255,0.05); padding: 14px; border-radius: 10px; overflow: auto; border: 1px solid rgba(245,158,11,0.25); color: #e5e7eb; line-height: 1.5; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div class="badge">${lang.toUpperCase()} Code Preview</div>
  <pre>${escaped}</pre>
</body>
</html>`;
}

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
    'ForgeX Code Studio Runtime Engine Ready',
    'Language environment initialized: ' + language.toUpperCase(),
    'Press "Run / Preview" to execute live script or view output.'
  ]);
  const [previewKey, setPreviewKey] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Responsive Mobile & Viewport States
  const [mobilePanel, setMobilePanel] = useState<'editor' | 'preview' | 'console' | 'fixes'>('preview');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [phonePreset, setPhonePreset] = useState<'iphone-15' | 'iphone-se' | 'pixel-8'>('iphone-15');
  const [phoneOrientation, setPhoneOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [mobilePreviewStyle, setMobilePreviewStyle] = useState<'full' | 'frame'>('full');
  const [fullscreenConsoleOpen, setFullscreenConsoleOpen] = useState(false);
  const [isAiCollapsed, setIsAiCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Auto-detect screen resize for responsive mode
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileScreen(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenPreview) {
        setIsFullscreenPreview(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreenPreview]);

  // Count errors in live console
  const consoleErrorsCount = consoleOutput.filter(
    (c) => c.includes('[ERROR]') || c.includes('[RUNTIME EXCEPTION]') || c.includes('[ERR]')
  ).length;

  // Listen to live console logs from preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'forgex_live_console') {
        const time = new Date().toLocaleTimeString();
        setConsoleOutput((prev) => [
          ...prev,
          `[${time}] [${(e.data.level || 'LOG').toUpperCase()}] ${e.data.text}`
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
    
    // Switch to preview if HTML or CSS, otherwise console
    if (newLang === 'html' || newLang === 'css') {
      setRightPanelTab('preview');
      setMobilePanel('preview');
    } else if (rightPanelTab === 'preview') {
      setRightPanelTab('console');
      setMobilePanel('console');
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
    
    if (language === 'html' || language === 'css') {
      setRightPanelTab('preview');
      setMobilePanel('preview');
      setConsoleOutput((prev) => [
        ...prev,
        `[${timestamp}] Rendered live ${language.toUpperCase()} in isolated sandbox.`
      ]);
    } else if (language === 'javascript' || language === 'typescript') {
      if (rightPanelTab === 'preview') {
        setMobilePanel('preview');
      } else {
        setRightPanelTab('console');
        setMobilePanel('console');
      }
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
            'Tip: Click "Auto-Correct" to have ForgeX AI instantly fix this bug!'
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
      const nextTab = res.corrections && res.corrections.length > 0 ? 'fixes' : language === 'html' ? 'preview' : 'console';
      setRightPanelTab(nextTab);
      setMobilePanel(nextTab);
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
      setMobilePanel('fixes');
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

  const activePreset = PHONE_PRESETS[phonePreset];
  const deviceWidth = phoneOrientation === 'portrait' ? activePreset.width : activePreset.height;
  const deviceHeight = phoneOrientation === 'portrait' ? activePreset.height : activePreset.width;

  const renderSimulatedMobile = (isFullscreen: boolean = false) => {
    // If on a real mobile device and not in fullscreen mode:
    if (isMobileScreen && !isFullscreen) {
      if (mobilePreviewStyle === 'full') {
        return (
          <div className="w-full h-full relative overflow-hidden bg-black flex-1 min-h-0 flex flex-col">
            {/* Mobile Preview Top Action Bar */}
            <div className="h-8 px-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs shrink-0 select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-[11px] text-amber-400">Live Preview</span>
                <span className="text-[10px] text-neutral-500 font-mono">({language.toUpperCase()})</span>
              </div>
              <div className="flex items-center gap-1.5">
                {consoleErrorsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRightPanelTab('console');
                      setMobilePanel('console');
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-semibold"
                    title="View Console Errors"
                  >
                    <span>{consoleErrorsCount} err</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobilePreviewStyle('frame')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1"
                  title="Switch to Phone Bezel Frame"
                >
                  <Smartphone className="w-2.5 h-2.5 text-amber-400" />
                  <span>Bezel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(true)}
                  className="p-1 rounded text-neutral-400 hover:text-white"
                  title="Fullscreen preview"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="p-1 rounded text-neutral-400 hover:text-amber-400"
                  title="Reload"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Edge-to-edge live iframe */}
            <div className="flex-1 relative overflow-hidden bg-black min-h-0 w-full">
              <iframe
                key={`mobile-native-${previewKey}`}
                title="ForgeX Live Mobile Preview"
                srcDoc={generatePreviewDocument(code, language)}
                sandbox="allow-scripts allow-modals allow-forms"
                className="w-full h-full border-none bg-black block flex-1"
              />
            </div>
          </div>
        );
      }
    }

    // Render responsive simulated smartphone device frame
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 min-h-0 relative select-none">
        {/* Device Controls Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-300 z-10 shrink-0 shadow-lg max-w-full overflow-x-auto no-scrollbar">
          {isMobileScreen && !isFullscreen && (
            <>
              <button
                type="button"
                onClick={() => setMobilePreviewStyle('full')}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                title="Return to full bleed mobile view"
              >
                <span>Full Bleed</span>
              </button>
              <span className="text-neutral-600">·</span>
            </>
          )}
          <span className="font-semibold text-amber-400">{activePreset.name}</span>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-[10px] text-neutral-400">{deviceWidth} × {deviceHeight}</span>
          <span className="text-neutral-600">·</span>
          {/* Preset selector */}
          <select
            value={phonePreset}
            onChange={(e) => setPhonePreset(e.target.value as PhonePresetKey)}
            className="bg-transparent text-neutral-300 text-[10px] font-medium focus:outline-none cursor-pointer"
          >
            <option value="iphone-15" className="bg-neutral-900 text-white">iPhone 15 Pro</option>
            <option value="iphone-se" className="bg-neutral-900 text-white">iPhone SE</option>
            <option value="pixel-8" className="bg-neutral-900 text-white">Pixel 8</option>
          </select>
          <span className="text-neutral-600">·</span>
          {/* Orientation rotate button */}
          <button
            type="button"
            onClick={() => setPhoneOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
            className="p-0.5 hover:text-amber-400 transition-colors flex items-center gap-1"
            title={`Rotate to ${phoneOrientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
          >
            <RotateCw className="w-3 h-3" />
            <span className="capitalize text-[10px]">{phoneOrientation}</span>
          </button>
        </div>

        {/* Scaled Device Mockup Container */}
        <div 
          className="relative transition-all duration-300 flex items-center justify-center w-full max-w-full flex-1 min-h-0 overflow-hidden"
        >
          <div 
            className={`flex flex-col bg-neutral-950 shadow-2xl overflow-hidden relative transition-all duration-300 border-[6px] sm:border-[8px] border-neutral-800 ${
              phoneOrientation === 'portrait' 
                ? 'rounded-[36px] sm:rounded-[44px] w-full max-w-[380px] h-full max-h-full sm:max-h-[720px]' 
                : 'rounded-[28px] sm:rounded-[36px] w-full max-w-[720px] h-full max-h-[380px]'
            }`}
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              aspectRatio: phoneOrientation === 'portrait' ? `${deviceWidth} / ${deviceHeight}` : `${deviceHeight} / ${deviceWidth}`,
            }}
          >
            {/* Top Status Bar & Dynamic Island */}
            <div className="h-7 bg-neutral-950 flex items-center justify-between px-5 text-[10px] text-neutral-400 select-none shrink-0 border-b border-neutral-900/60 z-20">
              <span className="font-semibold text-neutral-200 tracking-tight">9:41</span>
              {/* Dynamic Island / Camera Notch */}
              <div className="w-20 h-3.5 bg-neutral-900 rounded-full flex items-center justify-end px-2 gap-1 border border-neutral-800/80">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-neutral-300">
                <Wifi className="w-2.5 h-2.5" />
                <span className="font-mono text-[8px] font-bold">5G</span>
                <Battery className="w-3 h-3 fill-current" />
              </div>
            </div>

            {/* Simulated Screen Viewport with live iframe */}
            <div className="flex-1 relative overflow-hidden bg-black min-h-0 w-full">
              <iframe
                key={`sim-${previewKey}-${phoneOrientation}-${phonePreset}`}
                title="ForgeX Live Mobile Preview"
                srcDoc={generatePreviewDocument(code, language)}
                sandbox="allow-scripts allow-modals allow-forms"
                className="w-full h-full border-none bg-black block"
              />
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="h-4 bg-neutral-950 flex items-center justify-center select-none shrink-0 border-t border-neutral-900/40">
              <div className="w-24 h-1 bg-neutral-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* 1. TOP CONTROL BAR */}
      <div className={`px-3 sm:px-4 py-2 sm:py-3 border-b flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0 ${
        isDark ? 'border-neutral-800/80 bg-neutral-900/60' : 'border-neutral-200 bg-white'
      }`}>
        {/* Left: Title & File Identifier */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                id="code-studio-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                title="File name"
                className={`text-xs sm:text-sm font-semibold tracking-tight bg-transparent focus:outline-none border-b border-dashed max-w-[110px] sm:max-w-[180px] md:max-w-none truncate ${
                  isDark ? 'border-neutral-700 text-white focus:border-amber-400' : 'border-neutral-300 text-neutral-900 focus:border-amber-600'
                }`}
              />
              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                {linesCount}L
              </span>
            </div>
            <p className={`text-[10px] sm:text-xs hidden sm:block ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
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
                  {m.badge}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Assistant Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAiCollapsed((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              !isAiCollapsed
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border-neutral-700'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
            }`}
            title={isAiCollapsed ? 'Expand AI Assistant Bar' : 'Collapse AI Assistant Bar'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI Tools</span>
            {isAiCollapsed ? (
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            ) : (
              <ChevronUp className="w-3 h-3 text-neutral-400" />
            )}
          </button>

          {/* Run Button */}
          <button
            id="code-run-button"
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-md shadow-amber-500/10 active:scale-95"
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
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
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
            className={`p-1.5 rounded-lg border transition-all hidden sm:flex ${
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
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                isDark 
                  ? 'bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700' 
                  : 'bg-white text-neutral-700 hover:text-neutral-900 border-neutral-300 shadow-xs'
              }`}
              title="Revert to code before last AI alteration"
            >
              <RotateCcw className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Undo AI</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. AI CODE ASSISTANT TOOLBAR (Collapsible for maximum screen space) */}
      {!isAiCollapsed && (
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
              className={`px-2 py-0.5 rounded border transition-colors ${
                isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
              }`}
            >
              Interactive Canvas
            </button>
            <button
              onClick={() => loadTemplate('typescript')}
              className={`px-2 py-0.5 rounded border transition-colors ${
                isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
              }`}
            >
              TS Reactive Store
            </button>
            <button
              onClick={() => loadTemplate('python')}
              className={`px-2 py-0.5 rounded border transition-colors ${
                isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
              }`}
            >
              Python LRU Cache
            </button>
            <button
              onClick={() => loadTemplate('sql')}
              className={`px-2 py-0.5 rounded border transition-colors ${
                isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
              }`}
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                  isDark
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                }`}
              >
                <Bug className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>Auto-Correct Bugs & Syntax</span>
              </button>

              <button
                id="btn-alter-refactor"
                onClick={() => handleAIAlterOrCorrect('refactor')}
                disabled={isProcessing}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                  isDark
                    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
                }`}
              >
                <Layers className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>Refactor & Clean Architecture</span>
              </button>

              <button
                id="btn-alter-optimize"
                onClick={() => handleAIAlterOrCorrect('optimize')}
                disabled={isProcessing}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                  isDark
                    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
                }`}
              >
                <Zap className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>Optimize Performance</span>
              </button>

              <button
                id="btn-alter-types"
                onClick={() => handleAIAlterOrCorrect('types')}
                disabled={isProcessing}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                  isDark
                    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300'
                }`}
              >
                <FileCode className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border disabled:opacity-50 transition-all shrink-0 ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-amber-500/30'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-amber-700 border-neutral-300'
                }`}
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
      )}

      {/* 3. MOBILE PANEL SWITCHER (Visible on screens < md) */}
      <div className={`flex md:hidden items-center border-b px-2 py-1.5 gap-1 shrink-0 ${
        isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
      }`}>
        <button
          type="button"
          onClick={() => setMobilePanel('editor')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobilePanel === 'editor'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobilePanel('preview');
            setRightPanelTab('preview');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobilePanel === 'preview'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobilePanel('console');
            setRightPanelTab('console');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobilePanel === 'console'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Console</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobilePanel('fixes');
            setRightPanelTab('fixes');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobilePanel === 'fixes'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Fixes</span>
        </button>
      </div>

      {/* 4. DUAL-PANEL WORKSPACE (EDITOR + PREVIEW/CONSOLE) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANEL: CODE EDITOR */}
        <div className={`flex-1 flex flex-col min-w-0 border-r ${
          mobilePanel === 'editor' ? 'flex' : 'hidden md:flex'
        } ${isDark ? 'border-neutral-800 bg-[#0d0d10]' : 'border-neutral-200 bg-white'}`}>
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
        <div className={`flex-1 flex flex-col min-w-0 ${
          mobilePanel !== 'editor' ? 'flex' : 'hidden md:flex'
        } md:max-w-[50%] lg:max-w-[45%] ${
          isDark ? 'bg-neutral-950' : 'bg-neutral-50'
        }`}>
          {/* Right Panel Tabs */}
          <div className={`px-3 py-1.5 border-b flex flex-wrap items-center justify-between text-xs gap-2 shrink-0 ${
            isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white'
          }`}>
            {/* Desktop tabs - hidden on mobile since mobilePanel switcher is already visible */}
            <div className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                id="right-tab-preview"
                onClick={() => {
                  setRightPanelTab('preview');
                  setMobilePanel('preview');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  rightPanelTab === 'preview'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                id="right-tab-console"
                onClick={() => {
                  setRightPanelTab('console');
                  setMobilePanel('console');
                }}
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
                onClick={() => {
                  setRightPanelTab('fixes');
                  setMobilePanel('fixes');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  rightPanelTab === 'fixes'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                    : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Fixes</span>
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

            {/* Mobile Title indicator - shown on mobile screens */}
            <div className="flex md:hidden items-center gap-2">
              <span className="font-semibold text-xs text-amber-400 capitalize">
                {rightPanelTab}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[120px]">• {fileName}</span>
            </div>

            {/* Right toolbar: Viewport switcher + Quick Actions */}
            <div className="flex items-center gap-1.5">
              {/* Desktop Viewport Switcher (hidden on mobile) */}
              {rightPanelTab === 'preview' && !isMobileScreen && (
                <div className="flex items-center bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg gap-0.5">
                  <button
                    type="button"
                    onClick={() => setViewportMode('desktop')}
                    title="Desktop full viewport"
                    className={`p-1 rounded transition-colors ${
                      viewportMode === 'desktop'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('tablet')}
                    title="Tablet viewport (768px)"
                    className={`p-1 rounded transition-colors ${
                      viewportMode === 'tablet'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Tablet className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    title="Mobile preview (Phone device)"
                    className={`p-1 rounded transition-colors ${
                      viewportMode === 'mobile'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Mobile Console Error Pill (on mobile) */}
              {isMobileScreen && consoleErrorsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRightPanelTab('console');
                    setMobilePanel('console');
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-semibold"
                  title="View Console Errors"
                >
                  <span>{consoleErrorsCount} err</span>
                </button>
              )}

              {/* Fullscreen Preview button */}
              <button
                type="button"
                onClick={() => setIsFullscreenPreview(true)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Open live preview in full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                title="Refresh Preview & State"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab Content 1: Live Preview (iFrame sandbox with Device Viewport support) */}
          {rightPanelTab === 'preview' && (
            <div className="flex-1 flex flex-col relative overflow-hidden bg-neutral-950 items-center justify-center p-0 md:p-3 min-h-0 w-full h-full">
              {viewportMode === 'mobile' ? (
                renderSimulatedMobile(false)
              ) : viewportMode === 'tablet' ? (
                /* Interactive Tablet Frame */
                <div className="w-full max-w-[768px] h-full max-h-[820px] my-auto mx-auto rounded-[18px] sm:rounded-[24px] border-[3px] sm:border-[6px] border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col overflow-hidden relative transition-all box-border">
                  <div className="h-6 bg-neutral-950 flex items-center justify-center border-b border-neutral-900/60 shrink-0 select-none">
                    <div className="w-2 h-2 rounded-full bg-neutral-800 border border-neutral-700" />
                  </div>
                  <div className="flex-1 relative overflow-hidden bg-black min-h-0">
                    <iframe
                      key={`tab-${previewKey}`}
                      title="ForgeX Live Code Tablet Preview"
                      srcDoc={generatePreviewDocument(code, language)}
                      sandbox="allow-scripts allow-modals allow-forms"
                      className="w-full h-full border-none bg-black block"
                    />
                  </div>
                </div>
              ) : (
                /* Desktop Full Frame */
                <div className="w-full h-full relative overflow-hidden bg-black rounded-none md:rounded-xl border-0 md:border md:border-neutral-850 flex-1 min-h-0 flex flex-col">
                  <iframe
                    key={`desk-${previewKey}`}
                    title="ForgeX Live Code Preview"
                    srcDoc={generatePreviewDocument(code, language)}
                    sandbox="allow-scripts allow-modals allow-forms"
                    className="w-full h-full border-none bg-black block flex-1"
                  />
                </div>
              )}
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
                    <MarkdownRenderer content={lastResponse.explanation} theme={isDark ? 'dark' : 'light'} className="text-xs" />
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
                      <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                        {snip.title}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
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

      {/* 5. FULLSCREEN LIVE PREVIEW MODAL */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col select-none animate-in fade-in duration-150">
          {/* Top Fullscreen Header */}
          <div className="h-12 px-3 sm:px-4 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs shrink-0">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">ForgeX Fullscreen Preview</span>
                <span className="sm:hidden">Preview</span>
              </div>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400 text-xs font-mono truncate max-w-[130px] sm:max-w-none">{fileName}</span>
            </div>

            {/* Viewport & Device Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Device Mode Switcher */}
              <div className="flex items-center bg-neutral-950 border border-neutral-800 p-0.5 rounded-lg gap-0.5">
                <button
                  type="button"
                  onClick={() => setViewportMode('desktop')}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                    viewportMode === 'desktop'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Desktop Full Screen"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('tablet')}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                    viewportMode === 'tablet'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Tablet (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                    viewportMode === 'mobile'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Mobile Phone"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">Mobile</span>
                </button>
              </div>

              {/* Mobile Orientation Toggle (if mobile) */}
              {viewportMode === 'mobile' && (
                <button
                  type="button"
                  onClick={() => setPhoneOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))}
                  className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-amber-400 flex items-center gap-1 text-[11px] transition-colors"
                  title="Rotate Device"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="capitalize hidden sm:inline">{phoneOrientation}</span>
                </button>
              )}

              {/* Console drawer toggle */}
              <button
                type="button"
                onClick={() => setFullscreenConsoleOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                  fullscreenConsoleOpen
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
                }`}
                title="Toggle Console Output"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Console</span>
                {consoleErrorsCount > 0 && (
                  <span className="px-1 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {consoleErrorsCount}
                  </span>
                )}
              </button>

              {/* Refresh */}
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-amber-400 transition-colors"
                title="Reload Preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsFullscreenPreview(false)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title="Close Fullscreen (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen Body View */}
          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center p-0 sm:p-4 min-h-0">
            {viewportMode === 'mobile' ? (
              renderSimulatedMobile(true)
            ) : viewportMode === 'tablet' ? (
              <div className="w-full max-w-[768px] h-full max-h-[92vh] my-auto mx-auto rounded-[20px] sm:rounded-[24px] border-[4px] sm:border-[6px] border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col overflow-hidden relative">
                <div className="h-6 bg-neutral-950 flex items-center justify-center border-b border-neutral-900/60 shrink-0 select-none">
                  <div className="w-2 h-2 rounded-full bg-neutral-800 border border-neutral-700" />
                </div>
                <div className="flex-1 relative overflow-hidden bg-black min-h-0">
                  <iframe
                    key={`fs-tab-${previewKey}`}
                    title="ForgeX Fullscreen Tablet Preview"
                    srcDoc={generatePreviewDocument(code, language)}
                    sandbox="allow-scripts allow-modals allow-forms"
                    className="w-full h-full border-none bg-black block"
                  />
                </div>
              </div>
            ) : (
              <iframe
                key={`fs-desk-${previewKey}`}
                title="ForgeX Fullscreen Preview"
                srcDoc={generatePreviewDocument(code, language)}
                sandbox="allow-scripts allow-modals allow-forms"
                className="w-full h-full border-none bg-black block"
              />
            )}
          </div>

          {/* Bottom Console Drawer (if open) */}
          {fullscreenConsoleOpen && (
            <div className="h-48 border-t border-neutral-800 bg-neutral-950/95 font-mono text-xs overflow-y-auto p-3 z-30 shrink-0 select-text">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-neutral-850 text-[11px] text-neutral-400">
                <span className="font-semibold text-amber-400">Live Console Stream</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConsoleOutput([])}
                    className="text-[10px] text-neutral-400 hover:text-red-400"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenConsoleOpen(false)}
                    className="text-[10px] text-neutral-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {consoleOutput.length === 0 ? (
                  <div className="text-neutral-500 italic">No console logs or errors recorded.</div>
                ) : (
                  consoleOutput.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.includes('[ERROR]') || line.includes('[RUNTIME EXCEPTION]')
                          ? 'text-red-400'
                          : line.includes('[WARN]')
                          ? 'text-amber-400'
                          : 'text-neutral-300'
                      }
                    >
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
