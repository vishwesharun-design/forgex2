import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Rocket,
  Mail,
  FolderGit2,
  Folder,
  Globe,
  Compass,
  Code2,
  Terminal,
  Cpu,
  Monitor,
  Play,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  Sliders,
  Settings2,
  Shield,
  Layers,
  Search,
  X,
  RotateCcw,
  AlertTriangle,
  Check,
  Copy,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  ShieldAlert,
  ArrowLeft,
  Radio,
  HardDrive,
  Send,
  FileCode,
  FileText,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Plus,
  Maximize2,
  RotateCw,
  Laptop,
} from 'lucide-react';
import {
  AIAgent,
  AgentExecution,
  AgentChatMessage,
  AgentCategory,
  AgentToolType,
  AgentPermissions,
  ActionConfirmationRequest,
  ForgeXTheme,
  ForgeXModelId,
} from '../types';
import { agentService } from '../services/agentService';
import { TOOL_REGISTRY, ToolDefinition } from '../services/agentToolRegistry';
import { ModelSelector } from './ModelSelector';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AgentBrowser } from './AgentBrowser';

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
  // Navigation / View Modes: 'dashboard' | 'mission_chat' | 'browser_viewport'
  const [viewMode, setViewMode] = useState<'dashboard' | 'mission_chat' | 'browser_viewport'>('dashboard');

  // Agent State: Strictly ONLY user-created agents
  const [agents, setAgents] = useState<AIAgent[]>(() => agentService.getAgents());
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    const list = agentService.getAgents();
    return list.length > 0 ? list[0].id : '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const activeAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  // Chat State
  const [chatMessages, setChatMessages] = useState<AgentChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeStepText, setActiveStepText] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState<ActionConfirmationRequest | null>(null);

  // Live Browser Popup/Widget State
  const [activeBrowserUrl, setActiveBrowserUrl] = useState<string>('https://www.google.com');
  const [isLiveBrowserOpen, setIsLiveBrowserOpen] = useState(false);

  // Side Drawer in Mission Chat
  const [sideDrawerTab, setSideDrawerTab] = useState<'none' | 'permissions' | 'files'>('none');
  const [sandboxFiles, setSandboxFiles] = useState<Array<{ name: string; isDirectory: boolean; extension: string; sizeBytes: number }>>([]);
  const [sandboxFolder, setSandboxFolder] = useState('/Downloads');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Agent Modal: Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<AgentCategory>('General Assistant');
  const [formIcon, setFormIcon] = useState('Rocket');
  const [formDescription, setFormDescription] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formMemory, setFormMemory] = useState('');
  const [formTools, setFormTools] = useState<string[]>([]);
  const [formPermissions, setFormPermissions] = useState<AgentPermissions>({
    browser: true,
    webSearch: true,
    files: true,
    email: true,
    computerControl: true,
    codeExecution: true,
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Dedicated in-app Agent Deletion Confirmation Modal
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null);

  // Sync agents when modified
  const refreshAgents = (preferredSelectedId?: string) => {
    const list = agentService.getAgents();
    setAgents(list);
    if (list.length === 0) {
      setSelectedAgentId('');
      setViewMode('dashboard');
    } else {
      const targetId = preferredSelectedId || selectedAgentId;
      if (targetId && list.some((a) => a.id === targetId)) {
        setSelectedAgentId(targetId);
      } else {
        setSelectedAgentId(list[0].id);
      }
    }
  };

  // Load chat history when switching agents
  useEffect(() => {
    if (activeAgent) {
      const history = agentService.getChatHistory(activeAgent.id, activeAgent.name);
      setChatMessages(history);
      setPendingConfirmation(null);
    } else {
      setChatMessages([]);
    }
  }, [selectedAgentId, agents.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isExecuting, activeStepText]);

  // Load sandbox files
  const loadSandboxFiles = async (folder: string = '/Downloads') => {
    setIsLoadingFiles(true);
    setSandboxFolder(folder);
    try {
      const res = await fetch(`/api/agent/sandbox-files?path=${encodeURIComponent(folder)}`);
      if (res.ok) {
        const data = await res.json();
        setSandboxFiles(data.files || []);
      }
    } catch (_err) {
      setSandboxFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const getAgentIconComponent = (iconName: string, role?: string, className: string = 'w-5 h-5') => {
    const key = iconName || role || '';
    if (key.includes('Mail') || key.includes('Email')) return <Mail className={className} />;
    if (key.includes('Folder') || key.includes('File')) return <FolderGit2 className={className} />;
    if (key.includes('Globe') || key.includes('Browser')) return <Globe className={className} />;
    if (key.includes('Compass') || key.includes('Research')) return <Compass className={className} />;
    if (key.includes('Code') || key.includes('Coding')) return <Code2 className={className} />;
    if (key.includes('Cpu') || key.includes('Computer')) return <Cpu className={className} />;
    if (key.includes('Terminal')) return <Terminal className={className} />;
    if (key.includes('Rocket')) return <Rocket className={className} />;
    return <Bot className={className} />;
  };

  // Quick Mission Starters per Agent Role
  const getPromptStarters = (agent: AIAgent): string[] => {
    switch (agent.role) {
      case 'File Manager Agent':
        return [
          'Organize my Downloads folder.',
          'List files in /Downloads and identify file types.',
          'Create a "Projects" folder in /Documents.',
        ];
      case 'Email Agent':
        return [
          'Send an email to John saying the meeting is tomorrow at 5 PM.',
          'Search emails for "telemetry" in my inbox.',
          'Draft an email confirming tomorrow\'s mission briefing.',
        ];
      case 'Browser Agent':
        return [
          'Open browser on my laptop and search for latest AI news.',
          'Open Google on my laptop to find high-performance laptops.',
          'Open browser to https://en.wikipedia.org/wiki/SpaceX_Starship on my laptop.',
        ];
      case 'Coding Agent':
        return [
          'Write and run a fast prime-number generator in JavaScript.',
          'Execute a test script calculating escape velocity in km/s.',
          'Run console command: node -v && uptime',
        ];
      case 'Computer Agent':
        return [
          'Run console command: uptime && uname -a',
          'Inspect mission computer telemetry and system resources.',
          'List files in /Downloads.',
        ];
      default:
        return [
          'Open browser and search for NVIDIA news.',
          'Organize my Downloads folder.',
          'Run console command: echo "Mission telemetry nominal"',
          'Send an email to John saying the meeting is tomorrow at 5 PM.',
        ];
    }
  };

  // Dispatch Mission Task
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !activeAgent || isExecuting) return;

    if (!activeAgent.isActive) {
      alert(`Agent "${activeAgent.name}" is currently inactive. Please toggle its status to Active.`);
      return;
    }

    const userMessage: AgentChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory);
    agentService.saveChatHistory(activeAgent.id, newHistory);
    setInputMessage('');
    setIsExecuting(true);
    setActiveStepText('Mission Control: Initializing telemetry & executing action...');

    try {
      const result = await agentService.sendAgentMessage(
        activeAgent,
        text,
        newHistory,
        undefined,
        (step) => setActiveStepText(step)
      );

      const assistantMessage: AgentChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
        actionLogs: result.actionLogs,
        requiresConfirmation: result.requiresConfirmation,
        openBrowser: result.openBrowser,
        browserUrl: result.browserUrl,
      };

      const updatedHistory = [...newHistory, assistantMessage];
      setChatMessages(updatedHistory);
      agentService.saveChatHistory(activeAgent.id, updatedHistory);

      if (result.requiresConfirmation) {
        setPendingConfirmation(result.requiresConfirmation);
      }

      // If browser action was requested, launch on user's laptop (not inside the agent's UI)
      if (result.openBrowser) {
        const urlToOpen = result.browserUrl || 'https://www.google.com';
        setActiveBrowserUrl(urlToOpen);
        setIsLiveBrowserOpen(false);
        // Automatically attempt to launch browser tab on the user's laptop
        try {
          const win = window.open(urlToOpen, '_blank', 'noopener,noreferrer');
          if (!win || win.closed || typeof win.closed === 'undefined') {
            console.log('Automated popup intercepted by laptop browser; direct card provided.');
          }
        } catch (popupErr) {
          console.warn('Direct popup launch error:', popupErr);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const errorMessage: AgentChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Mission Exception Encountered**:\n${msg}`,
        timestamp: Date.now(),
        actionLogs: [`✗ Operation failed: ${msg}`],
      };
      const updatedHistory = [...newHistory, errorMessage];
      setChatMessages(updatedHistory);
      agentService.saveChatHistory(activeAgent.id, updatedHistory);
    } finally {
      setIsExecuting(false);
      setActiveStepText('');
    }
  };

  // User authorizes sensitive action (e.g. sending email, deleting file)
  const handleConfirmAction = async (confirmed: boolean) => {
    if (!pendingConfirmation || !activeAgent) return;

    if (!confirmed) {
      const abortMsg: AgentChatMessage = {
        id: `abort-${Date.now()}`,
        role: 'assistant',
        content: `🛑 **Mission Action Aborted**: The sensitive action **${pendingConfirmation.title}** was aborted.`,
        timestamp: Date.now(),
        actionLogs: [`✗ User aborted action: ${pendingConfirmation.title}`],
      };
      const updated = [...chatMessages, abortMsg];
      setChatMessages(updated);
      agentService.saveChatHistory(activeAgent.id, updated);
      setPendingConfirmation(null);
      return;
    }

    setIsExecuting(true);
    setActiveStepText(`Executing authorized action: ${pendingConfirmation.toolName}...`);

    try {
      const result = await agentService.sendAgentMessage(
        activeAgent,
        `Authorize and execute ${pendingConfirmation.toolName}`,
        chatMessages,
        {
          actionId: pendingConfirmation.actionId,
          toolName: pendingConfirmation.toolName,
          parameters: pendingConfirmation.parameters,
          confirmed: true,
        },
        (step) => setActiveStepText(step)
      );

      const confirmNotice: AgentChatMessage = {
        id: `conf-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
        actionLogs: result.actionLogs,
      };

      const updated = [...chatMessages, confirmNotice];
      setChatMessages(updated);
      agentService.saveChatHistory(activeAgent.id, updated);
      setPendingConfirmation(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Authorization execution failed: ${msg}`);
    } finally {
      setIsExecuting(false);
      setActiveStepText('');
    }
  };

  // Agent Creation / Edit Form Handlers
  const handleOpenCreateModal = () => {
    setEditingAgentId(null);
    setFormName('');
    setFormRole('General Assistant');
    setFormIcon('Rocket');
    setFormDescription('');
    setFormPrompt('You are an autonomous AI agent in the Agent Lab. Execute real actions using your authorized tools.');
    setFormMemory('');
    setFormTools([
      'web_search',
      'browser_open',
      'browser_read',
      'browser_search',
      'file_list',
      'file_read',
      'file_create',
      'file_organize',
      'email_search',
      'email_draft',
      'email_send',
      'code_execute',
      'computer_action',
    ]);
    setFormPermissions({
      browser: true,
      webSearch: true,
      files: true,
      email: true,
      computerControl: true,
      codeExecution: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (agent: AIAgent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingAgentId(agent.id);
    setFormName(agent.name);
    setFormRole(agent.role);
    setFormIcon(agent.avatarIcon || 'Bot');
    setFormDescription(agent.description);
    setFormPrompt(agent.systemPrompt);
    setFormMemory(agent.memory || '');
    setFormTools(agent.enabledTools || []);
    setFormPermissions(agent.permissions || {
      browser: true,
      webSearch: true,
      files: true,
      email: true,
      computerControl: true,
      codeExecution: true,
    });
    setIsModalOpen(true);
  };

  const handleSaveAgentForm = () => {
    if (!formName.trim()) return;

    if (editingAgentId) {
      const existing = agents.find((a) => a.id === editingAgentId);
      if (existing) {
        const updatedAgent: AIAgent = {
          ...existing,
          name: formName.trim(),
          role: formRole,
          avatarIcon: formIcon,
          description: formDescription.trim() || `Configured ${formRole}`,
          systemPrompt: formPrompt.trim() || 'Execute assigned goals with real tools.',
          memory: formMemory.trim(),
          enabledTools: formTools,
          permissions: formPermissions,
          updatedAt: Date.now(),
        };
        agentService.saveCustomAgent(updatedAgent);
        refreshAgents();
      }
    } else {
      const newAgent: AIAgent = {
        id: `custom-${Date.now()}`,
        name: formName.trim(),
        role: formRole,
        avatarIcon: formIcon,
        description: formDescription.trim() || `Autonomous operative configured with ${formTools.length} tools.`,
        systemPrompt: formPrompt.trim() || 'Execute assigned goals with real tools.',
        memory: formMemory.trim(),
        enabledTools: formTools,
        permissions: formPermissions,
        temperature: 0.3,
        isActive: true,
        isCustom: true,
        capabilities: ['Custom Directives', 'Autonomous Tool Calling', 'Mission Telemetry'],
        createdAt: Date.now(),
      };
      agentService.saveCustomAgent(newAgent);
      refreshAgents();
      setSelectedAgentId(newAgent.id);
      setViewMode('mission_chat');
    }

    setIsModalOpen(false);
  };

  const handleDuplicateAgent = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const dup = agentService.duplicateAgent(id);
    if (dup) {
      refreshAgents();
      setSelectedAgentId(dup.id);
    }
  };

  const handleToggleStatus = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    agentService.toggleAgentStatus(id);
    refreshAgents();
  };

  const handleOpenDeleteConfirm = (agent: AIAgent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAgentToDelete(agent);
  };

  const handleConfirmDelete = () => {
    if (!agentToDelete) return;
    const idToDelete = agentToDelete.id;
    agentService.deleteAgent(idToDelete);
    setAgentToDelete(null);
    if (isModalOpen && editingAgentId === idToDelete) {
      setIsModalOpen(false);
      setEditingAgentId(null);
    }
    const remaining = agentService.getAgents();
    setAgents(remaining);
    if (remaining.length === 0) {
      setSelectedAgentId('');
      setViewMode('dashboard');
    } else if (selectedAgentId === idToDelete) {
      setSelectedAgentId(remaining[0].id);
    }
  };

  const handleDeleteAgent = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = agents.find((a) => a.id === id);
    if (target) {
      handleOpenDeleteConfirm(target, e);
    }
  };

  // Filter agents for dashboard
  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === 'all' ||
      (selectedCategoryFilter === 'active' && a.isActive) ||
      a.role.toLowerCase().includes(selectedCategoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`h-full flex flex-col font-sans select-none overflow-hidden ${
      isDark ? 'bg-[#090b10] text-neutral-100' : 'bg-neutral-50 text-neutral-900'
    }`}>
      {/* ========================================================================= */}
      {/* 1. AEROSPACE MISSION CONTROL TOP BAR */}
      {/* ========================================================================= */}
      <div className={`px-4 sm:px-6 py-2.5 sm:py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
        isDark ? 'border-neutral-800 bg-neutral-950/90' : 'border-neutral-200 bg-white shadow-xs'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'
            }`}>
              <Rocket className="w-5 h-5" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-neutral-950"></span>
            </span>
          </div>

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-display font-bold tracking-tight uppercase flex items-center gap-1.5 text-left">
                <span>AI Agents</span>
                <span className={`text-[11px] font-mono lowercase tracking-normal font-normal ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}>
                  beta
                </span>
              </h1>
            </div>
            <div className={`flex items-center gap-2 text-[10px] sm:text-[11px] font-mono mt-0.5 ${
              isDark ? 'text-neutral-400' : 'text-neutral-600 font-semibold'
            }`}>
              <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <Radio className="w-2.5 h-2.5 animate-pulse" /> RUNTIME: NOMINAL
              </span>
              <span>•</span>
              <span className="hidden sm:inline">TOOL CALLING: ACTIVE</span>
              <span className="hidden sm:inline">•</span>
              <span className={isDark ? 'text-amber-400 font-semibold' : 'text-amber-800 font-bold'}>
                {agents.length} AGENT{agents.length === 1 ? '' : 'S'} CREATED
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher & Global Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className={`p-1 rounded-xl border flex items-center gap-1 text-xs font-semibold ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-300'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'dashboard'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Agents Roster ({agents.length})</span>
            </button>
            <button
              type="button"
              disabled={agents.length === 0}
              onClick={() => setViewMode('mission_chat')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                viewMode === 'mission_chat'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Mission Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('browser_viewport')}
              className={`hidden md:flex px-3 py-1.5 rounded-lg items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'browser_viewport'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Browser Viewport</span>
            </button>
          </div>

          {/* + Create Agent Prominent Action Button */}
          <button
            type="button"
            id="btn-create-agent-lab"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Agent</span>
          </button>

          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
            useShortName={true}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT STAGE */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIEW 1: AGENTS ROSTER DASHBOARD */}
        {viewMode === 'dashboard' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Header / Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div>
                <h2 className={`text-lg font-display font-bold tracking-tight flex items-center gap-2 ${
                  isDark ? 'text-neutral-100' : 'text-neutral-900'
                }`}>
                  <span>Custom Operatives</span>
                  <span className={`text-xs font-mono font-normal ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    ({filteredAgents.length} created)
                  </span>
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>
                  Create your own independent AI agents equipped with real browser navigation, filesystem tools, emails, and code execution.
                </p>
              </div>

              {agents.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search your agents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* If zero agents created yet, show pristine Create Agent invitation */}
            {agents.length === 0 ? (
              <div className={`my-auto py-16 px-6 max-w-xl mx-auto rounded-3xl border text-center flex flex-col items-center justify-center space-y-5 ${
                isDark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-white shadow-sm'
              }`}>
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border shadow-lg ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-800'
                }`}>
                  <Rocket className="w-8 h-8" />
                </div>

                <div className="space-y-1.5 text-center">
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    No Agents Created Yet
                  </h3>
                  <p className={`text-xs max-w-md mx-auto leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-700 font-medium'}`}>
                    Create your first AI agent. Customize its name, personality, and choose the real tools it can use (Browser, Files, Email, Code Execution, and Web Search).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Your First Agent</span>
                </button>
              </div>
            ) : (
              /* Agent Grid Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgentId === agent.id;
                  return (
                    <div
                      key={agent.id}
                      id={`agent-card-${agent.id}`}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setViewMode('mission_chat');
                      }}
                      className={`group relative rounded-2xl border p-4.5 transition-all cursor-pointer flex flex-col justify-between text-left ${
                        isSelected
                          ? isDark
                            ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10'
                            : 'border-amber-500 bg-amber-50/60 shadow-sm'
                          : isDark
                          ? 'border-neutral-800 bg-neutral-900/70 hover:border-amber-500/40 hover:bg-neutral-900'
                          : 'border-neutral-200 bg-white hover:border-amber-500/40 shadow-xs hover:shadow-sm'
                      }`}
                    >
                      <div className="text-left">
                        {/* Top Card Bar: Icon, Name, Active Toggle */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                              agent.isActive
                                ? isDark
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                  : 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 border-neutral-300 dark:border-neutral-700'
                            }`}>
                              {getAgentIconComponent(agent.avatarIcon, agent.role, 'w-5 h-5')}
                            </div>
                            <div className="min-w-0 text-left">
                              <h3 className={`text-sm font-bold truncate transition-colors ${
                                isDark ? 'text-white group-hover:text-amber-400' : 'text-neutral-900 group-hover:text-amber-800'
                              }`}>
                                {agent.name}
                              </h3>
                              <span className={`text-[10px] font-mono font-bold block truncate ${
                                isDark ? 'text-amber-400' : 'text-amber-800'
                              }`}>
                                {agent.role}
                              </span>
                            </div>
                          </div>

                          {/* Active/Inactive Toggle Pill */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(agent.id, e)}
                            title={`Toggle ${agent.isActive ? 'Inactive' : 'Active'}`}
                            className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 border transition-colors ${
                              agent.isActive
                                ? isDark
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : isDark
                                ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                                : 'bg-neutral-200 text-neutral-700 border-neutral-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${agent.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                            <span className="text-[9px]">{agent.isActive ? 'ACTIVE' : 'IDLE'}</span>
                          </button>
                        </div>

                        {/* Description */}
                        <p className={`text-xs mt-3 line-clamp-2 leading-relaxed text-left ${
                          isDark ? 'text-neutral-300' : 'text-neutral-700 font-medium'
                        }`}>
                          {agent.description}
                        </p>

                        {/* Enabled Tools Badges */}
                        <div className="mt-3.5 space-y-1.5 text-left">
                          <span className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${
                            isDark ? 'text-neutral-400' : 'text-neutral-700'
                          }`}>
                            Armed Tools ({agent.enabledTools.length})
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                            {agent.enabledTools.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-medium ${
                                  isDark
                                    ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                                    : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                                }`}
                              >
                                {t}
                              </span>
                            ))}
                            {agent.enabledTools.length > 4 && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                                isDark
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                +{agent.enabledTools.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Quick Actions */}
                      <div className={`mt-5 pt-3 border-t flex items-center justify-between gap-2 ${
                        isDark ? 'border-neutral-800' : 'border-neutral-200'
                      }`}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(agent, e)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-black'
                            }`}
                            title="Configure Agent & Permissions"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDuplicateAgent(agent.id, e)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-amber-300' : 'hover:bg-neutral-100 text-neutral-600 hover:text-amber-800'
                            }`}
                            title="Duplicate Agent"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAgent(agent.id, e)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-red-400' : 'hover:bg-neutral-100 text-neutral-600 hover:text-red-600'
                            }`}
                            title="Delete Agent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAgentId(agent.id);
                            setViewMode('mission_chat');
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                            isDark
                              ? 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border-amber-500/30'
                              : 'bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-black border-amber-300'
                          }`}
                        >
                          <span>Open Chat</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DEDICATED MISSION CHAT CONSOLE */}
        {viewMode === 'mission_chat' && (
          <div className="flex-1 flex overflow-hidden">
            {!activeAgent ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Bot className="w-12 h-12 text-neutral-400" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  No Agent Selected
                </h3>
                <p className={`text-xs max-w-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Create an agent from the roster to start chatting and executing tasks.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs"
                >
                  Create Agent
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Active Agent Sub-Header with telemetry controls */}
                <div className={`px-4 sm:px-6 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 ${
                  isDark ? 'border-neutral-800 bg-neutral-950/80' : 'border-neutral-200 bg-white shadow-xs'
                }`}>
                  <div className="flex items-center gap-3 min-w-0 text-left">
                    <button
                      type="button"
                      onClick={() => setViewMode('dashboard')}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isDark ? 'border-neutral-800 hover:bg-neutral-850 text-neutral-300' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-800'
                      }`}
                      title="Back to Agent Roster"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-800'
                    }`}>
                      {getAgentIconComponent(activeAgent.avatarIcon, activeAgent.role, 'w-4 h-4')}
                    </div>

                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h2 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                          {activeAgent.name}
                        </h2>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                          isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {activeAgent.role}
                        </span>
                      </div>
                      <p className={`text-[11px] truncate text-left ${isDark ? 'text-neutral-400' : 'text-neutral-700 font-medium'}`}>
                        {activeAgent.enabledTools.length} tools armed • {activeAgent.description}
                      </p>
                    </div>
                  </div>

                  {/* Side Drawer & Quick Tools Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveBrowserOpen(!isLiveBrowserOpen);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isLiveBrowserOpen
                          ? 'border-amber-500 bg-amber-500 text-black font-bold'
                          : isDark
                          ? 'border-neutral-800 text-neutral-300 hover:text-white'
                          : 'border-neutral-300 text-neutral-800 hover:bg-neutral-100'
                      }`}
                      title="Open Live Browser Viewport"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Live Browser</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSideDrawerTab(sideDrawerTab === 'permissions' ? 'none' : 'permissions');
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        sideDrawerTab === 'permissions'
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400 font-bold'
                          : isDark
                          ? 'border-neutral-800 text-neutral-400 hover:text-white'
                          : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tools</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (sideDrawerTab !== 'files') loadSandboxFiles('/Downloads');
                        setSideDrawerTab(sideDrawerTab === 'files' ? 'none' : 'files');
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        sideDrawerTab === 'files'
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400 font-bold'
                          : isDark
                          ? 'border-neutral-800 text-neutral-400 hover:text-white'
                          : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Files</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(activeAgent)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDark ? 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900' : 'border-neutral-200 text-neutral-600 hover:text-black hover:bg-neutral-100'
                      }`}
                      title={`Configure ${activeAgent.name}`}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        agentService.clearChatHistory(activeAgent.id);
                        setChatMessages(agentService.getChatHistory(activeAgent.id, activeAgent.name));
                      }}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDark ? 'border-neutral-800 text-neutral-400 hover:text-amber-400 hover:bg-neutral-900' : 'border-neutral-200 text-neutral-600 hover:text-amber-700 hover:bg-neutral-100'
                      }`}
                      title="Clear Conversation History"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id="btn-delete-active-agent"
                      onClick={() => handleOpenDeleteConfirm(activeAgent)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isDark
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/15'
                          : 'border-red-300 text-red-600 hover:bg-red-50'
                      }`}
                      title={`Delete ${activeAgent.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete Agent</span>
                    </button>
                  </div>
                </div>

                {/* Chat Messages Stream */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-left">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-4xl mx-auto w-full`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1 text-left">
                        <span className={`text-[10px] font-mono font-bold ${
                          isDark ? 'text-neutral-400' : 'text-neutral-700'
                        }`}>
                          {msg.role === 'user' ? 'MISSION COMMAND (YOU)' : activeAgent.name}
                        </span>
                        <span className={`text-[9px] font-mono ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`rounded-2xl p-4 sm:p-5 text-xs leading-relaxed max-w-2xl sm:max-w-3xl text-left ${
                          msg.role === 'user'
                            ? 'bg-amber-500 text-neutral-950 font-medium shadow-sm'
                            : isDark
                            ? 'bg-neutral-900/90 border border-neutral-800 text-neutral-100'
                            : 'bg-white border border-neutral-300 text-neutral-900 shadow-xs'
                        }`}
                      >
                        {/* Real Action Logs Box if present */}
                        {msg.actionLogs && msg.actionLogs.length > 0 && (
                          <div className={`mb-3 p-3 rounded-xl border font-mono text-[11px] space-y-1 text-left ${
                            isDark ? 'bg-black/60 border-neutral-800 text-neutral-200' : 'bg-neutral-100 border-neutral-300 text-neutral-900'
                          }`}>
                            <div className="flex items-center justify-between text-[10px] font-bold border-b pb-1 mb-1 border-neutral-300 dark:border-neutral-800">
                              <span className={`flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                                <Terminal className="w-3 h-3" /> EXECUTED ACTION LOGS
                              </span>
                              <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                REAL EXECUTION
                              </span>
                            </div>
                            {msg.actionLogs.map((log, i) => (
                              <div key={i} className="text-left font-mono">
                                {log}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Main Message Markdown */}
                        <div className={`text-left ${
                          msg.role === 'user'
                            ? 'text-neutral-950 font-medium'
                            : isDark
                            ? 'text-neutral-100'
                            : 'text-neutral-900 font-normal'
                        }`}>
                          <MarkdownRenderer
                            content={msg.content}
                            theme={isDark ? 'dark' : 'light'}
                            className={msg.role === 'user' ? 'text-neutral-950 font-medium' : isDark ? 'text-neutral-100' : 'text-neutral-950 font-medium'}
                          />
                        </div>

                        {/* Dedicated Laptop Browser Action Card */}
                        {msg.browserUrl && (
                          <div className={`mt-3 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-left shadow-sm ${
                            isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-100' : 'bg-amber-50 border-amber-300 text-neutral-900'
                          }`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-xs text-neutral-950">
                                <Laptop className="w-5 h-5 stroke-[2.5]" />
                              </div>
                              <div className="min-w-0 text-left">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] uppercase font-black tracking-wider block font-mono px-2 py-0.5 rounded-full ${
                                    isDark ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30' : 'bg-amber-200 text-amber-950 font-bold'
                                  }`}>
                                    💻 Laptop Browser Action
                                  </span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                    isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-800 bg-emerald-100'
                                  }`}>
                                    Dispatched to laptop
                                  </span>
                                </div>
                                <span className={`text-xs font-mono font-bold truncate block mt-1 ${isDark ? 'text-white' : 'text-neutral-950'}`}>
                                  {msg.browserUrl}
                                </span>
                                <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                                  Opening directly on your laptop in a new tab. If popups are restricted, click Open on Laptop:
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={msg.browserUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  window.open(msg.browserUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer no-underline"
                              >
                                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                                <span>Open on Laptop ↗</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.browserUrl || '');
                                  alert('Target URL copied to clipboard: ' + msg.browserUrl);
                                }}
                                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  isDark ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200' : 'border-neutral-300 hover:bg-neutral-200 text-neutral-800 bg-white'
                                }`}
                                title="Copy URL"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Copy</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* SENSITIVE MISSION CONFIRMATION PANEL */}
                  {pendingConfirmation && (
                    <div className={`max-w-2xl mx-auto rounded-2xl border-2 p-5 space-y-3 shadow-lg text-left ${
                      isDark
                        ? 'border-amber-500/80 bg-amber-500/10 text-neutral-100'
                        : 'border-amber-500 bg-amber-50 text-neutral-900'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-amber-500 animate-bounce" />
                          <h4 className={`text-sm font-bold uppercase tracking-wider ${
                            isDark ? 'text-amber-400' : 'text-amber-900'
                          }`}>
                            Mission Authorization Required
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30 font-bold">
                          CONFIRMATION NEEDED
                        </span>
                      </div>

                      <p className={`text-xs leading-relaxed text-left ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                        {pendingConfirmation.description}
                      </p>

                      <div className={`p-2.5 rounded-xl font-mono text-[11px] text-left ${
                        isDark ? 'bg-black/60 text-neutral-300' : 'bg-neutral-200/70 text-neutral-900'
                      }`}>
                        <div><strong className={isDark ? 'text-amber-300' : 'text-amber-900'}>Target Tool:</strong> {pendingConfirmation.toolName}</div>
                        <div><strong className={isDark ? 'text-amber-300' : 'text-amber-900'}>Parameters:</strong> {JSON.stringify(pendingConfirmation.parameters)}</div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmAction(false)}
                          className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                            isDark ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' : 'border-neutral-300 hover:bg-neutral-200 text-neutral-800'
                          }`}
                        >
                          Abort Action
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmAction(true)}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Authorize & Dispatch</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Live Working Indicator */}
                  {isExecuting && (
                    <div className={`max-w-2xl mx-auto rounded-2xl border p-4 flex items-center gap-3 text-left ${
                      isDark ? 'border-amber-500/40 bg-amber-500/5' : 'border-amber-400 bg-amber-50'
                    }`}>
                      <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
                      <div className="text-left">
                        <p className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                          Agent executing real tool...
                        </p>
                        <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>
                          {activeStepText || 'Autonomous action in progress'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Mission Task Dispatch Bar */}
                <div className={`p-4 border-t text-left ${
                  isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'
                }`}>
                  {/* Quick Task Prompt Chips */}
                  <div className="max-w-4xl mx-auto mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className={`text-[10px] font-mono uppercase font-bold shrink-0 flex items-center gap-1 mr-1 ${
                      isDark ? 'text-amber-400' : 'text-amber-800'
                    }`}>
                      <Sparkles className="w-3 h-3" /> Quick Directives:
                    </span>
                    {getPromptStarters(activeAgent).map((starter, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isExecuting}
                        onClick={() => handleSendMessage(starter)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 transition-colors disabled:opacity-40 text-left ${
                          isDark
                            ? 'border-neutral-800 hover:border-amber-500/40 bg-neutral-900/60 text-neutral-300 hover:text-white'
                            : 'border-neutral-300 hover:border-amber-500/40 bg-neutral-100 text-neutral-800 hover:text-black font-medium'
                        }`}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>

                  {/* Text Input & Dispatch Button */}
                  <div className="max-w-4xl mx-auto flex items-center gap-2">
                    <input
                      id="agent-chat-input"
                      type="text"
                      placeholder={`Direct ${activeAgent.name}... (e.g. "Open browser and search for latest NVIDIA news" or "Organize my Downloads folder")`}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
                      className={`flex-1 px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
                        isDark
                          ? 'bg-neutral-900 border-neutral-800 text-neutral-100 placeholder-neutral-500'
                          : 'bg-neutral-100 border-neutral-300 text-neutral-900 placeholder-neutral-500 font-medium'
                      }`}
                    />

                    <button
                      id="btn-dispatch-mission"
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={isExecuting || !inputMessage.trim()}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm shadow-amber-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 fill-current" />
                      <span>Dispatch</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Right Side Drawer (Permissions / Files) */}
            {sideDrawerTab !== 'none' && activeAgent && (
              <div className={`w-80 border-l flex flex-col shrink-0 overflow-hidden text-left ${
                isDark ? 'border-neutral-800 bg-neutral-950/95' : 'border-neutral-200 bg-neutral-50'
              }`}>
                <div className={`p-3 border-b flex items-center justify-between ${
                  isDark ? 'border-neutral-800' : 'border-neutral-200'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${
                    isDark ? 'text-amber-400' : 'text-amber-900'
                  }`}>
                    {sideDrawerTab === 'permissions' ? <Shield className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
                    {sideDrawerTab === 'permissions' ? 'Tools & Permissions' : 'Sandbox Files'}
                  </span>
                  <button
                    onClick={() => setSideDrawerTab('none')}
                    className={`p-1 rounded ${isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {sideDrawerTab === 'permissions' && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-left">
                    <div>
                      <h4 className={`font-semibold mb-2 ${isDark ? 'text-neutral-300' : 'text-neutral-800'}`}>
                        Permissions
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(activeAgent.permissions || {}).map(([key, val]) => (
                          <div
                            key={key}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'
                            }`}
                          >
                            <span className="font-mono capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                              val
                                ? isDark
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : isDark
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-red-100 text-red-900 border border-red-300'
                            }`}>
                              {val ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className={`font-semibold mb-2 ${isDark ? 'text-neutral-300' : 'text-neutral-800'}`}>
                        Armed Tools ({activeAgent.enabledTools.length})
                      </h4>
                      <div className="space-y-1.5">
                        {activeAgent.enabledTools.map((t) => {
                          const def = TOOL_REGISTRY[t];
                          return (
                            <div
                              key={t}
                              className={`p-2 rounded-xl border text-[11px] text-left ${
                                isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                                  {def?.label || t}
                                </span>
                                {def?.isSensitive && (
                                  <span className={`text-[9px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                                    CONFIRM REQ
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                {def?.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {sideDrawerTab === 'files' && (
                  <div className="flex-1 flex flex-col overflow-hidden p-3 text-xs text-left">
                    <div className={`flex items-center gap-1 pb-2 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                      <button
                        onClick={() => loadSandboxFiles('/Downloads')}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-bold ${
                          sandboxFolder === '/Downloads'
                            ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-200 text-amber-900'
                            : isDark ? 'text-neutral-400' : 'text-neutral-700'
                        }`}
                      >
                        /Downloads
                      </button>
                      <button
                        onClick={() => loadSandboxFiles('/Documents')}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-bold ${
                          sandboxFolder === '/Documents'
                            ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-200 text-amber-900'
                            : isDark ? 'text-neutral-400' : 'text-neutral-700'
                        }`}
                      >
                        /Documents
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pt-2 space-y-1">
                      {isLoadingFiles ? (
                        <div className="py-8 text-center text-neutral-500">Loading filesystem...</div>
                      ) : sandboxFiles.length === 0 ? (
                        <div className="py-8 text-center text-neutral-500">Folder is empty.</div>
                      ) : (
                        sandboxFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {file.isDirectory ? (
                                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                              )}
                              <span className="truncate font-mono">{file.name}</span>
                            </div>
                            <span className={`text-[10px] font-mono shrink-0 ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                              {file.isDirectory ? 'DIR' : `${Math.round(file.sizeBytes / 1024) || 1} KB`}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: FULL LIVE BROWSER VIEWPORT */}
        {viewMode === 'browser_viewport' && (
          <div className="flex-1 flex flex-col overflow-hidden text-left">
            <AgentBrowser
              isDark={isDark}
              theme={theme}
              agentName={activeAgent?.name || 'Agent'}
              initialUrl={activeBrowserUrl}
              onSendToChat={onSendToChat}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. AGENT CREATION / CONFIGURATION MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden text-left ${
            isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900 shadow-2xl'
          }`}>
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isDark ? 'border-neutral-800' : 'border-neutral-200'
            }`}>
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-amber-500" />
                <h3 className={`text-base font-display font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  <span>{editingAgentId ? 'Configure Agent' : 'Create New AI Agent'}</span>
                  <span className={`text-[11px] font-mono lowercase tracking-normal font-normal ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}>
                    beta
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded-lg ${isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-600 hover:text-black hover:bg-neutral-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs text-left">
              {/* Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-800'}`}>
                    Agent Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Browser Bot or File Ops"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-800'}`}>
                    Role / Category
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as AgentCategory)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  >
                    <option value="Browser Agent">Browser Agent (Navigates websites & searches)</option>
                    <option value="File Manager Agent">File Manager Agent (Organizes files & folders)</option>
                    <option value="Email Agent">Email Agent (Manages emails & drafts)</option>
                    <option value="Coding Agent">Coding Agent (Writes & executes code)</option>
                    <option value="Computer Agent">Computer Agent (Controlled environment tasks)</option>
                    <option value="Research Agent">Research Agent (Web search & dossiers)</option>
                    <option value="General Assistant">General Assistant (Multi-tool master)</option>
                    <option value="Custom Agent">Custom Agent</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="text-left">
                <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-800'}`}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Navigates websites, opens links, searches for news and summaries."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                  }`}
                />
              </div>

              {/* System Instructions / Directives */}
              <div className="text-left">
                <label className={`block font-semibold mb-1 ${isDark ? 'text-neutral-400' : 'text-neutral-800'}`}>
                  Instructions / Personality
                </label>
                <textarea
                  rows={3}
                  placeholder="Define how this agent reasons and uses its tools..."
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 font-mono text-[11px] ${
                    isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                  }`}
                />
              </div>

              {/* Permissions Toggles */}
              <div className="text-left">
                <label className={`block font-semibold mb-1.5 ${isDark ? 'text-neutral-400' : 'text-neutral-800'}`}>
                  Permissions Section
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(formPermissions) as Array<keyof AgentPermissions>).map((permKey) => {
                    const isAllowed = formPermissions[permKey];
                    return (
                      <button
                        key={permKey}
                        type="button"
                        onClick={() =>
                          setFormPermissions((prev) => ({
                            ...prev,
                            [permKey]: !prev[permKey],
                          }))
                        }
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-colors ${
                          isAllowed
                            ? isDark
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                              : 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                            : isDark
                            ? 'border-neutral-800 bg-neutral-900 text-neutral-400'
                            : 'border-neutral-300 bg-neutral-100 text-neutral-800 font-medium'
                        }`}
                      >
                        <span className="font-mono text-[11px] capitalize">{permKey.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-bold text-[10px] font-mono">{isAllowed ? 'ON' : 'OFF'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Choose Tools */}
              <div className="text-left">
                <label className={`block font-semibold mb-1.5 ${isDark ? 'text-neutral-400' : 'text-neutral-800'}`}>
                  Select Armed Tools ({formTools.length} enabled)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1">
                  {Object.values(TOOL_REGISTRY).map((tool) => {
                    const isChecked = formTools.includes(tool.name);
                    return (
                      <button
                        key={tool.name}
                        type="button"
                        onClick={() =>
                          setFormTools((prev) =>
                            prev.includes(tool.name)
                              ? prev.filter((t) => t !== tool.name)
                              : [...prev, tool.name]
                          )
                        }
                        className={`p-2 rounded-xl border text-left text-[11px] transition-all ${
                          isChecked
                            ? isDark
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                              : 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                            : isDark
                            ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
                            : 'bg-white border-neutral-300 text-neutral-900 font-medium'
                        }`}
                      >
                        <div className="truncate font-semibold">{tool.label}</div>
                        <div className={`text-[9px] font-mono truncate ${isDark ? 'text-neutral-400' : 'text-neutral-700'}`}>
                          {tool.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-between gap-2 ${
              isDark ? 'border-neutral-800' : 'border-neutral-200 bg-neutral-50'
            }`}>
              <div>
                {editingAgentId && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = agents.find((a) => a.id === editingAgentId);
                      if (target) {
                        handleOpenDeleteConfirm(target);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Agent</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                    isDark ? 'border-neutral-800 hover:bg-neutral-850 text-neutral-300' : 'border-neutral-300 hover:bg-neutral-200 text-neutral-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAgentForm}
                  disabled={!formName.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold disabled:opacity-40 shadow-sm cursor-pointer"
                >
                  {editingAgentId ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DEDICATED IN-APP DELETE AGENT CONFIRMATION MODAL (NO WINDOW.CONFIRM) */}
      {agentToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 text-left animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight">Delete AI Agent?</h3>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Permanent removal from your roster
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border mb-5 text-xs ${
              isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}>
              <div className="flex items-center gap-2.5 font-bold mb-1">
                {getAgentIconComponent(agentToDelete.avatarIcon, agentToDelete.role, 'w-4 h-4')}
                <span className="truncate">{agentToDelete.name}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-normal border ${
                  isDark ? 'border-neutral-700 text-neutral-400' : 'border-neutral-300 text-neutral-600'
                }`}>
                  {agentToDelete.role}
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed mt-2 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Are you sure you want to permanently delete this agent? All chat messages, custom system directives, and armed tool telemetry associated with &quot;{agentToDelete.name}&quot; will be permanently erased.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAgentToDelete(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  isDark
                    ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-agent"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-500/25 cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Agent</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
