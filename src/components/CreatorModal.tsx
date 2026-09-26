import React from 'react';
import { X, ArrowLeft, User, Compass, Sparkles, Target } from 'lucide-react';
import { ForgeXTheme } from '../types';
import { ForgeXLogo } from './ForgeXLogo';

interface CreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ForgeXTheme;
}

export const CreatorModal: React.FC<CreatorModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
      <div
        id="modal-creator-forgex"
        className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/80'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        {/* Close Button */}
        <button
          id="btn-close-creator"
          onClick={onClose}
          className={`absolute top-6 right-6 p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ForgeXLogo className="w-5 h-5 text-neutral-900 dark:text-white" />
          </div>
          <div>
            <h2 id="creator-title" className="font-display font-bold text-2xl sm:text-3xl">
              The Creator
            </h2>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Vision & Origin of ForgeX
            </p>
          </div>
        </div>

        {/* Placeholder Identity Banner */}
        <div
          className={`p-5 rounded-2xl border mb-6 flex items-start gap-4 ${
            isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-amber-400">
              VishweshVarman
            </h3>
            <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              Creator & Architect of ForgeX, building powerful AI creation tools accessible from one simple workspace.
            </p>
          </div>
        </div>

        {/* Sections Grid */}
        <div className="space-y-4 mb-8">
          {/* Section 1: About the creator */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-neutral-950/40 border-neutral-800/80' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 text-amber-400">
              <User className="w-4 h-4" />
              <h4 className="font-display font-semibold text-sm">About the Creator</h4>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Independent software designer and creative technologist passionate about human-AI symbiosis, high-performance interfaces, and fluid digital generative tools.
            </p>
          </div>

          {/* Section 2: Why ForgeX was created */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-neutral-950/40 border-neutral-800/80' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 text-amber-400">
              <Compass className="w-4 h-4" />
              <h4 className="font-display font-semibold text-sm">Why ForgeX Was Created</h4>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Creative AI had become fragmented across dozens of complex portals. ForgeX was forged to unify intelligent conversation, visual art generation, and cinematic motion synthesis under one lightning-fast, distraction-free environment.
            </p>
          </div>

          {/* Section 3: Vision */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-neutral-950/40 border-neutral-800/80' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-display font-semibold text-sm">Vision</h4>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              To democratize professional digital studio capabilities, enabling writers, directors, concept artists, and founders to translate imagination into production-ready media effortlessly.
            </p>
          </div>

          {/* Section 4: Future plans */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-neutral-950/40 border-neutral-800/80' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 text-amber-400">
              <Target className="w-4 h-4" />
              <h4 className="font-display font-semibold text-sm">Future Plans</h4>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Expanding cross-modal pipelines (direct text-to-storyboard orchestration), custom fine-tuned weights, audio/voice synthesis integration, and real-time multiplayer creative canvas sessions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800/40">
          <button
            id="btn-back-to-forgex-creator"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 border transition-colors ${
              isDark
                ? 'bg-neutral-800/70 hover:bg-neutral-700/80 border-neutral-700 text-neutral-200'
                : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to ForgeX</span>
          </button>
        </div>
      </div>
    </div>
  );
};
