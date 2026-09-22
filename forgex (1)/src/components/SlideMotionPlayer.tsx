import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Film, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Mic
} from 'lucide-react';
import { GeneratedVideo, VideoSlide, CameraMotion } from '../types';
import { buildSlideStoryboard, createSlideSvgFallback } from '../services/videoService';

interface SlideMotionPlayerProps {
  video: GeneratedVideo;
  isPlaying: boolean;
  onTogglePlay?: () => void;
  isDark: boolean;
  compact?: boolean;
}

export const SlideMotionPlayer: React.FC<SlideMotionPlayerProps> = ({
  video,
  isPlaying,
  onTogglePlay,
  isDark,
  compact = false,
}) => {
  // Guarantee 4 distinct slides with unique visuals
  const slides: VideoSlide[] = React.useMemo(() => {
    if (video.slides && video.slides.length >= 4) {
      const allSame = video.slides.every((s) => s.imageUrl === video.slides![0]?.imageUrl);
      if (!allSame) return video.slides;
    }
    return buildSlideStoryboard(video.prompt, video.duration, video.aspectRatio);
  }, [video.id, video.prompt, video.duration, video.aspectRatio, video.slides]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [playMode, setPlayMode] = useState<'slides' | 'stream'>('slides');
  const [internalPlaying, setInternalPlaying] = useState(isPlaying);
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setInternalPlaying(isPlaying);
  }, [isPlaying]);

  const effectivePlaying = onTogglePlay ? isPlaying : internalPlaying;
  const activeSlide = slides[currentSlideIndex] || slides[0];
  const slideDurationMs = (activeSlide.durationSeconds || 2.5) * 1000;

  // Web Speech Synthesis for Voice-Over Narration
  const speakSlide = (slide: VideoSlide) => {
    if (!voiceOverEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const text = `${slide.title}. ${slide.caption}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('David'))
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  // Trigger voice over on slide change when playing or voice toggled
  useEffect(() => {
    if (effectivePlaying && playMode === 'slides') {
      speakSlide(activeSlide);
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  }, [currentSlideIndex, effectivePlaying, playMode, voiceOverEnabled]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Slide ticker
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentProgressMsRef = useRef<number>(0);

  useEffect(() => {
    if (!effectivePlaying || playMode !== 'slides') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimeRef.current = 0;
      return;
    }

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      currentProgressMsRef.current += delta;
      const progressRatio = Math.min(1, currentProgressMsRef.current / slideDurationMs);
      setSlideProgress(progressRatio);

      if (currentProgressMsRef.current >= slideDurationMs) {
        currentProgressMsRef.current = 0;
        setSlideProgress(0);
        setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
      }

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [effectivePlaying, playMode, currentSlideIndex, slideDurationMs, slides.length]);

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    currentProgressMsRef.current = 0;
    setSlideProgress(0);
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    currentProgressMsRef.current = 0;
    setSlideProgress(0);
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handleSelectSlide = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    currentProgressMsRef.current = 0;
    setSlideProgress(0);
    setCurrentSlideIndex(idx);
  };

  const getMotionTransform = (motion: CameraMotion, progress: number): string => {
    switch (motion) {
      case 'zoom-in': {
        const scale = 1.0 + progress * 0.22;
        return `scale(${scale.toFixed(3)})`;
      }
      case 'pan-left-to-right': {
        const translateX = -6 + progress * 12;
        return `scale(1.15) translateX(${translateX.toFixed(2)}%)`;
      }
      case 'pan-right-to-left': {
        const translateX = 6 - progress * 12;
        return `scale(1.15) translateX(${translateX.toFixed(2)}%)`;
      }
      case 'zoom-out': {
        const scale = 1.25 - progress * 0.22;
        return `scale(${scale.toFixed(3)})`;
      }
      case 'orbit': {
        const scale = 1.12 + Math.sin(progress * Math.PI) * 0.08;
        const rot = Math.sin(progress * Math.PI * 2) * 1.5;
        return `scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
      }
      default:
        return 'scale(1)';
    }
  };

  const motionLabel: Record<CameraMotion, string> = {
    'zoom-in': 'Zoom In',
    'zoom-out': 'Zoom Out',
    'pan-left-to-right': 'Pan Left → Right',
    'pan-right-to-left': 'Pan Right → Left',
    orbit: 'Orbit Sweep',
  };

  const currentSlideSrc = imgErrorMap[activeSlide.id]
    ? createSlideSvgFallback(activeSlide.title, currentSlideIndex + 1, activeSlide.caption)
    : activeSlide.imageUrl;

  return (
    <div className="relative w-full h-full bg-black flex flex-col justify-between overflow-hidden select-none rounded-2xl">
      {playMode === 'stream' ? (
        <video
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          autoPlay={effectivePlaying}
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
          {/* Main Slide Scene Image with Dynamic Kinetic Transform */}
          <img
            key={`${activeSlide.id}-${currentSlideIndex}`}
            src={currentSlideSrc}
            alt={activeSlide.title}
            onError={() => {
              setImgErrorMap((prev) => ({ ...prev, [activeSlide.id]: true }));
            }}
            style={{
              transform: getMotionTransform(activeSlide.cameraMotion, slideProgress),
              transition: effectivePlaying ? 'transform 0.08s linear' : 'transform 0.3s ease-out',
            }}
            className="w-full h-full object-cover transform-gpu will-change-transform"
          />

          {/* Cinematic Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50 pointer-events-none" />

          {/* Top Bar Controls */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
            {/* Slide Index Badge */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/40 font-mono shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Scene {currentSlideIndex + 1} of {slides.length}
              </span>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-neutral-900/80 backdrop-blur-md text-neutral-300 border border-white/10 hidden sm:inline-block">
                {motionLabel[activeSlide.cameraMotion]}
              </span>
            </div>

            {/* Voice-Over Toggle & Stream Toggle */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* Voice-Over Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVoiceOverEnabled((prev) => {
                    const next = !prev;
                    if (next && effectivePlaying) {
                      speakSlide(activeSlide);
                    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                    return next;
                  });
                }}
                title={voiceOverEnabled ? 'Voice-Over Narration is ON (Click to Mute)' : 'Voice-Over Narration is OFF (Click to Enable)'}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border transition-all ${
                  voiceOverEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                    : 'bg-black/60 text-neutral-400 border-white/10 hover:text-white'
                }`}
              >
                {voiceOverEnabled ? (
                  <>
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse text-amber-400' : ''}`} />
                    <span>Voice ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Voice OFF</span>
                  </>
                )}
              </button>

              {/* Mode Switcher */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlayMode((m) => (m === 'slides' ? 'stream' : 'slides'));
                }}
                title="Toggle Slide Storyboard vs Video Stream"
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-black/70 hover:bg-neutral-900 text-neutral-300 border border-white/10 transition-colors"
              >
                <Film className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">{playMode === 'slides' ? 'Slides' : 'Stream'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={handlePrevSlide}
            title="Previous Scene"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            title="Next Scene"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md border border-white/10 transition-all active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Center Play/Pause Overlay */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onTogglePlay) {
                onTogglePlay();
              } else {
                setInternalPlaying((prev) => !prev);
              }
            }}
            title={effectivePlaying ? 'Pause Video' : 'Play Slide Video'}
            className={`absolute z-20 w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-amber-500/40 transition-all active:scale-95 ${
              effectivePlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100 scale-100'
            }`}
          >
            {effectivePlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Bottom Captions & Scene Progress Bars */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex flex-col gap-1.5 pointer-events-none">
            {/* Caption Text */}
            {!compact && (
              <div className="text-left px-1">
                <p className="text-xs font-bold text-white drop-shadow-md line-clamp-1">
                  {activeSlide.title}
                </p>
                <p className="text-[11px] text-neutral-200 drop-shadow-md line-clamp-2">
                  {activeSlide.caption}
                </p>
              </div>
            )}

            {/* 4 Clickable Scene Segments with Progress */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {slides.map((s, idx) => {
                const isActive = idx === currentSlideIndex;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => handleSelectSlide(idx, e)}
                    title={`Jump to Scene ${idx + 1}: ${s.title}`}
                    className={`flex-1 h-2 rounded-full overflow-hidden transition-all relative ${
                      isActive ? 'bg-neutral-700/80 ring-1 ring-amber-400/50' : 'bg-neutral-800/80 hover:bg-neutral-700'
                    }`}
                  >
                    {isActive ? (
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-75"
                        style={{ width: `${(slideProgress * 100).toFixed(1)}%` }}
                      />
                    ) : idx < currentSlideIndex ? (
                      <div className="h-full bg-amber-500/70 rounded-full w-full" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
