import React from 'react';
import { Menu, Bell, Heart, Sun, Moon, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ActiveWorkspace, ForgeXModelId, ForgeXTheme, FORGEX_MODELS } from '../types';
import { ModelSelector } from './ModelSelector';

interface HeaderProps {
  activeWorkspace: ActiveWorkspace;
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  onToggleTheme: () => void;
  onToggleMobileNav: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications: () => void;
  onOpenFavorites: () => void;
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
  onToggleTheme,
  onToggleMobileNav,
  onOpenSearch,
  onOpenNotifications,
  onOpenFavorites,
  unreadNotificationsCount = 2,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const isDark = theme === 'dark';

  const getWorkspaceTitle = () => {
    switch (activeWorkspace) {
      case 'chat':
        return 'ForgeX Chat';
      case 'image':
        return 'Image Studio';
      case 'video':
        return 'Video Studio';
      case 'music':
        return 'AI Song Studio';
      default:
        return 'ForgeX Studio';
    }
  };

  const currentModel = FORGEX_MODELS.find((m) => m.id === selectedModelId) || FORGEX_MODELS[4];

  return (
    <header
      id="forgex-app-header"
      className={`sticky top-0 z-30 h-16 px-4 sm:px-6 flex items-center justify-between border-b backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-neutral-950/85 border-neutral-850 text-white'
          : 'bg-white/85 border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Left: Mobile menu button / Desktop collapse toggle + Workspace title */}
      <div className="flex items-center gap-2.5 sm:gap-3">
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

        {/* Desktop Sidebar Minimize / Expand toggle button */}
        {onToggleSidebarCollapse && (
          <button
            id="btn-desktop-sidebar-toggle"
            onClick={onToggleSidebarCollapse}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            className={`p-2 rounded-xl hidden md:flex items-center justify-center border transition-colors ${
              isDark
                ? 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                : 'border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-amber-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div>
          <h1 id="header-workspace-title" className="font-display font-bold text-lg sm:text-xl tracking-tight">
            {getWorkspaceTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Notifications, Favorites, Theme, and Round Model Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Favorites trigger */}
        <button
          id="btn-open-favorites"
          onClick={onOpenFavorites}
          title="Saved Favorites"
          className={`p-2 rounded-xl border transition-colors ${
            isDark
              ? 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-neutral-700'
              : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-red-500 hover:border-neutral-300'
          }`}
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* Notifications trigger */}
        <button
          id="btn-open-notifications"
          onClick={onOpenNotifications}
          title="Notifications"
          className={`relative p-2 rounded-xl border transition-colors ${
            isDark
              ? 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-neutral-950 font-bold text-[10px] flex items-center justify-center">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

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

        {/* Round Model Switcher button as specified in Section 8 & 9 */}
        <div className="ml-1 flex items-center">
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
            theme={theme}
            compactRoundOnly={true}
          />
        </div>
      </div>
    </header>
  );
};
