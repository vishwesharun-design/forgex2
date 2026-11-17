import React from 'react';
import { Menu, User as UserIcon } from 'lucide-react';
import { ActiveWorkspace, ForgeXModelId, ForgeXTheme, ThemeEffectType, UserProfile } from '../types';
import { ModelSelector } from './ModelSelector';

interface HeaderProps {
  activeWorkspace: ActiveWorkspace;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  themeEffect?: ThemeEffectType;
  onSelectThemeEffect?: (effect: ThemeEffectType) => void;
  onToggleTheme?: () => void;
  onToggleMobileNav: () => void;
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
  theme,
  onToggleMobileNav,
  user,
  onOpenAuth,
}) => {
  const isDark = theme === 'dark';

  const getWorkspaceInfo = () => {
    switch (activeWorkspace) {
      case 'chat':
        return { title: 'ForgeX', category: 'Studio' };
      case 'library':
        return { title: 'Library', category: 'Media' };
      case 'image':
        return { title: 'Image Studio', category: 'Creative' };
      case 'music':
        return { title: 'AI Song Studio', category: 'Creative' };
      case 'spotify':
        return { title: 'Music Player', category: 'Creative' };
      case 'research':
        return { title: 'Deep Research', category: 'Intelligence' };
      case 'code':
        return { title: 'Code Studio', category: 'Productivity' };
      case 'files':
        return { title: 'Document AI', category: 'Productivity' };
      case 'agents':
        return { title: 'AI Agents', category: 'beta' };
      case 'search':
        return { title: 'Live Web Search', category: 'Intelligence' };
      case 'writing':
        return { title: 'Writing Studio', category: 'Productivity' };
      case 'data_analysis':
        return { title: 'Data Analysis Studio', category: 'Intelligence' };
      case 'vault':
        return { title: 'Knowledge Vault', category: 'Intelligence' };
      case 'presentation':
        return { title: 'Presentations', category: 'Productivity' };
      case 'canvas':
        return { title: 'AI Canvas & Mindmap', category: 'Productivity' };
      case 'projects':
        return { title: 'Projects Manager', category: 'Productivity' };
      default:
        return { title: 'ForgeX Studio', category: 'Studio' };
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

      {/* Left: Mobile menu toggle + Model Switching */}
      <div className="relative z-10 flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          id="btn-mobile-nav-toggle"
          onClick={onToggleMobileNav}
          className={`p-2 rounded-xl md:hidden border transition-colors ${
            isDark
              ? 'border-white/15 text-neutral-200 hover:bg-white/10'
              : 'border-neutral-900/10 text-neutral-700 hover:bg-white/70'
          }`}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Switching: Placed on the left */}
        {activeWorkspace === 'chat' ? (
          <div className="flex items-center">
            <ModelSelector
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              theme={theme}
              variant="chatgpt"
              align="left"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h1 id="header-workspace-title" className="font-display font-semibold text-base sm:text-lg tracking-tight truncate max-w-[140px] sm:max-w-none flex items-center gap-1.5">
              {workspaceInfo.title}
              {activeWorkspace === 'agents' && (
                <span className={`text-xs font-mono font-medium lowercase ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}>
                  beta
                </span>
              )}
            </h1>
            {activeWorkspace !== 'agents' && (
              <span className={`hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {workspaceInfo.category}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Clean & minimal */}
      <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 shrink-0">
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
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

