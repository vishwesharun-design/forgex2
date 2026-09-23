import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  HelpCircle,
  Table as TableIcon,
  BookOpen,
  CheckCircle,
  Copy,
  Trash2,
  GitCompare,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Check,
  Search,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { DocumentItem, DocumentFileType, QuizQuestion, ForgeXTheme, ForgeXModelId, FORGEX_MODELS } from '../types';
import { documentService } from '../services/documentService';
import { ModelSelector } from './ModelSelector';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DocumentWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
}

type DocActionMode = 'summarize' | 'qa' | 'tables' | 'notes' | 'quiz' | 'compare' | 'analyze';

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  isDark,
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>(() => documentService.getDocuments());
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<DocActionMode>('summarize');
  const [questionInput, setQuestionInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizScore, setShowQuizScore] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-select first document if available
  useEffect(() => {
    if (documents.length > 0 && selectedDocIds.length === 0) {
      setSelectedDocIds([documents[0].id]);
    }
  }, [documents]);

  const activeDocs = documents.filter((d) => selectedDocIds.includes(d.id));

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    try {
      const newDocs: DocumentItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const doc = await documentService.parseUploadedFile(files[i]);
        documentService.addDocument(doc);
        newDocs.push(doc);
      }
      const updated = documentService.getDocuments();
      setDocuments(updated);
      setSelectedDocIds([newDocs[0].id]);
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = documentService.deleteDocument(id);
    setDocuments(updated);
    setSelectedDocIds((prev) => prev.filter((dId) => dId !== id));
  };

  const toggleSelectDoc = (id: string) => {
    if (activeMode === 'compare') {
      setSelectedDocIds((prev) =>
        prev.includes(id) ? (prev.length > 1 ? prev.filter((d) => d !== id) : prev) : [...prev, id]
      );
    } else {
      setSelectedDocIds([id]);
    }
  };

  const handleRunAction = async () => {
    if (activeDocs.length === 0) return;
    setIsProcessing(true);
    setResultText('');
    setGeneratedQuiz(null);
    setQuizAnswers({});
    setShowQuizScore(false);

    try {
      let actionType: any = activeMode;
      if (activeMode === 'tables') actionType = 'extract-tables';
      else if (activeMode === 'notes') actionType = 'generate-notes';
      else if (activeMode === 'quiz') actionType = 'generate-quiz';
      else if (activeMode === 'analyze') actionType = 'analyze-data';

      const resp = await documentService.runDocumentAction({
        action: actionType,
        documents: activeDocs,
        query: questionInput.trim(),
        prompt: questionInput.trim(),
      });

      setResultText(resp.result);
      if (resp.quiz && Array.isArray(resp.quiz)) {
        setGeneratedQuiz(resp.quiz);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResultText(`Execution encountered an issue: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type: DocumentFileType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />;
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-400" />;
      default:
        return <FileCode className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Top Header */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              File & Document AI
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Multimodal Neural OCR
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Upload PDF, DOCX, PPTX, TXT, CSV & images for Q&A, synthesis, quizzes, and comparative intelligence.
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

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: File Vault & Selection */}
        <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          {/* Upload Zone */}
          <div className="p-4 border-b border-neutral-800/40">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10'
                  : isDark
                  ? 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/60'
                  : 'border-neutral-300 hover:border-neutral-400 bg-white'
              }`}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-amber-400" />
              <p className="text-xs font-semibold">Upload Documents</p>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                PDF, DOCX, PPTX, TXT, CSV, or Images
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Vault ({documents.length})
              </span>
              {activeMode === 'compare' && (
                <span className="text-[10px] text-amber-400 font-medium">Select 2+ to compare</span>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-10 px-4">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-neutral-400" />
                <p className="text-xs font-medium text-neutral-400">No documents in vault</p>
                <p className="text-[11px] text-neutral-500 mt-1">Upload files above to start analyzing</p>
              </div>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleSelectDoc(doc.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/10 shadow-sm'
                        : isDark
                        ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/60'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(doc.fileType)}
                        <span className="text-xs font-semibold truncate">{doc.name}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-800/30 text-[10px] text-neutral-400">
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      <span>{new Date(doc.uploadTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Analysis & Interactions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action Tabs Bar */}
          <div className={`px-6 py-3 border-b flex items-center justify-between gap-2 overflow-x-auto ${isDark ? 'border-neutral-850 bg-neutral-950/60' : 'border-neutral-200 bg-white'}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'summarize', label: 'Summarize', icon: FileText },
                { id: 'qa', label: 'Ask Question', icon: HelpCircle },
                { id: 'tables', label: 'Extract Tables', icon: TableIcon },
                { id: 'notes', label: 'Generate Notes', icon: BookOpen },
                { id: 'quiz', label: 'Quiz Me', icon: CheckCircle },
                { id: 'compare', label: 'Compare Docs', icon: GitCompare },
                { id: 'analyze', label: 'Data Analysis', icon: Sparkles },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`doc-action-${tab.id}`}
                    type="button"
                    onClick={() => setActiveMode(tab.id as DocActionMode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                        : isDark
                        ? 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-850'
                        : 'bg-neutral-100 border border-neutral-200 text-neutral-700 hover:bg-neutral-200'
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
                onClick={handleRunAction}
                disabled={isProcessing || activeDocs.length === 0}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Processing...' : 'Run Intelligence'}</span>
              </button>
            </div>
          </div>

          {/* Query Input (Shown for Q&A, compare, or custom queries) */}
          {(activeMode === 'qa' || activeMode === 'compare' || activeMode === 'analyze') && (
            <div className={`px-6 py-3 border-b flex items-center gap-2 ${isDark ? 'border-neutral-850 bg-neutral-900/30' : 'border-neutral-200 bg-neutral-50'}`}>
              <Search className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                id="doc-query-input"
                type="text"
                placeholder={
                  activeMode === 'qa'
                    ? 'Ask any specific question about the document(s)...'
                    : activeMode === 'compare'
                    ? 'Enter specific criteria or comparison focus (optional)...'
                    : 'Specify data insights, columns, or metrics to focus on...'
                }
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunAction();
                }}
                className={`w-full text-xs bg-transparent border-none focus:outline-none ${isDark ? 'text-white' : 'text-neutral-900'}`}
              />
            </div>
          )}

          {/* Results Viewer Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className="w-12 h-12 text-neutral-500 mb-3 opacity-40" />
                <h3 className="text-sm font-bold text-neutral-300">No Document Selected</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  Upload a document or select an existing file from the left vault to begin synthesis.
                </p>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-amber-400">Processing document content with Neural OCR...</p>
                <p className="text-[11px] text-neutral-500">Extracting syntax, context vectors, and entities</p>
              </div>
            ) : resultText ? (
              <div className="space-y-4 max-w-4xl mx-auto">
                {/* Result Action Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      {activeMode.toUpperCase()} Results
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Based on {activeDocs.map((d) => d.name).join(', ')}
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
                        onClick={() => onSendToChat(`[Document Context from ${activeDocs[0].name}]:\n${resultText.slice(0, 1500)}`)}
                        className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Send to Chat</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Render Interactive Quiz if Quiz Mode */}
                {generatedQuiz && generatedQuiz.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-amber-400">Interactive Document Quiz</h3>
                    {generatedQuiz.map((q, qIdx) => {
                      const selectedOpt = quizAnswers[qIdx];
                      const isAnswered = selectedOpt !== undefined;
                      return (
                        <div
                          key={q.id || qIdx}
                          className={`p-4 rounded-2xl border ${
                            isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
                          }`}
                        >
                          <p className="text-xs font-bold mb-3">
                            <span className="text-amber-400 mr-1.5">{qIdx + 1}.</span>
                            {q.question}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = selectedOpt === optIdx;
                              const isCorrect = showQuizScore && optIdx === q.correctAnswerIndex;
                              const isWrong = showQuizScore && isSelected && optIdx !== q.correctAnswerIndex;

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => {
                                    if (!showQuizScore) {
                                      setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
                                    }
                                  }}
                                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                      : isWrong
                                      ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                                      : isSelected
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                                      : isDark
                                      ? 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                                      : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {showQuizScore && (
                            <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-neutral-800/80 text-[11px] text-neutral-400">
                              <span className="font-bold text-amber-400 mr-1">Explanation:</span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setShowQuizScore(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors"
                      >
                        Check Answers & Score
                      </button>

                      {showQuizScore && (
                        <span className="text-xs font-bold text-amber-400">
                          Score:{' '}
                          {
                            generatedQuiz.filter((q, idx) => quizAnswers[idx] === q.correctAnswerIndex).length
                          }{' '}
                          / {generatedQuiz.length} Correct
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard Markdown / Text Render */
                  <div className={`p-5 rounded-2xl border leading-relaxed text-xs space-y-3 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                    <MarkdownRenderer content={resultText} theme={theme} className="text-xs" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <Sparkles className="w-10 h-10 text-amber-400/40 mb-1" />
                <h3 className="text-sm font-bold">Document Ready for Analysis</h3>
                <p className="text-xs text-neutral-400 max-w-md">
                  Selected: <span className="text-amber-400 font-semibold">{activeDocs[0].name}</span> (
                  {(activeDocs[0].fileSize / 1024).toFixed(1)} KB). Click{' '}
                  <span className="text-amber-400 font-semibold">"Run Intelligence"</span> above or choose a mode.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
