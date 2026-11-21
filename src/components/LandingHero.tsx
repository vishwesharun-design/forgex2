import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion, type Variants } from 'motion/react';
import {
  ArrowRight,
  ArrowUp,
  AudioLines,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Flower2,
  Gamepad2,
  Globe,
  Image as ImageIcon,
  LogIn,
  MessageSquare,
  Mic,
  Music,
  Palette,
  PanelLeftClose,
  Pause,
  Play,
  Plus,
  Scan,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Video,
  Zap,
} from 'lucide-react';
import { ActiveWorkspace, ForgeXModelId, ForgeXTheme } from '../types';
import { ForgeXLogo } from './ForgeXLogo';
import floralSynthesisImg from '../assets/images/model_floral_synthesis_1795140923194.jpg';
import kineticHorizonImg from '../assets/images/model_kinetic_horizon_1795140922378.jpg';
import neonSnakeImg from '../assets/images/gallery_neon_snake_1795140922300.jpg';
import windowSeatImg from '../assets/images/gallery_window_seat_1795140922665.jpg';
import skyMetropolisImg from '../assets/images/gallery_sky_metropolis_1795140922670.jpg';

interface LandingHeroProps {
  theme: ForgeXTheme;
  onGetStarted: () => void;
  onLaunchStudio: (initialWorkspace?: ActiveWorkspace, initialPrompt?: string) => void;
  onExplore: () => void;
  selectedModelId?: ForgeXModelId;
  onSelectModel?: (id: ForgeXModelId) => void;
  isAuthenticated?: boolean;
  reduceMotion?: boolean;
}

type PersonaTabId = 'tinkerers' | 'builders' | 'developers' | 'learners';
type ShowcaseModelChipId = 'forge-chat' | 'image-studio' | 'omni-vision' | 'song-maker' | 'voice-tts';
type GalleryCategoryId = 'featured' | 'personal' | 'games' | 'art';

interface PersonaConfig {
  id: PersonaTabId;
  label: string;
  subtitle: string;
  defaultChip: ShowcaseModelChipId;
  defaultPrompt: string;
}

const PERSONA_TABS: PersonaConfig[] = [
  {
    id: 'tinkerers',
    label: 'For tinkerers',
    subtitle: 'Try the latest multimodal ForgeX models inside the interactive ForgeX workspace.',
    defaultChip: 'song-maker',
    defaultPrompt: 'Read this like a calm late-night studio narrator introducing a new track',
  },
  {
    id: 'builders',
    label: 'For builders',
    subtitle: 'Turn a prompt into a live full-stack web app inside Code Studio.',
    defaultChip: 'omni-vision',
    defaultPrompt: 'Build an interactive weather window app with live scenic landscapes',
  },
  {
    id: 'developers',
    label: 'For developers',
    subtitle: 'Test reasoning tiers, inspect structured outputs, and iterate rapidly.',
    defaultChip: 'forge-chat',
    defaultPrompt: 'Compare edge caching patterns and write a clean TypeScript worker',
  },
  {
    id: 'learners',
    label: 'For learners',
    subtitle: 'Synthesize handwritten study notes, solve math, and run deep research.',
    defaultChip: 'image-studio',
    defaultPrompt: 'Create visual study notes explaining neural attention mechanisms',
  },
];

interface ShowcaseDemo {
  id: ShowcaseModelChipId;
  chipLabel: string;
  modelDisplayName: string;
  modelTechId: string;
  sessionTitle: string;
  userPrompt: string;
  workspace: ActiveWorkspace;
  mappedForgeModel: ForgeXModelId;
  defaultInputText: string;
}

const SHOWCASE_DEMOS: Record<ShowcaseModelChipId, ShowcaseDemo> = {
  'forge-chat': {
    id: 'forge-chat',
    chipLabel: 'Forge 2 Ultra',
    modelDisplayName: 'Forge 2 Ultra',
    modelTechId: 'forge-2-ultra',
    sessionTitle: 'Live Web Grounding',
    userPrompt: 'Summarize the key breakthroughs in multimodal reasoning and cite current sources.',
    workspace: 'chat',
    mappedForgeModel: 'forge-2-ultra',
    defaultInputText: 'Explain quantum error correction with a clear interactive table',
  },
  'image-studio': {
    id: 'image-studio',
    chipLabel: 'Image Studio',
    modelDisplayName: 'Forge Image Engine',
    modelTechId: 'forge-image-2.1',
    sessionTitle: 'Botanical sculpture',
    userPrompt: 'A woven archway of pink roses, yellow tulips, and lavender with monarch butterflies under clear daylight.',
    workspace: 'image',
    mappedForgeModel: 'forge-1.5',
    defaultInputText: 'Generate a minimalist architectural pavilion at golden hour',
  },
  'omni-vision': {
    id: 'omni-vision',
    chipLabel: 'Omni Vision',
    modelDisplayName: 'Forge Omni Flash',
    modelTechId: 'forge-omni-flash',
    sessionTitle: 'Ink drop in slow motion',
    userPrompt: 'Describe atmospheric light diffusion across coastal mist and ocean horizons.',
    workspace: 'research',
    mappedForgeModel: 'forge-2-pro',
    defaultInputText: 'Analyze atmospheric scattering in misty coastal landscapes',
  },
  'song-maker': {
    id: 'song-maker',
    chipLabel: 'Song Maker',
    modelDisplayName: 'Forge Audio 3.5',
    modelTechId: 'forge-lyria-3.5',
    sessionTitle: 'Late-night lo-fi',
    userPrompt: 'A warm lo-fi track with soft piano and vinyl crackle for late-night coding.',
    workspace: 'music',
    mappedForgeModel: 'forge-2',
    defaultInputText: 'Compose an ambient acoustic guitar loop at 86 BPM',
  },
  'voice-tts': {
    id: 'voice-tts',
    chipLabel: 'Voice TTS',
    modelDisplayName: 'Forge Voice TTS',
    modelTechId: 'forge-tts-3.8',
    sessionTitle: 'Cinematic narration',
    userPrompt: 'Read this like a calm documentary host opening a midnight creative session.',
    workspace: 'chat',
    mappedForgeModel: 'forge-1',
    defaultInputText: 'Read this like a warm storyteller introducing ForgeX',
  },
};

