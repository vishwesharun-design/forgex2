import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Settings as SettingsIcon, 
  User as UserIcon, 
  ChevronRight, 
  LogOut, 
  Sliders,
  BarChart3,
  Trash2, 
  X,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
} from 'lucide-react';
import { ActiveWorkspace, ChatSession, ForgeXTheme, ScheduledTask, UserProfile } from '../types';
import { ForgeXLogo } from './ForgeXLogo';
import { ScheduledTaskIcon } from './ScheduledTaskIcon';

interface SidebarProps {
  activeWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  recentChats: ChatSession[];
  scheduledTasks?: ScheduledTask[];
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

const LibraryIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="4" width="3.8" height="16" rx="1" />
    <rect x="8.3" y="4" width="3.8" height="16" rx="1" />
    <rect x="13.8" y="4.8" width="3.8" height="15.2" rx="1" transform="rotate(-14 13.8 4.8)" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  recentChats,
  scheduledTasks = [],
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
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);

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

  const handleSelectNav = (ws: ActiveWorkspace) => {
    if (ws !== 'chat' && ws !== 'library' && ws !== 'scheduled' && !user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    onSelectWorkspace(ws);
    if (window.innerWidth < 768) onCloseMobile();
  };

  const existingEmptyChat = recentChats.find(
    (c) => (!c.messages || c.messages.length === 0) && !c.scheduledTaskId
  );
  const isOnEmptyChat =
    activeWorkspace === 'chat' &&
    (recentChats.length === 0 || Boolean(existingEmptyChat && activeChatId === existingEmptyChat.id));

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
              disabled={isOnEmptyChat}
              onClick={() => {
                if (isOnEmptyChat) return;
                onNewChat();
                onSelectWorkspace('chat');
                if (window.innerWidth < 768) onCloseMobile();
              }}
              title={
                isOnEmptyChat
                  ? 'Start a conversation in this chat before creating a new one'
                  : existingEmptyChat
                  ? 'Open your current empty chat'
                  : 'New Chat Session'
              }
              className={`${
                isCompact
                  ? 'w-10 h-10 rounded-xl p-0 flex items-center justify-center'
                  : 'w-full py-2 px-3 rounded-xl flex items-center gap-2.5'
              } font-medium text-sm transition-all duration-150 ${
                isOnEmptyChat
                  ? isDark
                    ? 'bg-white/[0.02] text-neutral-500 border border-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-white/30 text-neutral-400 border border-neutral-900/5 opacity-60 cursor-not-allowed'
                  : isDark
                    ? 'bg-white/[0.04] hover:bg-white/[0.11] text-neutral-100 hover:text-white border border-white/10 hover:border-white/20 cursor-pointer'
                    : 'bg-white/50 hover:bg-white/90 text-neutral-800 hover:text-neutral-950 border border-neutral-900/10 hover:border-neutral-900/20 shadow-xs cursor-pointer'
              }`}
            >
              <Plus className={`w-4 h-4 shrink-0 ${isOnEmptyChat ? 'opacity-50' : isDark ? 'text-white' : 'text-black'}`} />
              {!isCompact && <span>New chat</span>}
            </button>
          </div>

          {/* Scrollable Middle Container: Core Chat / Library + Chat History */}
          <div className={`relative z-10 flex-1 min-h-0 overflow-y-auto px-2.5 py-1 space-y-4 custom-scrollbar ${isCompact ? 'flex flex-col items-center' : ''}`}>
            
            {/* Expanded Mode: Chat & Library at top, then Recent Chats below */}
            {!isCompact ? (
              <>
                <div className="space-y-0.5 pt-1">
                  <button
                    type="button"
                    id="nav-workspace-scheduled"
                    onClick={() => handleSelectNav('scheduled')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                      activeWorkspace === 'scheduled'
                        ? isDark
                          ? 'bg-white/[0.12] text-white font-semibold border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-md'
                          : 'bg-white/95 text-black font-semibold border border-neutral-300 shadow-sm backdrop-blur-md'
                        : isDark
                          ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-transparent'
                          : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    <Clock className={`w-4 h-4 shrink-0 ${isDark ? 'text-white' : 'text-black'}`} />
                    <span className="truncate flex-1 text-left">Scheduled</span>
                  </button>

                  <button
                    type="button"
                    id="nav-workspace-chat"
                    onClick={() => handleSelectNav('chat')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      activeWorkspace === 'chat'
                        ? isDark
                          ? 'bg-white/[0.12] text-white font-semibold border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-md'
                          : 'bg-white/95 text-black font-semibold border border-neutral-300 shadow-sm backdrop-blur-md'
                        : isDark
                          ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-transparent'
                          : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isDark ? 'text-white' : 'text-black'}`} />
                    <span className="truncate flex-1 text-left">ForgeX Chat</span>
                  </button>

                  <button
                    type="button"
                    id="nav-workspace-library"
                    onClick={() => handleSelectNav('library')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      activeWorkspace === 'library'
                        ? isDark
                          ? 'bg-white/[0.12] text-white font-semibold border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-md'
                          : 'bg-white/95 text-black font-semibold border border-neutral-300 shadow-sm backdrop-blur-md'
                        : isDark
                          ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-transparent'
                          : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    <LibraryIcon className={`w-4 h-4 shrink-0 ${isDark ? 'text-white' : 'text-black'}`} />
                    <span className="truncate flex-1 text-left">Library</span>
                  </button>
                </div>

                {/* RECENT CHATS */}
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
                                {chat.scheduledTaskId ? (
                                  <ScheduledTaskIcon
                                    task={scheduledTasks.find((t) => t.id === chat.scheduledTaskId)}
                                    titleFallback={chat.title}
                                    className="w-3.5 h-3.5 shrink-0"
                                  />
                                ) : (
                                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                )}
                                <span className="truncate">{chat.title || 'New conversation'}</span>
                              </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                              }}
                              title="Delete chat"
                              className={`opacity-70 md:opacity-0 md:group-hover:opacity-100 p-1 rounded transition-opacity shrink-0 ${
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
              /* Collapsed Glass Rail Mode: Scheduled + Chat + Library icon list */
              <div className="flex flex-col items-center gap-1.5 py-1 w-full">
                <button
                  type="button"
                  id="nav-workspace-scheduled"
                  onClick={() => handleSelectNav('scheduled')}
                  title="Scheduled — Tasks, reminders & updates"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer ${
                    activeWorkspace === 'scheduled'
                      ? isDark
                        ? 'bg-white/15 text-white border border-white/30 shadow-sm'
                        : 'bg-neutral-900/10 text-black border border-neutral-300 shadow-sm'
                      : isDark
                        ? 'text-neutral-300 hover:text-white hover:bg-white/10'
                        : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/70'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${isDark ? 'text-white' : 'text-black'}`} />
                </button>

                <button
                  id="nav-workspace-chat"
                  onClick={() => handleSelectNav('chat')}
                  title="ForgeX Chat — Conversational AI & '+' Tools"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-all ${
                    activeWorkspace === 'chat'
                      ? isDark
                        ? 'bg-white/15 text-white border border-white/30 shadow-sm'
                        : 'bg-neutral-900/10 text-black border border-neutral-300 shadow-sm'
                      : isDark
                        ? 'text-neutral-300 hover:text-white hover:bg-white/10'
                        : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/70'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 ${isDark ? 'text-white' : 'text-black'}`} />
                </button>

                <button
                  id="nav-workspace-library"
                  onClick={() => handleSelectNav('library')}
                  title="Library — Saved images, references, folders & media"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-all ${
                    activeWorkspace === 'library'
                      ? isDark
                        ? 'bg-white/15 text-white border border-white/30 shadow-sm'
                        : 'bg-neutral-900/10 text-black border border-neutral-300 shadow-sm'
                      : isDark
                        ? 'text-neutral-300 hover:text-white hover:bg-white/10'
                        : 'text-neutral-700 hover:text-neutral-950 hover:bg-white/70'
                  }`}
                >
                  <LibraryIcon className={`w-4 h-4 ${isDark ? 'text-white' : 'text-black'}`} />
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
              {!isCompact && <span>Settings & Preferences</span>}
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
                     className={`absolute bottom-full left-0 mb-2 w-[min(16rem,calc(100vw-3rem))] rounded-2xl border p-2 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
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
                           <Cpu className="w-3 h-3" />
                           AI Workspace Usage
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
