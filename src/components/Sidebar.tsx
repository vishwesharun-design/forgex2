import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Plus, 
  MessageSquare, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music,
  Compass, 
  Code2, 
  FileText, 
  Bot, 
  Globe, 
  PenTool, 
  Presentation, 
  LayoutDashboard, 
  FolderKanban, 
  Mic, 
  Settings as SettingsIcon, 
  User as UserIcon, 
  ChevronRight, 
  ChevronDown,
  LogOut, 
  Sliders, 
  BarChart3, 
  Trash2, 
  X,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Check,
  Palette,
  Cpu,
  Wrench,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { ActiveWorkspace, ChatSession, ForgeXTheme, UserProfile } from '../types';

interface SidebarProps {
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  recentChats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onSignOut: () => void;
  user: UserProfile | null;
  theme: ForgeXTheme;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onReturnToLanding?: () => void;
  onOpenAuth?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenVoiceMode?: () => void;
}

type StudioCategory = 'all' | 'creative' | 'intelligence' | 'productivity';

interface StudioDefinition {
  id: ActiveWorkspace;
  title: string;
  category: 'creative' | 'intelligence' | 'productivity';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badge: string;
  description: string;
}

const STUDIOS: StudioDefinition[] = [
  // 1. Creative Studios
  {
    id: 'image',
    title: 'Image Studio',
    category: 'creative',
    icon: ImageIcon,
    accentColor: 'text-amber-400',
    badge: 'Visuals',
    description: 'Text-to-image generator with styles & aspect ratios',
  },
  {
    id: 'music',
    title: 'Make Song',
    category: 'creative',
    icon: Music,
    accentColor: 'text-yellow-400',
    badge: 'Audio Synth',
    description: 'Web Audio polyphonic synthesizer & song lyrics generator',
  },

  // 2. Intelligence Studios
  {
    id: 'chat',
    title: 'ForgeX Chat',
    category: 'intelligence',
    icon: MessageSquare,
    accentColor: 'text-amber-400',
    badge: 'Assistant',
    description: 'Multi-turn conversational reasoning with markdown & code',
  },
  {
    id: 'search',
    title: 'Web Search',
    category: 'intelligence',
    icon: Globe,
    accentColor: 'text-blue-400',
    badge: 'Grounding',
    description: 'Google search grounding with verified live sources',
  },
  {
    id: 'research',
    title: 'Deep Research',
    category: 'intelligence',
    icon: Compass,
    accentColor: 'text-cyan-400',
    badge: 'Investigate',
    description: 'Autonomous multi-query web analysis & executive synthesis',
  },
  {
    id: 'agents',
    title: 'AI Agents',
    category: 'intelligence',
    icon: Bot,
    accentColor: 'text-teal-400',
    badge: 'Autonomous',
    description: 'Multi-agent goal swarms & tool orchestration',
  },

  // 3. Productivity & Dev Studios
  {
    id: 'code',
    title: 'Code Studio',
    category: 'productivity',
    icon: Code2,
    accentColor: 'text-emerald-400',
    badge: 'Dev Sandbox',
    description: 'Polyglot coding sandbox with refactoring & execution',
  },
  {
    id: 'files',
    title: 'Document AI',
    category: 'productivity',
    icon: FileText,
    accentColor: 'text-green-400',
    badge: 'Docs & Quiz',
    description: 'Document intelligence, auto-summaries & interactive quizzes',
  },
  {
    id: 'writing',
    title: 'Writing Studio',
    category: 'productivity',
    icon: PenTool,
    accentColor: 'text-violet-400',
    badge: 'Prose & Tone',
    description: 'Articles, essays, resumes with tone modifier & rewriter',
  },
  {
    id: 'presentation',
    title: 'Presentations',
    category: 'productivity',
    icon: Presentation,
    accentColor: 'text-orange-400',
    badge: 'Decks',
    description: 'Structured slide architect with themes & HTML export',
  },
  {
    id: 'canvas',
    title: 'AI Canvas',
    category: 'productivity',
    icon: LayoutDashboard,
    accentColor: 'text-rose-400',
    badge: 'Whiteboard',
    description: 'Infinite interactive whiteboard & mindmap node graph',
  },
  {
    id: 'projects',
    title: 'Projects',
    category: 'productivity',
    icon: FolderKanban,
    accentColor: 'text-amber-500',
    badge: 'Manager',
    description: 'Project portfolios, linked assets and task tracking',
  },
];

