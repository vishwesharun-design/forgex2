import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'motion/react';
import {
  Zap,
  ArrowRight,
  ArrowDown,
  Cpu,
  MessageSquare,
  Image as ImageIcon,
  Code2,
  BookOpen,
  Music,
  Globe,
} from 'lucide-react';
import {
  ForgeXTheme,
  ActiveWorkspace,
  ForgeXModelId,
  FORGEX_MODELS,
} from '../types';
import { ForgeXLogo } from './ForgeXLogo';
import { Landing3DCore } from './Landing3DCore';

interface LandingHeroProps {
  theme: ForgeXTheme;
  onGetStarted: () => void;
  onLaunchStudio: (initialWorkspace?: ActiveWorkspace) => void;
  onExplore: () => void;
  selectedModelId?: ForgeXModelId;
  onSelectModel?: (id: ForgeXModelId) => void;
  isAuthenticated?: boolean;
  reduceMotion?: boolean;
}

const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Converse & Reason',
    meta: 'Forge 2 Ultra · Live Web Grounding · Structured Math',
    description:
      'Draft specifications, analyze documents, and verify complex logic with multi-step reasoning and cited live web search.',
    workspace: 'chat' as ActiveWorkspace,
  },
  {
    number: '02',
    title: 'Synthesize Visuals & Audio',
    meta: '7 Visual Styles · Original Stems · Real-Time Canvas',
    description:
      'Generate artwork across curated artistic styles, compose full musical tracks with lyrics, and sketch concepts on an interactive board.',
    workspace: 'image' as ActiveWorkspace,
  },
  {
    number: '03',
    title: 'Build & Ship Full-Stack Code',
    meta: 'Multi-File Projects · Live Preview · Auto-Correction',
    description:
      'Architect complete web applications inside Code Studio with automated syntax verification and instant browser previews.',
    workspace: 'code' as ActiveWorkspace,
  },
];

