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
    if (onSelectProject) onSelectProject(proj);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Top Header */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              Projects System & Shared Context
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Persistent Memory
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Organize chats, code, files, and images into dedicated projects with continuous context memory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
          />
        </div>
      </div>

      {/* Main Dual Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Projects Directory */}
        <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-3 border-b border-neutral-800/40 flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Active Workspaces ({projects.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {projects.map((proj) => {
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
                    {projects.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(proj.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className={`text-[11px] mt-1.5 line-clamp-2 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {proj.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {proj.tags?.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Project Detail & Memory Vault */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeProject ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <FolderKanban className="w-12 h-12 text-neutral-500 opacity-40" />
              <h3 className="text-sm font-bold text-neutral-300">No Project Active</h3>
              <p className="text-xs text-neutral-500">Create a project or select one from the left menu.</p>
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
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {activeProject.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-neutral-500">
                    <span>Category: <strong className="text-neutral-300">{activeProject.category}</strong></span>
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
                  <span className="text-[10px] font-mono text-neutral-500">Auto-injected into AI queries</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Write persistent requirements, architecture decisions, code rules, or reference specs for this specific project.
                </p>
                <textarea
                  rows={6}
                  value={activeProject.contextNotes || ''}
                  onChange={(e) => handleUpdateNotes(e.target.value)}
                  placeholder="e.g. Engine: Luau / Roblox. Design aesthetic: Cyberpunk neon. Always output typed functions..."
                  className={`w-full p-3.5 rounded-xl border text-xs font-mono resize-none focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-200' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  }`}
                />
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
                <label className="block font-semibold mb-1 text-neutral-400">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Roblox Game, My Portfolio, Biology Thesis"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-neutral-400">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
                >
                  <option value="Game Development">Game Development</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Education">Education & School</option>
                  <option value="Business">Business & Marketing</option>
                  <option value="Creative">Creative Writing & Art</option>
                  <option value="General">General Project</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-neutral-400">Short Description</label>
                <input
                  type="text"
                  placeholder="Brief summary of the goals and deliverables..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-neutral-400">Initial Context Notes / Rules</label>
                <textarea
                  rows={3}
                  placeholder="Rules, technologies, preferred frameworks, target audience..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-neutral-400">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Roblox, Lua, Multi-player"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
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
