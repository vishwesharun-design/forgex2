import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { ActiveWorkspace, ForgeXModelId, ForgeXTheme, FORGEX_MODELS, ThemeEffectType } from '../types';
import { ModelSelector } from './ModelSelector';
import { ThemeEffectDropdown } from './ThemeEffectDropdown';

interface HeaderProps {
  activeWorkspace: ActiveWorkspace;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  themeEffect?: ThemeEffectType;
  onSelectThemeEffect?: (effect: ThemeEffectType) => void;
  onToggleTheme: () => void;
  onToggleMobileNav: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenFavorites?: () => void;
  onOpenApiKey?: () => void;
  unreadNotificationsCount?: number;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeWorkspace,
  selectedModelId,
  onSelectModel,
  theme,
  themeEffect = 'connected_dots',
  onSelectThemeEffect,
  onToggleTheme,
  onToggleMobileNav,
  onOpenSearch,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const isDark = theme === 'dark';

  const getWorkspaceInfo = () => {
    switch (activeWorkspace) {
      case 'chat':
        return { title: 'ForgeX', category: 'Studio' };
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
        return { title: 'AI Agents', category: 'Intelligence' };
      case 'search':
        return { title: 'Live Web Search', category: 'Intelligence' };
      case 'writing':
        return { title: 'Writing Studio', category: 'Productivity' };
      case 'data_analysis':
        return { title: 'Data Analysis Studio', category: 'Intelligence' };
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
      className={`sticky top-0 z-30 h-14 px-3 sm:px-5 flex items-center justify-between border-b backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-neutral-950/85 border-neutral-850 text-white'
          : 'bg-white/85 border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Left: Mobile menu toggle + Desktop sidebar minimize toggle + Model Switching right near the left */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          id="btn-mobile-nav-toggle"
          onClick={onToggleMobileNav}
          className={`p-2 rounded-xl md:hidden border transition-colors ${
            isDark
              ? 'border-neutral-800 text-neutral-300 hover:bg-neutral-900'
              : 'border-neutral-200 text-neutral-700 hover:bg-neutral-100'
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
            <h1 id="header-workspace-title" className="font-display font-semibold text-base sm:text-lg tracking-tight truncate max-w-[140px] sm:max-w-none">
              {workspaceInfo.title}
            </h1>
            <span className={`hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
              isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {workspaceInfo.category}
            </span>
          </div>
        )}
      </div>

      {/* Right: Clean & minimal (Favorites and Notifications removed per user request) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

        {/* Theme Effect quick switcher - visible on sm+ screens */}
        {onSelectThemeEffect && (
          <div className="hidden sm:flex items-center">
            <ThemeEffectDropdown
              currentEffect={themeEffect}
              onSelectEffect={onSelectThemeEffect}
              theme={theme}
              compact={true}
            />
          </div>
        )}

        {/* Theme quick toggle */}
        <button
          id="btn-header-theme"
          onClick={onToggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          className={`p-2 rounded-xl border transition-colors ${
            isDark
              ? 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-neutral-700'
              : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-amber-600 hover:border-neutral-300'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

