import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  FolderOpen,
  FileText,
  Code,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  CheckCircle,
  Tag,
  ArrowRight,
  Bookmark,
  X
} from 'lucide-react';
import { ForgeXProject, ForgeXTheme, ForgeXModelId } from '../types';
import { projectService } from '../services/projectService';
import { ModelSelector } from './ModelSelector';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ProjectWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
  onSelectProject?: (proj: ForgeXProject) => void;
  onSelectWorkspace?: (ws: any) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  isDark,
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
  onSelectProject,
  onSelectWorkspace,
}) => {
  const [projects, setProjects] = useState<ForgeXProject[]>(() => projectService.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => projectService.getActiveProjectId() || projects[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Web Development');
  const [newNotes, setNewNotes] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [mobileTab, setMobileTab] = useState<'directory' | 'details'>('details');
  const [notesViewMode, setNotesViewMode] = useState<'edit' | 'preview'>('edit');

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const handleCreate = () => {
    if (!newName.trim()) return;
    const tags = newTagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const created = projectService.createProject({
      name: newName,
      description: newDesc,
      category: newCategory,
      contextNotes: newNotes,
      tags: tags.length > 0 ? tags : ['Project'],
    });

    setProjects(projectService.getProjects());
    setActiveProjectId(created.id);
    setIsModalOpen(false);
    setNewName('');
    setNewDesc('');
    setNewNotes('');
    setNewTagInput('');
    setMobileTab('details');
    if (onSelectProject) onSelectProject(created);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = projectService.deleteProject(id);
    setProjects(updated);
    if (activeProjectId === id && updated.length > 0) {
      setActiveProjectId(updated[0].id);
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (!activeProject) return;
    const updated: ForgeXProject = {
      ...activeProject,
      contextNotes: notes,
    };
    projectService.updateProject(updated);
    setProjects(projectService.getProjects());
  };

  const handleActivate = (proj: ForgeXProject) => {
    projectService.setActiveProjectId(proj.id);
    setActiveProjectId(proj.id);
    setMobileTab('details');
    if (onSelectProject) onSelectProject(proj);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Top Header */}
      <div className={`px-4 sm:px-6 py-3 sm:py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 truncate">
              Projects System & Context
              <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold shrink-0">
                Persistent Memory
              </span>
            </h1>
            <p className={`text-[11px] sm:text-xs truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Organize chats, code, files, and continuous memory context
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
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
          onClick={() => setMobileTab('directory')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'directory'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Directory ({projects.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('details')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'details'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Project Details</span>
        </button>
      </div>

      {/* Main Dual Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Projects Directory */}
        <div className={`w-full md:w-80 border-r flex flex-col shrink-0 ${
          mobileTab === 'directory' ? 'flex' : 'hidden md:flex'
        } ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-3 border-b border-neutral-800/40 flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Active Workspaces ({projects.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {projects.length === 0 ? (
              <div className="text-center py-8 px-3">
                <FolderKanban className="w-8 h-8 mx-auto text-neutral-500/50 mb-2" />
                <p className="text-xs text-neutral-400 font-medium">No projects yet</p>
                <p className="text-[11px] text-neutral-500 mt-1">Start a fresh project to organize your chats, files, and ideas.</p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Project
                </button>
              </div>
            ) : (
              projects.map((proj) => {
                const isActive = activeProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => handleActivate(proj)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isActive
                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                        : isDark
                        ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/70'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                        <h4 className="text-xs font-bold truncate">{proj.name}</h4>
                      </div>
                      <button
                        onClick={(e) => handleDelete(proj.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className={`text-[11px] mt-1.5 line-clamp-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {proj.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {proj.tags?.map((t) => (
                        <span
                          key={t}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Project Detail & Memory Vault */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          mobileTab === 'details' ? 'flex' : 'hidden md:flex'
        }`}>
          {!activeProject ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <FolderKanban className="w-8 h-8" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>No Projects Created Yet</h3>
                <p className={`text-xs max-w-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Create a custom project workspace to hold your code snippets, generated media, research queries, and persistent memory context.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Project</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Project Hero Banner */}
              <div className={`p-6 rounded-2xl border flex items-start justify-between gap-4 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{activeProject.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      CURRENT CONTEXT
                    </span>
                  </div>
                  <div className="mt-1">
                    <MarkdownRenderer content={activeProject.description} theme={theme} className="text-xs opacity-90" />
                  </div>
                  <div className={`flex items-center gap-3 mt-3 text-[11px] ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                    <span>Category: <strong className={isDark ? 'text-neutral-300' : 'text-neutral-900'}>{activeProject.category}</strong></span>
                    <span>•</span>
                    <span>Created: {new Date(activeProject.createdTime).toLocaleDateString()}</span>
                  </div>
                </div>

                {onSendToChat && (
                  <button
                    onClick={() =>
                      onSendToChat(
                        `[Project Context: ${activeProject.name}]\nDescription: ${activeProject.description}\nNotes:\n${activeProject.contextNotes}`
                      )
                    }
                    className="px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Send to Chat</span>
                  </button>
                )}
              </div>

              {/* Dedicated Project Memory & Instructions */}
              <div className={`p-6 rounded-2xl border space-y-3 ${isDark ? 'bg-neutral-900/60 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Bookmark className="w-4 h-4" />
                    Project System Context & Guidelines
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-neutral-800 p-0.5 bg-neutral-950 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setNotesViewMode('edit')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          notesViewMode === 'edit'
                            ? 'bg-amber-500 text-black font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesViewMode('preview')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${
                          notesViewMode === 'preview'
                            ? 'bg-amber-500 text-black font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Markdown Preview
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">Auto-injected into AI queries</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Write persistent requirements, architecture decisions, code rules, or reference specs for this specific project. Supports rich Markdown formatting.
                </p>

                {notesViewMode === 'edit' ? (
                  <textarea
                    rows={6}
                    value={activeProject.contextNotes || ''}
                    onChange={(e) => handleUpdateNotes(e.target.value)}
                    placeholder="e.g. Architecture specs: React, Tailwind, TypeScript. Target audience: Developers. Key requirements..."
                    className={`w-full p-3.5 rounded-xl border text-xs font-mono resize-none focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-200' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                    }`}
                  />
                ) : (
                  <div className={`p-4 rounded-xl border min-h-[140px] text-xs ${
                    isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-300'
                  }`}>
                    <MarkdownRenderer
                      content={activeProject.contextNotes || '*No context notes yet. Switch to Editor to write guidelines and specifications.*'}
                      theme={theme}
                    />
                  </div>
                )}
              </div>

              {/* Connected Resources Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Chat Sessions</span>
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-lg font-bold">{activeProject.chatSessionIds.length}</p>
                </div>

                <div className={`p-4 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Project Files</span>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold">{activeProject.fileIds.length}</p>
                </div>

                <div className={`p-4 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Code Snippets</span>
                    <Code className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold">{activeProject.codeSnippetIds.length}</p>
                </div>

                <div className={`p-4 rounded-xl border text-xs space-y-1 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Generated Images</span>
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-lg font-bold">{activeProject.imageIds.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/40">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-amber-400" />
                Create New Project
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. NextGen SaaS Platform, Mobile App, Research Thesis"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                >
                  <option value="Web Development">Web Development</option>
                  <option value="Game Development">Game Development</option>
                  <option value="Education">Education & School</option>
                  <option value="Business">Business & Marketing</option>
                  <option value="Creative">Creative Writing & Art</option>
                  <option value="General">General Project</option>
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>Short Description</label>
                <input
                  type="text"
                  placeholder="Brief summary of the goals and deliverables..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>Initial Context Notes / Rules</label>
                <textarea
                  rows={3}
                  placeholder="Rules, technologies, preferred frameworks, target audience..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. React, Full-stack, API, Production"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/40">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold disabled:opacity-40"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