const CATEGORY_META = {
  creative: {
    label: 'Creative',
    icon: Palette,
    desc: 'Image & music generation',
  },
  intelligence: {
    label: 'Intelligence',
    icon: Cpu,
    desc: 'Reasoning, grounding & research',
  },
  productivity: {
    label: 'Productivity',
    icon: Wrench,
    desc: 'Code, documents, decks & canvas',
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  recentChats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenSettings,
  onOpenAccount,
  onSignOut,
  user,
  theme,
  isMobileOpen,
  onCloseMobile,
  onReturnToLanding,
  onOpenAuth,
  isCollapsed = false,
  onToggleCollapse,
  onOpenVoiceMode,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'studios' | 'chats'>('studios');
  const [selectedCategory, setSelectedCategory] = useState<StudioCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    creative: false,
    intelligence: false,
    productivity: false,
  });

  const accountRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

  const usagePercentage = user 
    ? Math.min(100, Math.round((user.creditsUsed / user.creditsLimit) * 100))
    : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  // Filter studios according to category & query
  const filteredStudios = useMemo(() => {
    return STUDIOS.filter((s) => {
      const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
      const matchesQuery = searchQuery.trim() === '' || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.badge.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  // Toggle category folding
  const toggleCategoryFold = (categoryKey: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const handleSelectStudio = (ws: ActiveWorkspace) => {
    onSelectWorkspace(ws);
    if (window.innerWidth < 768) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        id="forgex-sidebar"
        className={`fixed md:sticky top-0 left-0 h-[100dvh] z-50 md:z-20 flex flex-col transition-all duration-300 border-r ${
          isCollapsed ? 'md:w-20 w-72 max-w-[85vw]' : 'w-72 max-w-[85vw]'
        } ${
          isDark
            ? 'bg-neutral-950 border-neutral-850 text-neutral-200'
            : 'bg-neutral-50 border-neutral-200 text-neutral-800'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: ForgeX Brand & Toggle Buttons */}
        <div className={`p-3.5 flex items-center shrink-0 ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'} border-b border-neutral-800/30`}>
          <div
            onClick={onReturnToLanding}
            className="flex items-center gap-2.5 select-none cursor-pointer hover:opacity-90 transition-opacity"
            title="Return to ForgeX Landing Page"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10 shrink-0">
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg tracking-tight leading-none flex items-center">
                  Forge<span className="text-amber-400">X</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase">
                  {STUDIOS.length} AI Studios
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Minimize/Expand Toggle Button */}
            {onToggleCollapse && (
              <button
                id="btn-sidebar-toggle-collapse"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
                className={`p-1.5 rounded-lg hidden md:flex items-center justify-center transition-colors ${
                  isDark ? 'hover:bg-neutral-850 text-neutral-400 hover:text-white' : 'hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-amber-400" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className={`p-1.5 rounded-lg md:hidden ${
                isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action: + New Chat button & Voice Mode */}
        <div className={`p-3 pb-2 space-y-2 shrink-0 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          <button
            id="sidebar-btn-new-chat"
            onClick={() => {
              onNewChat();
              onSelectWorkspace('chat');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            title="New Chat Session"
            className={`${
              isCollapsed
                ? 'w-11 h-11 rounded-xl p-0 flex items-center justify-center'
                : 'w-full py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-2'
            } font-semibold text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20 active:scale-[0.98] transition-all`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>New Chat</span>}
          </button>

          {onOpenVoiceMode && (
            <button
              id="sidebar-btn-voice-mode"
              onClick={() => {
                onOpenVoiceMode();
                if (window.innerWidth < 768) onCloseMobile();
              }}
              title="Real-Time Voice Mode"
              className={`${
                isCollapsed
                  ? 'w-11 h-11 rounded-xl p-0 flex items-center justify-center'
                  : 'w-full py-1.5 px-3 rounded-xl flex items-center justify-center gap-2'
              } text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all`}
            >
              <Mic className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-400" />
              {!isCollapsed && <span>Live Voice Mode</span>}
            </button>
          )}
        </div>

        {/* Studio / Chats Tab Navigation */}
        {!isCollapsed && (
          <div className="px-3 pt-1 pb-2 shrink-0">
            <div className={`p-1 rounded-xl flex items-center gap-1 ${isDark ? 'bg-neutral-900 border border-neutral-850' : 'bg-neutral-200/70 border border-neutral-300'}`}>
              <button
                type="button"
                onClick={() => setSidebarTab('studios')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  sidebarTab === 'studios'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Studios ({STUDIOS.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarTab('chats')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  sidebarTab === 'chats'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Chats ({recentChats.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Middle Container: Never overflows or clips studios */}
        <div className={`flex-1 min-h-0 overflow-y-auto px-2.5 py-1 space-y-3 custom-scrollbar ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          
          {/* VIEW: STUDIOS TAB (OR ALWAYS IN COLLAPSED MODE) */}
          {(sidebarTab === 'studios' || isCollapsed) && (
            <>
              {/* Category Filter Pills (Expanded Mode) */}
              {!isCollapsed && (
                <div className="space-y-2 px-0.5">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {(
                      [
                        { id: 'all', label: 'All', icon: Sparkles },
                        { id: 'creative', label: 'Creative', icon: Palette },
                        { id: 'intelligence', label: 'AI Intelligence', icon: Cpu },
                        { id: 'productivity', label: 'Productivity', icon: Wrench },
                      ] as const
                    ).map((cat) => {
                      const isSel = selectedCategory === cat.id;
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id as StudioCategory)}
                          className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1.5 transition-all ${
                            isSel
                              ? 'bg-neutral-800 text-amber-400 border border-amber-500/40 shadow-sm'
                              : isDark
                                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 border border-transparent'
                          }`}
                        >
                          <CatIcon className="w-3 h-3 shrink-0" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Studio Filter Input */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Find studio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-7 pr-6 py-1 rounded-lg text-xs border focus:outline-none focus:border-amber-500 ${
                        isDark 
                          ? 'bg-neutral-900/60 border-neutral-800 text-neutral-200 placeholder-neutral-500' 
                          : 'bg-white border-neutral-200 text-neutral-900 placeholder-neutral-400'
                      }`}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Grouped Studios List */}
              {!isCollapsed ? (
                <div className="space-y-3 pt-1">
                  {(['creative', 'intelligence', 'productivity'] as const).map((catKey) => {
                    const categoryStudios = filteredStudios.filter((s) => s.category === catKey);
                    if (categoryStudios.length === 0) return null;

                    const meta = CATEGORY_META[catKey];
                    const CatIcon = meta.icon;
                    const isFolded = collapsedCategories[catKey] && selectedCategory === 'all';

                    return (
                      <div key={catKey} className="space-y-1">
                        {/* Section Header */}
                        {selectedCategory === 'all' && (
                          <button
                            type="button"
                            onClick={() => toggleCategoryFold(catKey)}
                            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-300 transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <CatIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="leading-none">{meta.label}</span>
                              <span className="text-[10px] text-neutral-500 font-mono font-normal leading-none">
                                ({categoryStudios.length})
                              </span>
                            </span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform duration-200 ${
                                isFolded ? '-rotate-90' : ''
                              }`}
                            />
                          </button>
                        )}

                        {/* Category Studios Items */}
                        {!isFolded && (
                          <div className="space-y-0.5">
                            {categoryStudios.map((studio) => {
                              const Icon = studio.icon;
                              const isSelected = activeWorkspace === studio.id;

                              return (
                                <button
                                  key={studio.id}
                                  id={`nav-workspace-${studio.id}`}
                                  onClick={() => handleSelectStudio(studio.id)}
                                  title={studio.description}
                                  className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2.5 transition-all group ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80 ring-1 ring-amber-500/20'
                                        : 'bg-neutral-200 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                                      : isDark
                                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/70 border border-transparent'
                                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                    isSelected 
                                      ? 'bg-amber-500/15 border border-amber-500/30' 
                                      : isDark 
                                        ? 'bg-neutral-900 border border-neutral-800' 
                                        : 'bg-neutral-200 border border-neutral-300'
                                  }`}>
                                    <Icon className={`w-3.5 h-3.5 ${studio.accentColor}`} />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-xs truncate">{studio.title}</span>
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                        isSelected
                                          ? 'bg-amber-500/20 text-amber-400 font-semibold'
                                          : isDark
                                            ? 'text-neutral-500 bg-neutral-900'
                                            : 'text-neutral-500 bg-neutral-200'
                                      }`}>
                                        {studio.badge}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Collapsed Mode: Clean icon list with tooltips */
                <div className="flex flex-col items-center gap-1.5 py-1 w-full">
                  {(['creative', 'intelligence', 'productivity'] as const).map((catKey, idx) => {
                    const categoryStudios = STUDIOS.filter((s) => s.category === catKey);
                    return (
                      <React.Fragment key={catKey}>
                        {idx > 0 && (
                          <div className="w-6 h-px bg-neutral-800 my-1" />
                        )}
                        {categoryStudios.map((studio) => {
                          const Icon = studio.icon;
                          const isSelected = activeWorkspace === studio.id;
                          return (
                            <button
                              key={studio.id}
                              id={`nav-workspace-${studio.id}`}
                              onClick={() => handleSelectStudio(studio.id)}
                              title={`${studio.title} — ${studio.description}`}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-all ${
                                isSelected
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm'
                                  : isDark
                                    ? 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : studio.accentColor}`} />
                            </button>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Bottom Quick Link to Chats when in Studios Tab */}
              {!isCollapsed && recentChats.length > 0 && (
                <div className="pt-2">
                  <div className="border-t border-neutral-800/40 pt-2">
                    <button
                      type="button"
                      onClick={() => setSidebarTab('chats')}
                      className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs text-neutral-400 hover:text-amber-400 hover:bg-neutral-900/50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Recent Chats</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                        {recentChats.length}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW: CHATS TAB (Expanded Mode) */}
          {sidebarTab === 'chats' && !isCollapsed && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Chat Sessions
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                  {recentChats.length}
                </span>
              </div>

              {recentChats.length === 0 ? (
                <div className="px-3 py-8 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto opacity-50" />
                  <p className="text-xs text-neutral-500">No active conversations yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onNewChat();
                      onSelectWorkspace('chat');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors inline-block"
                  >
                    Start a New Chat
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentChats.map((chat) => {
                    const isSelected = activeWorkspace === 'chat' && activeChatId === chat.id;
                    return (
                      <div
                        key={chat.id}
                        className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all ${
                          isSelected
                            ? isDark
                              ? 'bg-neutral-800 text-amber-400 font-medium border border-neutral-700/80 shadow-sm'
                              : 'bg-neutral-200 text-amber-700 font-medium border border-neutral-300 shadow-sm'
                            : isDark
                              ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onSelectChat(chat.id);
                            onSelectWorkspace('chat');
                            if (window.innerWidth < 768) onCloseMobile();
                          }}
                          className="flex-1 text-left truncate pr-2 flex items-center gap-2"
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{chat.title || 'Untitled Chat'}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          title="Delete chat"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider before Settings & Account */}
        <div className="px-3 shrink-0">
          <div className={`h-px w-full ${isDark ? 'bg-neutral-800/80' : 'bg-neutral-200'}`} />
        </div>

        {/* Bottom Sidebar: Settings, then Account */}
        <div className={`p-2.5 space-y-1 shrink-0 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Settings button */}
          <button
            id="sidebar-btn-settings"
            onClick={onOpenSettings}
            title="Settings & Preferences"
            className={`${
              isCollapsed ? 'w-10 h-10 justify-center' : 'w-full px-3 py-2 gap-3'
            } flex items-center rounded-xl text-xs font-medium transition-all ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-900/70'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <SettingsIcon className="w-4 h-4 text-neutral-400 shrink-0" />
            {!isCollapsed && <span>Settings & Studio Config</span>}
          </button>

          {/* Account section at bottom */}
          {user ? (
            <div ref={accountRef} className="relative w-full">
              <button
                id="sidebar-btn-account"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                title={user.name}
                className={`${
                  isCollapsed ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full p-2 justify-between'
                } flex items-center rounded-xl text-left transition-all ${
                  isDark
                    ? 'hover:bg-neutral-900/80 text-neutral-300'
                    : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-semibold text-xs shrink-0">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {user.name}
                      </p>
                      <p className={`text-[10px] truncate ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                        {user.email}
                      </p>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${accountMenuOpen ? 'rotate-90' : ''}`} />
                )}
              </button>

              {/* Account Popover Menu */}
              {accountMenuOpen && (
                <div
                  id="menu-account-popover"
                  className={`absolute bottom-full left-0 mb-2 w-64 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
                      : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
                  }`}
                >
                  {/* AI Usage Indicator Component */}
                  <div
                    className={`p-3 rounded-xl border mb-2 ${
                      isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Studio Usage
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400">
                        {user.creditsUsed} / {user.creditsLimit}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>

                    <p className="text-[10px] text-neutral-500 mt-1.5 text-right font-mono">
                      {Math.round((user.creditsUsed / user.creditsLimit) * 100)}% monthly quota
                    </p>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenAccount();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                        isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Profile & Account</span>
                    </button>

                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenSettings();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                        isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Preferences</span>
                    </button>

                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenAccount();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                        isDark ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Credits Overview</span>
                    </button>

                    <div className={`my-1 h-px ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />

                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              id="sidebar-btn-signin"
              onClick={onOpenAuth}
              title="Sign In / Register"
              className={`${
                isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full p-2 justify-center gap-2'
              } flex items-center rounded-xl font-semibold text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm shadow-amber-500/20`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Sign In / Register</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
