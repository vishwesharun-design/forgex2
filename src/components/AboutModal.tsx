import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  ArrowLeft, 
  Zap, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  ArrowRight,
  User,
  CheckCircle2,
  Lock,
  Palette,
  Maximize2,
  Wrench,
  Clock,
  RefreshCw,
  Film
} from 'lucide-react';
import { ForgeXTheme, FORGEX_MODELS, ActiveWorkspace } from '../types';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ForgeXTheme;
  onGetStarted?: (workspace?: ActiveWorkspace) => void;
  onOpenAuth?: () => void;
  isAuthenticated?: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  theme,
  onGetStarted,
  onOpenAuth,
  isAuthenticated = false,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'chat' | 'image' | 'video' | 'models' | 'auth'>('overview');

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/75 animate-in fade-in duration-200">
      <div
        id="modal-about-forgex"
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl transition-all overflow-hidden ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white shadow-black/90'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300'
        }`}
      >
        {/* Modal Header */}
        <div className="p-6 sm:p-8 pb-4 flex items-start justify-between border-b border-neutral-800/40 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md shadow-amber-500/10">
              <Zap className="w-6 h-6 fill-amber-400 text-amber-400 glow-lightning" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="about-title" className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
                  Everything About Forge<span className="text-amber-400">X</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Full Platform Guide
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                The all-in-one AI creation platform created by <span className="font-semibold text-amber-400">VishweshVarman</span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-about"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className={`px-6 sm:px-8 py-2.5 flex items-center gap-2 overflow-x-auto border-b shrink-0 ${
          isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
        }`}>
          {[
            { id: 'overview', label: 'Overview', icon: Sparkles },
            { id: 'chat', label: 'AI Chat', icon: MessageSquare },
            { id: 'image', label: 'Image Studio', icon: ImageIcon },
            { id: 'video', label: 'Video Studio', icon: VideoIcon },
            { id: 'models', label: 'Unreal Models', icon: Cpu },
            { id: 'auth', label: 'Real Auth & Credits', icon: ShieldCheck },
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="font-display font-bold text-xl sm:text-2xl mb-2 text-amber-400">
                  What is ForgeX?
                </h3>
                <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  ForgeX is an all-in-one AI creation studio where creators, developers, designers, and visionaries can 
                  <strong className="text-amber-400 font-semibold"> chat with advanced reasoning AI, generate high-fidelity images, and produce cinematic AI videos</strong>—all in one seamless, high-performance workspace without switching tabs or juggling disconnected subscriptions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div 
                  onClick={() => setActiveSection('chat')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    isDark ? 'bg-neutral-950/60 border-neutral-800 hover:border-amber-500/40' : 'bg-neutral-50 border-neutral-200 hover:border-amber-500/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">ForgeX Chat</h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Intelligent conversations, full-stack code synthesis, brainstorming, and multimodal file attachments.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveSection('image')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    isDark ? 'bg-neutral-950/60 border-neutral-800 hover:border-amber-500/40' : 'bg-neutral-50 border-neutral-200 hover:border-amber-500/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2.5">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">Image Studio</h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Render photorealistic visuals across 7 curated styles, 4 aspect ratios, and reference-guided synthesis.
                  </p>
                </div>

                <div 
                  onClick={() => setActiveSection('video')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    isDark ? 'bg-neutral-950/60 border-neutral-800 hover:border-amber-500/40' : 'bg-neutral-50 border-neutral-200 hover:border-amber-500/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2.5">
                    <VideoIcon className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">Video Studio</h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Synthesize fluid motion sequences from text prompts or still reference images with physics-based lighting.
                  </p>
                </div>
              </div>

              {/* Creator & Philosophy card */}
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold text-sm">
                  <User className="w-4 h-4" />
                  <span>The Creator’s Vision</span>
                </div>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  Conceived and architected by <strong>VishweshVarman</strong>, ForgeX was designed around a clean, distraction-free aesthetic with instantaneous latency. Every visual element—from the lightning insignia to the interactive particle starfield—aims to inspire unhindered creativity.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: FORGEX CHAT */}
          {activeSection === 'chat' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-amber-400">
                    ForgeX Chat: Conversational Intelligence
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Deep reasoning, coding assistance, and creative brainstorming
                  </p>
                </div>
              </div>

              <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                ForgeX Chat provides an ultra-responsive interface for interacting with multi-tier neural models. Conversations retain context across exchanges and format code snippets with syntax highlighting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5 text-amber-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Multimodal Attachments
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Attach images and reference documents directly into your prompt for visual critique or text summarization.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5 text-amber-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Quick Action Shortcuts
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Pills for <code>+ Image</code>, <code>+ Video</code>, <code>Analyze</code>, and <code>Write</code> allow jumping straight from ideation to synthesis.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5 text-amber-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Unreal Engine Tier Selection
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Switch on the fly between Unreal Engine 1 (ultra-fast responses) through Unreal Engine 5 (deep reasoning).
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5 text-amber-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Voice Dictation Mode
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Speak naturally to dictate complex creative prompts and questions without typing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMAGE STUDIO */}
          {activeSection === 'image' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-amber-400">
                    Image Generation Studio
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    High-fidelity visual synthesis across 7 artistic presets
                  </p>
                </div>
              </div>

              <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                The Image Studio synthesizes production-ready visuals from natural language prompts. Control compositions, aspect ratios, style aesthetics, and reference imagery with precision.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 shrink-0" />
                    <span>7 Style Presets</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Realistic, Cinematic, Anime, 3D Render, Illustration, Minimalist, and Custom prompts.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <Maximize2 className="w-4 h-4 shrink-0" />
                    <span>4 Aspect Ratios</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    1:1 (Square), 16:9 (Landscape widescreen), 9:16 (Vertical Reels/Stories), and 4:3 (Classic).
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>Image Reference Grounding</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Upload sketches, character references, or architectural concepts to guide the diffusion process.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 shrink-0" />
                    <span>Creation Toolkit</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Hover actions on any creation: <strong>Download</strong>, <strong>Fullscreen Canvas</strong>, <strong>Variation</strong>, <strong>Edit Prompt</strong>, and <strong>Favorites</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VIDEO STUDIO */}
          {activeSection === 'video' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <VideoIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-amber-400">
                    Video Generation Studio
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Neural temporal motion synthesis from text and image prompts
                  </p>
                </div>
              </div>

              <p className={`text-sm leading-relaxed ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                Transform static ideas into dynamic motion sequences. ForgeX Video Studio utilizes deep temporal interpolation to create fluid camera dollies, cinematic lighting passes, and atmospheric effects.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Duration Controls</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Select between 5s, 10s, or 15s generation lengths tailored to social teasers or cinematic sequences.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>Dual Generation Pipelines</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    <strong>Text → Video</strong> creates scenes from scratch; <strong>Image → Video</strong> animates your existing stills into camera moves.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Resolution Modes</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Choose Standard mode for fast generation or High Quality for enhanced frame sharpness and raytraced reflections.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-sm mb-1 text-amber-400 flex items-center gap-1.5">
                    <Film className="w-4 h-4 shrink-0" />
                    <span>Player & Remix Tools</span>
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Direct in-browser looping player, fullscreen playback, regeneration with altered seeds, and MP4 downloads.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: UNREAL ENGINE MODELS */}
          {activeSection === 'models' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-amber-400">
                    Unreal Engine 1 through 5
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Five distinct intelligence tiers tailored for every creative workflow
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {FORGEX_MODELS.map((model) => (
                  <div 
                    key={model.id}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{model.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {model.badge}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                          {model.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-mono px-2 py-1 rounded-lg border ${
                        isDark 
                          ? 'bg-neutral-900 border-neutral-800 text-amber-400' 
                          : 'bg-neutral-100 border-neutral-200 text-amber-600'
                      }`}>
                        Power Level {model.capabilityLevel} / 5
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: AUTHENTICATION & CREDITS */}
          {activeSection === 'auth' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-amber-400">
                    Real Authentication & Personal Vault
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    No sample accounts or dummy emails—your real creative studio
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-amber-400 mb-1 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Zero Sample Accounts
                  </h4>
                  <p className={`${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    Every user registers with their genuine email address. No fake profiles or sample placeholder emails are pre-populated. Your authentication session, saved chats, generated images, and video renders belong exclusively to your account.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-amber-400 mb-1 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    1,000 Free Compute Credits
                  </h4>
                  <p className={`${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    Every newly registered ForgeX creator receives 1,000 monthly compute units. The visual usage meter in the sidebar monitors usage across chat reasoning tokens, image diffusions, and temporal video renders.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-neutral-950/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <h4 className="font-semibold text-amber-400 mb-1 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    Command Palette & Personalization
                  </h4>
                  <p className={`${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    Access the global command search via <code>⌘K</code> (or <code>Ctrl+K</code>), bookmark media to your Favorites vault, and customize model preferences in Settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar / Action Trigger */}
        <div className={`p-4 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          isDark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <button
            onClick={onClose}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border transition-colors ${
              isDark
                ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Close Guide</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isAuthenticated && onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-colors ${
                  isDark
                    ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                    : 'border-amber-500 text-amber-600 hover:bg-amber-50'
                }`}
              >
                Sign In / Register
              </button>
            )}

            {onGetStarted && (
              <button
                onClick={() => {
                  onClose();
                  onGetStarted('chat');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Enter ForgeX Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
