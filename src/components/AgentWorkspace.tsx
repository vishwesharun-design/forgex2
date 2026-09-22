import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Compass,
  Code2,
  Sparkles,
  BarChart3,
  BookOpen,
  Layout,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  Sliders,
  Terminal,
  Settings2,
  Shield,
  Layers,
  Search,
  Cpu,
  X
} from 'lucide-react';
import { AIAgent, AgentExecution, ForgeXTheme, ForgeXModelId, AgentCategory, AgentToolType } from '../types';
import { agentService, PRESET_AGENTS } from '../services/agentService';
import { ModelSelector } from './ModelSelector';

interface AgentWorkspaceProps {
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSelectModel: (id: ForgeXModelId) => void;
  onSendToChat?: (text: string) => void;
}

export const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({
  isDark,
  theme,
  selectedModelId,
  onSelectModel,
  onSendToChat,
}) => {
  const [agents, setAgents] = useState<AIAgent[]>(() => agentService.getAgents());
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => agents[0]?.id || 'agent-research');
  const [taskPrompt, setTaskPrompt] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeStepText, setActiveStepText] = useState<string>('');
  const [currentExecution, setCurrentExecution] = useState<AgentExecution | null>(null);
  const [executions, setExecutions] = useState<AgentExecution[]>(() => agentService.getExecutions());

  // Custom Agent Creation Modal
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AgentCategory>('Custom Agent');
  const [newPrompt, setNewPrompt] = useState('');
  const [newTools, setNewTools] = useState<AgentToolType[]>(['web_search', 'code_executor']);

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const getAgentIcon = (role: string) => {
    switch (role) {
      case 'Research Agent':
        return <Compass className="w-5 h-5 text-blue-400" />;
      case 'Coding Agent':
        return <Code2 className="w-5 h-5 text-emerald-400" />;
      case 'Marketing Agent':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'Data Analyst':
        return <BarChart3 className="w-5 h-5 text-amber-400" />;
      case 'Study Agent':
        return <BookOpen className="w-5 h-5 text-indigo-400" />;
      case 'Website Builder':
        return <Layout className="w-5 h-5 text-pink-400" />;
      default:
        return <Bot className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleRunTask = async () => {
    if (!taskPrompt.trim() || !activeAgent || isExecuting) return;

    setIsExecuting(true);
    setCurrentExecution(null);

    try {
      const exec = await agentService.runAgentTask(activeAgent, taskPrompt, (step) => {
        setActiveStepText(step);
      });
      setCurrentExecution(exec);
      setExecutions(agentService.getExecutions());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCurrentExecution({
        id: 'exec-err-' + Date.now(),
        agentId: activeAgent.id,
        taskPrompt,
        status: 'error',
        steps: [
          {
            id: 'err-1',
            title: 'Execution Interrupted',
            status: 'failed',
            detail: msg,
          },
        ],
        finalResponse: `Agent encountered an issue: ${msg}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsExecuting(false);
      setActiveStepText('');
    }
  };

  const handleSaveCustomAgent = () => {
    if (!newName.trim()) return;
    const newAgent: AIAgent = {
      id: 'custom-' + Date.now(),
      name: newName.trim(),
      role: newRole,
      description: `Autonomous specialist configured with ${newTools.length} tools.`,
      avatarIcon: 'Bot',
      systemPrompt: newPrompt.trim() || 'You are an autonomous AI specialist dedicated to quality solutions.',
      enabledTools: newTools,
      temperature: 0.7,
      isCustom: true,
      capabilities: ['Custom Instructions', 'Autonomous Tool Calling', 'Synthesis'],
      createdAt: Date.now(),
    };
    agentService.saveCustomAgent(newAgent);
    const updated = agentService.getAgents();
    setAgents(updated);
    setSelectedAgentId(newAgent.id);
    setIsCreatingModalOpen(false);
    setNewName('');
    setNewPrompt('');
  };

  const handleDeleteAgent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = agentService.deleteAgent(id);
    setAgents(updated);
    if (selectedAgentId === id && updated.length > 0) {
      setSelectedAgentId(updated[0].id);
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {/* Header */}
      <div className={`px-6 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
              Autonomous AI Agents
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Multi-Step Reasoning
              </span>
            </h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Deploy goal-oriented autonomous operatives equipped with custom tools, memory, and execution pipelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="create-custom-agent-btn"
            onClick={() => setIsCreatingModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Agent</span>
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
        {/* Left Agent Directory */}
        <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-neutral-850 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-100/50'}`}>
          <div className="p-3 border-b border-neutral-800/40 flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Agent Roster ({agents.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {agents.map((agent) => {
              const isSelected = selectedAgentId === agent.id;
              const isCustom = !PRESET_AGENTS.some((p) => p.id === agent.id);
              return (
                <div
                  key={agent.id}
                  id={`agent-card-${agent.id}`}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : isDark
                      ? 'border-neutral-850 hover:border-neutral-800 bg-neutral-900/70'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-center shrink-0">
                        {getAgentIcon(agent.role)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold leading-tight">{agent.name}</h4>
                        <span className="text-[10px] text-amber-400 font-semibold">{agent.role}</span>
                      </div>
                    </div>
                    {isCustom && (
                      <button
                        onClick={(e) => handleDeleteAgent(agent.id, e)}
                        className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                        title="Delete custom agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className={`text-[11px] mt-2 line-clamp-2 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {agent.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {agent.enabledTools.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-300 border border-neutral-700/60"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Agent Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active Agent Banner */}
          {activeAgent && (
            <div className={`p-5 border-b flex items-start justify-between gap-4 ${isDark ? 'border-neutral-850 bg-neutral-900/30' : 'border-neutral-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  {getAgentIcon(activeAgent.role)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold">{activeAgent.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      ACTIVE OPERATIVE
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {activeAgent.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {activeAgent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Task Output / History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isExecuting ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-amber-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-amber-400">Agent Executing Pipeline</h3>
                  <p className="text-xs text-neutral-400">{activeStepText || 'Autonomous reasoning in progress...'}</p>
                </div>
              </div>
            ) : currentExecution ? (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Task Objective Badge */}
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-neutral-900/60 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Assigned Task</span>
                  <p className="text-xs font-semibold mt-1">{currentExecution.taskPrompt}</p>
                </div>

                {/* Multi-Step Pipeline Tracking */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Execution Pipeline</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {currentExecution.steps.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          step.status === 'completed'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : step.status === 'failed'
                            ? 'border-red-500/40 bg-red-500/10 text-red-300'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{step.title}</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Deliverable Content */}
                <div className={`p-6 rounded-2xl border space-y-3 ${isDark ? 'bg-neutral-900/40 border-neutral-850' : 'bg-white border-neutral-200'}`}>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800/60">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Final Deliverable</span>
                    {onSendToChat && currentExecution.finalResponse && (
                      <button
                        onClick={() => onSendToChat(`[Agent: ${activeAgent.name}]\n${(currentExecution.finalResponse || '').slice(0, 1500)}`)}
                        className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Send to Chat</span>
                      </button>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-neutral-200">
                    {currentExecution.finalResponse}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <Bot className="w-12 h-12 text-neutral-500 opacity-40" />
                <h3 className="text-sm font-bold text-neutral-300">Ready for Agent Assignment</h3>
                <p className="text-xs text-neutral-500 max-w-md">
                  Assign a complex goal, coding task, research topic, or data directive to{' '}
                  <span className="text-amber-400 font-semibold">{activeAgent.name}</span> below.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Task Assignment Input Bar */}
          <div className={`p-4 border-t ${isDark ? 'border-neutral-850 bg-neutral-950/80' : 'border-neutral-200 bg-white'}`}>
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <input
                id="agent-task-input"
                type="text"
                placeholder={`Instruct ${activeAgent.name} (e.g. "Research and synthesize the top 3 architectural patterns for real-time webapps...")`}
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunTask();
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-neutral-100 placeholder-neutral-500'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-900 placeholder-neutral-400'
                }`}
              />

              <button
                id="agent-dispatch-btn"
                type="button"
                onClick={handleRunTask}
                disabled={isExecuting || !taskPrompt.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Dispatch Agent</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Agent Creation Modal */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 ${isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/40">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                Create Custom AI Agent
              </h3>
              <button
                onClick={() => setIsCreatingModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-neutral-400">Agent Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cyber Security Auditor"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-neutral-400">Role / Domain</label>
                <input
                  type="text"
                  placeholder="e.g. Security Specialist"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AgentCategory)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-neutral-400">System Directives & Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Define how this agent should reason, analyze tasks, and construct outputs..."
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-neutral-400">Enabled Capabilities & Tools</label>
                <div className="flex flex-wrap gap-2">
                  {(['web_search', 'code_executor', 'data_cruncher', 'doc_reader', 'visual_designer'] as AgentToolType[]).map((t) => {
                    const isChecked = newTools.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setNewTools((prev) =>
                            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/40">
              <button
                type="button"
                onClick={() => setIsCreatingModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomAgent}
                disabled={!newName.trim()}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold disabled:opacity-40"
              >
                Save & Deploy Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
