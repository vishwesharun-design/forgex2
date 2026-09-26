import { AIAgent, AgentExecution, AgentChatMessage, ActionConfirmationRequest } from '../types';
import { authService } from './authService';

function getAgentStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_user_created_agents_v3_${partition}`;
}

function getExecutionStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_agent_executions_v3_${partition}`;
}

function getChatStorageKey(agentId: string): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_agent_chat_v3_${agentId}_${partition}`;
}

// Strictly NO sample/preset agents - only user-created agents are allowed
export const PRESET_AGENTS: AIAgent[] = [];

export const agentService = {
  getAgents(): AIAgent[] {
    try {
      const key = getAgentStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Strictly return only user-created agents, never sample or preset agents
          return parsed.filter((a) => a.isCustom === true && !a.id.startsWith('preset-'));
        }
      }
    } catch (_e) {
      // fallback
    }
    return [];
  },

  saveAgents(agents: AIAgent[]): void {
    const key = getAgentStorageKey();
    localStorage.setItem(key, JSON.stringify(agents));
  },

  saveCustomAgent(agent: AIAgent): void {
    const list = this.getAgents();
    const idx = list.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      list[idx] = { ...agent, updatedAt: Date.now() };
    } else {
      list.unshift(agent);
    }
    this.saveAgents(list);
  },

  duplicateAgent(id: string): AIAgent | null {
    const list = this.getAgents();
    const target = list.find((a) => a.id === id);
    if (!target) return null;

    const copy: AIAgent = {
      ...target,
      id: 'custom-' + Date.now(),
      name: `${target.name} (Copy)`,
      isCustom: true,
      createdAt: Date.now(),
    };
    this.saveCustomAgent(copy);
    return copy;
  },

  toggleAgentStatus(id: string): AIAgent[] {
    const list = this.getAgents().map((a) => {
      if (a.id === id) {
        return { ...a, isActive: !a.isActive };
      }
      return a;
    });
    this.saveAgents(list);
    return list;
  },

  deleteAgent(id: string): AIAgent[] {
    const list = this.getAgents().filter((a) => a.id !== id);
    this.saveAgents(list);
    this.clearChatHistory(id);
    return list;
  },

  // Conversation History Per Agent
  getChatHistory(agentId: string, agentName: string = 'Agent'): AgentChatMessage[] {
    try {
      const key = getChatStorageKey(agentId);
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_e) {}

    // Default welcoming message for newly created agent
    return [
      {
        id: `msg-init-${agentId}`,
        role: 'assistant',
        content: `**${agentName}** online and ready for mission assignment.\n\nWhat directive should I execute? (e.g. open browser, manage files, run code, or search the web)`,
        timestamp: Date.now(),
      },
    ];
  },

  saveChatHistory(agentId: string, messages: AgentChatMessage[]): void {
    try {
      const key = getChatStorageKey(agentId);
      localStorage.setItem(key, JSON.stringify(messages.slice(-60)));
    } catch (_e) {}
  },

  clearChatHistory(agentId: string): void {
    try {
      const key = getChatStorageKey(agentId);
      localStorage.removeItem(key);
    } catch (_e) {}
  },

  getExecutions(): AgentExecution[] {
    try {
      const key = getExecutionStorageKey();
      const stored = localStorage.getItem(key);
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

  clearExecutions(): void {
    const key = getExecutionStorageKey();
    localStorage.removeItem(key);
  },

  // Real tool-calling agent chat & execution pipeline
  async sendAgentMessage(
    agent: AIAgent,
    message: string,
    history: AgentChatMessage[] = [],
    confirmAction?: { actionId: string; toolName: string; parameters: Record<string, any>; confirmed: boolean },
    onStepUpdate?: (step: string) => void
  ): Promise<{
    reply: string;
    steps: any[];
    actionLogs: string[];
    requiresConfirmation?: ActionConfirmationRequest;
    openBrowser?: boolean;
    browserUrl?: string;
  }> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';
    if (onStepUpdate) onStepUpdate('Mission Control: Initializing telemetry & tool verification...');

    const res = await fetch('/api/agent-run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        agent,
        taskPrompt: message,
        history: history.slice(-10),
        confirmAction,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Agent mission execution failed.');
    }

    const data = await res.json();

    const execution: AgentExecution = {
      id: 'exec-' + Date.now(),
      agentId: agent.id,
      taskPrompt: message,
      status: data.requiresConfirmation ? 'awaiting_confirmation' : 'completed',
      steps: data.steps || [],
      actionLogs: data.actionLogs || [],
      finalResponse: data.response || '',
      requiresConfirmation: data.requiresConfirmation,
      timestamp: Date.now(),
    };

    this.saveExecution(execution);

    return {
      reply: data.response || '',
      steps: data.steps || [],
      actionLogs: data.actionLogs || [],
      requiresConfirmation: data.requiresConfirmation,
      openBrowser: Boolean(data.openBrowser),
      browserUrl: data.browserUrl || 'https://www.google.com',
    };
  },

  // Backward compatibility alias
  async runAgentTask(
    agent: AIAgent,
    taskPrompt: string,
    onStepUpdate?: (stepTitle: string) => void
  ): Promise<AgentExecution> {
    const result = await this.sendAgentMessage(agent, taskPrompt, [], undefined, onStepUpdate);
    return {
      id: 'exec-' + Date.now(),
      agentId: agent.id,
      taskPrompt,
      status: result.requiresConfirmation ? 'awaiting_confirmation' : 'completed',
      steps: result.steps,
      actionLogs: result.actionLogs,
      finalResponse: result.reply,
      requiresConfirmation: result.requiresConfirmation,
      timestamp: Date.now(),
    };
  },
};
