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
  Database,
  Sparkles,
  Search,
  Check,
  Palette,
  Cpu,
  Wrench,
  Sparkles as SparklesIcon,
  Headphones,
  PanelLeftClose,
  PanelLeftOpen,
  Crown,
  Gamepad2,
  Flame,
  Rocket,
  Layers,
  Wand2,
} from 'lucide-react';
import { ActiveWorkspace, ChatSession, ForgeXTheme, UserProfile } from '../types';
import { ForgeXLogo } from './ForgeXLogo';
import { studioService, StudioCatalogueItem } from '../services/studioService';

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
  onOpenStudioStore?: () => void;
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
  {
    id: 'spotify',
    title: 'Music Player',
    category: 'creative',
    icon: Headphones,
    accentColor: 'text-emerald-400',
    badge: 'Real Audio',
    description: 'Listen to real songs: Interstellar, Levitating, categories, Spotify links & player',
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
    accentColor: 'text-amber-400',
    badge: 'beta',
    description: 'Autonomous tool-using bots, laptop browser launch & terminal logistics',
  },
  {
    id: 'data_analysis',
    title: 'Data Analysis',
    category: 'intelligence',
    icon: BarChart3,
    accentColor: 'text-amber-400',
    badge: 'BI & Stats',
    description: 'Upload CSV/JSON for automated stats, anomalies, and reports',
  },
  {
    id: 'vault',
    title: 'Knowledge Vault',
    category: 'intelligence',
    icon: Database,
    accentColor: 'text-amber-400',
    badge: 'Vault RAG',
    description: 'Private document knowledge base & grounding vault for AI',
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
  onOpenStudioStore,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  
  // Dynamic Studios tracking from studioService
  const [activeStudioIds, setActiveStudioIds] = useState<string[]>(() => studioService.getActiveStudioIds());
  const [allStudios, setAllStudios] = useState<StudioCatalogueItem[]>(() => studioService.getAllStudios());

  useEffect(() => {
    const handleStudiosUpdated = () => {
      setActiveStudioIds(studioService.getActiveStudioIds());
      setAllStudios(studioService.getAllStudios());
    };
    window.addEventListener('forgex_studios_updated', handleStudiosUpdated);
    return () => window.removeEventListener('forgex_studios_updated', handleStudiosUpdated);
  }, []);

  useEffect(() => {
    if (!isCollapsed) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHoverExpanded(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const activeStudios = useMemo(() => {
    return allStudios.filter((s) => activeStudioIds.includes(s.id));
  }, [allStudios, activeStudioIds]);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDark = theme === 'dark';

  // Compact rail only when collapsed on desktop and not currently hovered or open on mobile
  const isCompact = isCollapsed && !isHoverExpanded && !isMobileOpen;

  const usagePercentage = user 
    ? Math.min(100, Math.round((user.creditsUsed / user.creditsLimit) * 100))
    : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
        if (isCollapsed) {
          setIsHoverExpanded(false);
        }
      }
    };
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen, isCollapsed]);

  const handleSelectStudio = (ws: ActiveWorkspace) => {
    if (ws !== 'chat' && !user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    onSelectWorkspace(ws);
    if (window.innerWidth < 768) onCloseMobile();
  };

  const handleRemoveStudio = (studioId: string) => {
    if (studioId === 'chat') return;
    const updated = studioService.removeStudioFromSidebar(studioId);
    setActiveStudioIds(updated);
    if (activeWorkspace === studioId) {
      onSelectWorkspace('chat');
    }
  };

  const handlePinOrCollapse = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (isCollapsed) {
      setIsHoverExpanded(false);
      onToggleCollapse?.();
    } else if (onToggleCollapse) {
      setIsHoverExpanded(false);
      onToggleCollapse();
    } else if (onReturnToLanding) {
      onReturnToLanding();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md md:hidden animate-in fade-in"
        />
      )}

      {/* Desktop Layout Slot + Floating Hover Glassy Sidebar */}
      <div
        className={`shrink-0 relative z-50 md:z-40 md:h-[100dvh] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCollapsed ? 'md:w-[88px] w-0' : 'md:w-[292px] w-0'
        }`}
      >
        {/* Main Hover Glassy Screen Container */}
        <aside
          id="forgex-sidebar"
          onMouseEnter={() => {
            if (isCollapsed && !isHoverExpanded) {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              hoverTimeoutRef.current = setTimeout(() => {
                setIsHoverExpanded(true);
                hoverTimeoutRef.current = null;
              }, 3000);
            }
          }}
          onMouseLeave={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            if (isCollapsed && !accountMenuOpen) setIsHoverExpanded(false);
          }}
          className={`fixed md:absolute top-0 md:top-3 left-0 md:left-3 h-[100dvh] md:h-[calc(100dvh-1.5rem)] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:rounded-3xl border backdrop-blur-2xl backdrop-saturate-150 ${
            isCompact ? 'md:w-[68px] w-72 max-w-[85vw]' : 'md:w-[272px] w-72 max-w-[85vw]'
          } ${
            isDark
              ? `bg-neutral-900/55 hover:bg-neutral-900/68 border-white/15 ring-1 ring-inset ring-white/10 text-neutral-100 ${
                  isHoverExpanded
                    ? 'shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85),0_0_32px_-8px_rgba(245,158,11,0.16)]'
                    : 'shadow-[0_16px_48px_-12px_rgba(0,0,0,0.75)] md:hover:-translate-y-0.5 md:hover:shadow-[0_22px_56px_-12px_rgba(0,0,0,0.85)]'
                }`
              : `bg-white/65 hover:bg-white/78 border-white/80 ring-1 ring-inset ring-white/90 text-neutral-800 ${
                  isHoverExpanded
                    ? 'shadow-[0_24px_64px_-12px_rgba(15,23,42,0.22),0_0_28px_-8px_rgba(245,158,11,0.18)]'
                    : 'shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14),0_4px_16px_-4px_rgba(15,23,42,0.06)] md:hover:-translate-y-0.5 md:hover:shadow-[0_20px_50px_-12px_rgba(15,23,42,0.2)]'
                }`
          } ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {/* Specular Frosted Glass Sheen Layer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                isDark
                  ? 'from-white/[0.11] via-white/[0.02] to-amber-500/[0.03]'
                  : 'from-white/75 via-white/25 to-amber-500/[0.04]'
              }`}
            />
            <div
              className={`absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent ${
                isDark ? 'via-white/30' : 'via-white'
              } to-transparent`}
            />
          </div>

          {/* Top: ForgeX Brand & Toggle Buttons */}
          <div className={`relative z-10 p-3.5 flex items-center shrink-0 ${isCompact ? 'md:justify-center justify-between' : 'justify-between'} border-b ${isDark ? 'border-white/10' : 'border-neutral-900/10'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Logo Button: turns into minimize/pin button on hover */}
              <button
                type="button"
                id="sidebar-logo-button"
                onClick={handlePinOrCollapse}
                onMouseEnter={() => setIsLogoHovered(true)}
                onMouseLeave={() => setIsLogoHovered(false)}
                title={isCollapsed ? 'Pin sidebar open' : (isLogoHovered ? 'Minimize to hover rail' : 'ForgeX')}
                aria-label={isCollapsed ? 'Pin sidebar open' : 'ForgeX'}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 ${
                  isDark
                    ? 'hover:bg-white/10 hover:text-amber-400 text-neutral-100'
                    : 'hover:bg-neutral-900/[0.07] hover:text-amber-600 text-neutral-800'
                }`}
              >
                {isLogoHovered ? (
                  isCollapsed ? (
                    <PanelLeftOpen className="w-5 h-5 text-amber-400 animate-in fade-in zoom-in-90 duration-150" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5 text-amber-400 animate-in fade-in zoom-in-90 duration-150" />
                  )
                ) : (
                  <ForgeXLogo className="w-5 h-5 text-neutral-950 dark:text-white transition-all duration-150" />
                )}
              </button>

              {!isCompact && (
                <div
                  onClick={onReturnToLanding}
                  className="flex flex-col select-none cursor-pointer hover:opacity-90 transition-opacity"
                  title="Return to ForgeX Landing Page"
                >
                  <span className={`font-display font-bold text-base tracking-tight leading-none flex items-center ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Forge<span className={isDark ? 'text-amber-400' : 'text-amber-500'}>X</span>
                  </span>
                  <span className={`text-[10px] font-mono tracking-wider uppercase ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Studio
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Desktop Collapse / Pin Button */}
              {onToggleCollapse && !isCompact && (
                <button
                  id="btn-sidebar-minimize"
                  onClick={handlePinOrCollapse}
                  title={isCollapsed ? 'Pin sidebar open' : 'Minimize to hover rail'}
                  className={`p-1.5 rounded-lg hidden md:flex items-center justify-center transition-colors ${
                    isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-neutral-900/[0.07] text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-amber-400" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              )}

              {/* Mobile Close Button */}
              <button
                onClick={onCloseMobile}
                className={`p-1.5 rounded-lg md:hidden ${
                  isDark ? 'hover:bg-white/10 text-neutral-400' : 'hover:bg-neutral-900/[0.07] text-neutral-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action: + New Chat button */}
          <div className={`relative z-10 p-3 pb-2 shrink-0 ${isCompact ? 'flex flex-col items-center' : ''}`}>
            <button
              id="sidebar-btn-new-chat"
              onClick={() => {
                onNewChat();
                onSelectWorkspace('chat');
                if (window.innerWidth < 768) onCloseMobile();
              }}
              title="New Chat Session"
              className={`${
                isCompact
                  ? 'w-10 h-10 rounded-xl p-0 flex items-center justify-center'
                  : 'w-full py-2 px-3 rounded-xl flex items-center gap-2.5'
              } font-medium text-sm transition-all duration-150 ${
                isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.11] text-neutral-100 hover:text-white border border-white/10 hover:border-white/20'
                  : 'bg-white/50 hover:bg-white/90 text-neutral-800 hover:text-neutral-950 border border-neutral-900/10 hover:border-neutral-900/20 shadow-xs'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0 text-amber-500" />
              {!isCompact && <span>New chat</span>}
            </button>
          </div>

          {/* Scrollable Middle Container: Studios ABOVE Chat History */}
          <div className={`relative z-10 flex-1 min-h-0 overflow-y-auto px-2.5 py-1 space-y-4 custom-scrollbar ${isCompact ? 'flex flex-col items-center' : ''}`}>
            
            {/* Expanded Mode: Studios at top, then Chat History below */}
            {!isCompact ? (
              <>
                {/* 1. STUDIOS SECTION (ABOVE CHAT HISTORY) */}
                <div className="space-y-1">
                  <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      Studios
                    </span>
                    <span className={`text-[10px] font-mono tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      {STUDIOS.length}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {activeStudios.map((studio) => {
                      const Icon = (STUDIOS.find((s) => s.id === studio.id)?.icon) || Bot;
                      const isSelected = activeWorkspace === studio.id;
                      const isChat = studio.id === 'chat';
                      return (
                        <div
                          key={studio.id}
                          className="group/studio relative flex items-center"
                        >
                          <button
                            type="button"
                            id={`nav-workspace-${studio.id}`}
                            onClick={() => handleSelectStudio(studio.id as ActiveWorkspace)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 ${!isChat ? 'pr-7' : ''} rounded-xl text-xs font-medium transition-all duration-150 ${
                              isSelected
                                ? isDark
                                  ? 'bg-white/[0.12] text-amber-300 font-semibold border border-amber-400/35 shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-md'
                                  : 'bg-white/90 text-neutral-950 font-semibold border border-amber-400/50 shadow-sm backdrop-blur-md'
                                : isDark
                                  ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-transparent'
                                  : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/60 border border-transparent'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-500' : studio.accentColor}`} />
                            <span className="truncate flex-1 text-left">{studio.title}</span>
                            <span className={`text-[10px] font-mono lowercase ${
                              studio.id === 'agents'
                                ? isDark ? 'text-neutral-400 font-medium' : 'text-neutral-500 font-medium'
                                : isSelected ? 'opacity-100 text-amber-500 dark:text-amber-300 font-bold' : 'opacity-65'
                            }`}>
                              {studio.badge}
                            </span>
                          </button>

                          {/* Remove Studio From Sidebar Button (available for all added studios, cannot remove chat) */}
                          {!isChat && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStudio(studio.id);
                              }}
                              title={`Remove ${studio.title} from sidebar`}
                              className="absolute right-1.5 p-1 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/studio:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Studio Button directly below chat/active studios with a plus icon */}
                    <button
                      type="button"
                      id="sidebar-btn-add-studio"
                      onClick={() => {
                        if (!user && onOpenAuth) {
                          onOpenAuth();
                          return;
                        }
                        if (onOpenStudioStore) onOpenStudioStore();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold border border-dashed transition-all mt-1 ${
                        isDark
                          ? 'border-amber-400/35 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/60'
                          : 'border-amber-600/40 text-amber-800 hover:bg-amber-500/10 hover:border-amber-600'
                      }`}
                    >
                      <Plus className="w-4 h-4 shrink-0 text-amber-500" />
                      <span className="truncate flex-1 text-left">Add Studio</span>
                    </button>
                  </div>
                </div>

                {/* 2. RECENT CHATS (DIRECTLY BELOW STUDIOS) */}
                <div className={`pt-3 border-t space-y-1 ${isDark ? 'border-white/10' : 'border-neutral-900/10'}`}>
                  <div className="px-2 pt-0.5 pb-1 flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      Recent Chats
                    </span>
                    {recentChats.length > 0 && (
                      <span className={`text-[10px] font-mono tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {recentChats.length}
                      </span>
                    )}
                  </div>

                  {recentChats.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <MessageSquare className="w-6 h-6 text-neutral-500 mx-auto opacity-40 mb-1.5" />
                      <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        No previous chats
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {recentChats.map((chat) => {
                        const isSelected = activeWorkspace === 'chat' && activeChatId === chat.id;
                        return (
                          <div
                            key={chat.id}
                            className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all duration-150 ${
                              isSelected
                                ? isDark
                                  ? 'bg-white/[0.12] text-amber-300 font-semibold border border-amber-400/35 shadow-sm'
                                  : 'bg-white/90 text-neutral-950 font-semibold border border-amber-400/50 shadow-sm'
                                : isDark
                                  ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-transparent'
                                  : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/60 border border-transparent'
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
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                              <span className="truncate">{chat.title || 'New conversation'}</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                              }}
                              title="Delete chat"
                              className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                                isDark ? 'hover:text-red-400 text-neutral-400' : 'hover:text-red-600 text-neutral-500'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Collapsed Glass Rail Mode: Clean icon list with tooltips, expands on hover */
              <div className="flex flex-col items-center gap-1.5 py-1 w-full">
                {activeStudios.map((studio) => {
                  const Icon = (STUDIOS.find((s) => s.id === studio.id)?.icon) || Bot;
                  const isSelected = activeWorkspace === studio.id;
                  const isChat = studio.id === 'chat';
                  return (
                    <div key={studio.id} className="group/collapsed-studio relative flex items-center justify-center">
                      <button
                        id={`nav-workspace-${studio.id}`}
                        onClick={() => handleSelectStudio(studio.id as ActiveWorkspace)}
                        title={`${studio.title} — ${studio.description}`}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm'
                            : isDark
                              ? 'text-neutral-300 hover:text-white hover:bg-white/10'
                              : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/70'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : studio.accentColor}`} />
                      </button>

                      {!isChat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStudio(studio.id);
                          }}
                          title={`Remove ${studio.title}`}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] opacity-0 group-hover/collapsed-studio:opacity-100 transition-opacity shadow-sm hover:scale-110"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add Studio button in collapsed mode */}
                <button
                  type="button"
                  onClick={() => {
                    if (!user && onOpenAuth) {
                      onOpenAuth();
                      return;
                    }
                    if (onOpenStudioStore) onOpenStudioStore();
                  }}
                  title="Add Studio"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border border-dashed transition-all ${
                    isDark
                      ? 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10'
                      : 'border-amber-600/50 text-amber-800 hover:bg-amber-500/10'
                  }`}
                >
                  <Plus className="w-4 h-4 text-amber-500" />
                </button>
              </div>
            )}
          </div>

          {/* Divider before Settings & Account */}
          <div className="relative z-10 px-3 shrink-0">
            <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-neutral-900/10'}`} />
          </div>

          {/* Bottom Sidebar: Settings, then Account */}
          <div className={`relative z-10 p-2.5 space-y-1 shrink-0 ${isCompact ? 'flex flex-col items-center' : ''}`}>
            {/* Settings button */}
            <button
              id="sidebar-btn-settings"
              onClick={onOpenSettings}
              title="Settings & Preferences"
              className={`${
                isCompact ? 'w-10 h-10 justify-center' : 'w-full px-3 py-2 gap-3'
              } flex items-center rounded-xl text-xs font-medium transition-all ${
                isDark
                  ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
                  : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/65'
              }`}
            >
              <SettingsIcon className="w-4 h-4 text-neutral-400 shrink-0" />
              {!isCompact && <span>Settings & Studio Config</span>}
            </button>

            {/* Account section at bottom (only shown when signed in; Sign In lives in the top bar) */}
            {user && (
              <div ref={accountRef} className="relative w-full">
                <button
                  id="sidebar-btn-account"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  title={user.name}
                  className={`${
                    isCompact ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full p-2 justify-between'
                  } flex items-center rounded-xl text-left transition-all ${
                    isDark
                      ? 'hover:bg-white/[0.08] text-neutral-200'
                      : 'hover:bg-white/65 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 font-semibold text-xs shrink-0">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                    {!isCompact && (
                      <div className="min-w-0">
                         <p className="text-xs font-semibold truncate leading-tight">
                           {user.name}
                         </p>
                         <p className={`text-[10px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-600 font-medium'}`}>
                           {user.email}
                         </p>
                       </div>
                    )}
                   </div>
                   {!isCompact && (
                     <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${accountMenuOpen ? 'rotate-90' : ''}`} />
                   )}
                 </button>

                 {/* Account Popover Menu */}
                 {accountMenuOpen && (
                   <div
                     id="menu-account-popover"
                     className={`absolute bottom-full left-0 mb-2 w-64 rounded-2xl border p-2 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
                       isDark
                         ? 'bg-neutral-900/90 border-white/15 text-white shadow-black/80'
                         : 'bg-white/90 border-neutral-200/80 text-neutral-900 shadow-neutral-400/30'
                     }`}
                   >
                     {/* AI Usage Indicator Component */}
                     <div
                       className={`p-3 rounded-xl border mb-2 ${
                         isDark ? 'bg-neutral-950/60 border-white/10' : 'bg-neutral-50/80 border-neutral-200'
                       }`}
                     >
                       <div className="flex items-center justify-between text-xs mb-1.5">
                         <span className={`font-semibold flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                           <Sparkles className="w-3 h-3" />
                           AI Studio Usage
                         </span>
                         <span className={`font-mono text-[11px] tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-600 font-medium'}`}>
                           {user.creditsUsed} / {user.creditsLimit}
                         </span>
                       </div>

                     {/* Progress Bar */}
                     <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
                       <div
                         className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                         style={{ width: `${usagePercentage}%` }}
                       />
                     </div>

                     <p className={`text-[10px] mt-1.5 text-right font-mono ${isDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
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
            )}
        </div>
      </aside>
      </div>
    </>
  );
};
