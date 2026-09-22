import { ForgeXProject } from '../types';

const STORAGE_KEY_PROJECTS = 'forgex_projects';
const ACTIVE_PROJECT_KEY = 'forgex_active_project_id';

export const projectService = {
  getProjects(): ForgeXProject[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {
      // fallback
    }
    return this.getDefaultProjects();
  },

  saveProjects(projects: ForgeXProject[]): void {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  },

  getActiveProjectId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  },

  setActiveProjectId(id: string | null): void {
    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
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
    return [
      {
        id: 'proj-roblox',
        name: 'My Roblox Game',
        description: 'Multiplayer adventure obby with Lua scripting, custom badges, and responsive camera physics.',
        category: 'Game Development',
        createdTime: Date.now() - 1000 * 60 * 60 * 48,
        lastActive: Date.now() - 1000 * 60 * 30,
        contextNotes: 'Game Title: Cyber Odyssey Obby\nEngine: Roblox Studio\nLanguage: Luau\nTarget Audience: 9-16\nKey Mechanics: Double-jump checkpoints, laser grid hazards, coin multipliers.',
        chatSessionIds: [],
        fileIds: [],
        codeSnippetIds: [],
        imageIds: [],
        researchQueries: ['Roblox Luau optimal collision loops'],
        tags: ['Roblox', 'Gaming', 'Luau'],
      },
      {
        id: 'proj-website',
        name: 'My Website',
        description: 'Modern portfolio and product storefront built with React, Tailwind CSS, and full-stack API integration.',
        category: 'Web Development',
        createdTime: Date.now() - 1000 * 60 * 60 * 72,
        lastActive: Date.now() - 1000 * 60 * 120,
        contextNotes: 'Stack: React 19, Tailwind CSS v4, Vite\nVisual Style: Sleek dark theme, amber accents, accessible typography\nPages: Home, Features, Showcase, Contact',
        chatSessionIds: [],
        fileIds: [],
        codeSnippetIds: [],
        imageIds: [],
        researchQueries: ['Tailwind CSS high-performance animations'],
        tags: ['Web', 'React', 'Frontend'],
      },
      {
        id: 'proj-school',
        name: 'School Project',
        description: 'Comprehensive research paper and presentation deck exploring renewable energy and solar storage cells.',
        category: 'Education',
        createdTime: Date.now() - 1000 * 60 * 60 * 96,
        lastActive: Date.now() - 1000 * 60 * 300,
        contextNotes: 'Subject: Physics & Environmental Science\nTopic: Perovskite Solar Cells Efficiency\nDeliverables: 10-page report, 8-slide presentation deck, comparative dataset.',
        chatSessionIds: [],
        fileIds: [],
        codeSnippetIds: [],
        imageIds: [],
        researchQueries: ['Perovskite solar efficiency benchmarks 2026'],
        tags: ['School', 'Science', 'Research'],
      },
    ];
  },
};
