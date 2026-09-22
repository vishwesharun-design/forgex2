import { AIAgent, AgentExecution } from '../types';
import { authService } from './authService';

function getAgentStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_agents_${userId}`;
}

function getExecutionStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_agent_executions_${userId}`;
}

export const PRESET_AGENTS: AIAgent[] = [
  {
    id: 'agent-research',
    name: 'Nexus Research Specialist',
    role: 'Research Agent',
    description: 'Autonomous research operative with deep query synthesis, source verification, and systematic citation compilation.',
    avatarIcon: 'Compass',
    systemPrompt: 'You are an advanced Autonomous Research Agent. Investigate subjects comprehensively, evaluate multi-source evidence, uncover subtle correlations, and deliver rigorous, cited briefing papers.',
    enabledTools: ['web_search', 'doc_reader'],
    temperature: 0.3,
    capabilities: ['Deep Web Crawl', 'Cross-Citation Synthesis', 'Fact Grounding', 'Executive Briefings'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'agent-coding',
    name: 'Quantum Coder Pro',
    role: 'Coding Agent',
    description: 'Full-stack software architect specialized in clean TypeScript, algorithmic optimization, bug fixes, and system design.',
    avatarIcon: 'Code2',
    systemPrompt: 'You are a Principal Software Engineering Agent. Deliver production-ready code with complete type safety, modular architecture, unit tests, and performance considerations.',
    enabledTools: ['code_executor', 'doc_reader'],
    temperature: 0.2,
    capabilities: ['Architecture Design', 'Syntax Correction', 'Algorithm Optimization', 'Refactoring Engine'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'agent-marketing',
    name: 'Growth Catalyst',
    role: 'Marketing Agent',
    description: 'Strategic growth & content architect for viral copy, go-to-market strategies, campaign analytics, and SEO optimization.',
    avatarIcon: 'Sparkles',
    systemPrompt: 'You are a Senior Growth & Marketing AI Agent. Craft persuasive messaging, customer psychology frameworks, brand positioning, and high-conversion copy.',
    enabledTools: ['web_search', 'visual_designer'],
    temperature: 0.7,
    capabilities: ['Viral Content Strategy', 'GTM Planning', 'Audience Segmentation', 'Conversion Copywriting'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'agent-data',
    name: 'Sigma Data Analyst',
    role: 'Data Analyst',
    description: 'Statistical reasoning engine for uncovering trends, distributions, variance anomalies, and generating actionable visualizations.',
    avatarIcon: 'BarChart3',
    systemPrompt: 'You are a Senior Quantitative Data Analyst. Analyze metrics, compute statistical significance, explain correlations, and recommend data-driven actions.',
    enabledTools: ['data_cruncher', 'code_executor'],
    temperature: 0.2,
    capabilities: ['Descriptive Statistics', 'Anomaly Detection', 'Trend Forecasting', 'Correlation Matrices'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'agent-study',
    name: 'Athena Study Mentor',
    role: 'Study Agent',
    description: 'Pedagogical tutor creating personalized curriculums, flashcards, conceptual analogies, and Socratic review questions.',
    avatarIcon: 'BookOpen',
    systemPrompt: 'You are a Master Academic Tutor. Break complex theories into first-principles intuition, use vivid analogies, and test comprehension interactively.',
    enabledTools: ['doc_reader', 'web_search'],
    temperature: 0.4,
    capabilities: ['Feynman Technique', 'Cornell Notes', 'Quiz Generation', 'Active Recall Systems'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'agent-web-builder',
    name: 'Vortex Site Builder',
    role: 'Website Builder',
    description: 'Web developer agent that drafts complete modern web apps, landing pages, responsive Tailwind layouts, and interactive UI.',
    avatarIcon: 'Layout',
    systemPrompt: 'You are an Elite Frontend Web Developer. Output clean, modular HTML5, modern Tailwind CSS, and reactive components with refined micro-interactions.',
    enabledTools: ['code_executor', 'visual_designer'],
    temperature: 0.4,
    capabilities: ['Tailwind Component Systems', 'Responsive UI/UX', 'Landing Page Wireframes', 'Interactive Demos'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
];

export const agentService = {
  getAgents(): AIAgent[] {
    try {
      const key = getAgentStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_agents');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(key, legacy);
        }
      }
      if (stored) {
        const parsed: AIAgent[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge presets that might not be in custom list
          const customIds = new Set(parsed.map((a) => a.id));
          const missingPresets = PRESET_AGENTS.filter((p) => !customIds.has(p.id));
          return [...parsed, ...missingPresets];
        }
      }
    } catch (_e) {
      // fallback
    }
    return PRESET_AGENTS;
  },

  saveAgents(agents: AIAgent[]): void {
    const key = getAgentStorageKey();
    localStorage.setItem(key, JSON.stringify(agents));
  },

  saveCustomAgent(agent: AIAgent): void {
    const list = this.getAgents();
    const idx = list.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      list[idx] = agent;
    } else {
      list.unshift(agent);
    }
    this.saveAgents(list);
  },

  deleteAgent(id: string): AIAgent[] {
    const list = this.getAgents().filter((a) => a.id !== id);
    this.saveAgents(list);
    return list;
  },

  getExecutions(): AgentExecution[] {
    try {
      const key = getExecutionStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_agent_executions');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(key, legacy);
        }
      }
      return stored ? JSON.parse(stored) : [];
    } catch (_e) {
      return [];
    }
  },

  saveExecution(exec: AgentExecution): void {
    const key = getExecutionStorageKey();
    const list = this.getExecutions();
    list.unshift(exec);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  },

  async runAgentTask(
    agent: AIAgent,
    taskPrompt: string,
    onStepUpdate?: (stepTitle: string) => void
  ): Promise<AgentExecution> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';
    if (onStepUpdate) onStepUpdate('Assembling agent tools and initial plan...');

    const res = await fetch('/api/agent-run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        agent,
        taskPrompt,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Agent execution failed.');
    }

    const data = await res.json();

    const execution: AgentExecution = {
      id: 'exec-' + Date.now(),
      agentId: agent.id,
      taskPrompt,
      status: 'completed',
      steps: data.steps || [],
      finalResponse: data.response || '',
      timestamp: Date.now(),
    };

    this.saveExecution(execution);
    return execution;
  },
};
