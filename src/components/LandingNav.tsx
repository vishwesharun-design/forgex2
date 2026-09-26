import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { ForgeXTheme, ThemeEffectType } from '../types';
import { ThemeEffectDropdown } from './ThemeEffectDropdown';
import { ForgeXLogo } from './ForgeXLogo';

interface LandingNavProps {
  theme: ForgeXTheme;
  themeEffect?: ThemeEffectType;
  onSelectThemeEffect?: (effect: ThemeEffectType) => void;
  onToggleTheme: () => void;
  onOpenAbout: () => void;
  onOpenCreator: () => void;
  onOpenSignIn: () => void;
  onOpenGetStarted: () => void;
}

export const LandingNav: React.FC<LandingNavProps> = ({
  theme,
  themeEffect = 'connected_dots',
  onSelectThemeEffect,
  onToggleTheme,
  onOpenAbout,
  onOpenCreator,
  onOpenSignIn,
  onOpenGetStarted,
}) => {
  const isDark = theme === 'dark';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-2 sm:px-8 py-3 sm:py-4 transition-all duration-300">
      <div
        id="forgex-landing-navbar"
        className={`max-w-6xl mx-auto flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl backdrop-blur-md transition-all duration-300 border ${
          isDark
            ? 'bg-neutral-950/75 border-neutral-800/80 shadow-2xl shadow-black/40 text-neutral-200'
            : 'bg-white/80 border-neutral-200/80 shadow-lg shadow-neutral-200/50 text-neutral-800'
        }`}
      >
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5 select-none cursor-pointer group shrink-0">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <ForgeXLogo className="w-6 h-6 text-neutral-900 dark:text-white" />
          </div>
          <span className="font-display font-bold text-lg sm:text-xl tracking-tight flex items-center">
            Forge<span className="text-amber-500">X</span>
          </span>
        </div>

        {/* Right Nav links */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <button
            id="nav-btn-about"
            onClick={onOpenAbout}
            className={`hidden md:inline-block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            About
          </button>

          <button
            id="nav-btn-creator"
            onClick={onOpenCreator}
            className={`hidden md:inline-block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Creator
          </button>

          <button
            id="nav-btn-signin"
            onClick={onOpenSignIn}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              isDark
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            Sign In
          </button>

          {onSelectThemeEffect && (
            <div className="hidden sm:inline-block">
              <ThemeEffectDropdown
                currentEffect={themeEffect}
                onSelectEffect={onSelectThemeEffect}
                theme={theme}
                compact={true}
              />
            </div>
          )}

          <button
            id="nav-btn-theme"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className={`p-1.5 sm:p-2 rounded-xl text-sm transition-colors border ${
              isDark
                ? 'text-neutral-400 hover:text-amber-300 border-neutral-800 hover:bg-neutral-900'
                : 'text-neutral-600 hover:text-amber-600 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="nav-btn-getstarted"
            onClick={onOpenGetStarted}
            className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 active:scale-[0.98] transition-all duration-200"
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};
