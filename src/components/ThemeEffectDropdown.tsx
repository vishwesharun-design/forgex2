import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Network, 
  Terminal, 
  Activity, 
  Flame, 
  Grid, 
  EyeOff, 
  Check, 
  ChevronDown 
} from 'lucide-react';
import { ForgeXTheme, ThemeEffectType } from '../types';
import { THEME_EFFECTS_META } from './ThemeEffectBackground';

interface ThemeEffectDropdownProps {
  currentEffect: ThemeEffectType;
  onSelectEffect: (effect: ThemeEffectType) => void;
  theme: ForgeXTheme;
  compact?: boolean;
}

export const ThemeEffectDropdown: React.FC<ThemeEffectDropdownProps> = ({
  currentEffect,
  onSelectEffect,
  theme,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentMeta = THEME_EFFECTS_META.find((e) => e.id === currentEffect) || THEME_EFFECTS_META[0];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Network': return Network;
      case 'Sparkles': return Sparkles;
      case 'Terminal': return Terminal;
      case 'Activity': return Activity;
      case 'Flame': return Flame;
      case 'Grid': return Grid;
      case 'EyeOff': return EyeOff;
      default: return Sparkles;
    }
  };

  const CurrentIcon = getIcon(currentMeta.iconName);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        id="btn-theme-effect-dropdown"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Theme Canvas Effect: ${currentMeta.name}`}
        className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition-all border ${
          compact ? 'px-2 py-2' : 'px-2.5 py-2'
        } ${
          isDark
            ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-amber-400 hover:border-amber-500/40 hover:bg-neutral-850'
            : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:text-amber-600 hover:border-amber-400/40 hover:bg-neutral-50'
        }`}
      >
        <CurrentIcon className="w-4 h-4 text-amber-500 shrink-0" />
        {!compact && (
          <span className="hidden sm:inline-block max-w-[105px] truncate">
            {currentMeta.name}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 text-neutral-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id="popover-theme-effects"
          className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl backdrop-blur-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isDark
              ? 'bg-neutral-950/95 border-neutral-800 text-white shadow-black/80'
              : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-300'
          }`}
        >
          <div className={`px-2 py-1.5 border-b mb-1 flex items-center justify-between ${
            isDark ? 'border-neutral-800/50' : 'border-neutral-200'
          }`}>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'text-neutral-400' : 'text-neutral-600 font-bold'
            }`}>
              Theme Canvas Effect
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
              isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-800'
            }`}>
              {THEME_EFFECTS_META.length} Effects
            </span>
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
            {THEME_EFFECTS_META.map((eff) => {
              const isSelected = eff.id === currentEffect;
              const Icon = getIcon(eff.iconName);

              return (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => {
                    onSelectEffect(eff.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        : 'bg-amber-100 border border-amber-400 text-amber-900 font-semibold'
                      : isDark
                        ? 'hover:bg-neutral-900 text-neutral-300 hover:text-white border border-transparent'
                        : 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950'
                        : isDark ? 'bg-neutral-900 text-amber-400' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate">
                        {eff.name}
                      </span>
                      <span className={`text-[10px] block truncate ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {eff.badge}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
