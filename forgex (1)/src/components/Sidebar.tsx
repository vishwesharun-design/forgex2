import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  MessageSquare, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music,
  Compass,
  Settings as SettingsIcon, 
  User as UserIcon, 
  ChevronRight, 
  LogOut, 
  Sliders, 
  BarChart3, 
  Trash2, 
  X,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen
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
}

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
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

  // Calculate visual usage bar
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
        className={`fixed md:sticky top-0 left-0 h-screen z-50 md:z-20 flex flex-col transition-all duration-300 border-r ${
          isCollapsed ? 'md:w-20 w-72' : 'w-72'
        } ${
          isDark
            ? 'bg-neutral-950 border-neutral-850 text-neutral-200'
            : 'bg-neutral-50 border-neutral-200 text-neutral-800'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: ForgeX Brand & Toggle Buttons */}
        <div className={`p-4 flex items-center ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'} border-b border-neutral-800/30`}>
          <div
            onClick={onReturnToLanding}
            className="flex items-center gap-2.5 select-none cursor-pointer hover:opacity-90 transition-opacity"
            title="Return to ForgeX Landing Page"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10 shrink-0">
              <Zap className="w-4 h-4 fill-amber-400 text-amber-400 glow-lightning" />
            </div>
            {!isCollapsed && (
              <span className="font-display font-bold text-xl tracking-tight flex items-center">
                Forge<span className="text-amber-400">X</span>
              </span>
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

        {/* Action: + New Chat button */}
        <div className={`p-3 pb-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            id="sidebar-btn-new-chat"
            onClick={() => {
              onNewChat();
              onSelectWorkspace('chat');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            title="New Chat"
            className={`${
              isCollapsed
                ? 'w-11 h-11 rounded-xl p-0 flex items-center justify-center'
                : 'w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2'
            } font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20 active:scale-[0.98] transition-all`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Primary Navigation Workspaces */}
        <nav className={`px-3 py-2 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          <button
            id="nav-workspace-chat"
            onClick={() => {
              onSelectWorkspace('chat');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            title="Chat Workspace"
            className={`${
              isCollapsed
                ? 'w-11 h-11 justify-center'
                : 'w-full px-3 py-2.5 gap-3'
            } flex items-center rounded-xl text-sm font-medium transition-all ${
              activeWorkspace === 'chat'
                ? isDark
                  ? 'bg-neutral-800/80 text-white font-semibold shadow-sm border border-neutral-700/50'
                  : 'bg-neutral-200/80 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Chat</span>}
          </button>

          <button
            id="nav-workspace-image"
            onClick={() => {
              onSelectWorkspace('image');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            title="Image Studio"
            className={`${
              isCollapsed
                ? 'w-11 h-11 justify-center'
                : 'w-full px-3 py-2.5 gap-3'
            } flex items-center rounded-xl text-sm font-medium transition-all ${
              activeWorkspace === 'image'
                ? isDark
                  ? 'bg-neutral-800/80 text-white font-semibold shadow-sm border border-neutral-700/50'
                  : 'bg-neutral-200/80 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Image Gen</span>}
          </button>

          <button
            id="nav-workspace-video"
            onClick={() => {
              onSelectWorkspace('video');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            title="Video Studio"
            className={`${
              isCollapsed
                ? 'w-11 h-11 justify-center'
                : 'w-full px-3 py-2.5 gap-3'
            } flex items-center rounded-xl text-sm font-medium transition-all ${
              activeWorkspace === 'video'
                ? isDark
                  ? 'bg-neutral-800/80 text-white font-semibold shadow-sm border border-neutral-700/50'
                  : 'bg-neutral-200/80 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <VideoIcon className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Video Gen</span>}
          </button>

          <button
            id="nav-workspace-music"
            onClick={() => {
              onSelectWorkspace('music');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            title="AI Song Studio (Make Song)"
            className={`${
              isCollapsed
                ? 'w-11 h-11 justify-center'
                : 'w-full px-3 py-2.5 gap-3'
            } flex items-center rounded-xl text-sm font-medium transition-all ${
              activeWorkspace === 'music'
                ? isDark
                  ? 'bg-neutral-800/80 text-white font-semibold shadow-sm border border-neutral-700/50'
                  : 'bg-neutral-200/80 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Music className="w-4 h-4 shrink-0 text-amber-400" />
            {!isCollapsed && <span>Make Song</span>}
          </button>

          <button
            id="nav-workspace-research"
            onClick={() => {
              onSelectWorkspace('research');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            title="Deep Research Engine"
            className={`${
              isCollapsed
                ? 'w-11 h-11 justify-center'
                : 'w-full px-3 py-2.5 gap-3'
            } flex items-center rounded-xl text-sm font-medium transition-all ${
              activeWorkspace === 'research'
                ? isDark
                  ? 'bg-neutral-800/80 text-white font-semibold shadow-sm border border-neutral-700/50'
                  : 'bg-neutral-200/80 text-neutral-950 font-semibold shadow-sm border border-neutral-300'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0 text-amber-400" />
            {!isCollapsed && <span>Deep Research</span>}
          </button>
        </nav>

        {/* Divider */}
        <div className="px-3 py-2">
          <div className={`h-px w-full ${isDark ? 'bg-neutral-800/80' : 'bg-neutral-200'}`} />
        </div>

        {/* Recent Chats Section */}
        <div className={`flex-1 overflow-y-auto px-2 py-1 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {!isCollapsed ? (
            <>
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                <span>Recent Chats</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">
                  {recentChats.length}
                </span>
              </div>

              {recentChats.length === 0 ? (
                <div className="px-3 py-4 text-xs text-neutral-500 text-center">
                  No previous chats yet
                </div>
              ) : (
                recentChats.map((chat) => {
                  const isSelected = activeWorkspace === 'chat' && activeChatId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-neutral-850/90 text-amber-400 font-medium'
                            : 'bg-neutral-200 text-amber-700 font-medium'
                          : isDark
                            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
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
                        <span className="truncate">{chat.title}</span>
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
                })
              )}
            </>
          ) : (
            /* Collapsed view: compact chat icons */
            <div className="flex flex-col items-center gap-1.5 py-1">
              {recentChats.slice(0, 6).map((chat) => {
                const isSelected = activeWorkspace === 'chat' && activeChatId === chat.id;
                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      onSelectChat(chat.id);
                      onSelectWorkspace('chat');
                    }}
                    title={chat.title}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : isDark
                          ? 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider before Settings & Account */}
        <div className="px-3 py-1">
          <div className={`h-px w-full ${isDark ? 'bg-neutral-800/80' : 'bg-neutral-200'}`} />
        </div>

        {/* Bottom Sidebar: Settings, then Account */}
        <div className={`p-2 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Settings button */}
          <button
            id="sidebar-btn-settings"
            onClick={onOpenSettings}
            title="Settings"
            className={`${
              isCollapsed ? 'w-10 h-10 justify-center' : 'w-full px-3 py-2.5 gap-3'
            } flex items-center rounded-xl text-sm font-medium transition-all ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-900/70'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <SettingsIcon className="w-4 h-4 text-neutral-400 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {/* Account section at bottom */}
          {user ? (
            <div ref={accountRef} className="relative w-full">
              <button
                id="sidebar-btn-account"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                title={user.name}
                className={`${
                  isCollapsed ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full p-2.5 justify-between'
                } flex items-center rounded-xl text-left transition-all ${
                  isDark
                    ? 'hover:bg-neutral-900/80 text-neutral-300'
                    : 'hover:bg-neutral-100 text-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-semibold text-xs shrink-0">
                    <UserIcon className="w-4 h-4" />
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
                        AI Usage
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
                isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full p-2.5 justify-center gap-2'
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
