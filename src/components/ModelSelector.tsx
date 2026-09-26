import React, { useState, useRef, useEffect } from 'react';
import { Check, Sparkles, ChevronDown } from 'lucide-react';
import { ForgeXModel, ForgeXModelId, FORGEX_MODELS, ForgeXTheme } from '../types';

interface ModelSelectorProps {
  selectedModelId: ForgeXModelId;
  onSelectModel: (modelId: ForgeXModelId) => void;
  theme: ForgeXTheme;
  compactRoundOnly?: boolean;
  align?: 'left' | 'right';
  variant?: 'chatgpt' | 'pill' | 'round';
  useShortName?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onSelectModel,
  theme,
  compactRoundOnly = false,
  align = 'left',
  variant,
  useShortName = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

  const normalizedId = 
    selectedModelId === 'unreal-1' ? 'forge-1' :
    selectedModelId === 'unreal-2' ? 'forge-1.5' :
    selectedModelId === 'unreal-3' ? 'forge-2' :
    selectedModelId === 'unreal-4' ? 'forge-2-pro' :
    selectedModelId === 'unreal-5' ? 'forge-2-ultra' :
    selectedModelId;

  const currentModel = FORGEX_MODELS.find((m) => m.id === normalizedId) || FORGEX_MODELS[4];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const effectiveVariant = variant || (compactRoundOnly ? 'round' : 'chatgpt');

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* 1. ChatGPT-style Minimal Header Dropdown Button */}
      {effectiveVariant === 'chatgpt' && (
        <button
          id="btn-model-switcher-chatgpt"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-display font-semibold transition-all duration-150 ${
            useShortName ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
          } ${
            isDark
              ? 'text-neutral-200 hover:text-white hover:bg-neutral-900/90'
              : 'text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100'
          }`}
        >
          <span className="truncate max-w-[160px] sm:max-w-none">
            {useShortName ? currentModel.badge : currentModel.name}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-amber-500' : ''
            }`}
          />
        </button>
      )}

      {/* 2. Round / Compact Model Switcher Button */}
      {effectiveVariant === 'round' && (
        <button
          id="btn-model-switcher-round"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={`Active Model: ${currentModel.name}`}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-xs tracking-wider transition-all duration-200 border shadow-md active:scale-95 ${
            isDark
              ? 'bg-neutral-900 border-neutral-700 text-amber-400 hover:border-amber-500/50 hover:bg-neutral-800 shadow-black/40'
              : 'bg-white border-neutral-300 text-amber-600 hover:border-amber-400 hover:bg-neutral-50 shadow-neutral-200'
          }`}
        >
          <span>{currentModel.badge}</span>
        </button>
      )}

      {/* 3. Pill Switcher Button */}
      {effectiveVariant === 'pill' && (
        <button
          id="btn-model-switcher"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
            isDark
              ? 'bg-neutral-900/90 border-neutral-700 text-neutral-200 hover:border-neutral-600 hover:text-white'
              : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
          }`}
        >
          {useShortName ? (
            <span className="font-display font-semibold text-amber-500 dark:text-amber-400">
              {currentModel.badge}
            </span>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                {currentModel.badge}
              </div>
              <span className="font-display font-medium">{currentModel.name}</span>
            </>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          id="menu-model-selector"
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-72 sm:w-84 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-neutral-950/95 backdrop-blur-md border-neutral-800 text-white shadow-black/80'
              : 'bg-white/95 backdrop-blur-md border-neutral-200 text-neutral-900 shadow-neutral-300'
          }`}
        >
          <div className={`px-3 py-2 border-b flex items-center justify-between ${
            isDark ? 'border-neutral-800/40' : 'border-neutral-200'
          }`}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Select Model
            </span>
            <div className={`flex items-center gap-1 text-[11px] font-medium ${
              isDark ? 'text-amber-400' : 'text-amber-700'
            }`}>
              <Sparkles className="w-3 h-3" />
              <span>ForgeX Engine</span>
            </div>
          </div>

          <div className="py-1 space-y-1">
            {FORGEX_MODELS.map((model: ForgeXModel) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  id={`model-option-${model.id}`}
                  type="button"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? isDark
                        ? 'bg-amber-500/10 text-white border border-amber-500/30'
                        : 'bg-amber-50 text-neutral-900 border border-amber-300'
                      : isDark
                        ? 'hover:bg-neutral-800/60 text-neutral-300 hover:text-white'
                        : 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  {/* Radio / Selection Indicator */}
                  <div className="mt-0.5 shrink-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-neutral-950'
                          : isDark
                            ? 'border-neutral-600'
                            : 'border-neutral-400'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                    </div>
                  </div>

                  {/* Model Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-sm">
                        {model.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-400'
                            : isDark
                              ? 'bg-neutral-800 text-neutral-400'
                              : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {model.badge}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        isSelected
                          ? isDark
                            ? 'text-neutral-300'
                            : 'text-neutral-600'
                          : isDark
                            ? 'text-neutral-400'
                            : 'text-neutral-500'
                      }`}
                    >
                      {model.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
