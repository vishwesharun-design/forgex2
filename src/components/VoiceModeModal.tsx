import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Menu,
  Settings,
  ChevronLeft,
  MessageSquare,
  RotateCcw,
  Check,
  Share2,
  AlertCircle,
  PhoneCall,
  PhoneOff,
  Headphones,
  Plus,
  Send,
  Image as ImageIcon,
  Lightbulb,
  ClipboardCheck,
  Languages,
  Download,
  BellRing,
} from 'lucide-react';
import { ActiveReminderAlert, VoiceOption, ForgeXModelId, ForgeXTheme, ImageStyle } from '../types';
import { voiceController } from '../services/voiceService';
import { imageService } from '../services/imageService';
import { detectImageGenerationIntent } from '../utils/imageIntent';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  userName?: string;
  onSendToChat?: (text: string) => void;
  activeReminder?: ActiveReminderAlert | null;
  onDismissReminder?: () => void;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  interrupted?: boolean;
  timestamp: number;
  audioBase64?: string;
  mimeType?: string;
  generatedImageUrl?: string;
  imagePrompt?: string;
}

type VoiceToolMode = 'general' | 'image' | 'ideas' | 'task' | 'translate';

interface QuickPromptCard {
  id: VoiceToolMode;
  label: string;
  prompt: string;
  placeholder: string;
  icon: React.ReactNode;
}

const QUICK_PROMPTS: QuickPromptCard[] = [
  {
    id: 'image',
    label: 'Create an image',
    prompt: 'A luminous floating crystal conservatory at twilight under aurora skies, vibrant ultra-detailed digital art',
    placeholder: 'Describe an image to create...',
    icon: <ImageIcon className="w-4 h-4 text-[#5A52BA]" />,
  },
  {
    id: 'ideas',
    label: 'Give me ideas',
    prompt: 'Give me three creative, practical, and exciting ideas I can explore right now. Keep them punchy.',
    placeholder: 'Ask for ideas on any topic...',
    icon: <Lightbulb className="w-4 h-4 text-[#6A56C8]" />,
  },
  {
    id: 'task',
    label: 'Do the task',
    prompt: 'I need help completing a task step by step. Give me a quick action framework and ask what task we are tackling.',
    placeholder: 'Tell me the task to break down...',
    icon: <ClipboardCheck className="w-4 h-4 text-[#5249B3]" />,
  },
  {
    id: 'translate',
    label: 'Translate the text',
    prompt: 'Translate mode ready! Ask me what phrase or sentence to translate and which language I want.',
    placeholder: 'Say or type text + target language...',
    icon: <Languages className="w-4 h-4 text-[#5C53BE]" />,
  },
];

interface CharacterOrbProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported';
  audioLevel: number;
  isMuted: boolean;
  isBlinking: boolean;
  eyeOffset: { x: number; y: number };
  waveTick: number;
  onClick: () => void;
  title: string;
}

