import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ChevronDown } from 'lucide-react';
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
    <div ref={containerRef} className="relative inline-block text-left min-w-0">
      {/* 1. ChatGPT-style Minimal Header Dropdown Button */}
      {effectiveVariant === 'chatgpt' && (
        <button
          id="btn-model-switcher-chatgpt"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl font-display font-semibold transition-all duration-150 min-w-0 max-w-full ${
            useShortName ? 'text-xs sm:text-base' : 'text-sm sm:text-lg'
          } ${
            isDark
              ? 'text-neutral-200 hover:text-white hover:bg-neutral-900/90'
              : 'text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100'
          }`}
        >
          <span className="truncate max-w-[104px] sm:max-w-none">
            {useShortName ? currentModel.badge : currentModel.name}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180' : ''
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
              ? 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800 shadow-black/40'
              : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 shadow-neutral-200'
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
          <span className="font-display font-medium">
            {useShortName ? currentModel.badge : currentModel.name}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          id="menu-model-selector"
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-56 sm:w-60 max-w-[calc(100vw-24px)] rounded-2xl border p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
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
              Models
            </span>
            <Cpu className={`w-3.5 h-3.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`} />
          </div>

          <div className="py-1 space-y-1">
            {FORGEX_MODELS.map((model: ForgeXModel) => {
              const isSelected = model.id === normalizedId;
              return (
                <button
                  key={model.id}
                  id={`model-option-${model.id}`}
                  type="button"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
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
                  <span className="truncate">{model.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