interface ModelShowcaseCard {
  id: string;
  title: string;
  subtitle: string;
  kind: 'waveform' | 'image';
  image?: string;
  workspace: ActiveWorkspace;
}

const LATEST_MODEL_CARDS: ModelShowcaseCard[] = [
  {
    id: 'audio-voice',
    title: 'Forge Audio & Voice Studio',
    subtitle: 'Original song composition, adaptive BPM stems, and natural spoken narration.',
    kind: 'waveform',
    workspace: 'music',
  },
  {
    id: 'image-synthesis',
    title: 'Visual Synthesis Engine',
    subtitle: 'Photorealistic scenes, isometric dioramas, and handwritten visual study notes.',
    kind: 'image',
    image: floralSynthesisImg,
    workspace: 'image',
  },
  {
    id: 'omni-research',
    title: 'Deep Research & Omni Horizon',
    subtitle: 'Multi-pass external synthesis with live web grounding and cited sources.',
    kind: 'image',
    image: kineticHorizonImg,
    workspace: 'research',
  },
  {
    id: 'code-arcade',
    title: 'Code Studio & Interactive Apps',
    subtitle: 'Generate playable 2D/3D web apps with instant browser preview and auto-fix.',
    kind: 'image',
    image: neonSnakeImg,
    workspace: 'code',
  },
];

interface GalleryAppCard {
  id: string;
  category: Exclude<GalleryCategoryId, 'featured'>;
  featured?: boolean;
  title: string;
  description: string;
  image: string;
  remixPrompt: string;
  overlayBadge?: string;
}

const GALLERY_APPS: GalleryAppCard[] = [
  {
    id: 'neon-snake',
    category: 'games',
    featured: true,
    title: 'Multiplayer Neon Snake',
    description: 'Collect orbs to dominate the neon grid in this real-time multiplayer snake game.',
    image: neonSnakeImg,
    remixPrompt: 'Build a real-time Multiplayer Neon Snake web game with glowing grid trails, energy orbs, and a live scoreboard in Code Studio.',
  },
  {
    id: 'window-seat',
    category: 'personal',
    featured: true,
    title: 'Window Seat',
    description: 'Generate photorealistic window views based on live weather and specific locations.',
    image: windowSeatImg,
    remixPrompt: 'Create Window Seat, a web app that renders scenic window views paired with live location weather telemetry and atmospheric forecasts.',
    overlayBadge: 'WEATHER FORECAST',
  },
  {
    id: 'sky-metropolis',
    category: 'art',
    featured: true,
    title: 'Sky Metropolis',
    description: 'Manage a virtual metropolis and fulfill tasks engineered with ForgeX intelligence.',
    image: skyMetropolisImg,
    remixPrompt: 'Build Sky Metropolis, an isometric floating city builder where players place tiles, watch clouds drift, and complete AI city directives.',
  },
  {
    id: 'botanical-atelier',
    category: 'art',
    title: 'Botanical Atelier',
    description: 'Interactive generative flora archways reactive to cursor movement and sunlight.',
    image: floralSynthesisImg,
    remixPrompt: 'Create an interactive botanical garden art canvas with blooming flora particles and sunlit daylight controls.',
  },
  {
    id: 'horizon-journal',
    category: 'personal',
    title: 'Horizon Dispatch',
    description: 'Minimalist personal travel log paired with atmospheric sky palettes and notes.',
    image: kineticHorizonImg,
    remixPrompt: 'Build a personal travel journal web app with atmospheric photo headers, markdown notes, and reading-time indicators.',
  },
  {
    id: 'grid-runner',
    category: 'games',
    title: 'Grid Vector Arena',
    description: 'Fast-paced 60fps arcade wave survival built with canvas physics and synth audio.',
    image: neonSnakeImg,
    remixPrompt: 'Design a 60fps geometric grid survival arcade game with keyboard controls and particle trails.',
  },
];

const STARTER_IDEAS = [
  {
    id: 'language-app',
    label: 'A conversational language learning app',
    icon: BookOpen,
    prompt: 'Build a conversational language learning app with daily voice practice, instant grammar feedback, and vocabulary flashcards.',
  },
  {
    id: 'bg-remover',
    label: 'An app to remove backgrounds',
    icon: Scan,
    prompt: 'Build a clean web app to upload photos, isolate subjects from backgrounds, and export transparent PNG cutouts.',
  },
  {
    id: 'dream-garden',
    label: 'Help me design my dream garden',
    icon: Flower2,
    prompt: 'Help me design a custom backyard garden layout with seasonal perennial plantings, lighting zones, and a watering schedule.',
  },
];