const CharacterVoiceOrb: React.FC<CharacterOrbProps> = ({
  status,
  audioLevel,
  isMuted,
  isBlinking,
  eyeOffset,
  waveTick,
  onClick,
  title,
}) => {
  const listeningScale =
    status === 'listening' ? 1 + Math.min(0.09, audioLevel / 720) : 1;
  const speakingPulse =
    status === 'speaking'
      ? 1 + 0.03 + Math.sin(waveTick * 0.55) * 0.025 + Math.min(0.05, audioLevel / 1100)
      : 1;
  const orbScale =
    status === 'listening' ? listeningScale : status === 'speaking' ? speakingPulse : 1;

  // Eye shape responds naturally to voice state + randomized blinking
  let eyeScaleY = 1;
  if (isMuted) {
    eyeScaleY = 0.14;
  } else if (isBlinking) {
    eyeScaleY = 0.08;
  } else if (status === 'thinking') {
    eyeScaleY = 0.78;
  } else if (status === 'listening') {
    eyeScaleY = 1.06 + Math.min(0.08, audioLevel / 900);
  } else if (status === 'speaking') {
    eyeScaleY = 0.92 + Math.abs(Math.sin(waveTick * 0.5)) * 0.16;
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="relative group flex items-center justify-center focus:outline-none cursor-pointer animate-voice-orb-float"
      >
        <div
          className="relative flex items-center justify-center transition-transform duration-150 ease-out"
          style={{ transform: `scale(${orbScale.toFixed(3)})` }}
        >
          {/* Outer soft pastel aura glow */}
          <div
            aria-hidden="true"
            className={`absolute -inset-6 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
              status === 'speaking'
                ? 'bg-gradient-to-tr from-fuchsia-400/55 via-indigo-400/50 to-cyan-300/55 scale-110'
                : status === 'listening'
                ? 'bg-gradient-to-tr from-violet-400/45 via-indigo-400/45 to-sky-300/45 scale-105'
                : status === 'thinking'
                ? 'bg-gradient-to-tr from-purple-400/45 via-fuchsia-300/40 to-indigo-400/45 animate-pulse'
                : 'bg-gradient-to-tr from-purple-300/35 via-indigo-300/35 to-sky-300/35'
            }`}
          />

          {/* Translucent organic wavy frosted halo rings */}
          <div
            aria-hidden="true"
            className="absolute -inset-2.5 pointer-events-none rounded-[47%_53%_50%_50%/48%_46%_54%_52%] border-2 border-white/70 bg-white/15 backdrop-blur-[2px] shadow-[0_0_24px_rgba(255,255,255,0.75)] animate-voice-halo-rotate"
          />
          <div
            aria-hidden="true"
            className="absolute -inset-3.5 pointer-events-none rounded-[52%_48%_46%_54%/54%_50%_50%_46%] border border-white/45 opacity-80"
            style={{
              animation: 'voice-halo-rotate 16s linear infinite reverse',
            }}
          />

          {/* Listening ripple wave */}
          {status === 'listening' && (
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-full border border-indigo-400/40 animate-voice-ripple pointer-events-none"
            />
          )}

          {/* Core Luminous Gradient Sphere */}
          <div
            className="relative w-[166px] h-[166px] sm:w-[178px] sm:h-[178px] rounded-full overflow-hidden flex items-center justify-center shadow-[0_18px_38px_rgba(104,98,225,0.34),inset_0_2px_16px_rgba(255,255,255,0.65)] border border-white/55 transition-all duration-300 group-active:scale-95"
            style={{
              background: isMuted
                ? 'radial-gradient(circle at 30% 24%, #D2CCF2 0%, #9E96D8 45%, #7C7BA8 100%)'
                : 'radial-gradient(circle at 28% 24%, #EAAEFF 0%, #A986FF 38%, #7C7BFF 68%, #5BB8FF 100%)',
            }}
          >
            {/* Top-left glossy specular highlight */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -left-4 w-32 h-24 rounded-full bg-white/30 blur-xl rotate-[-22deg]"
            />
            {/* Bottom-right cyan/pink iridescent rim bounce */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-5 -right-4 w-32 h-24 rounded-full bg-cyan-200/35 blur-xl"
            />

            {/* Two Centered Vertical Pill Eyes with Blinking + Gaze Micro-Drift */}
            <div
              className="relative z-10 flex items-center justify-center gap-6 transition-transform duration-500 ease-out"
              style={{
                transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
              }}
            >
              <span
                className="block w-[15px] h-[34px] rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.92)] transition-transform duration-100 ease-in-out origin-center"
                style={{
                  transform: `scaleY(${eyeScaleY.toFixed(3)})`,
                  opacity: isMuted ? 0.72 : 1,
                }}
              />
              <span
                className="block w-[15px] h-[34px] rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.92)] transition-transform duration-100 ease-in-out origin-center"
                style={{
                  transform: `scaleY(${eyeScaleY.toFixed(3)})`,
                  opacity: isMuted ? 0.72 : 1,
                }}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Soft Floating Shadow Beneath Orb */}
      <div
        aria-hidden="true"
        className="mt-3 w-24 h-2.5 rounded-full bg-[#7A75DE]/35 blur-[5px] animate-voice-orb-shadow pointer-events-none"
      />
    </div>
  );
};

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  isDark,
  selectedModelId,
  userName,
  onSendToChat,
  activeReminder,
  onDismissReminder,
}) => {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [aiSpeechResponse, setAiSpeechResponse] = useState<string>('');
  const [textQuery, setTextQuery] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>(() => voiceController.getVoices());
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(
    () => voiceController.getSelectedVoiceUri() || 'gemini-Zephyr'
  );
  const [liveAudioLevel, setLiveAudioLevel] = useState<number>(0);
  const [continuousCall, setContinuousCall] = useState<boolean>(true);
  const [wasInterrupted, setWasInterrupted] = useState<boolean>(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [activeTab, setActiveTab] = useState<'stage' | 'transcript'>('stage');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
  const [waveTick, setWaveTick] = useState<number>(0);
  const [hasBlockedPlayback, setHasBlockedPlayback] = useState<boolean>(false);
  const [voiceToolMode, setVoiceToolMode] = useState<VoiceToolMode>('general');
  const [latestStageImage, setLatestStageImage] = useState<{ url: string; prompt: string } | null>(null);

  // Expressive Eye Blinking & Gaze Micro-Drift
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [eyeOffset, setEyeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const silenceTimerRef = useRef<any>(null);
  const vadSilenceTimerRef = useRef<any>(null);
  const resumeTimerRef = useRef<any>(null);
  const userSpokeRef = useRef<boolean>(false);
  const noiseFloorRef = useRef<number>(4);
  const continuousCallRef = useRef<boolean>(continuousCall);
  const isMutedRef = useRef<boolean>(isMuted);
  const activeTabRef = useRef<'stage' | 'transcript'>(activeTab);
  const turnsRef = useRef<ConversationTurn[]>(turns);
  const isProcessingRef = useRef<boolean>(false);
  const isOpenRef = useRef<boolean>(isOpen);
  const voiceToolModeRef = useRef<VoiceToolMode>(voiceToolMode);
  const startListeningLoopRef = useRef<() => Promise<void>>(async () => {});
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    voiceToolModeRef.current = voiceToolMode;
  }, [voiceToolMode]);

  useEffect(() => {
    continuousCallRef.current = continuousCall;
  }, [continuousCall]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    activeTabRef.current = activeTab;
    // Release hardware microphone while browsing/typing in Conversation view so Windows/Bluetooth audio stays in stereo output
    if (activeTab === 'transcript') {
      voiceController.pauseListening();
      voiceController.releaseMicStream();
      setLiveAudioLevel(0);
    } else if (isOpenRef.current && continuousCallRef.current && !isMutedRef.current && !isProcessingRef.current && !voiceController.isCurrentlySpeaking()) {
      setTimeout(() => {
        if (isOpenRef.current && activeTabRef.current === 'stage') {
          startListeningLoopRef.current();
        }
      }, 150);
    }
  }, [activeTab]);

  useEffect(() => {
    turnsRef.current = turns;
    if (activeTab === 'transcript' && transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTo({
        top: transcriptScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [turns, activeTab]);

  // Smooth wave tick while speaking or thinking
  useEffect(() => {
    if (!isOpen || (status !== 'speaking' && status !== 'thinking')) return;
    const id = setInterval(() => setWaveTick((t) => t + 1), 85);
    return () => clearInterval(id);
  }, [isOpen, status]);

  // Natural Randomized Blinking Animation Scheduler (single & occasional double-blinks)
  useEffect(() => {
    if (!isOpen) return;
    let mainTimer: any = null;
    let unblinkTimer: any = null;
    let doubleBlinkTimer: any = null;
    let doubleUnblinkTimer: any = null;

    const scheduleBlink = () => {
      const delay = 2300 + Math.random() * 2100;
      mainTimer = setTimeout(() => {
        setIsBlinking(true);
        unblinkTimer = setTimeout(() => {
          setIsBlinking(false);
          // 24% chance of a natural quick double-blink
          if (Math.random() < 0.24) {
            doubleBlinkTimer = setTimeout(() => {
              setIsBlinking(true);
              doubleUnblinkTimer = setTimeout(() => {
                setIsBlinking(false);
                scheduleBlink();
              }, 115);
            }, 130);
          } else {
            scheduleBlink();
          }
        }, 125);
      }, delay);
    };

    scheduleBlink();
    return () => {
      if (mainTimer) clearTimeout(mainTimer);
      if (unblinkTimer) clearTimeout(unblinkTimer);
      if (doubleBlinkTimer) clearTimeout(doubleBlinkTimer);
      if (doubleUnblinkTimer) clearTimeout(doubleUnblinkTimer);
      setIsBlinking(false);
    };
  }, [isOpen]);

  // Expressive Eye Gaze Micro-Drift
  useEffect(() => {
    if (!isOpen) return;
    if (status === 'thinking') {
      setEyeOffset({ x: 3, y: -3 });
      return;
    }
    if (isMuted) {
      setEyeOffset({ x: 0, y: 1 });
      return;
    }

    setEyeOffset({ x: 0, y: 0 });
    const id = setInterval(() => {
      if (status === 'idle' || status === 'listening') {
        const offsets = [
          { x: 0, y: 0 },
          { x: -3, y: -1 },
          { x: 3, y: -1 },
          { x: 0, y: 0 },
          { x: 2, y: 2 },
        ];
        setEyeOffset(offsets[Math.floor(Math.random() * offsets.length)]);
      } else {
        setEyeOffset({ x: 0, y: 0 });
      }
    }, 2600);

    return () => clearInterval(id);
  }, [isOpen, status, isMuted]);

  // Close settings popover on outside click
  useEffect(() => {
    if (!showOptionsMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showOptionsMenu]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleEndCall();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Handle hardware interruption callback safely via ref
  useEffect(() => {
    voiceController.setOnInterrupt(() => {
      setWasInterrupted(true);
      setStatus('listening');
      setTranscript('');
      startListeningLoopRef.current();
    });

    return () => {
      voiceController.setOnInterrupt(undefined);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      voiceController.stopSession();
      voiceController.interruptSpeaking(false);
      isProcessingRef.current = false;
      setStatus('idle');
      setTranscript('');
      setAiSpeechResponse('');
      setTextQuery('');
      setErrorMessage('');
      setShowOptionsMenu(false);
      setActiveTab('stage');
      setVoiceToolMode('general');
      setLatestStageImage(null);
      return;
    }

    voiceController.unlockAudio();

    const loadVoices = () => {
      const voices = voiceController.getVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !selectedVoiceUri) {
        setSelectedVoiceUri(voices[0].id);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const timer = setTimeout(() => {
      startListeningLoop();
    }, 320);

    return () => {
      clearTimeout(timer);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isOpen]);

  // Announce scheduled reminders aloud right while the user is talking in Voice Mode
  const lastSpokenReminderIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !activeReminder || activeReminder.id === lastSpokenReminderIdRef.current) return;
    lastSpokenReminderIdRef.current = activeReminder.id;

    voiceController.unlockAudio();
    voiceController.abortListeningWithoutTranscribe();
    setLiveAudioLevel(0);
    setAiSpeechResponse(activeReminder.spokenText);
    setTurns((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `⏰ ${activeReminder.spokenText}`,
        timestamp: activeReminder.triggeredAt,
      },
    ]);
    setStatus('speaking');
    voiceController.playSynthesizedResponse(
      activeReminder.spokenText,
      undefined,
      undefined,
      resumeListeningAfterSpeech,
      () => {
        setHasBlockedPlayback(true);
        setStatus('idle');
      }
    );
  }, [isOpen, activeReminder]);

  const handleVoiceChange = (uri: string) => {
    voiceController.unlockAudio();
    setSelectedVoiceUri(uri);
    voiceController.setVoiceByUri(uri);
    setShowOptionsMenu(false);
  };

  const startListeningLoop = async () => {
    if (!isOpenRef.current || isMutedRef.current || activeTabRef.current !== 'stage' || isProcessingRef.current) {
      return;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (vadSilenceTimerRef.current) {
      clearTimeout(vadSilenceTimerRef.current);
      vadSilenceTimerRef.current = null;
    }
    userSpokeRef.current = false;
    noiseFloorRef.current = 4;
    setErrorMessage('');

    const started = await voiceController.startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (wasInterrupted) {
          setWasInterrupted(false);
        }

        const trimmed = text.trim();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (trimmed.length > 0) {
          const timeoutMs = isFinal ? 550 : 1200;
          silenceTimerRef.current = setTimeout(() => {
            if (!isProcessingRef.current) {
              handleProcessVoiceQuery(trimmed);
            }
          }, timeoutMs);
        }
      },
      (newStatus, err) => {
        if (!isProcessingRef.current) {
          setStatus(newStatus);
        }
        if (err) setErrorMessage(err);
      },
      (level) => {
        setLiveAudioLevel(level);

        // Adaptive noise floor calibration while user hasn't started speaking
        if (!userSpokeRef.current) {
          noiseFloorRef.current = noiseFloorRef.current * 0.88 + Math.min(level, 25) * 0.12;
        }
        const speakThreshold = Math.max(10, noiseFloorRef.current + 6);
        const quietThreshold = Math.max(8, noiseFloorRef.current + 2.5);

        if (level > speakThreshold) {
          userSpokeRef.current = true;
          if (vadSilenceTimerRef.current) {
            clearTimeout(vadSilenceTimerRef.current);
            vadSilenceTimerRef.current = null;
          }
        } else if (level < quietThreshold && userSpokeRef.current) {
          if (!vadSilenceTimerRef.current && !silenceTimerRef.current) {
            vadSilenceTimerRef.current = setTimeout(() => {
              if (userSpokeRef.current && !isProcessingRef.current) {
                userSpokeRef.current = false;
                handleStopListening();
              }
            }, 1250);
          }
        }
      }
    );

    if (!started && isOpenRef.current && !isMutedRef.current) {
      setStatus('unsupported');
    }
  };

  startListeningLoopRef.current = startListeningLoop;

  const handleInterrupt = () => {
    voiceController.unlockAudio();
    setWasInterrupted(true);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    userSpokeRef.current = false;
    voiceController.interruptSpeaking(false);
    setStatus('listening');
    setTranscript('');
    startListeningLoop();
  };

  const handleStopListening = async () => {
    voiceController.unlockAudio();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
    userSpokeRef.current = false;
    const finalSpeech = await voiceController.stopListening();
    setLiveAudioLevel(0);
    const textToProcess = (finalSpeech || transcript).trim();
    if (textToProcess) {
      handleProcessVoiceQuery(textToProcess, { skipMicTranscription: true });
    } else if (isOpenRef.current && activeTabRef.current === 'stage' && continuousCallRef.current && !isMutedRef.current) {
      // Automatically keep hands-free mic alive if ambient sound or quick pause produced no speech
      setStatus('listening');
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        if (isOpenRef.current && !isMutedRef.current && !isProcessingRef.current) {
          startListeningLoopRef.current();
        }
      }, 150);
    } else {
      setStatus('idle');
    }
  };

  const handleToggleMute = () => {
    voiceController.unlockAudio();
    if (isMutedRef.current) {
      setIsMuted(false);
      isMutedRef.current = false;
      setTimeout(() => {
        startListeningLoop();
      }, 60);
    } else {
      setIsMuted(true);
      isMutedRef.current = true;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      voiceController.abortListeningWithoutTranscribe();
      setLiveAudioLevel(0);
      setStatus('idle');
    }
  };

  const resumeListeningAfterSpeech = () => {
    setHasBlockedPlayback(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    if (isOpenRef.current && activeTabRef.current === 'stage' && continuousCallRef.current && !isMutedRef.current) {
      // Brief pause after audio playback closes so hardware mic opens cleanly on Turn 2+
      setStatus('listening');
      setTranscript('');
      resumeTimerRef.current = setTimeout(() => {
        if (isOpenRef.current && activeTabRef.current === 'stage' && continuousCallRef.current && !isMutedRef.current && !isProcessingRef.current) {
          startListeningLoopRef.current();
        }
      }, 190);
    } else {
      setStatus('idle');
    }
  };

  const handleReplayTurnAudio = (turn: ConversationTurn) => {
    voiceController.unlockAudio();
    setHasBlockedPlayback(false);
    setStatus('speaking');
    voiceController.playSynthesizedResponse(
      turn.content,
      turn.audioBase64,
      turn.mimeType,
      resumeListeningAfterSpeech,
      () => {
        setHasBlockedPlayback(true);
        setStatus('idle');
      }
    );
  };

  const handleProcessVoiceQuery = async (
    queryText: string,
    options?: {
      skipMicTranscription?: boolean;
      forceImagePrompt?: string;
      toolModeOverride?: VoiceToolMode;
    }
  ) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setHasBlockedPlayback(false);
    voiceController.unlockAudio();

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    // Show immediate thinking feedback before tearing down mic hardware
    setErrorMessage('');
    setTranscript(cleanQuery);
    setStatus('thinking');
    setLiveAudioLevel(0);

    if (options?.skipMicTranscription) {
      voiceController.abortListeningWithoutTranscribe();
    } else {
      await voiceController.stopListening();
      voiceController.releaseMicStream();
    }

    const activeTool = options?.toolModeOverride || voiceToolModeRef.current;

    const userTurn: ConversationTurn = {
      role: 'user',
      content: cleanQuery,
      timestamp: Date.now(),
    };
    const updatedTurns = [...turnsRef.current, userTurn];
    setTurns(updatedTurns);
    turnsRef.current = updatedTurns;

    try {
      const detectedImageIntent = detectImageGenerationIntent(cleanQuery, false);
      const isDirectImageCommand = /^(?:create|generate|draw|make|paint|render|sketch)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|drawing|painting|artwork|claymation)/i.test(cleanQuery);
      const shouldGenerateImage =
        Boolean(options?.forceImagePrompt) ||
        detectedImageIntent.isImage ||
        isDirectImageCommand ||
        (activeTool === 'image' && !/^(?:stop|cancel|exit|translate|what|who|why|how)/i.test(cleanQuery));

      if (shouldGenerateImage) {
        const finalImagePrompt =
          options?.forceImagePrompt ||
          (detectedImageIntent.isImage && detectedImageIntent.prompt ? detectedImageIntent.prompt : cleanQuery);
        const imgs = await imageService.generateImages({
          prompt: finalImagePrompt,
          aspectRatio: '1:1',
          count: 1,
          style: (detectedImageIntent.style as ImageStyle) || 'None',
          modelId: selectedModelId,
        });

        const createdImg = imgs && imgs[0];
        if (createdImg?.imageUrl) {
          setLatestStageImage({ url: createdImg.imageUrl, prompt: finalImagePrompt });
          const reply = `Here is the image I created for "${finalImagePrompt.slice(0, 60)}". What should we visualize or talk about next?`;
          setAiSpeechResponse(reply);

          const assistantTurn: ConversationTurn = {
            role: 'assistant',
            content: reply,
            timestamp: Date.now(),
            generatedImageUrl: createdImg.imageUrl,
            imagePrompt: finalImagePrompt,
          };
          setTurns((prev) => [...prev, assistantTurn]);
          setVoiceToolMode('general');

          setStatus('speaking');
          isProcessingRef.current = false;

          voiceController.playSynthesizedResponse(
            reply,
            undefined,
            undefined,
            resumeListeningAfterSpeech,
            () => {
              setHasBlockedPlayback(true);
              setStatus('idle');
            }
          );
          return;
        }
      }

      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      const historyPayload = updatedTurns.slice(-6).map((t) => ({
        role: t.role === 'user' ? 'user' : 'assistant',
        content: t.content,
      }));
      const chosenVoice = selectedVoiceUri.replace(/^gemini-/i, '') || 'Zephyr';

      const messageWithContext =
        activeTool === 'translate' && !/translate/i.test(cleanQuery)
          ? `Translate this cleanly and speak the translation: ${cleanQuery}`
          : activeTool === 'task'
          ? `Help the user accomplish this task concisely step by step: ${cleanQuery}`
          : activeTool === 'ideas'
          ? `Brainstorm creative, exciting ideas concisely for: ${cleanQuery}`
          : cleanQuery;

      const res = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({
          message: messageWithContext,
          history: historyPayload.slice(0, -1),
          voiceName: chosenVoice,
          modelId: selectedModelId,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not reach AI voice assistant');
      }

      const data = await res.json();
      const reply = data.reply || 'I hear you. What would you like to explore next?';
      setAiSpeechResponse(reply);

      const assistantTurn: ConversationTurn = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        audioBase64: data.audioBase64,
        mimeType: data.mimeType,
      };
      setTurns((prev) => [...prev, assistantTurn]);

      setStatus('speaking');
      isProcessingRef.current = false;

      voiceController.playSynthesizedResponse(
        reply,
        data.audioBase64,
        data.mimeType,
        resumeListeningAfterSpeech,
        () => {
          setHasBlockedPlayback(true);
          setStatus('idle');
        }
      );
    } catch (err: unknown) {
      isProcessingRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('idle');
      setErrorMessage(msg);
    }
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = textQuery.trim();
    if (!val) return;
    voiceController.unlockAudio();
    setTextQuery('');
    if (status === 'speaking') {
      voiceController.interruptSpeaking(false);
    }
    handleProcessVoiceQuery(val, { skipMicTranscription: true });
  };

  const handleQuickPromptClick = (item: QuickPromptCard) => {
    voiceController.unlockAudio();
    if (status === 'speaking') {
      voiceController.interruptSpeaking(false);
    }
    setVoiceToolMode(item.id);

    const typed = textQuery.trim();
    if (typed) {
      setTextQuery('');
      handleProcessVoiceQuery(
        item.id === 'image' ? typed : `${item.label}: ${typed}`,
        {
          skipMicTranscription: true,
          forceImagePrompt: item.id === 'image' ? typed : undefined,
          toolModeOverride: item.id,
        }
      );
      return;
    }

    handleProcessVoiceQuery(item.prompt, {
      skipMicTranscription: true,
      forceImagePrompt: item.id === 'image' ? item.prompt : undefined,
      toolModeOverride: item.id,
    });
  };

  const handleClearHistory = () => {
    setTurns([]);
    setTranscript('');
    setAiSpeechResponse('');
    setErrorMessage('');
  };

  const handleEndCall = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (vadSilenceTimerRef.current) clearTimeout(vadSilenceTimerRef.current);
    voiceController.stopListening();
    voiceController.interruptSpeaking(false);
    voiceController.stopSession();
    onClose();
  };

  const handleCenterMicPress = () => {
    voiceController.unlockAudio();
    if (hasBlockedPlayback) {
      setHasBlockedPlayback(false);
      setStatus('speaking');
      voiceController.replayBlockedAudio(resumeListeningAfterSpeech);
      return;
    }
    if (status === 'speaking') {
      handleInterrupt();
    } else if (isMutedRef.current) {
      setIsMuted(false);
      isMutedRef.current = false;
      setTimeout(() => startListeningLoop(), 40);
    } else if (status === 'listening') {
      handleStopListening();
    } else {
      startListeningLoop();
    }
  };

  if (!isOpen) return null;

  const firstName = userName?.trim().split(/\s+/)[0] || '';
  const activeVoiceName =
    availableVoices.find((v) => v.id === selectedVoiceUri)?.name || 'Zephyr';

  const isActiveDialogue =
    status === 'listening' ||
    status === 'thinking' ||
    status === 'speaking' ||
    Boolean(transcript) ||
    Boolean(aiSpeechResponse);

  const primaryGreeting = firstName ? `Hello, ${firstName}!` : 'Hello!';
  const secondaryHeadline =
    status === 'thinking'
      ? 'Thinking...'
      : status === 'speaking'
      ? 'Speaking...'
      : status === 'listening' && (transcript || turns.length > 0)
      ? 'Listening...'
      : isMuted
      ? 'Microphone muted'
      : 'How can I help you today?';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleEndCall();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden select-none animate-in fade-in duration-200 ${
        isDark ? 'bg-black/65' : 'bg-indigo-950/30'
      } backdrop-blur-xl`}
    >
      {/* Frosted Pastel Lavender Voice Card Matching Reference UI */}
      <div
        id="modal-live-voice"
        onPointerDown={() => {
          voiceController.unlockAudio();
          if (hasBlockedPlayback) {
            setHasBlockedPlayback(false);
            setStatus('speaking');
            voiceController.replayBlockedAudio(resumeListeningAfterSpeech);
          }
        }}
        className="w-full max-w-[392px] h-[min(90dvh,748px)] rounded-[28px] sm:rounded-[36px] border-2 border-white/80 shadow-[0_28px_80px_rgba(78,72,170,0.34)] flex flex-col relative overflow-hidden text-[#39328E]"
        style={{
          background:
            'linear-gradient(172deg, #F6F2FF 0%, #EDE9FE 48%, #E1EBFF 100%)',
        }}
      >
        {/* Ambient Soft Pastel Blooms */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-75 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(226,184,255,0.65) 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 -right-20 w-72 h-72 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(167,225,255,0.7) 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/4 w-80 h-80 rounded-full opacity-65 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(206,196,255,0.75) 0%, transparent 70%)',
          }}
        />

        {/* TOP BAR: Circular Menu/Back on Left, Circular Settings + Close on Right */}
        <header className="relative z-30 shrink-0 px-4 sm:px-5 pt-4 sm:pt-5 pb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              voiceController.unlockAudio();
              setActiveTab((prev) => (prev === 'stage' ? 'transcript' : 'stage'));
            }}
            title={activeTab === 'transcript' ? 'Back to Voice Assistant' : 'View Conversation History'}
            className="relative w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-white shadow-[0_4px_14px_rgba(78,70,160,0.1)] flex items-center justify-center text-[#453DA1] transition-all active:scale-95 cursor-pointer"
          >
            {activeTab === 'transcript' ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <Menu className="w-[18px] h-[18px]" />
            )}
            {activeTab === 'stage' && turns.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#6B63FF] ring-2 ring-white" />
            )}
          </button>

          {activeTab === 'transcript' && (
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-tight text-[#39328E] whitespace-nowrap">
              Conversation
            </span>
          )}

          <div ref={optionsMenuRef} className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                voiceController.unlockAudio();
                setShowOptionsMenu((prev) => !prev);
              }}
              title="Voice Settings & Personas"
              className={`w-10 h-10 rounded-full border shadow-[0_4px_14px_rgba(78,70,160,0.1)] flex items-center justify-center text-[#453DA1] transition-all active:scale-95 cursor-pointer ${
                showOptionsMenu
                  ? 'bg-white border-indigo-200'
                  : 'bg-white/90 hover:bg-white border-white'
              }`}
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              title="Close Voice Assistant"
              className="w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-white shadow-[0_4px_14px_rgba(78,70,160,0.1)] flex items-center justify-center text-[#453DA1] hover:text-rose-500 transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-[18px] h-[18px]" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-[min(16rem,calc(100vw-48px))] p-2.5 rounded-2xl bg-white/95 backdrop-blur-2xl border border-white shadow-[0_18px_45px_rgba(52,46,128,0.22)] z-50 text-[#2E2775] animate-in fade-in zoom-in-95 duration-150">
                <div className="space-y-1 pb-2 mb-2 border-b border-indigo-950/10">
                  <button
                    type="button"
                    onClick={() => {
                      voiceController.unlockAudio();
                      setContinuousCall(!continuousCall);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-indigo-50 flex items-center justify-between text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {continuousCall ? (
                        <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <PhoneOff className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{continuousCall ? 'Hands-Free Mode' : 'Push-To-Talk'}</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                        continuousCall ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {continuousCall ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-indigo-50 flex items-center justify-between text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {isMuted ? (
                        <MicOff className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>{isMuted ? 'Microphone Muted' : 'Microphone Active'}</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                        isMuted ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isMuted ? 'MUTED' : 'LIVE'}
                    </span>
                  </button>
                </div>

                {availableVoices.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-950/55 px-2 pb-1.5">
                      <Headphones className="w-3 h-3" />
                      <span className="truncate">
                        Voice: {activeVoiceName.replace(/ \((?:Gemini AI|ForgeX Neural).*?\)/, '')}
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {availableVoices.map((v) => {
                        const isGeminiVoice = v.id.startsWith('gemini-');
                        const displayName = v.name.replace(/ \((?:Gemini AI|ForgeX Neural).*?\)/, '');
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleVoiceChange(v.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              selectedVoiceUri === v.id
                                ? 'bg-indigo-100 text-indigo-900 font-semibold'
                                : 'hover:bg-indigo-50 text-[#352F7D]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate pr-2">
                              <span className="truncate">{displayName}</span>
                              {isGeminiVoice && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/15 text-indigo-700 shrink-0">
                                  AI
                                </span>
                              )}
                            </div>
                            {selectedVoiceUri === v.id && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* MAIN STAGE */}
        <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-between px-4 sm:px-5 pb-4 sm:pb-5 pt-2 overflow-hidden">
          {activeTab === 'stage' ? (
            <>
              {/* Centered Greeting + Live Status */}
              <div className="w-full flex flex-col items-center text-center shrink-0 pt-1">
                <p className="text-[18px] font-medium tracking-tight text-[#4E46A6] leading-snug">
                  {primaryGreeting}
                </p>
                <h2 className="text-[20px] font-semibold tracking-tight text-[#39328E] leading-snug">
                  {secondaryHeadline}
                </h2>

                {/* Compact Fixed-Height Caption Slot */}
                <div className="mt-1.5 h-[36px] w-full max-w-[300px] flex items-center justify-center">
                  {hasBlockedPlayback ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHasBlockedPlayback(false);
                        setStatus('speaking');
                        voiceController.replayBlockedAudio(resumeListeningAfterSpeech);
                      }}
                      className="px-3 py-1 rounded-full bg-[#645CE8] hover:bg-[#534AD8] text-white text-[11px] font-medium shadow-sm flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <Headphones className="w-3 h-3" />
                      <span>Tap to hear voice reply</span>
                    </button>
                  ) : errorMessage ? (
                    <div className="px-2.5 py-1 rounded-full bg-rose-500/12 border border-rose-400/35 text-rose-700 text-[11px] flex items-center gap-1.5 max-w-full">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{errorMessage}</span>
                    </div>
                  ) : transcript && status !== 'speaking' ? (
                    <p className="text-[12px] text-[#554DA8] font-medium line-clamp-2 leading-tight animate-in fade-in duration-150">
                      "{transcript}"
                    </p>
                  ) : status === 'speaking' && aiSpeechResponse ? (
                    <p className="text-[12px] text-[#4C449E] line-clamp-2 leading-tight animate-in fade-in duration-150">
                      {aiSpeechResponse}
                    </p>
                  ) : isActiveDialogue && status === 'listening' ? (
                    <span className="text-[11px] font-medium text-[#6B63BC]">
                      Speak naturally — tap the orb anytime
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Centerpiece Luminous Orb with Blinking Eyes */}
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-1 gap-2">
                <CharacterVoiceOrb
                  status={status}
                  audioLevel={liveAudioLevel}
                  isMuted={isMuted}
                  isBlinking={isBlinking}
                  eyeOffset={eyeOffset}
                  waveTick={waveTick}
                  onClick={handleCenterMicPress}
                  title={
                    status === 'speaking'
                      ? 'Tap orb to interrupt and speak'
                      : status === 'listening'
                      ? 'Listening... Tap to process now'
                      : isMuted
                      ? 'Tap orb to unmute & listen'
                      : 'Tap orb to start listening'
                  }
                />

                {latestStageImage && (
                  <div className="relative flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl bg-white/90 border border-white shadow-[0_8px_24px_rgba(78,72,170,0.16)] max-w-full sm:max-w-[285px] animate-in fade-in zoom-in-95 duration-200">
                    <img
                      src={latestStageImage.url}
                      alt={latestStageImage.prompt}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-indigo-100"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[11px] font-semibold text-[#39328E] truncate">Created Image</p>
                      <p className="text-[10px] text-[#5D55B0] truncate">{latestStageImage.prompt}</p>
                    </div>
                    <a
                      href={latestStageImage.url}
                      download={`forgex-voice-${Date.now()}.png`}
                      title="Download image"
                      className="w-7 h-7 rounded-full bg-indigo-50 hover:bg-indigo-100 text-[#473E9C] flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setLatestStageImage(null)}
                      title="Dismiss image preview"
                      className="w-6 h-6 rounded-full hover:bg-indigo-50 text-[#6B63BC] flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* CLEAN CONVERSATION HISTORY VIEW (Anchored header + anchored bottom bar) */
            <div className="flex-1 min-h-0 flex flex-col pt-1 pb-3 overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-indigo-950/10 shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4F47A5]/75">
                  {turns.length} {turns.length === 1 ? 'Turn' : 'Turns'}
                </span>
                <div className="flex items-center gap-1.5">
                  {hasBlockedPlayback && (
                    <button
                      type="button"
                      onClick={() => {
                        setHasBlockedPlayback(false);
                        setStatus('speaking');
                        voiceController.replayBlockedAudio(resumeListeningAfterSpeech);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-[#645CE8] hover:bg-[#534AD8] text-white flex items-center gap-1 font-medium cursor-pointer animate-pulse shadow-xs"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Tap to hear voice</span>
                    </button>
                  )}
                  {turns.length > 0 && onSendToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        const compiled = turns
                          .map((t) => `${t.role === 'user' ? 'User' : 'ForgeX'}: ${t.content}`)
                          .join('\n\n');
                        onSendToChat(`[Voice Call Transcript]:\n\n${compiled}`);
                        handleEndCall();
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/85 hover:bg-white border border-white text-indigo-800 flex items-center gap-1 font-medium transition-colors cursor-pointer shadow-xs"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Send to Chat</span>
                    </button>
                  )}
                  {turns.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/80 hover:bg-white border border-white text-[#473E9C] hover:text-rose-600 flex items-center gap-1 font-medium transition-colors cursor-pointer shadow-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={transcriptScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2.5 py-3 pr-1 custom-scrollbar"
              >
                {turns.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6 text-[#4F47A5]/75">
                    <div className="w-12 h-12 rounded-full bg-white/75 border border-white shadow-sm flex items-center justify-center mb-3">
                      <MessageSquare className="w-5 h-5 text-[#665ED1]" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#39328E]">No conversation yet</p>
                    <p className="text-[11px] mt-1 leading-relaxed text-[#5D55B0]/85 max-w-[230px]">
                      Speak into the microphone or type below to start a live voice conversation.
                    </p>
                  </div>
                ) : (
                  turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl text-[12.5px] leading-relaxed shadow-sm border ${
                        turn.role === 'user'
                          ? 'bg-gradient-to-br from-[#5B54D6] to-[#473FA8] border-white/25 text-white ml-4 sm:ml-8 rounded-br-md'
                          : 'bg-white/90 border-white text-[#2F297A] mr-4 sm:mr-8 rounded-bl-md'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-75 font-semibold mb-1">
                        <span>{turn.role === 'user' ? (firstName || 'You') : 'ForgeX'}</span>
                        <div className="flex items-center gap-2">
                          {turn.role === 'assistant' && (
                            <button
                              type="button"
                              onClick={() => handleReplayTurnAudio(turn)}
                              title="Play voice reply"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-100/80 hover:bg-indigo-200/90 text-[#473E9C] transition-colors cursor-pointer"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span className="text-[9px]">Play</span>
                            </button>
                          )}
                          <span>
                            {new Date(turn.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      {turn.generatedImageUrl && (
                        <div className="mb-2 relative rounded-xl overflow-hidden border border-indigo-200/70 bg-white">
                          <img
                            src={turn.generatedImageUrl}
                            alt={turn.imagePrompt || 'Created image'}
                            className="w-full max-h-48 object-cover block"
                          />
                          <a
                            href={turn.generatedImageUrl}
                            download={`forgex-voice-${turn.timestamp}.png`}
                            title="Download image"
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{turn.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Anchored Bottom Section: Live Reminder Strip + 2x2 Quick Prompt Cards + Input Pill + Mic */}
          <div className="w-full shrink-0 flex flex-col gap-2 sm:gap-3">
            {activeReminder && (
              <div
                id="voice-reminder-below-bar"
                className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-amber-50/95 border border-amber-300/80 text-[#39328E] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BellRing className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
                  <span className="text-[12px] font-medium truncate">
                    <strong className="text-amber-700">Reminder: </strong>
                    {activeReminder.message}
                  </span>
                </div>
                {onDismissReminder && (
                  <button
                    type="button"
                    onClick={onDismissReminder}
                    title="Dismiss reminder"
                    className="p-1 rounded-full hover:bg-amber-200/60 text-amber-800 shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {activeTab === 'stage' && (
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {QUICK_PROMPTS.map((item) => {
                  const isActiveMode = voiceToolMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleQuickPromptClick(item)}
                      className={`rounded-2xl border px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2 text-left text-[12px] font-medium transition-all active:scale-[0.98] cursor-pointer ${
                        isActiveMode
                          ? 'bg-white border-[#8A82FF] text-[#352E96] shadow-[0_6px_20px_rgba(92,84,225,0.18)] ring-1 ring-[#8A82FF]/40'
                          : 'bg-white/85 hover:bg-white border-white shadow-[0_4px_14px_rgba(88,82,175,0.07)] text-[#473E9C] hover:shadow-[0_6px_18px_rgba(88,82,175,0.12)]'
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Input Bar + Circular Gradient Mic Button */}
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2.5">
              <div className="flex-1 h-12 rounded-full bg-white/90 border border-white shadow-[0_6px_20px_rgba(82,74,165,0.1)] px-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    voiceController.unlockAudio();
                    handleClearHistory();
                    setVoiceToolMode('general');
                    setLatestStageImage(null);
                    if (activeTab === 'transcript') {
                      setActiveTab('stage');
                    }
                    if (!isMutedRef.current) {
                      startListeningLoop();
                    }
                  }}
                  title="Start Fresh Voice Turn"
                  className="w-8 h-8 rounded-full bg-[#ECE8FF] hover:bg-[#DFD8FF] text-[#4C43A8] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  onKeyDown={() => voiceController.unlockAudio()}
                  placeholder={
                    QUICK_PROMPTS.find((q) => q.id === voiceToolMode)?.placeholder ||
                    'Ask me anything...'
                  }
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-[#352F7D] placeholder-[#7C75BD] outline-none"
                />

                {textQuery.trim().length > 0 && (
                  <button
                    type="submit"
                    title="Send to Voice Assistant"
                    className="w-8 h-8 rounded-full bg-[#6E74FF] hover:bg-[#5E64F5] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Circular Gradient Mic / Speaking Button */}
              <button
                type="button"
                onClick={handleCenterMicPress}
                title={
                  status === 'speaking'
                    ? 'AI Speaking (Tap to interrupt & speak)'
                    : isMuted
                    ? 'Unmute Microphone'
                    : status === 'listening'
                    ? 'Send Spoken Query'
                    : 'Start Speaking'
                }
                className={`relative w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white shadow-[0_8px_22px_rgba(98,104,238,0.42)] transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isMuted
                    ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                    : status === 'speaking'
                    ? 'bg-gradient-to-br from-[#7AC3FF] via-[#8F80FF] to-[#DF8CFF]'
                    : 'bg-gradient-to-br from-[#6A7BFF] via-[#7B7DFF] to-[#87CEFF]'
                }`}
              >
                {status === 'listening' && (
                  <span className="absolute -inset-1 rounded-full border-2 border-[#7E88FF]/60 animate-ping pointer-events-none opacity-60" />
                )}
                {status === 'speaking' ? (
                  <Volume2 className="w-5 h-5 animate-pulse" />
                ) : isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
