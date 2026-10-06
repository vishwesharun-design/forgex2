import React, { useState, useRef, useMemo } from 'react';
import {
  Database,
  Search,
  Plus,
  Upload,
  Globe,
  FileText,
  Code,
  StickyNote,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  Check,
  X,
  FileCheck,
  Download,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { VaultDocument, ForgeXTheme } from '../types';
import { vaultService } from '../services/vaultService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface VaultWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  onSendToChat?: (text: string) => void;
  onNavigateToChat?: () => void;
}

export const VaultWorkspace: React.FC<VaultWorkspaceProps> = ({
  isDark,
  theme,
  onSendToChat,
  onNavigateToChat,
}) => {
  const [documents, setDocuments] = useState<VaultDocument[]>(() => vaultService.getDocuments());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectingDoc, setInspectingDoc] = useState<VaultDocument | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  // Modals
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const [isUrlIngesting, setIsUrlIngesting] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // New Note State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<VaultDocument['category']>('notes');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshDocuments = () => {
    setDocuments(vaultService.getDocuments());
  };

  const handleToggleDoc = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    vaultService.toggleDocumentActive(id);
    refreshDocuments();
  };

  const handleToggleAll = (active: boolean) => {
    vaultService.toggleAllActive(active);
    refreshDocuments();
  };

  const handleDeleteDoc = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Remove this document from your Knowledge Vault?')) {
      vaultService.deleteDocument(id);
      if (inspectingDoc?.id === id) {
        setInspectingDoc(null);
      }
      refreshDocuments();
    }
  };

  // File Upload Handlers (TXT, MD, JSON, CSV, PDF text)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        let category: VaultDocument['category'] = 'document';
        if (['ts', 'tsx', 'js', 'jsx', 'py', 'html', 'css', 'json', 'sql', 'rust', 'go'].includes(ext)) {
          category = 'code';
        } else if (['md', 'txt'].includes(ext)) {
          category = 'notes';
        }

        vaultService.addDocument({
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: text,
          category,
          tags: [ext.toUpperCase(), 'Uploaded'],
          summary: text.slice(0, 180) + (text.length > 180 ? '...' : ''),
          isActive: true,
        });
        refreshDocuments();
      };

      reader.readAsText(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // URL Ingest
  const handleIngestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isUrlIngesting) return;
    setIsUrlIngesting(true);
    setUrlError(null);

    try {
      const data = await vaultService.ingestUrl(urlInput.trim());
      vaultService.addDocument({
        title: data.title || urlInput.trim(),
        content: data.content,
        category: 'webpage',
        tags: ['Web Page', 'Link'],
        sourceUrl: urlInput.trim(),
        summary: data.summary,
        isActive: true,
      });
      setUrlInput('');
      setIsAddUrlOpen(false);
      refreshDocuments();
    } catch (err: any) {
      setUrlError(err?.message || 'Failed to ingest link.');
    } finally {
      setIsUrlIngesting(false);
    }
  };

  // Save New Note
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const tagsArr = newNoteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    vaultService.addDocument({
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: newNoteCategory,
      tags: tagsArr.length > 0 ? tagsArr : ['Personal Note'],
      summary: newNoteContent.slice(0, 180) + (newNoteContent.length > 180 ? '...' : ''),
      isActive: true,
    });

    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTags('');
    setIsAddNoteOpen(false);
    refreshDocuments();
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!inspectingDoc) return;
    const tagsArr = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    vaultService.updateDocument(inspectingDoc.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      tags: tagsArr,
      summary: editContent.slice(0, 180) + '...',
    });

    setInspectingDoc((prev) =>
      prev
        ? {
            ...prev,
            title: editTitle.trim(),
            content: editContent.trim(),
            tags: tagsArr,
          }
        : null
    );
    setIsEditingDoc(false);
    refreshDocuments();
  };

  // Open doc inspector
  const openInspectDoc = (docItem: VaultDocument) => {
    setInspectingDoc(docItem);
    setEditTitle(docItem.title);
    setEditContent(docItem.content);
    setEditTags(docItem.tags.join(', '));
    setIsEditingDoc(false);
  };

  // Filtered docs
  const filteredDocs = useMemo(() => {
    return documents.filter((docItem) => {
      const matchesCategory = selectedCategory === 'all' || docItem.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch =
        docItem.title.toLowerCase().includes(q) ||
        docItem.tags.some((t) => t.toLowerCase().includes(q)) ||
        docItem.content.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  const activeCount = documents.filter((d) => d.isActive).length;
  const totalChars = documents.reduce((sum, d) => sum + d.charCount, 0);

  return (
    <div
      id="workspace-vault"
      className={`flex-1 flex flex-col min-h-0 relative overflow-hidden transition-colors ${
        isDark ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.json,.csv,.ts,.js,.py,.html,.css,.sql"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* TOP HEADER / ACTION BAR */}
      <div className={`p-4 sm:p-6 border-b shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/60' : 'border-neutral-200 bg-white/70'}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight">Knowledge Vault</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  RAG Grounding
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Private document knowledge base. Active documents automatically ground ForgeX Chat & Deep Research.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700 hover:border-amber-500/50"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Files</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddUrlOpen(true)}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700 hover:border-blue-500/50"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Add Link</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddNoteOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {/* METRICS & QUICK TOGGLES STRIP */}
        <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-neutral-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block">Total Documents</span>
            <span className="text-lg font-display font-bold mt-0.5 block">{documents.length}</span>
          </div>

          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block">Active Grounding</span>
              <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
            </div>
            <span className="text-lg font-display font-bold text-amber-400 mt-0.5 block">
              {activeCount} <span className="text-xs font-normal text-neutral-400">/ {documents.length}</span>
            </span>
          </div>

          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block">Knowledge Density</span>
            <span className="text-lg font-display font-bold mt-0.5 block">
              {(totalChars / 1000).toFixed(1)}k <span className="text-xs font-normal text-neutral-400">chars</span>
            </span>
          </div>

          <div className={`p-2.5 rounded-2xl border flex flex-col justify-center items-start gap-1.5 ${isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">Master Toggle</span>
            <div className="flex items-center gap-1.5 w-full">
              <button
                type="button"
                onClick={() => handleToggleAll(true)}
                className="flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => handleToggleAll(false)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                  isDark ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-800' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH STRIP */}
      <div className={`px-4 sm:px-6 py-3 border-b shrink-0 flex items-center justify-between gap-3 ${isDark ? 'border-neutral-850 bg-neutral-950/40' : 'border-neutral-200 bg-white/40'}`}>
        <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All', icon: Layers },
              { id: 'document', label: 'Docs', icon: FileText },
              { id: 'notes', label: 'Notes', icon: StickyNote },
              { id: 'webpage', label: 'Web Pages', icon: Globe },
              { id: 'code', label: 'Code', icon: Code },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                      : isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vault documents..."
              className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border outline-none transition-colors ${
                isDark
                  ? 'bg-neutral-900/80 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-amber-500/50'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-amber-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* DOCUMENT GRID (SCROLLABLE) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          {filteredDocs.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-4">
                <Database className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="font-display font-bold text-base text-neutral-300">No documents found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                {searchQuery
                  ? `No vault documents match "${searchQuery}".`
                  : 'Upload PDFs, notes, or web links to start grounding ForgeX with your proprietary knowledge.'}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddNoteOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-bold"
                >
                  Create First Note
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((docItem) => {
                const isDocActive = docItem.isActive;
                return (
                  <div
                    key={docItem.id}
                    onClick={() => openInspectDoc(docItem)}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between group cursor-pointer relative ${
                      isDocActive
                        ? isDark
                          ? 'bg-neutral-900/90 border-amber-500/35 hover:border-amber-500/60 shadow-lg shadow-black/40'
                          : 'bg-white border-amber-500/40 hover:border-amber-500/70 shadow-md'
                        : isDark
                        ? 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/70 text-neutral-400'
                        : 'bg-white/80 border-neutral-200 hover:border-neutral-300 text-neutral-500'
                    }`}
                  >
                    {/* Active Grounding Indicator Aura */}
                    {isDocActive && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleDoc(docItem.id, e)}
                          title="Click to toggle grounding on/off for this document"
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Grounded</span>
                        </button>
                      </div>
                    )}

                    {!isDocActive && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleDoc(docItem.id, e)}
                          title="Click to enable this document for AI grounding"
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                            isDark
                              ? 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                              : 'bg-neutral-100 text-neutral-600 hover:text-black border border-neutral-200'
                          }`}
                        >
                          Off
                        </button>
                      </div>
                    )}

                    <div>
                      {/* Category & Date */}
                      <div className="flex items-center gap-2 mb-2 pr-16">
                        <span className={`p-1.5 rounded-lg text-xs ${
                          docItem.category === 'code'
                            ? 'bg-blue-500/15 text-blue-400'
                            : docItem.category === 'webpage'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : docItem.category === 'notes'
                            ? 'bg-purple-500/15 text-purple-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {docItem.category === 'code' && <Code className="w-3.5 h-3.5" />}
                          {docItem.category === 'webpage' && <Globe className="w-3.5 h-3.5" />}
                          {docItem.category === 'notes' && <StickyNote className="w-3.5 h-3.5" />}
                          {docItem.category === 'document' && <FileText className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                          {docItem.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className={`font-display font-bold text-sm tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}>
                        {docItem.title}
                      </h3>

                      {/* Summary / Excerpt */}
                      <p className={`text-xs mt-1.5 line-clamp-3 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {docItem.summary || docItem.content}
                      </p>

                      {/* Tag Chips */}
                      {docItem.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-3">
                          {docItem.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                                isDark ? 'bg-neutral-800/80 text-neutral-400' : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Metadata & Quick Actions */}
                    <div className="pt-3 mt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400" onClick={(e) => e.stopPropagation()}>
                      <span>{(docItem.charCount / 1000).toFixed(1)}k chars</span>

                      <div className="flex items-center gap-1">
                        {onSendToChat && (
                          <button
                            type="button"
                            onClick={() => {
                              onSendToChat(`[Discuss Knowledge Document: "${docItem.title}"]\n\n${docItem.content.slice(0, 1500)}`);
                              onNavigateToChat?.();
                            }}
                            title="Chat with this document"
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openInspectDoc(docItem)}
                          title="View document details"
                          className="p-1.5 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDoc(docItem.id, e)}
                          title="Delete from Vault"
                          className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* INSPECT / EDIT DOCUMENT DRAWER */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div
            className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <Database className="w-4 h-4" />
                </span>
                <span className="font-display font-bold text-sm truncate">{inspectingDoc.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingDoc(!isEditingDoc)}
                  className="px-2.5 py-1 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-xs font-medium flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3 text-amber-400" />
                  <span>{isEditingDoc ? 'Preview' : 'Edit'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingDoc(null)}
                  className="p-1.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar space-y-4">
              {isEditingDoc ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                      Content (Markdown)
                    </label>
                    <textarea
                      rows={12}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full text-xs font-mono p-3 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800">
                    <span>Category: <strong className="text-white capitalize">{inspectingDoc.category}</strong></span>
                    <span>{inspectingDoc.charCount.toLocaleString()} characters</span>
                  </div>
                  <div className="text-xs leading-relaxed prose prose-invert max-w-none">
                    <MarkdownRenderer content={inspectingDoc.content} theme={theme} className="text-xs" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleDoc(inspectingDoc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  inspectingDoc.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${inspectingDoc.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                <span>{inspectingDoc.isActive ? 'Grounded in AI' : 'Grounding Disabled'}</span>
              </button>

              <div className="flex items-center gap-2">
                {isEditingDoc ? (
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md"
                  >
                    Save Changes
                  </button>
                ) : (
                  onSendToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onSendToChat(`[Discuss Knowledge Document: "${inspectingDoc.title}"]\n\n${inspectingDoc.content.slice(0, 1800)}`);
                        setInspectingDoc(null);
                        onNavigateToChat?.();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat with Doc</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW NOTE MODAL */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
          <form
            onSubmit={handleCreateNote}
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-bold text-sm">Add Knowledge Vault Note</h3>
              </div>
              <button type="button" onClick={() => setIsAddNoteOpen(false)} className="hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                Document / Note Title
              </label>
              <input
                type="text"
                required
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="e.g. Q4 Growth Goals or API Schema"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                  Category
                </label>
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none"
                >
                  <option value="notes">Notes</option>
                  <option value="document">Document</option>
                  <option value="code">Code</option>
                  <option value="webpage">Web Page</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newNoteTags}
                  onChange={(e) => setNewNoteTags(e.target.value)}
                  placeholder="e.g. Strategy, Core"
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                Content & Insights (Markdown supported)
              </label>
              <textarea
                required
                rows={7}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write or paste your proprietary facts, notes, specifications..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none focus:border-amber-500 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAddNoteOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-700 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
              >
                Save to Vault
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD URL LINK MODAL */}
      {isAddUrlOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3">
          <form
            onSubmit={handleIngestUrl}
            className={`w-full max-w-md rounded-3xl border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <h3 className="font-display font-bold text-sm">Ingest Web Page or Article</h3>
              </div>
              <button type="button" onClick={() => setIsAddUrlOpen(false)} className="hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Paste any public article, documentation, or blog link. ForgeX will extract and clean the text content for AI grounding.
            </p>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
                Webpage URL
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/documentation"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white outline-none focus:border-blue-500"
              />
            </div>

            {urlError && (
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {urlError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAddUrlOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-700 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUrlIngesting}
                className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isUrlIngesting ? 'Ingesting Link...' : 'Ingest & Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
