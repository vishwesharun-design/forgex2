import { ForgeXProject } from '../types';
import { authService } from './authService';

function getProjectsStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_projects_${partition}`;
}

function getActiveProjectKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_active_project_id_${partition}`;
}

export const projectService = {
  getProjects(): ForgeXProject[] {
    try {
      const key = getProjectsStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_projects');
        if (legacy) {
          stored = legacy;
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clean out any sample / placeholder projects like 'My Roblox Game'
          const filtered = parsed.filter(
            (p: ForgeXProject) =>
              p.id !== 'proj-roblox' &&
              p.id !== 'proj-website' &&
              p.id !== 'proj-school' &&
              !p.name?.toLowerCase().includes('roblox')
          );
          if (filtered.length !== parsed.length) {
            this.saveProjects(filtered);
          }
          return filtered;
        }
      }
    } catch (_e) {
      // fallback
    }
    return this.getDefaultProjects();
  },

  saveProjects(projects: ForgeXProject[]): void {
    const key = getProjectsStorageKey();
    localStorage.setItem(key, JSON.stringify(projects));
  },

  getActiveProjectId(): string | null {
    const key = getActiveProjectKey();
    return localStorage.getItem(key);
  },

  setActiveProjectId(id: string | null): void {
    const key = getActiveProjectKey();
    if (id) {
      localStorage.setItem(key, id);
    } else {
      localStorage.removeItem(key);
    }
  },

  getActiveProject(): ForgeXProject | null {
    const id = this.getActiveProjectId();
    if (!id) return null;
    const projects = this.getProjects();
    return projects.find((p) => p.id === id) || null;
  },

  createProject(params: {
    name: string;
    description: string;
    category?: string;
    contextNotes?: string;
    tags?: string[];
  }): ForgeXProject {
    const newProj: ForgeXProject = {
      id: 'proj-' + Date.now(),
      name: params.name.trim(),
      description: params.description.trim(),
      category: params.category || 'General',
      createdTime: Date.now(),
      lastActive: Date.now(),
      contextNotes: params.contextNotes || '',
      chatSessionIds: [],
      fileIds: [],
      codeSnippetIds: [],
      imageIds: [],
      researchQueries: [],
      tags: params.tags || ['Project'],
    };

    const list = this.getProjects();
    list.unshift(newProj);
    this.saveProjects(list);
    this.setActiveProjectId(newProj.id);
    return newProj;
  },

  updateProject(project: ForgeXProject): void {
    const list = this.getProjects();
    const idx = list.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      list[idx] = { ...project, lastActive: Date.now() };
      this.saveProjects(list);
    }
  },

  deleteProject(id: string): ForgeXProject[] {
    const list = this.getProjects().filter((p) => p.id !== id);
    this.saveProjects(list);
    if (this.getActiveProjectId() === id) {
      this.setActiveProjectId(list.length > 0 ? list[0].id : null);
    }
    return list;
  },

  getDefaultProjects(): ForgeXProject[] {
    return [];
  },
};
