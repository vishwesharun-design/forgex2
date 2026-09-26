import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Sparkles,
  FileText,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Scissors,
  Maximize2,
  CheckCheck,
  SlidersHorizontal,
  ArrowRight,
  Download,
  Undo2,
  Redo2,
  Eye,
  Columns,
  BookOpen
} from 'lucide-react';
import { WritingDoc, WritingCategory, WritingTone, WritingAction, ForgeXTheme, ForgeXModelId } from '../types';
import { writingStudioService } from '../services/writingStudioService';
import { ModelSelector } from './ModelSelector';
import { MarkdownRenderer } from './MarkdownRenderer';

interface WritingStudioWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
}

const CATEGORIES: WritingCategory[] = [
  'Essay',
  'Article',
  'Blog',
  'Story',
  'Email',
  'Resume',
  'Script',
  'Documentation',
];

const TONES: WritingTone[] = [
  'Professional',
  'Casual',
  'Persuasive',
  'Academic',
  'Creative',
  'Confident',
  'Empathetic',
];

export const WritingStudioWorkspace: React.FC<WritingStudioWorkspaceProps> = ({
  isDark,
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
}) => {
  const [documents, setDocuments] = useState<WritingDoc[]>(() => writingStudioService.getDocuments());
  const [activeDocId, setActiveDocId] = useState<string>(() => documents[0]?.id || '');
  const [category, setCategory] = useState<WritingCategory>('Article');
  const [tone, setTone] = useState<WritingTone>('Professional');
  const [topicInput, setTopicInput] = useState('');
  const [currentText, setCurrentText] = useState<string>(() => documents[0]?.content || '');
  const [docTitle, setDocTitle] = useState<string>(() => documents[0]?.title || 'Untitled Writing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // History stacks for Undo & Redo
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const [mobileTab, setMobileTab] = useState<'controls' | 'editor'>('editor');

  // Synchronize documents with auth state changes and initialize if empty
  useEffect(() => {
    const loadDocs = () => {
      let docs = writingStudioService.getDocuments();
      if (docs.length === 0) {
        const welcomeDoc: WritingDoc = {
          id: 'doc-' + Date.now(),
          title: 'Blank Document',
          category: 'Article',
          tone: 'Professional',
          content: '',
          wordCount: 0,
          charCount: 0,
          lastModified: Date.now(),
        };
        writingStudioService.saveDocument(welcomeDoc);
        docs = [welcomeDoc];
      }

      setDocuments(docs);
      setActiveDocId((prev) => {
        const found = docs.find((d) => d.id === prev);
        if (found) {
          setDocTitle(found.title);
          setCurrentText(found.content);
          setCategory(found.category);
          setTone(found.tone);
          return found.id;
        }
        const first = docs[0];
        setDocTitle(first.title);
        setCurrentText(first.content);
        setCategory(first.category);
        setTone(first.tone);
        return first.id;
      });
    };

    loadDocs();
    window.addEventListener('forgex:auth_changed', loadDocs);
    return () => window.removeEventListener('forgex:auth_changed', loadDocs);
  }, []);

  const handleSelectDoc = (doc: WritingDoc) => {
    setActiveDocId(doc.id);
    setDocTitle(doc.title);
    setCurrentText(doc.content);
    setCategory(doc.category);
    setTone(doc.tone);
    setUndoStack([]);
    setRedoStack([]);
    setMobileTab('editor');
  };

  const handleNewDoc = () => {
    const newDoc: WritingDoc = {
      id: 'doc-' + Date.now(),
      title: 'New ' + category,
      category,
      tone,
      content: '',
      wordCount: 0,
      charCount: 0,
      lastModified: Date.now(),
    };
    writingStudioService.saveDocument(newDoc);
    const updated = writingStudioService.getDocuments();
    setDocuments(updated);
    setActiveDocId(newDoc.id);
    setDocTitle(newDoc.title);
    setCurrentText('');
    setUndoStack([]);
    setRedoStack([]);
    setMobileTab('editor');
  };

  const handleClearAllDocs = () => {
    writingStudioService.saveDocuments([]);
    const fresh: WritingDoc = {
      id: 'doc-' + Date.now(),
      title: 'Blank Writing',
      category,
      tone,
      content: '',
      wordCount: 0,
      charCount: 0,
      lastModified: Date.now(),
    };
    writingStudioService.saveDocument(fresh);
    setDocuments([fresh]);
    handleSelectDoc(fresh);
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = writingStudioService.deleteDocument(id);
    setDocuments(updated);
    if (activeDocId === id) {
      if (updated.length > 0) {
        handleSelectDoc(updated[0]);
      } else {
        const fresh: WritingDoc = {
          id: 'doc-' + Date.now(),
          title: 'Untitled Writing',
          category,
          tone,
          content: '',
          wordCount: 0,
          charCount: 0,
          lastModified: Date.now(),
        };
        writingStudioService.saveDocument(fresh);
        setDocuments([fresh]);
        handleSelectDoc(fresh);
      }
    }
  };

  const pushUndoState = (prevText: string) => {
    setUndoStack((prev) => [...prev.slice(-40), prevText]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [currentText, ...r.slice(0, 40)]);
    setUndoStack((u) => u.slice(0, -1));
    setCurrentText(prev);

    if (activeDocId) {
      const updatedDoc: WritingDoc = {
        id: activeDocId,
        title: docTitle,
        category,
        tone,
        content: prev,
        wordCount: prev.trim() ? prev.trim().split(/\s+/).length : 0,
        charCount: prev.length,
        lastModified: Date.now(),
      };
      writingStudioService.saveDocument(updatedDoc);
      setDocuments(writingStudioService.getDocuments());
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack((u) => [...u.slice(-40), currentText]);
    setRedoStack((r) => r.slice(1));
    setCurrentText(next);

    if (activeDocId) {
      const updatedDoc: WritingDoc = {
        id: activeDocId,
        title: docTitle,
        category,
        tone,
        content: next,
        wordCount: next.trim() ? next.trim().split(/\s+/).length : 0,
        charCount: next.length,
        lastModified: Date.now(),
      };
      writingStudioService.saveDocument(updatedDoc);
      setDocuments(writingStudioService.getDocuments());
    }
  };

  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || topicInput;
    if (!promptToUse.trim() || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);
    pushUndoState(currentText);

    try {
      const generated = await writingStudioService.generateWriting({
        category,
        tone,
        topic: promptToUse.trim(),
      });
      setCurrentText(generated);

      const targetId = (!currentText.trim() && activeDocId) ? activeDocId : 'doc-' + Date.now();
      const updatedDoc: WritingDoc = {
        id: targetId,
        title: promptToUse.trim().slice(0, 40) || 'Untitled',
        category,
        tone,
        content: generated,
        wordCount: generated.trim().split(/\s+/).length,
        charCount: generated.length,
        lastModified: Date.now(),
      };
      writingStudioService.saveDocument(updatedDoc);
      setDocuments(writingStudioService.getDocuments());
      setActiveDocId(updatedDoc.id);
      setDocTitle(updatedDoc.title);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Writing generation notice: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAlter = async (alterAction: WritingAction) => {
    if (!currentText.trim() || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);
    pushUndoState(currentText);

    try {
      const altered = await writingStudioService.alterWriting({
        category,
        tone,
        currentContent: currentText,
        alterAction,
      });
      setCurrentText(altered);
      const targetId = activeDocId || 'doc-' + Date.now();
      const updatedDoc: WritingDoc = {
        id: targetId,
        title: docTitle,
        category,
        tone,
        content: altered,
        wordCount: altered.trim().split(/\s+/).length,
        charCount: altered.length,
        lastModified: Date.now(),
      };
      writingStudioService.saveDocument(updatedDoc);
      setDocuments(writingStudioService.getDocuments());
      setActiveDocId(targetId);

      if (alterAction === 'grammar') {
        setSuccessToast('✓ AI Grammar & spelling perfected!');
        setTimeout(() => setSuccessToast(null), 3500);
      } else {
        setSuccessToast(`✓ Text updated with ${alterAction}!`);
        setTimeout(() => setSuccessToast(null), 2500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Text alteration notice: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportText = () => {
    if (!currentText) return;
    const blob = new Blob([currentText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
  const charCount = currentText.length;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Header */}
      <div className={`px-4 sm:px-6 py-3 sm:py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 truncate">
              Writing Studio & Editor
              <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold shrink-0">
                Copywriting AI
              </span>
            </h1>
            <p className={`text-[11px] sm:text-xs truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Draft essays, articles, documentation, stories & resumes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNewDoc}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Doc</span>
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
          onClick={() => setMobileTab('controls')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'controls'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Controls & Vault ({documents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'editor'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Editor & Preview</span>
        </button>
      </div>

      {/* Main Dual Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control & Documents Vault */}
        <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${
          mobileTab === 'controls' ? 'flex' : 'hidden md:flex'
        } ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          {/* Generator Controls */}
          <div className="p-4 border-b border-neutral-800/40 space-y-3">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Writing Controls
            </span>

            <div>
              <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WritingCategory)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                }`}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as WritingTone)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                }`}
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1 text-neutral-400">Prompt / Topic</label>
              <textarea
                rows={3}
                placeholder="e.g. Write an essay examining quantum computing applications in medicine..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                    e.preventDefault();
                    handleGenerate(topicInput.trim() || docTitle || 'Modern Strategic Innovation');
                  }
                }}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 resize-none ${
                  isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300'
                }`}
              />
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['AI Ethics Essay', 'Press Release', 'Executive Brief', 'Story Prologue'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setTopicInput(sug);
                      handleGenerate(sug);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                      isDark 
                        ? 'border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/40' 
                        : 'border-neutral-200 text-neutral-600 hover:text-amber-600 hover:border-amber-400'
                    }`}
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-start justify-between gap-2">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300 font-bold">×</button>
              </div>
            )}

            <button
              id="generate-writing-btn"
              type="button"
              onClick={() => handleGenerate(topicInput.trim() || docTitle || 'Modern Strategic Innovation')}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Generating Prose...' : 'Generate Writing'}</span>
            </button>
          </div>

          {/* Documents Vault */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                Saved Writings ({documents.length})
              </span>
              {documents.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllDocs}
                  className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors font-medium cursor-pointer"
                  title="Remove all saved writings"
                >
                  Clear All
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-6 text-neutral-400 text-xs">No saved writings yet.</div>
            ) : (
              documents.map((doc) => {
                const isSelected = activeDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : isDark
                        ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/60'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold truncate">{doc.title}</p>
                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/30 text-[10px] text-neutral-400">
                      <span>{doc.category}</span>
                      <span>{doc.wordCount || 0} words</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Editor & Alteration Toolkit */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          mobileTab === 'editor' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Alteration Action Bar */}
          <div className={`px-3 sm:px-6 py-2 sm:py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto ${isDark ? 'border-neutral-850 bg-neutral-950/60' : 'border-neutral-200 bg-white'}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Undo and Redo Action Group */}
              <div className="flex items-center gap-1 border-r border-neutral-800/50 pr-2 mr-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  title="Undo (Ctrl+Z or Cmd+Z)"
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? 'border-neutral-800 hover:bg-neutral-850 text-neutral-200'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Undo</span>
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  title="Redo (Ctrl+Y or Cmd+Shift+Z)"
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark
                      ? 'border-neutral-800 hover:bg-neutral-850 text-neutral-200'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <Redo2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Redo</span>
                </button>
              </div>

              {[
                { id: 'improve', label: 'Improve Flow', icon: Sparkles },
                { id: 'rewrite', label: 'Rewrite', icon: RefreshCw },
                { id: 'shorten', label: 'Shorten', icon: Scissors },
                { id: 'expand', label: 'Expand', icon: Maximize2 },
                { id: 'grammar', label: 'Fix Grammar', icon: CheckCheck },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleAlter(tool.id as WritingAction)}
                    disabled={isProcessing || !currentText.trim()}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors ${
                      isDark
                        ? 'border-neutral-800 hover:bg-neutral-850 text-neutral-300'
                        : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {successToast && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold animate-in fade-in duration-200">
                  {successToast}
                </span>
              )}
              <button
                onClick={handleCopy}
                disabled={!currentText}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-850 text-xs font-medium flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleExportText}
                disabled={!currentText}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-850 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export .md</span>
              </button>

              {onSendToChat && (
                <button
                  onClick={() => onSendToChat(`[Writing Studio Document: ${docTitle}]\n${currentText.slice(0, 1500)}`)}
                  disabled={!currentText}
                  className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-medium flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Send to Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Document Title Header */}
          <div className={`px-6 py-3 border-b flex items-center justify-between gap-4 ${isDark ? 'border-neutral-850 bg-neutral-900/30' : 'border-neutral-200 bg-neutral-50'}`}>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => {
                const newTitle = e.target.value;
                setDocTitle(newTitle);
                const targetId = activeDocId || 'doc-' + Date.now();
                if (!activeDocId) setActiveDocId(targetId);
                const updated: WritingDoc = {
                  id: targetId,
                  title: newTitle || 'Untitled Writing',
                  category,
                  tone,
                  content: currentText,
                  wordCount: currentText.trim() ? currentText.trim().split(/\s+/).length : 0,
                  charCount: currentText.length,
                  lastModified: Date.now(),
                };
                writingStudioService.saveDocument(updated);
                setDocuments(writingStudioService.getDocuments());
              }}
              placeholder="Document Title..."
              className="text-base font-bold bg-transparent border-none focus:outline-none flex-1"
            />
            <div className="flex items-center gap-3">
              {/* View Mode Switcher: Edit | Split | Markdown Preview */}
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'edit'
                      ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Raw Text Editor"
                >
                  <PenTool className="w-3 h-3" />
                  <span className="hidden sm:inline">Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'split'
                      ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Split Screen Editor & Markdown Preview"
                >
                  <Columns className="w-3 h-3" />
                  <span className="hidden sm:inline">Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'preview'
                      ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Rendered Markdown Document"
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Markdown</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
              </div>
            </div>
          </div>

          {/* Text Editor Area */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-amber-400">Crafting prose and refining vocabulary...</p>
              </div>
            ) : viewMode === 'preview' ? (
              <div
                className={`w-full flex-1 p-6 rounded-2xl border overflow-y-auto custom-scrollbar ${
                  isDark
                    ? 'bg-neutral-900/40 border-neutral-850 text-neutral-100'
                    : 'bg-white border-neutral-200 text-neutral-900'
                }`}
              >
                <MarkdownRenderer content={currentText || '*No content yet. Switch to Editor to start writing.*'} theme={theme} />
              </div>
            ) : viewMode === 'split' ? (
              <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                <textarea
                  id="writing-studio-editor"
                  value={currentText}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                      e.preventDefault();
                      handleUndo();
                    } else if (
                      ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') ||
                      ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z')
                    ) {
                      e.preventDefault();
                      handleRedo();
                    }
                  }}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    if (Math.abs(newContent.length - currentText.length) > 3 || newContent.endsWith('\n')) {
                      pushUndoState(currentText);
                    }
                    setCurrentText(newContent);
                    const targetId = activeDocId || 'doc-' + Date.now();
                    if (!activeDocId) setActiveDocId(targetId);
                    const updated: WritingDoc = {
                      id: targetId,
                      title: docTitle || 'Untitled Writing',
                      category,
                      tone,
                      content: newContent,
                      wordCount: newContent.trim() ? newContent.trim().split(/\s+/).length : 0,
                      charCount: newContent.length,
                      lastModified: Date.now(),
                    };
                    writingStudioService.saveDocument(updated);
                    setDocuments(writingStudioService.getDocuments());
                  }}
                  placeholder="Type markdown content..."
                  className={`w-full h-full p-4 rounded-2xl border text-sm leading-relaxed font-mono resize-none focus:outline-none focus:border-amber-500 transition-colors ${
                    isDark
                      ? 'bg-neutral-900/40 border-neutral-850 text-neutral-100 placeholder-neutral-500'
                      : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
                  }`}
                />
                <div
                  className={`w-full h-full p-4 rounded-2xl border overflow-y-auto custom-scrollbar ${
                    isDark
                      ? 'bg-neutral-900/40 border-neutral-850 text-neutral-100'
                      : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                >
                  <div className="text-[10px] font-mono text-amber-400 font-bold uppercase mb-2 pb-1 border-b border-neutral-800">
                    Live Markdown Preview
                  </div>
                  <MarkdownRenderer content={currentText || '*Live preview appears here...*'} theme={theme} />
                </div>
              </div>
            ) : (
              <textarea
                id="writing-studio-editor"
                value={currentText}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    handleUndo();
                  } else if (
                    ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') ||
                    ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z')
                  ) {
                    e.preventDefault();
                    handleRedo();
                  }
                }}
                onChange={(e) => {
                  const newContent = e.target.value;
                  // Store previous state for undo if starting a substantial change
                  if (Math.abs(newContent.length - currentText.length) > 3 || newContent.endsWith('\n')) {
                    pushUndoState(currentText);
                  }
                  setCurrentText(newContent);
                  const targetId = activeDocId || 'doc-' + Date.now();
                  if (!activeDocId) setActiveDocId(targetId);
                  const updated: WritingDoc = {
                    id: targetId,
                    title: docTitle || 'Untitled Writing',
                    category,
                    tone,
                    content: newContent,
                    wordCount: newContent.trim() ? newContent.trim().split(/\s+/).length : 0,
                    charCount: newContent.length,
                    lastModified: Date.now(),
                  };
                  writingStudioService.saveDocument(updated);
                  setDocuments(writingStudioService.getDocuments());
                }}
                placeholder="Start typing or generate content from the left panel..."
                className={`w-full flex-1 p-4 rounded-2xl border text-sm leading-relaxed font-sans resize-none focus:outline-none focus:border-amber-500 transition-colors ${
                  isDark
                    ? 'bg-neutral-900/40 border-neutral-850 text-neutral-100 placeholder-neutral-500'
                    : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
                }`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