export const LandingHero: React.FC<LandingHeroProps> = ({
  theme,
  onGetStarted,
  onLaunchStudio,
  selectedModelId = 'forge-2-ultra',
  onSelectModel,
  isAuthenticated = false,
  reduceMotion = false,
}) => {
  const isDark = theme === 'dark';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const studiosSectionRef = useRef<HTMLElement | null>(null);
  const scrollProgressRef = useRef<number>(0);

  const { scrollYProgress } = useScroll();
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    scrollProgressRef.current = latest;
  });

  // Scroll-linked compositor transforms (transform & opacity only)
  const heroModelY = useTransform(scrollYProgress, [0, 0.35], [0, -32]);
  const heroModelScale = useTransform(scrollYProgress, [0, 0.35], [1, 0.96]);
  const heroTextY = useTransform(scrollYProgress, [0, 0.3], [0, -18]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.4]);

  const activeModel =
    FORGEX_MODELS.find((m) => m.id === selectedModelId) ||
    FORGEX_MODELS[FORGEX_MODELS.length - 1];

  const handleScrollToStudios = () => {
    studiosSectionRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const revealTransition = (delay = 0) =>
    reduceMotion
      ? { duration: 0 }
      : {
          duration: 0.55,
          delay,
          ease: [0.16, 1, 0.3, 1] as const,
        };

  return (
    <div ref={rootRef} className="relative z-10 w-full overflow-x-clip">
      {/* Top Scroll Progress Indicator */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: scrollYProgress, transformOrigin: '0% 50%' }}
        className="fixed top-0 left-0 right-0 h-[2px] z-50 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 pointer-events-none"
      />

      {/* SECTION 1: HERO VIEWPORT WITH INTERACTIVE 3D MODEL */}
      <section className="relative min-h-[calc(100dvh-40px)] flex flex-col justify-center px-4 sm:px-8 pt-20 sm:pt-24 pb-10 sm:pb-12 max-w-6xl mx-auto">
        {/* Subtle ambient radial glow linked to scroll */}
        <motion.div
          style={reduceMotion ? undefined : { opacity: glowOpacity }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(360px,88vw)] sm:w-[640px] h-[min(360px,88vw)] sm:h-[640px] rounded-full pointer-events-none blur-3xl ${
            isDark ? 'bg-amber-500/10' : 'bg-amber-500/6'
          }`}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-10">
          {/* Left Column: Typography, Model Tiers & CTAs */}
          <motion.div
            style={reduceMotion ? undefined : { y: heroTextY }}
            className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            {/* Brand Emblem & Lockup */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0)}
              className="flex items-center gap-4 mb-5"
            >
              <div
                id="hero-lightning-logo"
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border shadow-lg shrink-0 ${
                  isDark
                    ? 'bg-neutral-900/90 border-neutral-800 text-amber-400'
                    : 'bg-white border-amber-500/25 text-amber-500'
                }`}
              >
                <ForgeXLogo className="w-9 h-9 sm:w-10 sm:h-10 text-neutral-900 dark:text-white" />
              </div>

              <div className="text-left">
                <p
                  className={`text-xs font-medium tracking-wide ${
                    isDark ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                >
                  Multimodal Creation Platform · 5 Reasoning Tiers
                </p>
                <h1
                  id="hero-brand-heading"
                  className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl tracking-tight leading-none"
                >
                  Forge<span className={isDark ? 'text-amber-400' : 'text-amber-500'}>X</span>
                </h1>
              </div>
            </motion.div>

            {/* Tagline */}
            <motion.h2
              id="hero-tagline"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.08)}
              className={`font-display font-semibold text-2xl sm:text-3xl md:text-4xl tracking-tight mb-3 text-balance ${
                isDark ? 'text-neutral-100' : 'text-neutral-900'
              }`}
            >
              Create. Imagine. Generate.
            </motion.h2>

            {/* Description */}
            <motion.p
              id="hero-description"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.14)}
              className={`text-base sm:text-lg font-normal max-w-xl mb-6 leading-relaxed ${
                isDark ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              One unified AI workspace for conversations, image synthesis, full-stack code,
              deep web research, and original music creation.
            </motion.p>

            {/* Interactive Model Tier Controls */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.2)}
              className={`inline-flex flex-wrap items-center justify-center lg:justify-start gap-1.5 p-1.5 rounded-2xl border mb-7 ${
                isDark
                  ? 'bg-neutral-900/75 border-neutral-800'
                  : 'bg-neutral-100/90 border-neutral-200'
              }`}
            >
              {FORGEX_MODELS.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onSelectModel && onSelectModel(model.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                        : isDark
                          ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                          : 'text-neutral-700 hover:text-neutral-950 hover:bg-white'
                    }`}
                  >
                    <Zap
                      className={`w-3 h-3 shrink-0 ${
                        isSelected
                          ? 'text-neutral-950'
                          : isDark
                            ? 'text-amber-400'
                            : 'text-amber-600'
                      }`}
                    />
                    <span>{model.name}</span>
                  </button>
                );
              })}
            </motion.div>

            {/* Call to action buttons */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.26)}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 w-full sm:w-auto"
            >
              <button
                id="hero-btn-getstarted"
                onClick={onGetStarted}
                className="w-full sm:w-auto max-w-full px-4 sm:px-7 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2 sm:gap-2.5 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 active:scale-[0.98] transition-all duration-200 whitespace-normal sm:whitespace-nowrap text-center"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Get Started — Learn How It Works</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                id="hero-btn-launch"
                onClick={() => onLaunchStudio('chat')}
                className={`w-full sm:w-auto max-w-full px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-medium border flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap shrink-0 ${
                  isDark
                    ? 'bg-neutral-900/70 hover:bg-neutral-800 border-neutral-800 text-neutral-200 hover:text-white'
                    : 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-900 shadow-xs'
                }`}
              >
                <Cpu className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>{isAuthenticated ? 'Open Workspace' : 'Enter ForgeX'}</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column: Interactive 3D ForgeX Neural Core */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={revealTransition(0.16)}
            style={
              reduceMotion
                ? undefined
                : { y: heroModelY, scale: heroModelScale }
            }
            className="lg:col-span-5 w-full"
          >
            <div
              className={`relative w-full h-[300px] sm:h-[440px] lg:h-[490px] rounded-3xl border overflow-hidden ${
                isDark
                  ? 'bg-neutral-900/45 border-neutral-800/90'
                  : 'bg-white/75 border-neutral-200/90 shadow-sm'
              }`}
            >
              {/* Minimal top-left static caption (unboxed text, no backdrop-blur over WebGL) */}
              <div className="absolute top-4 left-5 z-10 pointer-events-none">
                <p
                  className={`text-xs font-medium ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                >
                  ForgeX Kinetic Core · <span className="text-amber-500">{activeModel.name}</span>
                </p>
                <p
                  className={`text-[11px] font-mono tabular-nums ${
                    isDark ? 'text-neutral-500' : 'text-neutral-500'
                  }`}
                >
                  Drag to inspect · Scroll to expand
                </p>
              </div>

              <Landing3DCore
                theme={theme}
                modelLevel={activeModel.capabilityLevel}
                scrollProgressRef={scrollProgressRef}
                reduceMotion={reduceMotion}
              />
            </div>
          </motion.div>
        </div>

        {/* Scroll Discovery Prompt */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={revealTransition(0.4)}
          className="mt-10 flex justify-center"
        >
          <button
            type="button"
            onClick={handleScrollToStudios}
            className={`inline-flex items-center gap-2 text-xs font-medium py-2 px-4 rounded-xl transition-colors ${
              isDark
                ? 'text-neutral-400 hover:text-amber-400'
                : 'text-neutral-600 hover:text-amber-600'
            }`}
          >
            <span>Scroll to explore tools & architecture</span>
            <ArrowDown className={`w-3.5 h-3.5 ${reduceMotion ? '' : 'animate-bounce'}`} />
          </button>
        </motion.div>
      </section>

      {/* SECTION 2: SCROLL-ANIMATED MULTIMODAL WORKSPACE ARCHITECTURE */}
      <section
        ref={studiosSectionRef}
        className={`relative px-4 sm:px-8 py-20 border-t ${
          isDark ? 'border-neutral-900' : 'border-neutral-200/80'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={revealTransition(0)}
            className="max-w-2xl mb-12"
          >
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
              Workspace Architecture · All Tools Inside Chat
            </p>
            <h2
              className={`font-display font-bold text-3xl sm:text-4xl tracking-tight mb-3 text-balance ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Every creative discipline in one continuous workspace.
            </h2>
            <p className={`text-base leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Switch seamlessly between reasoning, image synthesis, multi-file engineering,
              music production, and live web research without losing context.
            </p>
          </motion.div>

          {/* Asymmetric Bento Grid with staggered scroll reveals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. ForgeX Chat (2-col span) */}
            <motion.button
              type="button"
              id="hero-card-chat"
              onClick={() => onLaunchStudio('chat')}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={revealTransition(0.05)}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              className={`md:col-span-2 text-left p-6 sm:p-7 rounded-2xl border transition-colors cursor-pointer group ${
                isDark
                  ? 'bg-neutral-900/55 border-neutral-800 hover:border-amber-500/50'
                  : 'bg-white border-neutral-200 hover:border-amber-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      isDark ? 'bg-amber-500/12 text-amber-400' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">ForgeX Chat</h3>
                    <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                      Conversational Reasoning · LaTeX Math · Live Web Grounding
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </div>
              <p className={`text-sm leading-relaxed max-w-xl ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                Stream answers powered by Forge 1 through Forge 2 Ultra with automatic live web
                search citations, interactive charts, quizzes, and knowledge vault grounding.
              </p>
            </motion.button>

            {/* 2. Image Studio */}
            <motion.button
              type="button"
              id="hero-card-image"
              onClick={() => onLaunchStudio('image')}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={revealTransition(0.12)}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              className={`text-left p-6 sm:p-7 rounded-2xl border transition-colors cursor-pointer group ${
                isDark
                  ? 'bg-neutral-900/55 border-neutral-800 hover:border-amber-500/50'
                  : 'bg-white border-neutral-200 hover:border-amber-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-2.5 rounded-xl ${
                    isDark ? 'bg-amber-500/12 text-amber-400' : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <ImageIcon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">Image Generator</h3>
              <p className={`text-xs mb-2.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                7 Curated Styles · Aspect Control
              </p>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                High-fidelity visual synthesis across Photorealistic, Claymation, Anime, 3D CGI,
                and Handwritten Study Notes.
              </p>
            </motion.button>

            {/* 3. Code Workspace */}
            <motion.button
              type="button"
              id="hero-card-code"
              onClick={() => onLaunchStudio('code')}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={revealTransition(0.18)}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              className={`text-left p-6 sm:p-7 rounded-2xl border transition-colors cursor-pointer group ${
                isDark
                  ? 'bg-neutral-900/55 border-neutral-800 hover:border-amber-500/50'
                  : 'bg-white border-neutral-200 hover:border-amber-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-2.5 rounded-xl ${
                    isDark ? 'bg-amber-500/12 text-amber-400' : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Code2 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">Code Workspace</h3>
              <p className={`text-xs mb-2.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Multi-File · Auto-Correction
              </p>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                Full-stack multi-file coding workspace with automated error recovery and instant
                sandboxed live preview.
              </p>
            </motion.button>

            {/* 4. Music & Deep Research (2-col span) */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={revealTransition(0.24)}
              className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <button
                type="button"
                onClick={() => onLaunchStudio('music')}
                className={`text-left p-6 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-0.5 ${
                  isDark
                    ? 'bg-neutral-900/55 border-neutral-800 hover:border-amber-500/50'
                    : 'bg-white border-neutral-200 hover:border-amber-400 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isDark ? 'bg-amber-500/12 text-amber-400' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <Music className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-display font-semibold text-base mb-1">Make Song</h3>
                <p className={`text-xs mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Lyrics · BPM Control · Audio Visualizer
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  Compose original tracks, structured song lyrics, and harmonic instrumentals.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onLaunchStudio('research')}
                className={`text-left p-6 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-0.5 ${
                  isDark
                    ? 'bg-neutral-900/55 border-neutral-800 hover:border-amber-500/50'
                    : 'bg-white border-neutral-200 hover:border-amber-400 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isDark ? 'bg-amber-500/12 text-amber-400' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-display font-semibold text-base mb-1">Deep Research</h3>
                <p className={`text-xs mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Multi-Source Synthesis · Verified Citations
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  Execute structured multi-pass research reports grounded in verified external
                  sources.
                </p>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3: SCROLL-REVEALED MODEL TIERS & WORKFLOW */}
      <section
        className={`relative px-4 sm:px-8 py-20 border-t ${
          isDark ? 'border-neutral-900 bg-neutral-950/50' : 'border-neutral-200/80 bg-neutral-50/70'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left: Model Tiers */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={revealTransition(0)}
              className="lg:col-span-5"
            >
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                Adaptive Intelligence · Select Active Tier
              </p>
              <h2
                className={`font-display font-bold text-3xl tracking-tight mb-4 ${
                  isDark ? 'text-white' : 'text-neutral-950'
                }`}
              >
                Calibrated from instant speed to deep synthesis.
              </h2>
              <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Pick any Forge tier to configure reasoning depth. Your selection updates the
                kinetic 3D core above and carries directly into your studio session.
              </p>

              <div className="space-y-2">
                {FORGEX_MODELS.map((model, idx) => {
                  const active = model.id === selectedModelId;
                  return (
                    <motion.button
                      key={model.id}
                      type="button"
                      onClick={() => onSelectModel && onSelectModel(model.id)}
                      initial={reduceMotion ? false : { opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={revealTransition(idx * 0.06)}
                      className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                        active
                          ? 'bg-amber-500/12 border-amber-500/60'
                          : isDark
                            ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-display font-semibold text-sm ${
                              active
                                ? 'text-amber-600 dark:text-amber-400'
                                : isDark
                                  ? 'text-neutral-100'
                                  : 'text-neutral-900'
                            }`}
                          >
                            {model.name}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-neutral-500">
                            · Tier {model.capabilityLevel}/5
                          </span>
                        </div>
                        <p className={`text-xs truncate ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                          {model.description}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono tabular-nums shrink-0 ${
                          active ? 'text-amber-500 font-semibold' : 'text-neutral-400'
                        }`}
                      >
                        {model.badge}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Right: 3-Step Numbered Editorial Workflow */}
            <div className="lg:col-span-7 space-y-6">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={revealTransition(0.05)}
              >
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                  Workflow · Prompt to Production
                </p>
                <h2
                  className={`font-display font-bold text-3xl tracking-tight mb-6 ${
                    isDark ? 'text-white' : 'text-neutral-950'
                  }`}
                >
                  Built for real creation cycles.
                </h2>
              </motion.div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <motion.div
                    key={step.number}
                    initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={revealTransition(0.08 + idx * 0.08)}
                    className="py-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-sm font-semibold tabular-nums text-amber-500 pt-0.5 shrink-0">
                        {step.number}.
                      </span>
                      <div>
                        <h3 className="font-display font-semibold text-lg mb-1">{step.title}</h3>
                        <p className={`text-xs mb-2 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                          {step.meta}
                        </p>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onLaunchStudio(step.workspace)}
                      className={`self-start px-3.5 py-2 rounded-xl text-xs font-medium border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        isDark
                          ? 'border-neutral-800 hover:border-amber-500/60 text-neutral-300 hover:text-amber-400'
                          : 'border-neutral-200 hover:border-amber-400 text-neutral-700 hover:text-amber-600 bg-white'
                      }`}
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Final CTA Strip */}
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={revealTransition(0.1)}
                className="pt-4 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => onLaunchStudio('chat')}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{isAuthenticated ? 'Open Chat Workspace' : 'Launch ForgeX'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className={`px-5 py-3 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    isDark
                      ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-300'
                      : 'border-neutral-300 hover:bg-white text-neutral-700'
                  }`}
                >
                  Read Platform Guide
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
