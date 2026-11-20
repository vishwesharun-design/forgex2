import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Menu, User as UserIcon } from 'lucide-react';
import { ActiveWorkspace, CHAT_ROLES, ChatRoleId, ForgeXModelId, ForgeXTheme, ThemeEffectType, UserProfile } from '../types';
import { ModelSelector } from './ModelSelector';

interface HeaderProps {
  activeWorkspace: ActiveWorkspace;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  selectedRoleId?: ChatRoleId;
  onSelectRole?: (roleId: ChatRoleId) => void;
  theme: ForgeXTheme;
  themeEffect?: ThemeEffectType;
  onSelectThemeEffect?: (effect: ThemeEffectType) => void;
  onToggleTheme?: () => void;
  onToggleMobileNav: () => void;
  onNavigateToChat?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenFavorites?: () => void;
  onOpenApiKey?: () => void;
  unreadNotificationsCount?: number;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  user?: UserProfile | null;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeWorkspace,
  selectedModelId,
  onSelectModel,
  selectedRoleId = 'general',
  onSelectRole,
  theme,
  onToggleMobileNav,
  onNavigateToChat,
  user,
  onOpenAuth,
}) => {
  const isDark = theme === 'dark';
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!roleMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [roleMenuOpen]);

  const activeRole = CHAT_ROLES.find((r) => r.id === selectedRoleId) || CHAT_ROLES[0];

  const getWorkspaceInfo = () => {
    switch (activeWorkspace) {
      case 'chat':
        return { title: 'ForgeX', category: 'Chat' };
      case 'scheduled':
        return { title: 'Scheduled', category: 'Automation' };
      case 'library':
        return { title: 'Library', category: 'Media' };
      case 'image':
        return { title: 'Image Generator', category: 'Creative' };
      case 'music':
        return { title: 'Make Song', category: 'Creative' };
      case 'spotify':
        return { title: 'Music Player', category: 'Creative' };
      case 'research':
        return { title: 'Deep Research', category: 'Intelligence' };
      case 'code':
        return { title: 'Code Workspace', category: 'Productivity' };
      case 'files':
        return { title: 'Document AI', category: 'Productivity' };
      case 'agents':
        return { title: 'AI Agents', category: 'beta' };
      case 'search':
        return { title: 'Live Web Search', category: 'Intelligence' };
      case 'writing':
        return { title: 'Writing Assistant', category: 'Productivity' };
      case 'data_analysis':
        return { title: 'Data Analysis', category: 'Intelligence' };
      case 'vault':
        return { title: 'Knowledge Vault', category: 'Intelligence' };
      case 'presentation':
        return { title: 'Presentations', category: 'Productivity' };
      case 'canvas':
        return { title: 'AI Canvas & Mindmap', category: 'Productivity' };
      case 'projects':
        return { title: 'Projects Manager', category: 'Productivity' };
      default:
        return { title: 'ForgeX', category: 'Workspace' };
    }
  };

  const workspaceInfo = getWorkspaceInfo();

  return (
    <header
      id="forgex-app-header"
      className={`sticky top-0 z-30 relative mx-2.5 sm:mx-3 md:ml-1 md:mr-3 mt-2.5 sm:mt-3 h-14 px-3 sm:px-5 flex items-center justify-between rounded-2xl md:rounded-3xl border backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
        isDark
          ? 'bg-neutral-900/55 hover:bg-neutral-900/68 border-white/15 ring-1 ring-inset ring-white/10 text-white shadow-[0_12px_36px_-10px_rgba(0,0,0,0.75)] md:hover:-translate-y-0.5 md:hover:shadow-[0_18px_44px_-10px_rgba(0,0,0,0.85)]'
          : 'bg-white/65 hover:bg-white/78 border-white/80 ring-1 ring-inset ring-white/90 text-neutral-900 shadow-[0_10px_32px_-8px_rgba(15,23,42,0.12),0_4px_12px_-4px_rgba(15,23,42,0.05)] md:hover:-translate-y-0.5 md:hover:shadow-[0_16px_40px_-10px_rgba(15,23,42,0.18)]'
      }`}
    >
      {/* Specular Frosted Glass Sheen Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
      >
        <div
          className={`absolute inset-0 bg-gradient-to-r ${
            isDark
              ? 'from-white/[0.1] via-white/[0.02] to-amber-500/[0.03]'
              : 'from-white/75 via-white/25 to-amber-500/[0.04]'
          }`}
        />
        <div
          className={`absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent ${
            isDark ? 'via-white/30' : 'via-white'
          } to-transparent`}
        />
      </div>

      {/* Left: Mobile menu toggle + Model & Role Switching */}
      <div className="relative z-10 flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1">
        {/* Mobile menu button */}
        <button
          id="btn-mobile-nav-toggle"
          onClick={onToggleMobileNav}
          className={`p-1.5 sm:p-2 rounded-xl md:hidden border transition-colors shrink-0 ${
            isDark
              ? 'border-white/15 text-neutral-200 hover:bg-white/10'
              : 'border-neutral-900/10 text-neutral-700 hover:bg-white/70'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Switching + Role Selector: Placed on the left */}
        {activeWorkspace === 'chat' ? (
          <div className="flex items-center gap-0.5 sm:gap-2 min-w-0 flex-1">
            <ModelSelector
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              theme={theme}
              variant="chatgpt"
              align="left"
            />

            {onSelectRole && (
              <div ref={roleMenuRef} className="relative inline-block text-left min-w-0">
                <button
                  id="btn-chat-role-selector"
                  type="button"
                  onClick={() => setRoleMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-display font-semibold text-sm sm:text-lg transition-all duration-150 cursor-pointer whitespace-nowrap min-w-0 max-w-full ${
                    isDark
                      ? 'text-neutral-200 hover:text-white hover:bg-neutral-900/90'
                      : 'text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100'
                  }`}
                  title={`Chatbot role: ${activeRole.name} — ${activeRole.description}`}
                >
                  <span className="truncate max-w-[78px] sm:max-w-none">{activeRole.shortLabel}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 transition-transform duration-200 shrink-0 ${
                      roleMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {roleMenuOpen && (
                  <div
                    className={`absolute right-0 sm:left-0 sm:right-auto mt-2 w-56 sm:w-60 max-w-[calc(100vw-24px)] rounded-2xl border p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                      isDark
                        ? 'bg-neutral-950/95 backdrop-blur-md border-neutral-800 text-white shadow-black/80'
                        : 'bg-white/95 backdrop-blur-md border-neutral-200 text-neutral-900 shadow-neutral-300'
                    }`}
                  >
                    <div
                      className={`px-3 py-2 border-b flex items-center justify-between ${
                        isDark ? 'border-neutral-800/60' : 'border-neutral-200'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          isDark ? 'text-neutral-400' : 'text-neutral-600'
                        }`}
                      >
                        Roles
                      </span>
                    </div>

                    <div className="py-1 space-y-1">
                      {CHAT_ROLES.map((role) => {
                        const isSelected = role.id === activeRole.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => {
                              onSelectRole(role.id);
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left text-sm font-display transition-colors cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-neutral-800 text-white font-semibold'
                                  : 'bg-neutral-200 text-neutral-950 font-semibold'
                                : isDark
                                  ? 'text-neutral-300 hover:bg-neutral-900 hover:text-white font-medium'
                                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-medium'
                            }`}
                          >
                            <span className="truncate">{role.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 pr-1">
            {onNavigateToChat && (
              <button
                id="btn-header-back-to-chat"
                type="button"
                onClick={onNavigateToChat}
                className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 sm:gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'border-white/15 text-neutral-200 hover:bg-white/10 hover:text-white'
                    : 'border-neutral-900/10 text-neutral-700 hover:bg-white hover:text-neutral-950'
                }`}
                title="Return to ForgeX Chat"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            )}
            <h1 id="header-workspace-title" className="font-display font-semibold text-sm sm:text-lg tracking-tight truncate min-w-0 flex items-center gap-1.5">
              <span className="truncate">{workspaceInfo.title}</span>
              {activeWorkspace === 'agents' && (
                <span className={`text-[11px] sm:text-xs font-mono font-medium lowercase shrink-0 ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}>
                  beta
                </span>
              )}
            </h1>
            {activeWorkspace !== 'agents' && (
              <span className={`hidden sm:inline-block text-xs font-normal shrink-0 ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}>
                · {workspaceInfo.category}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Clean & minimal */}
      <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 shrink-0 ml-1">
        {/* If in non-chat workspace, show model switch pill on right if helpful */}
        {activeWorkspace !== 'chat' && (
          <div className="hidden sm:flex items-center mr-1">
            <ModelSelector
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              theme={theme}
              variant="pill"
              useShortName={true}
              align="right"
            />
          </div>
        )}

        {/* Sign In button shown only if user hasn't signed in yet */}
        {!user && onOpenAuth && (
          <button
            id="btn-header-signin"
            type="button"
            onClick={onOpenAuth}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              isDark
                ? 'bg-black hover:bg-neutral-900 text-white border-white/20'
                : 'bg-neutral-950 hover:bg-neutral-800 text-white border-neutral-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

