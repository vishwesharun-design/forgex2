import React from 'react';
import { Zap, ArrowRight, Sparkles, MessageSquare, Image as ImageIcon, Video as VideoIcon, BookOpen } from 'lucide-react';
import { ForgeXTheme, ActiveWorkspace, ForgeXModelId, FORGEX_MODELS } from '../types';

interface LandingHeroProps {
  theme: ForgeXTheme;
  onGetStarted: () => void; // Explains everything about the app
  onLaunchStudio: (initialWorkspace?: ActiveWorkspace) => void;
  onExplore: () => void;
  selectedModelId?: ForgeXModelId;
  onSelectModel?: (id: ForgeXModelId) => void;
  isAuthenticated?: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  theme,
  onGetStarted,
  onLaunchStudio,
  onExplore,
  selectedModelId = 'unreal-5',
  onSelectModel,
  isAuthenticated = false,
}) => {
  const isDark = theme === 'dark';

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-20 pb-12 z-10 select-none">
      {/* Subtle central radial glow */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] rounded-full pointer-events-none blur-3xl transition-opacity duration-1000 ${
          isDark 
            ? 'bg-amber-500/10' 
            : 'bg-amber-500/5'
        }`}
      />

      <div className="relative max-w-3xl mx-auto flex flex-col items-center">
        {/* Large ForgeX logo with subtle aura */}
        <div className="relative mb-6 group cursor-default">
          <div 
            className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl group-hover:bg-amber-400/30 transition-all duration-500" 
          />
          <div 
            id="hero-lightning-logo"
            className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center border transition-all duration-500 shadow-2xl ${
              isDark
                ? 'bg-neutral-900/90 border-neutral-700/80 text-amber-400 shadow-amber-500/10'
                : 'bg-white/90 border-amber-500/30 text-amber-500 shadow-amber-500/15'
            }`}
          >
            <Zap className="w-14 h-14 sm:w-16 sm:h-16 fill-amber-400 text-amber-400 glow-lightning animate-pulse" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 
          id="hero-brand-heading"
          className="font-display font-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight mb-3"
        >
          Forge<span className="text-amber-400">X</span>
        </h1>

        {/* Tagline */}
        <h2 
          id="hero-tagline"
          className={`font-display font-semibold text-2xl sm:text-3xl md:text-4xl tracking-tight mb-4 ${
            isDark ? 'text-neutral-200' : 'text-neutral-800'
          }`}
        >
          Create. Imagine. Generate.
        </h2>

        {/* Description */}
        <p 
          id="hero-description"
          className={`text-lg sm:text-xl font-normal max-w-xl mx-auto mb-8 leading-relaxed ${
            isDark ? 'text-neutral-400' : 'text-neutral-600'
          }`}
        >
          One powerful AI workspace for conversations, images, and videos.
        </p>

        {/* Unreal Engine Model Selection Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {FORGEX_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => onSelectModel && onSelectModel(model.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center transition-all ${
                selectedModelId === model.id
                  ? 'bg-amber-500 text-neutral-950 font-bold border-amber-500 shadow-sm'
                  : isDark
                    ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    : 'bg-white/80 border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400 mr-1 shrink-0" />
              <span>{model.name}</span>
            </button>
          ))}
        </div>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-12">
          {/* Main "Get Started" Button: Explains everything about ForgeX */}
          <button
            id="hero-btn-getstarted"
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-[0.98] transition-all duration-200"
          >
            <BookOpen className="w-4 h-4" />
            <span>Get Started — Learn How It Works</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary CTA: Direct Studio Entry */}
          <button
            id="hero-btn-launch"
            onClick={() => onLaunchStudio('chat')}
            className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl text-base font-medium border flex items-center justify-center gap-2 transition-all duration-200 ${
              isDark
                ? 'bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800 text-neutral-200 hover:text-white'
                : 'bg-white/80 hover:bg-neutral-100 border-neutral-200 text-neutral-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isAuthenticated ? 'Open Studio' : 'Enter Studio'}</span>
          </button>
        </div>

        {/* Modality feature pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div 
            id="hero-card-chat"
            onClick={onGetStarted}
            className={`p-4 rounded-2xl border backdrop-blur-sm transition-all duration-200 cursor-pointer ${
              isDark 
                ? 'bg-neutral-900/40 border-neutral-800/80 hover:border-amber-500/50 hover:bg-neutral-850/60' 
                : 'bg-white/60 border-neutral-200/80 hover:border-amber-400 hover:bg-white shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-display font-semibold text-sm">ForgeX Chat</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Multi-model reasoning and coding intelligence. Click to learn how it works.
            </p>
          </div>

          <div 
            id="hero-card-image"
            onClick={onGetStarted}
            className={`p-4 rounded-2xl border backdrop-blur-sm transition-all duration-200 cursor-pointer ${
              isDark 
                ? 'bg-neutral-900/40 border-neutral-800/80 hover:border-amber-500/50 hover:bg-neutral-850/60' 
                : 'bg-white/60 border-neutral-200/80 hover:border-amber-400 hover:bg-white shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="font-display font-semibold text-sm">Image Studio</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              High-fidelity visual synthesis across 7 styles. Click to learn how it works.
            </p>
          </div>

          <div 
            id="hero-card-video"
            onClick={onGetStarted}
            className={`p-4 rounded-2xl border backdrop-blur-sm transition-all duration-200 cursor-pointer ${
              isDark 
                ? 'bg-neutral-900/40 border-neutral-800/80 hover:border-amber-500/50 hover:bg-neutral-850/60' 
                : 'bg-white/60 border-neutral-200/80 hover:border-amber-400 hover:bg-white shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <VideoIcon className="w-4 h-4" />
              </div>
              <span className="font-display font-semibold text-sm">Video Studio</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Dynamic motion sequence generation. Click to learn how it works.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