const WAVEFORM_BARS = [
  16, 26, 20, 38, 28, 48, 34, 54, 42, 60, 36, 46, 56, 30, 44, 62, 48, 34, 52, 40, 26, 44, 32, 22, 30, 18, 24, 14,
];

const CAROUSEL_WAVEFORM_HEIGHTS = [
  18, 32, 24, 54, 38, 72, 48, 86, 60, 40, 78, 52, 92, 64, 44, 70, 56, 36, 62, 42, 28,
];

const HERO_EASE = [0.16, 1, 0.3, 1] as const;

const heroContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: HERO_EASE,
    },
  },
};

export const LandingHero: React.FC<LandingHeroProps> = ({
  theme,
  onGetStarted,
  onLaunchStudio,
  onSelectModel,
  reduceMotion = false,
}) => {
  const systemReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(reduceMotion || systemReducedMotion);
  const isDark = theme === 'dark';

  const [activePersona, setActivePersona] = useState<PersonaTabId>('tinkerers');
  const [activeChip, setActiveChip] = useState<ShowcaseModelChipId>('song-maker');
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>(
    SHOWCASE_DEMOS['song-maker'].defaultInputText
  );
  const [thinkActive, setThinkActive] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [likedDemo, setLikedDemo] = useState<'up' | 'down' | null>(null);
  const [copiedDemo, setCopiedDemo] = useState(false);

  const [carouselOffset, setCarouselOffset] = useState(0);
  const [hoveredExploreCardId, setHoveredExploreCardId] = useState<string | null>(null);
  const [galleryCategory, setGalleryCategory] = useState<GalleryCategoryId>('featured');
  const [hoveredGalleryId, setHoveredGalleryId] = useState<string>('window-seat');
  const [ideaInput, setIdeaInput] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const currentPersona = PERSONA_TABS.find((p) => p.id === activePersona) || PERSONA_TABS[0];
  const currentDemo = SHOWCASE_DEMOS[activeChip];

  const handleSelectPersona = (tab: PersonaConfig) => {
    setActivePersona(tab.id);
    setActiveChip(tab.defaultChip);
    setPlaygroundPrompt(tab.defaultPrompt);
    setLikedDemo(null);
    if (audioRef.current && tab.defaultChip !== 'song-maker') {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    }
    onSelectModel?.(SHOWCASE_DEMOS[tab.defaultChip].mappedForgeModel);
  };

  const handleSelectChip = (chipId: ShowcaseModelChipId) => {
    setActiveChip(chipId);
    setPlaygroundPrompt(SHOWCASE_DEMOS[chipId].defaultInputText);
    setLikedDemo(null);
    if (audioRef.current && chipId !== 'song-maker') {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    }
    onSelectModel?.(SHOWCASE_DEMOS[chipId].mappedForgeModel);
  };

  const handleToggleAudioPreview = () => {
    if (activeChip === 'voice-tts') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (isPlayingPreview) {
          window.speechSynthesis.cancel();
          setIsPlayingPreview(false);
          return;
        }
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(currentDemo.userPrompt);
        utter.rate = 0.96;
        utter.onend = () => setIsPlayingPreview(false);
        utter.onerror = () => setIsPlayingPreview(false);
        setIsPlayingPreview(true);
        window.speechSynthesis.speak(utter);
      } else {
        setIsPlayingPreview((prev) => !prev);
      }
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio('/audio/maple-leaf-rag.mp3');
      audio.addEventListener('timeupdate', () => {
        if (audio.duration && Number.isFinite(audio.duration)) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      });
      audio.addEventListener('ended', () => {
        setIsPlayingPreview(false);
        setAudioProgress(0);
      });
      audio.addEventListener('error', () => {
        setIsPlayingPreview(false);
      });
      audioRef.current = audio;
    }

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      void audioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(() => {
        setIsPlayingPreview(false);
      });
    }
  };

  const handleRunPlaygroundPrompt = () => {
    const clean = playgroundPrompt.trim() || currentDemo.userPrompt;
    onLaunchStudio(currentDemo.workspace, clean);
  };

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ideaInput.trim();
    if (!clean) {
      onLaunchStudio('code');
      return;
    }
    onLaunchStudio('code', clean);
  };

  const visibleModelCards = [0, 1, 2].map(
    (offset) => LATEST_MODEL_CARDS[(carouselOffset + offset) % LATEST_MODEL_CARDS.length]
  );

  const filteredGalleryApps =
    galleryCategory === 'featured'
      ? GALLERY_APPS.filter((item) => item.featured)
      : GALLERY_APPS.filter((item) => item.category === galleryCategory);

  const handleNextCarousel = () => {
    setCarouselOffset((prev) => (prev + 1) % LATEST_MODEL_CARDS.length);
  };

  const handlePrevCarousel = () => {
    setCarouselOffset((prev) => (prev - 1 + LATEST_MODEL_CARDS.length) % LATEST_MODEL_CARDS.length);
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <div className="relative z-10 w-full overflow-x-clip">
        {/* SECTION 1: HERO HEADLINE & CTAs (Positioned cleanly beneath the untouched floating LandingNav) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-28 sm:pt-36 pb-10 sm:pb-12">
          <motion.div
            className="max-w-3xl"
            variants={heroContainerVariants}
            initial={shouldReduceMotion ? 'visible' : 'hidden'}
            animate="visible"
          >
            <motion.h1
              id="hero-brand-heading"
              variants={heroItemVariants}
              style={{ fontSize: 'clamp(2.35rem, 4.9vw, 3.85rem)' }}
              className={`font-display font-medium tracking-tight leading-[1.06] text-balance ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Try, build and ship with ForgeX&apos;s latest AI models
            </motion.h1>

            <motion.p
              id="hero-description"
              variants={heroItemVariants}
              className={`mt-4 sm:mt-5 text-[15px] sm:text-[17px] leading-relaxed max-w-2xl ${
                isDark ? 'text-neutral-300' : 'text-neutral-600'
              }`}
            >
              ForgeX is where you explore every multimodal model, turn a prompt into a working app,
              and create code, visuals, research, and music in one workspace.
            </motion.p>

            <motion.div
              variants={heroItemVariants}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <motion.button
                id="hero-btn-launch"
                type="button"
                whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.16, ease: HERO_EASE }}
                onClick={() => onLaunchStudio('chat')}
                className={`px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                    : 'bg-neutral-950 text-white hover:bg-neutral-800'
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Get started</span>
              </motion.button>

              <motion.button
                id="hero-btn-getstarted"
                type="button"
                whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.16, ease: HERO_EASE }}
                onClick={onGetStarted}
                className={`px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.1] text-white'
                    : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800'
                }`}
              >
                <span>Read the docs</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* SECTION 2: INTERACTIVE FORGEX WORKSPACE SHOWCASE WITH RAINBOW AMBIENT GLOW */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.22, ease: HERO_EASE }}
            className={`relative rounded-[28px] border px-4 sm:px-10 pt-8 sm:pt-10 pb-8 sm:pb-10 overflow-hidden ${
              isDark
                ? 'bg-[#141417] border-white/[0.06]'
                : 'bg-neutral-100 border-neutral-200/90'
            }`}
          >
            {/* Persona Category Tabs */}
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {PERSONA_TABS.map((tab) => {
                const active = activePersona === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectPersona(tab)}
                    className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-white text-neutral-950 shadow-sm'
                          : 'bg-neutral-950 text-white shadow-sm'
                        : isDark
                          ? 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-white/70'
                    }`}
                  >
                    {tab.id === 'tinkerers' && <Sparkles className="w-3.5 h-3.5 shrink-0" />}
                    {tab.id === 'builders' && <Zap className="w-3.5 h-3.5 shrink-0" />}
                    {tab.id === 'developers' && <Code2 className="w-3.5 h-3.5 shrink-0" />}
                    {tab.id === 'learners' && <BookOpen className="w-3.5 h-3.5 shrink-0" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <p
              className={`relative z-10 text-center text-xs sm:text-sm mt-4 mb-7 ${
                isDark ? 'text-neutral-300' : 'text-neutral-600'
              }`}
            >
              {currentPersona.subtitle}
            </p>

            {/* Inner Workspace Window + Iridescent Bottom Halo */}
            <div className="relative max-w-4xl mx-auto">
              {/* Soft iridescent spectrum glow tucked under the bottom edges */}
              <motion.div
                aria-hidden="true"
                initial={shouldReduceMotion ? { opacity: isDark ? 0.6 : 0.3 } : { opacity: 0 }}
                animate={{ opacity: isDark ? 0.6 : 0.3 }}
                transition={{ duration: 0.7, delay: shouldReduceMotion ? 0 : 0.32, ease: HERO_EASE }}
                className="pointer-events-none absolute -inset-x-8 -bottom-10 top-12 rounded-3xl blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle at 18% 90%, rgba(99, 102, 241, 0.52), transparent 46%), radial-gradient(circle at 50% 96%, rgba(245, 158, 11, 0.44), transparent 48%), radial-gradient(circle at 84% 88%, rgba(16, 185, 129, 0.52), transparent 46%)',
                }}
              />

              {/* Authentic ForgeX Workspace Preview Frame */}
              <motion.div
                initial={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.48, delay: shouldReduceMotion ? 0 : 0.28, ease: HERO_EASE }}
                className={`relative z-10 rounded-3xl border shadow-2xl overflow-hidden p-2.5 sm:p-3.5 flex gap-3 min-h-[420px] ${
                  isDark
                    ? 'bg-[#121215]/95 border-white/[0.1] text-neutral-100'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-900'
                }`}
              >
              {/* Authentic Floating Frosted-Glass ForgeX Sidebar */}
              <aside
                className={`w-[228px] shrink-0 hidden md:flex flex-col rounded-2xl border backdrop-blur-2xl overflow-hidden ${
                  isDark
                    ? 'bg-neutral-900/70 border-white/15 text-neutral-100 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.75)]'
                    : 'bg-white/85 border-neutral-200 text-neutral-900 shadow-sm'
                }`}
              >
                {/* Brand Row */}
                <div
                  className={`p-3 flex items-center justify-between border-b ${
                    isDark ? 'border-white/10' : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                      <ForgeXLogo className={`w-4.5 h-4.5 ${isDark ? 'text-white' : 'text-neutral-950'}`} />
                    </div>
                    <span className="font-display font-bold text-sm tracking-tight leading-none">
                      Forge<span className="text-amber-400">X</span>
                    </span>
                  </div>
                  <PanelLeftClose className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </div>

                {/* + New chat button */}
                <div className="p-2.5 pb-1.5">
                  <button
                    type="button"
                    onClick={() => onLaunchStudio('chat')}
                    className={`w-full py-1.5 px-2.5 rounded-xl flex items-center gap-2 text-xs font-medium border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-white/[0.04] hover:bg-white/[0.1] text-neutral-100 border-white/10'
                        : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>New chat</span>
                  </button>
                </div>

                {/* Core Workspace Navigation */}
                <div className="px-2 py-1 space-y-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onLaunchStudio('scheduled')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                      isDark
                        ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Scheduled</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLaunchStudio('chat')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-semibold border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-white/[0.12] text-white border-white/25 shadow-sm'
                        : 'bg-white text-neutral-950 border-neutral-300 shadow-xs'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">ForgeX Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLaunchStudio('library')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                      isDark
                        ? 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="3.8" height="16" rx="1" />
                      <rect x="8.3" y="4" width="3.8" height="16" rx="1" />
                      <rect x="13.8" y="4.8" width="3.8" height="15.2" rx="1" transform="rotate(-14 13.8 4.8)" />
                    </svg>
                    <span className="truncate">Library</span>
                  </button>
                </div>

                {/* Recent Chats List */}
                <div
                  className={`mt-2 pt-2.5 px-2 flex-1 border-t space-y-1 ${
                    isDark ? 'border-white/10' : 'border-neutral-200'
                  }`}
                >
                  <div className="px-1.5 pb-1 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      Recent Chats
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-neutral-500">5</span>
                  </div>

                  {(Object.values(SHOWCASE_DEMOS) as ShowcaseDemo[]).map((demo) => {
                    const isSelectedChat = activeChip === demo.id;
                    return (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => handleSelectChip(demo.id)}
                        className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] text-left transition-all cursor-pointer border ${
                          isSelectedChat
                            ? isDark
                              ? 'bg-white/[0.12] text-amber-300 font-semibold border-amber-400/35'
                              : 'bg-amber-50 text-neutral-950 font-semibold border-amber-400/50'
                            : isDark
                              ? 'text-neutral-300 hover:text-white hover:bg-white/[0.06] border-transparent'
                              : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 border-transparent'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3 shrink-0 opacity-65" />
                        <span className="truncate">{demo.sessionTitle}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Main Right ForgeX Header + Chat Stage + Real Composer */}
              <div className="flex-1 flex flex-col min-w-0 justify-between gap-3">
                {/* Authentic Floating Frosted Header Bar */}
                <div
                  className={`h-11 px-3 sm:px-4 rounded-2xl border backdrop-blur-2xl flex items-center justify-between gap-2 shrink-0 ${
                    isDark
                      ? 'bg-neutral-900/65 border-white/15 text-white'
                      : 'bg-white/85 border-neutral-200 text-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onLaunchStudio(currentDemo.workspace)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-display font-semibold truncate hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{currentDemo.modelDisplayName}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    </button>

                    <span className="text-neutral-600 hidden sm:inline">·</span>

                    <button
                      type="button"
                      onClick={() => onLaunchStudio('chat')}
                      className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>General</span>
                      <ChevronDown className="w-3 h-3 text-neutral-400" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunPlaygroundPrompt}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isDark
                        ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-neutral-200'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                    }`}
                  >
                    <span>Open Chat</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Center Conversation Area */}
                <div className="flex-1 flex flex-col justify-center px-1.5 sm:px-3 py-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeChip}
                      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: HERO_EASE }}
                      className="space-y-4"
                    >
                      {/* User Message */}
                      <div className="flex justify-end">
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed border ${
                            isDark
                              ? 'bg-white/[0.08] border-white/[0.08] text-neutral-100'
                              : 'bg-neutral-200/80 border-neutral-300 text-neutral-900'
                          }`}
                        >
                          {currentDemo.userPrompt}
                        </div>
                      </div>

                      {/* Assistant Response */}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                        isDark
                          ? 'bg-neutral-900 border-white/15 text-amber-400'
                          : 'bg-white border-neutral-200 text-amber-600'
                      }`}
                    >
                      <ForgeXLogo className={`w-4 h-4 ${isDark ? 'text-white' : 'text-neutral-900'}`} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span className="font-medium text-neutral-200">
                          {currentDemo.modelDisplayName}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-[10px]">{currentDemo.modelTechId}</span>
                      </div>

                      {(activeChip === 'song-maker' || activeChip === 'voice-tts') && (
                        <div
                          className={`rounded-xl border p-3 flex items-center gap-3 max-w-sm ${
                            isDark
                              ? 'bg-[#202025] border-white/[0.09]'
                              : 'bg-white border-neutral-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={handleToggleAudioPreview}
                            aria-label={isPlayingPreview ? 'Pause audio preview' : 'Play audio preview'}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                              isDark
                                ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300'
                                : 'bg-neutral-900 text-white hover:bg-neutral-800'
                            }`}
                          >
                            {isPlayingPreview ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate mb-1.5">
                              {currentDemo.sessionTitle}
                            </div>
                            <div className="flex items-end gap-[2px] h-4">
                              {WAVEFORM_BARS.map((barH, idx) => {
                                const filled = (idx / WAVEFORM_BARS.length) * 100 <= audioProgress;
                                return (
                                  <span
                                    key={idx}
                                    style={{
                                      height: `${Math.max(
                                        20,
                                        Math.min(100, barH + (isPlayingPreview ? (idx % 3) * 14 : 0))
                                      )}%`,
                                    }}
                                    className={`w-[2.5px] rounded-full transition-colors ${
                                      filled
                                        ? 'bg-amber-400'
                                        : idx % 4 === 0
                                          ? 'bg-amber-400/70'
                                          : 'bg-neutral-500/45'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          <span className="text-[11px] font-mono tabular-nums text-neutral-400 shrink-0">
                            {activeChip === 'voice-tts' ? '0:18' : '2:48'}
                          </span>
                        </div>
                      )}

                      {activeChip === 'image-studio' && (
                        <div className="rounded-xl overflow-hidden border border-white/[0.1] max-w-xs aspect-[16/10] bg-neutral-900">
                          <img
                            src={floralSynthesisImg}
                            alt="Generated botanical sculpture artwork preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {activeChip === 'omni-vision' && (
                        <div className="rounded-xl overflow-hidden border border-white/[0.1] max-w-xs aspect-[16/10] bg-neutral-900">
                          <img
                            src={kineticHorizonImg}
                            alt="Atmospheric ocean horizon visual analysis preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {activeChip === 'forge-chat' && (
                        <div
                          className={`rounded-xl border p-3 text-xs leading-relaxed ${
                            isDark
                              ? 'bg-[#202025] border-white/[0.08] text-neutral-200'
                              : 'bg-white border-neutral-200 text-neutral-700'
                          }`}
                        >
                          Adaptive reasoning combines live web grounding, inline LaTeX math,
                          interactive tables, and multi-file Code Studio synthesis within one
                          conversation thread.
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5 text-neutral-500">
                        <button
                          type="button"
                          onClick={() => {
                            setCopiedDemo(true);
                            setTimeout(() => setCopiedDemo(false), 1500);
                          }}
                          aria-label="Copy preview output"
                          className="p-1 rounded hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedDemo && <span className="text-emerald-400">Copied</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLikedDemo(likedDemo === 'up' ? null : 'up')}
                          aria-label="Thumbs up"
                          className={`p-1 rounded hover:text-white transition-colors cursor-pointer ${
                            likedDemo === 'up' ? 'text-white' : ''
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLikedDemo(likedDemo === 'down' ? null : 'down')}
                          aria-label="Thumbs down"
                          className={`p-1 rounded hover:text-white transition-colors cursor-pointer ${
                            likedDemo === 'down' ? 'text-white' : ''
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Authentic ForgeX Chat Composer Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRunPlaygroundPrompt();
                  }}
                  className={`rounded-3xl border px-3 py-2 flex items-center gap-2 ${
                    isDark
                      ? 'bg-neutral-900/90 border-white/15'
                      : 'bg-white border-neutral-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onLaunchStudio(currentDemo.workspace)}
                    aria-label="Open tools menu"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                      isDark
                        ? 'hover:bg-neutral-800 text-neutral-300'
                        : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={playgroundPrompt}
                    onChange={(e) => setPlaygroundPrompt(e.target.value)}
                    placeholder="Ask ForgeX"
                    aria-label="Ask ForgeX"
                    className={`flex-1 min-w-0 bg-transparent px-1 text-xs sm:text-sm focus:outline-none ${
                      isDark
                        ? 'text-white placeholder:text-neutral-500'
                        : 'text-neutral-900 placeholder:text-neutral-500'
                    }`}
                  />

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setThinkActive((prev) => !prev);
                        onSelectModel?.('forge-2-ultra');
                      }}
                      className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        thinkActive
                          ? isDark
                            ? 'bg-neutral-800 text-white border border-neutral-700'
                            : 'bg-neutral-200 text-neutral-900 border border-neutral-300'
                          : isDark
                            ? 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                            : 'hover:bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Think</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleAudioPreview}
                      aria-label="Dictate voice input"
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        isDark
                          ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onLaunchStudio('chat')}
                      aria-label="Live Voice Mode"
                      className={`w-8 h-8 rounded-full hidden sm:flex items-center justify-center transition-colors cursor-pointer ${
                        isDark
                          ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      <AudioLines className="w-4 h-4" />
                    </button>

                    <button
                      type="submit"
                      aria-label="Send to ForgeX Chat"
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isDark
                          ? 'bg-white text-neutral-950 hover:bg-neutral-200 active:scale-95'
                          : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>

          {/* Bottom Model Chip Switcher Strip */}
          <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <span className={`text-xs sm:text-sm mr-1 ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              Pick a model to see it run
            </span>

            {(Object.values(SHOWCASE_DEMOS) as ShowcaseDemo[]).map((demo) => {
              const isSelected = activeChip === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleSelectChip(demo.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-white text-neutral-950 shadow-md'
                        : 'bg-neutral-950 text-white shadow-md'
                      : isDark
                        ? 'bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-neutral-200'
                        : 'bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700'
                  }`}
                >
                  {demo.id === 'forge-chat' && <Sparkles className="w-3.5 h-3.5 shrink-0" />}
                  {demo.id === 'image-studio' && <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                  {demo.id === 'omni-vision' && <Video className="w-3.5 h-3.5 shrink-0" />}
                  {demo.id === 'song-maker' && <Music className="w-3.5 h-3.5 shrink-0" />}
                  {demo.id === 'voice-tts' && <AudioLines className="w-3.5 h-3.5 shrink-0" />}
                  <span>{demo.chipLabel}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* SECTION 3: EXPLORE THE LATEST MODELS CAROUSEL */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-20">
        <div className="flex items-center justify-between gap-4 mb-7">
          <h2
            className={`font-display font-medium text-2xl sm:text-4xl tracking-tight text-balance ${
              isDark ? 'text-white' : 'text-neutral-950'
            }`}
          >
            Explore the latest models from ForgeX
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrevCarousel}
              aria-label="Previous models"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                isDark
                  ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-neutral-300 hover:text-white'
                  : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextCarousel}
              aria-label="Next models"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                isDark
                  ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-neutral-300 hover:text-white'
                  : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleModelCards.map((card) => {
            const isCardHovered = hoveredExploreCardId === card.id;
            const playHoverAnim = isCardHovered && !shouldReduceMotion;

            return (
              <motion.button
                key={card.id}
                type="button"
                onClick={() => onLaunchStudio(card.workspace)}
                onMouseEnter={() => setHoveredExploreCardId(card.id)}
                onMouseLeave={() => setHoveredExploreCardId((prev) => (prev === card.id ? null : prev))}
                onFocus={() => setHoveredExploreCardId(card.id)}
                onBlur={() => setHoveredExploreCardId((prev) => (prev === card.id ? null : prev))}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.2, ease: HERO_EASE }}
                className={`group text-left rounded-2xl overflow-hidden border transition-colors duration-200 cursor-pointer flex flex-col ${
                  isDark
                    ? 'bg-[#141417] border-white/[0.08] hover:border-white/[0.22]'
                    : 'bg-white border-neutral-200 hover:border-neutral-400 shadow-xs'
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#070709]">
                  {card.kind === 'waveform' ? (
                    <div className="w-full h-full bg-gradient-to-b from-[#04060c] via-[#070d1c] to-[#04070d] flex items-center justify-center px-6 relative">
                      <div className="flex items-center justify-center gap-2.5 w-full h-44">
                        {CAROUSEL_WAVEFORM_HEIGHTS.map((pct, idx) => (
                          <motion.span
                            key={idx}
                            style={{ height: `${pct}%`, transformOrigin: 'center' }}
                            animate={
                              playHoverAnim
                                ? {
                                    scaleY: [
                                      1,
                                      0.4 + ((idx * 3) % 5) * 0.16,
                                      1.2,
                                      0.55 + (idx % 3) * 0.15,
                                      1,
                                    ],
                                    opacity: [0.85, 1, 0.9],
                                  }
                                : { scaleY: 1, opacity: 0.9 }
                            }
                            transition={
                              playHoverAnim
                                ? {
                                    duration: 0.9 + (idx % 4) * 0.14,
                                    delay: idx * 0.035,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }
                                : { duration: 0.25, ease: HERO_EASE }
                            }
                            className="w-2 rounded-full bg-gradient-to-b from-sky-400/90 via-blue-600/85 to-indigo-950/90"
                          />
                        ))}
                      </div>
                      <div className="absolute bottom-4 left-4">
                        {playHoverAnim && (
                          <motion.span
                            aria-hidden="true"
                            initial={{ scale: 1, opacity: 0.55 }}
                            animate={{ scale: [1, 1.75], opacity: [0.55, 0] }}
                            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                            className="absolute inset-0 rounded-full bg-sky-400/60"
                          />
                        )}
                        <motion.div
                          animate={
                            playHoverAnim
                              ? { scale: [1, 1.08, 1] }
                              : { scale: 1 }
                          }
                          transition={
                            playHoverAnim
                              ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
                              : { duration: 0.2 }
                          }
                          className="relative w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-neutral-950 shadow-lg"
                        >
                          <AudioLines className="w-5 h-5" />
                        </motion.div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <motion.img
                        src={card.image}
                        alt={card.title}
                        referrerPolicy="no-referrer"
                        animate={
                          playHoverAnim
                            ? card.id === 'image-synthesis'
                              ? { scale: [1.03, 1.09, 1.03], x: [0, -6, 0] }
                              : card.id === 'omni-research'
                                ? { scale: [1.03, 1.08, 1.03], y: [0, -5, 0] }
                                : { scale: [1.03, 1.08, 1.03] }
                            : { scale: 1, x: 0, y: 0 }
                        }
                        transition={
                          playHoverAnim
                            ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.3, ease: HERO_EASE }
                        }
                        className="w-full h-full object-cover"
                      />

                      {playHoverAnim && card.id === 'image-synthesis' && (
                        <motion.div
                          aria-hidden="true"
                          initial={{ x: '-120%' }}
                          animate={{ x: ['-120%', '220%'] }}
                          transition={{ duration: 1.85, repeat: Infinity, repeatDelay: 0.55, ease: 'easeInOut' }}
                          className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                      )}

                      {playHoverAnim && card.id === 'omni-research' && (
                        <motion.div
                          aria-hidden="true"
                          initial={{ y: '-15%', opacity: 0 }}
                          animate={{ y: ['-15%', '115%'], opacity: [0, 0.85, 0] }}
                          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-transparent via-sky-400/25 to-transparent"
                        />
                      )}

                      {playHoverAnim && card.id === 'code-arcade' && (
                        <motion.div
                          aria-hidden="true"
                          animate={{
                            x: [0, 44, -28, 16, 0],
                            y: [0, -24, 18, -10, 0],
                            scale: [1, 1.25, 0.95, 1.15, 1],
                          }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-400/80 shadow-[0_0_24px_rgba(52,211,153,0.9)] ring-4 ring-emerald-300/30"
                        />
                      )}
                    </>
                  )}
                </div>

                <div className="p-5">
                  <h3
                    className={`font-display font-medium text-base ${
                      isDark ? 'text-white' : 'text-neutral-950'
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {card.subtitle}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: INTERACTIVE APP GALLERY (FEATURED / PERSONAL / GAMES / ART) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-20">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {[
            { id: 'featured' as GalleryCategoryId, label: 'Featured', icon: Star },
            { id: 'personal' as GalleryCategoryId, label: 'Personal websites', icon: Globe },
            { id: 'games' as GalleryCategoryId, label: '2D & 3D games', icon: Gamepad2 },
            { id: 'art' as GalleryCategoryId, label: 'Interactive art', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = galleryCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGalleryCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? isDark
                      ? 'bg-[#1c1c21] text-white border border-white/[0.12]'
                      : 'bg-neutral-900 text-white'
                    : isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active && tab.id === 'featured' ? 'text-sky-400' : ''
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredGalleryApps.map((appItem) => {
            const showRemixAlways = hoveredGalleryId === appItem.id;
            return (
              <div
                key={appItem.id}
                onMouseEnter={() => setHoveredGalleryId(appItem.id)}
                onClick={() => onLaunchStudio('code', appItem.remixPrompt)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLaunchStudio('code', appItem.remixPrompt);
                  }
                }}
                className="group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl"
              >
                <div
                  className={`relative aspect-[16/10] rounded-xl overflow-hidden border ${
                    isDark ? 'border-white/[0.1] bg-[#141417]' : 'border-neutral-200 bg-neutral-100'
                  }`}
                >
                  <img
                    src={appItem.image}
                    alt={appItem.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors" />

                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                      showRemixAlways ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <span className="px-4 py-2 rounded-full bg-white text-neutral-950 text-xs sm:text-sm font-medium shadow-lg">
                      Remix app
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <h3
                    className={`font-display font-medium text-base ${
                      isDark ? 'text-white' : 'text-neutral-950'
                    }`}
                  >
                    {appItem.title}
                  </h3>
                  <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {appItem.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => onLaunchStudio('code')}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              isDark
                ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                : 'bg-neutral-950 text-white hover:bg-neutral-800'
            }`}
          >
            Explore the app gallery
          </button>
        </div>
      </section>

      {/* SECTION 5: BRING YOUR IDEAS TO LIFE CONVERSION COMPOSER */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-8 overflow-hidden">
        {/* Subtle dark ambient star dots matching the quiet conversion backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage: isDark
              ? 'radial-gradient(1px 1px at 14% 24%, rgba(255,255,255,0.45), transparent), radial-gradient(1px 1px at 38% 68%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 66% 18%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 84% 58%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 26% 82%, rgba(255,255,255,0.28), transparent), radial-gradient(1px 1px at 91% 28%, rgba(255,255,255,0.32), transparent)'
              : 'none',
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2
            className={`font-display font-medium text-3xl sm:text-5xl tracking-tight text-balance mb-8 ${
              isDark ? 'text-white' : 'text-neutral-950'
            }`}
          >
            Bring your ideas to life
          </h2>

          <form
            onSubmit={handleSubmitIdea}
            className={`max-w-xl mx-auto rounded-2xl border p-2 pl-4 sm:pl-5 flex items-center gap-3 shadow-xl ${
              isDark
                ? 'bg-[#18181b]/95 border-white/[0.1]'
                : 'bg-white border-neutral-300'
            }`}
          >
            <input
              type="text"
              value={ideaInput}
              onChange={(e) => setIdeaInput(e.target.value)}
              placeholder="Describe your idea in a sentence or two"
              aria-label="Describe your app idea"
              className={`flex-1 bg-transparent text-sm focus:outline-none ${
                isDark
                  ? 'text-white placeholder:text-neutral-500'
                  : 'text-neutral-900 placeholder:text-neutral-500'
              }`}
            />
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                ideaInput.trim()
                  ? isDark
                    ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                    : 'bg-neutral-950 text-white hover:bg-neutral-800'
                  : isDark
                    ? 'bg-white/[0.08] text-neutral-300 hover:bg-white/[0.14] hover:text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Get started
            </button>
          </form>

          <div className="max-w-md mx-auto mt-6 space-y-2 text-left">
            {STARTER_IDEAS.map((idea) => {
              const Icon = idea.icon;
              return (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => onLaunchStudio('code', idea.prompt)}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-3 text-sm transition-colors cursor-pointer ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                      : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-neutral-500" />
                  <span className="truncate">{idea.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
    </MotionConfig>
  );
};
