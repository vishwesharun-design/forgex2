import React from 'react';
import { ForgeXTheme, ThemeEffectType, UserProfile } from '../types';
import { ForgeXLogo } from './ForgeXLogo';

interface LandingNavProps {
  theme: ForgeXTheme;
  themeEffect?: ThemeEffectType;
  onSelectThemeEffect?: (effect: ThemeEffectType) => void;
  onToggleTheme?: () => void;
  onOpenAbout: () => void;
  onOpenCreator: () => void;
  onOpenSignIn: () => void;
  onOpenGetStarted: () => void;
  user?: UserProfile | null;
}

export const LandingNav: React.FC<LandingNavProps> = ({
  theme,
  onOpenAbout,
  onOpenCreator,
  onOpenSignIn,
  onOpenGetStarted,
  user,
}) => {
  const isDark = theme === 'dark';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-2.5 sm:px-8 py-2.5 sm:py-4 transition-all duration-300">
      <div
        id="forgex-landing-navbar"
        className={`relative max-w-6xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl md:rounded-3xl backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border ${
          isDark
            ? 'bg-neutral-900/55 hover:bg-neutral-900/68 border-white/15 ring-1 ring-inset ring-white/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.75)] md:hover:-translate-y-0.5 md:hover:shadow-[0_22px_56px_-12px_rgba(0,0,0,0.85)] text-neutral-100'
            : 'bg-white/65 hover:bg-white/78 border-white/80 ring-1 ring-inset ring-white/90 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14),0_4px_16px_-4px_rgba(15,23,42,0.06)] md:hover:-translate-y-0.5 md:hover:shadow-[0_20px_50px_-12px_rgba(15,23,42,0.2)] text-neutral-800'
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
        {/* Left: Brand */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 select-none cursor-pointer group shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
            <ForgeXLogo className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-900 dark:text-white" />
          </div>
          <span className="font-display font-bold text-base sm:text-xl tracking-tight flex items-center">
            Forge<span className="text-amber-500">X</span>
          </span>
        </div>

        {/* Right Nav links */}
        <div className="relative z-10 flex items-center gap-1 sm:gap-2.5 shrink-0">
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

          {!user && (
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
          )}

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
