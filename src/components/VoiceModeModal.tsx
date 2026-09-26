import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ArrowRight,
  Radio,
  Settings2,
  AlertCircle,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  Headphones,
  Check,
  Share2,
  Activity,
  Zap
} from 'lucide-react';
import { VoiceOption, ForgeXModelId, ForgeXTheme } from '../types';
import { voiceController } from '../services/voiceService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSendToChat?: (text: string) => void;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  interrupted?: boolean;
  timestamp: number;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  isDark,
  theme,
  selectedModelId,
  onSendToChat,
}) => {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [aiSpeechResponse, setAiSpeechResponse] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [liveAudioLevel, setLiveAudioLevel] = useState<number>(0);
  const [continuousCall, setContinuousCall] = useState<boolean>(true);
  const [wasInterrupted, setWasInterrupted] = useState<boolean>(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [activeTab, setActiveTab] = useState<'stage' | 'transcript'>('stage');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showVoicePicker, setShowVoicePicker] = useState<boolean>(false);

  // Visual Haptic Feedback Engine State
  const [visualHapticsEnabled, setVisualHapticsEnabled] = useState<boolean>(true);
  const [hapticCounter, setHapticCounter] = useState<number>(0);
  const [hapticType, setHapticType] = useState<'tap' | 'transient' | 'turn' | 'interrupt' | 'thinking' | 'speaking'>('tap');
  const [hapticIntensity, setHapticIntensity] = useState<'low' | 'med' | 'high'>('med');

  const silenceTimerRef = useRef<any>(null);
  const continuousCallRef = useRef<boolean>(continuousCall);
  const turnsRef = useRef<ConversationTurn[]>(turns);
  const isProcessingRef = useRef<boolean>(false);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);
  const prevAudioLevelRef = useRef<number>(0);
  const lastTransientHapticRef = useRef<number>(0);
  const lastTranscriptRef = useRef<string>('');

  // Digital visual haptic feedback trigger (with device vibration fallback)
  const triggerHaptic = (
    type: 'tap' | 'transient' | 'turn' | 'interrupt' | 'thinking' | 'speaking',
    intensity: 'low' | 'med' | 'high' = 'med'
  ) => {
    if (!visualHapticsEnabled) return;
    setHapticCounter((prev) => prev + 1);
    setHapticType(type);
    setHapticIntensity(intensity);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'interrupt') {
          navigator.vibrate([24, 35, 20]);
        } else if (type === 'turn') {
          navigator.vibrate([18]);
        } else if (type === 'speaking') {
          navigator.vibrate([14]);
        } else if (type === 'tap') {
          navigator.vibrate([8]);
        } else if (type === 'transient') {
          navigator.vibrate([10]);
        }
      } catch {
        // Safe fail-silent if device does not permit vibration
      }
    }
  };

  useEffect(() => {
    continuousCallRef.current = continuousCall;
  }, [continuousCall]);

  useEffect(() => {
    turnsRef.current = turns;
    if (activeTab === 'transcript' && transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns, activeTab]);

  // Handle hardware interruption callback
  useEffect(() => {
    voiceController.setOnInterrupt(() => {
      setWasInterrupted(true);
      triggerHaptic('interrupt', 'high');
      setStatus('listening');
      setTranscript('');
      startListeningLoop();
    });

    return () => {
      voiceController.setOnInterrupt(undefined);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      voiceController.stopSession();
      voiceController.interruptSpeaking();
      setStatus('idle');
      setTranscript('');
      setAiSpeechResponse('');
      setShowVoicePicker(false);
      return;
    }

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

    // Auto start listening when opening modal
    const timer = setTimeout(() => {
      startListeningLoop();
    }, 350);

    return () => {
      clearTimeout(timer);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isOpen]);

  const handleVoiceChange = (uri: string) => {
    triggerHaptic('tap', 'low');
    setSelectedVoiceUri(uri);
    voiceController.setVoiceByUri(uri);
    setShowVoicePicker(false);
  };

  const startListeningLoop = async () => {
    if (isMuted) return;
    setErrorMessage('');
    const started = await voiceController.startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (wasInterrupted) {
          setWasInterrupted(false);
        }

        // Visual haptic tick on new transcribed words
        const trimmed = text.trim();
        if (trimmed.length > 0 && trimmed !== lastTranscriptRef.current) {
          lastTranscriptRef.current = trimmed;
          triggerHaptic('transient', 'low');
        }

        // Auto-silence detection for real human-like dialogue
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (trimmed.length > 1) {
          const timeoutMs = isFinal ? 600 : 1200;
          silenceTimerRef.current = setTimeout(() => {
            if (!isProcessingRef.current) {
              handleProcessVoiceQuery(trimmed);
            }
          }, timeoutMs);
        }
      },
      (newStatus, err) => {
        setStatus(newStatus);
        if (err) setErrorMessage(err);
      },
      (level) => {
        setLiveAudioLevel(level);

        // Visual haptic pulse when audio transient peaks above ambient noise
        const prev = prevAudioLevelRef.current;
        prevAudioLevelRef.current = level;
        if (level > 28 && (level - prev > 16 || prev < 12)) {
          const now = Date.now();
          if (now - lastTransientHapticRef.current > 380) {
            lastTransientHapticRef.current = now;
            triggerHaptic('transient', 'low');
          }
        }
      }
    );

    if (!started) {
      setStatus('unsupported');
    }
  };

  const handleInterrupt = () => {
    setWasInterrupted(true);
    triggerHaptic('interrupt', 'high');
    voiceController.interruptSpeaking();
    setStatus('listening');
    setTranscript('');
    startListeningLoop();
  };

  const handleStopListening = async () => {
    triggerHaptic('turn', 'med');
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const finalSpeech = await voiceController.stopListening();
    setLiveAudioLevel(0);
    const textToProcess = (finalSpeech || transcript).trim();
    if (textToProcess) {
      handleProcessVoiceQuery(textToProcess);
    } else {
      setStatus('idle');
    }
  };

  const handleToggleMute = () => {
    triggerHaptic('tap', 'low');
    if (isMuted) {
      setIsMuted(false);
      startListeningLoop();
    } else {
      setIsMuted(true);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      voiceController.stopListening();
      setLiveAudioLevel(0);
      setStatus('idle');
    }
  };

  const handleProcessVoiceQuery = async (queryText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    triggerHaptic('turn', 'med');
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    await voiceController.stopListening();
    setLiveAudioLevel(0);
    setStatus('thinking');
    triggerHaptic('thinking', 'low');

    // Append user turn
    const userTurn: ConversationTurn = {
      role: 'user',
      content: queryText,
      timestamp: Date.now(),
    };
    const updatedTurns = [...turnsRef.current, userTurn];
    setTurns(updatedTurns);
    turnsRef.current = updatedTurns;

    try {
      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      const historyPayload = updatedTurns.slice(-6).map((t) => ({
        role: t.role === 'user' ? 'user' : 'assistant',
        content: t.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({
          message: queryText,
          history: historyPayload.slice(0, -1),
          modelId: selectedModelId,
          systemInstruction:
            'You are ForgeX, an all-in-one AI creation and intelligence platform. ONLY if the user explicitly asks who created you, who made you, or who your creator is, state that you were created by VishweshVarman. Do NOT mention your creator unprompted. You are in a live real-time voice conversation with the user. Talk like a real, charismatic, thoughtful human being in natural spoken English. Keep your spoken answers concise, engaging, warm, and direct (1 to 3 short sentences). Avoid robotic bullet points, asterisks, lists, URLs, or markdown formatting because your response is being spoken aloud. If the user interrupted you, seamlessly acknowledge their point naturally.',
        }),
      });

      if (!res.ok) {
        throw new Error('AI Voice engine response error');
      }

      const data = await res.json();
      const reply = data.reply || 'I hear you. What would you like to explore next?';
      setAiSpeechResponse(reply);

      // Append assistant turn
      const assistantTurn: ConversationTurn = {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };
      setTurns((prev) => [...prev, assistantTurn]);

      setStatus('speaking');
      triggerHaptic('speaking', 'med');
      isProcessingRef.current = false;

      // Speak back with interruptibility
      voiceController.speak(reply, () => {
        if (continuousCallRef.current && !isMuted) {
          setStatus('listening');
          setTranscript('');
          startListeningLoop();
        } else {
          setStatus('idle');
        }
      });
    } catch (err: unknown) {
      isProcessingRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('idle');
      setErrorMessage(msg);
    }
  };

  const handleClearHistory = () => {
    setTurns([]);
    setTranscript('');
    setAiSpeechResponse('');
  };

  const handleEndCall = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    voiceController.stopListening();
    voiceController.interruptSpeaking();
    voiceController.stopSession();
    onClose();
  };

  if (!isOpen) return null;

  // Selected voice display label
  const activeVoiceName = availableVoices.find((v) => v.id === selectedVoiceUri)?.name || 'Default Persona';

  // Sample prompt chips for fast topic discovery
  const QUICK_TOPICS = [
    'Brainstorm creative startup names',
    'How do neural networks learn?',
    'Give me an inspiring daily thought',
    'Explain quantum computing simply',
    'Suggest a high-concept movie plot',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Main Responsive Modal Shell - Guarantees full screen fit without clipping */}
      <div
        id="modal-live-voice"
        className={`w-full max-w-xl md:max-w-2xl h-[92dvh] sm:h-[86vh] max-h-[660px] rounded-3xl border shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300 ${
          isDark
            ? 'bg-neutral-950/95 border-neutral-800 text-white shadow-black/80'
            : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-xl'
        }`}
      >
        {/* Visual Haptic Ambient Edge Aura - Subtle tactile luminescence pulsing around modal boundary */}
        {visualHapticsEnabled && hapticCounter > 0 && (
          <div
            key={`haptic-edge-${hapticCounter}`}
            className={`absolute inset-0 rounded-3xl pointer-events-none z-20 transition-all ${
              hapticType === 'interrupt'
                ? 'ring-2 ring-inset ring-red-500/60 shadow-[inset_0_0_36px_rgba(239,68,68,0.25)] animate-haptic-border'
                : hapticType === 'speaking'
                ? 'ring-2 ring-inset ring-amber-500/50 shadow-[inset_0_0_28px_rgba(245,158,11,0.2)] animate-haptic-border'
                : hapticType === 'transient'
                ? 'ring-1 ring-inset ring-rose-500/35 shadow-[inset_0_0_22px_rgba(244,63,94,0.18)] animate-haptic-border'
                : 'ring-1 ring-inset ring-amber-500/30 shadow-[inset_0_0_18px_rgba(245,158,11,0.14)] animate-haptic-border'
            }`}
          />
        )}

        {/* TOP BAR CONTRACT: Brand + Tabs + Voice Persona + Close */}
        <header className={`shrink-0 px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-2 sm:gap-3 ${
          isDark ? 'border-neutral-800/80 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50/80'
        }`}>
          {/* Brand & Live Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              status === 'speaking'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : status === 'listening'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/50'
            }`}>
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight truncate">ForgeX Live Voice</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                  status === 'speaking'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : status === 'listening'
                    ? 'bg-red-500/15 text-red-400'
                    : status === 'thinking'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-neutral-800 text-neutral-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'speaking'
                      ? 'bg-emerald-400 animate-pulse'
                      : status === 'listening'
                      ? 'bg-red-500 animate-ping'
                      : status === 'thinking'
                      ? 'bg-amber-400 animate-spin'
                      : 'bg-neutral-500'
                  }`} />
                  <span className="hidden xs:inline">
                    {status === 'speaking'
                      ? 'Speaking'
                      : status === 'listening'
                      ? 'Listening'
                      : status === 'thinking'
                      ? 'Thinking'
                      : 'Ready'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Center Tabs: Stage vs Transcript */}
          <div className={`flex items-center p-0.5 rounded-xl border ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
          }`}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', 'low');
                setActiveTab('stage');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'stage'
                  ? isDark
                    ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                    : 'bg-white text-neutral-900 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', 'low');
                setActiveTab('transcript');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'transcript'
                  ? isDark
                    ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                    : 'bg-white text-neutral-900 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Log</span>
              {turns.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 font-bold">
                  {turns.length}
                </span>
              )}
            </button>
          </div>

          {/* Right Action Icons: Persona Settings, Visual Haptics & Close */}
          <div className="flex items-center gap-1.5 relative">
            {availableVoices.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVoicePicker(!showVoicePicker)}
                  title={`Voice Persona: ${activeVoiceName}`}
                  className={`p-2 rounded-xl text-xs flex items-center gap-1 border transition-colors ${
                    showVoicePicker
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : isDark
                      ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px] max-w-[90px] truncate">
                    {activeVoiceName.split(' ')[0]}
                  </span>
                </button>

                {/* Dropdown Popover */}
                {showVoicePicker && (
                  <div className={`absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl border shadow-xl z-50 ${
                    isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'
                  }`}>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-2 py-1 font-semibold border-b border-neutral-800/60 mb-1">
                      Select Voice Persona
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {availableVoices.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleVoiceChange(v.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            selectedVoiceUri === v.id
                              ? 'bg-amber-500/15 text-amber-400 font-semibold'
                              : isDark
                              ? 'hover:bg-neutral-800 text-neutral-300'
                              : 'hover:bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          <span className="truncate pr-2">{v.name}</span>
                          {selectedVoiceUri === v.id && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Visual Haptics Feedback Indicator & Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !visualHapticsEnabled;
                setVisualHapticsEnabled(nextVal);
                if (nextVal) triggerHaptic('tap', 'med');
              }}
              title={
                visualHapticsEnabled
                  ? 'Visual Haptic Feedback: Active (Tap to pause subtle pulsing effects)'
                  : 'Visual Haptic Feedback: Off (Tap to enable tactile digital responses)'
              }
              className={`p-2 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${
                visualHapticsEnabled
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/10'
                  : isDark
                  ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-500 hover:text-neutral-300'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${visualHapticsEnabled ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline text-[11px] font-medium">Haptics</span>
            </button>

            <button
              type="button"
              onClick={handleEndCall}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title="Close Voice Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* CENTER STAGE / BODY (Flex-1 ensures it dynamically adapts to height without vertical scroll blowout) */}
        <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
          {activeTab === 'stage' ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden">
              {/* Context Headline Cue */}
              <div className="text-center shrink-0">
                <span className="text-xs sm:text-sm font-medium text-neutral-400 block transition-all">
                  {wasInterrupted
                    ? 'Interrupted — Go ahead, I am listening...'
                    : status === 'speaking'
                    ? 'ForgeX is speaking · Tap orb to interrupt anytime'
                    : status === 'listening'
                    ? continuousCall
                      ? 'Listening freely · Speak naturally'
                      : 'Listening (Push-To-Talk) · Speak now'
                    : status === 'thinking'
                    ? 'Synthesizing response with ForgeX reasoning...'
                    : isMuted
                    ? 'Microphone is muted'
                    : 'Tap the orb or say something to begin'}
                </span>
              </div>

              {/* Central Voice Orb & Soundwaves */}
              <div className="relative my-auto flex flex-col items-center justify-center shrink-0 py-2 sm:py-4">
                {/* Audio-Reactive Ambient Ripples */}
                {status === 'listening' && (
                  <div
                    className="absolute rounded-full bg-red-500/10 pointer-events-none transition-transform duration-100 ease-out"
                    style={{
                      width: `${190 + liveAudioLevel * 0.9}px`,
                      height: `${190 + liveAudioLevel * 0.9}px`,
                    }}
                  />
                )}

                {status === 'speaking' && (
                  <div className="absolute rounded-full bg-amber-500/15 w-[200px] h-[200px] animate-voice-ripple pointer-events-none" />
                )}

                {/* Visual Haptic Dynamic Shockwaves & Tactile Expansion Rings */}
                {visualHapticsEnabled && hapticCounter > 0 && (
                  <>
                    <div
                      key={`haptic-shock-${hapticCounter}`}
                      className={`absolute rounded-full pointer-events-none animate-haptic-shockwave ${
                        hapticType === 'interrupt'
                          ? 'bg-red-500/35 w-36 h-36 sm:w-44 sm:h-44'
                          : hapticType === 'speaking'
                          ? 'bg-amber-400/25 w-36 h-36 sm:w-44 sm:h-44'
                          : hapticType === 'transient'
                          ? 'bg-rose-500/20 w-32 h-32 sm:w-40 sm:h-40'
                          : 'bg-amber-400/20 w-32 h-32 sm:w-40 sm:h-40'
                      }`}
                    />
                    <div
                      key={`haptic-ring-${hapticCounter}`}
                      className={`absolute rounded-full pointer-events-none animate-haptic-ring ${
                        hapticType === 'interrupt'
                          ? 'border-2 border-red-500/60 w-32 h-32 sm:w-40 sm:h-40'
                          : hapticType === 'speaking'
                          ? 'border-2 border-amber-400/50 w-32 h-32 sm:w-40 sm:h-40'
                          : hapticType === 'transient'
                          ? 'border border-rose-400/40 w-28 h-28 sm:w-36 sm:h-36'
                          : 'border border-amber-400/35 w-28 h-28 sm:w-36 sm:h-36'
                      }`}
                    />
                  </>
                )}

                {/* Main Interactive Pulsing Orb */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap', 'med');
                    if (status === 'speaking') {
                      handleInterrupt();
                    } else if (status === 'listening') {
                      handleStopListening();
                    } else if (status === 'idle') {
                      startListeningLoop();
                    }
                  }}
                  title={
                    status === 'speaking'
                      ? 'Click to interrupt ForgeX'
                      : status === 'listening'
                      ? 'Listening to you... Click to process'
                      : 'Click to start speaking'
                  }
                  className={`w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full transition-all duration-300 flex items-center justify-center relative cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/50 ${
                    visualHapticsEnabled && (hapticType === 'tap' || hapticType === 'transient')
                      ? 'animate-haptic-pulse'
                      : ''
                  } ${
                    status === 'speaking'
                      ? 'bg-gradient-to-tr from-amber-500/30 via-amber-400/20 to-orange-500/30 ring-8 ring-amber-500/25 shadow-2xl shadow-amber-500/30 scale-105'
                      : status === 'listening'
                      ? 'bg-gradient-to-tr from-red-500/30 via-rose-500/25 to-amber-500/20 ring-8 ring-red-500/25 shadow-2xl shadow-red-500/20'
                      : status === 'thinking'
                      ? 'bg-gradient-to-tr from-amber-500/25 to-indigo-500/25 ring-4 ring-amber-500/20 animate-pulse'
                      : isDark
                      ? 'bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-900 shadow-lg'
                      : 'bg-neutral-100 border border-neutral-200 hover:border-amber-500/40 hover:bg-neutral-50 shadow-md'
                  }`}
                  style={{
                    transform: status === 'listening' ? `scale(${1 + liveAudioLevel / 220})` : undefined,
                  }}
                >
                  {/* Internal Glow Core */}
                  <div className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center transition-all ${
                    status === 'speaking'
                      ? 'bg-amber-500/20 text-amber-300'
                      : status === 'listening'
                      ? 'bg-red-500/20 text-red-300'
                      : status === 'thinking'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'text-neutral-400 group-hover:text-amber-400'
                  }`}>
                    {status === 'speaking' ? (
                      <>
                        <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse text-amber-400" />
                        <span className="text-[9px] font-bold mt-1 uppercase tracking-wider text-amber-300">Tap to Interrupt</span>
                      </>
                    ) : status === 'listening' ? (
                      <>
                        <Mic className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse text-red-400" />
                        <span className="text-[9px] font-bold mt-1 uppercase tracking-wider text-red-300">Listening</span>
                      </>
                    ) : status === 'thinking' ? (
                      <>
                        <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-amber-400" />
                        <span className="text-[9px] font-bold mt-1 uppercase tracking-wider text-amber-300">Thinking</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-10 h-10 sm:w-12 sm:h-12 transition-transform group-hover:scale-110" />
                        <span className="text-[9px] font-bold mt-1 uppercase tracking-wider text-neutral-400 group-hover:text-amber-400">Tap to Speak</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Reactive Waveform Equalizer Bars with Visual Haptic Spring */}
                <div className={`flex items-center gap-1 mt-4 h-6 transition-transform duration-150 ${
                  visualHapticsEnabled && (hapticType === 'transient' || hapticType === 'speaking') ? 'scale-y-110' : ''
                }`}>
                  {[20, 40, 65, 90, 75, 50, 85, 100, 80, 60, 95, 70, 45, 30, 20].map((threshold, i) => {
                    const isActive = status === 'listening' && liveAudioLevel >= threshold * 0.35;
                    const isSpeakingBar = status === 'speaking';
                    const heightVal = isActive
                      ? Math.max(6, Math.min(24, (liveAudioLevel / 100) * 24 * (threshold / 80)))
                      : isSpeakingBar
                      ? Math.max(5, 8 + Math.sin(i * 0.7 + Date.now() / 200) * 8)
                      : 4;

                    return (
                      <span
                        key={i}
                        className={`w-1 rounded-full transition-all duration-75 ${
                          isActive
                            ? 'bg-red-400'
                            : isSpeakingBar
                            ? 'bg-amber-400'
                            : isDark
                            ? 'bg-neutral-800'
                            : 'bg-neutral-300'
                        }`}
                        style={{ height: `${heightVal}px` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Subtitle / Real-time Speech Caption Box (Kept compact with max-h so it never pushes the layout) */}
              <div className="w-full shrink-0 space-y-2 max-w-lg mx-auto">
                <div className={`p-3 rounded-2xl border text-xs min-h-[58px] max-h-24 sm:max-h-28 overflow-y-auto custom-scrollbar transition-all duration-300 ${
                  isDark ? 'bg-neutral-900/60 border-neutral-800/80' : 'bg-neutral-50 border-neutral-200'
                } ${
                  visualHapticsEnabled && hapticCounter > 0 && hapticType === 'transient'
                    ? 'border-amber-500/50 shadow-[0_0_14px_rgba(245,158,11,0.18)]'
                    : ''
                }`}>
                  {transcript ? (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                        {wasInterrupted ? 'Interruption:' : 'You:'}
                      </span>
                      <p className="italic text-neutral-200">"{transcript}"</p>
                    </div>
                  ) : aiSpeechResponse && status === 'speaking' ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-400">
                        <span>ForgeX:</span>
                        <span className="text-[9px] text-neutral-400 font-normal">Spoken response</span>
                      </div>
                      <p className="text-neutral-200 line-clamp-3">{aiSpeechResponse}</p>
                    </div>
                  ) : status === 'thinking' ? (
                    <div className="flex items-center gap-2 text-neutral-400 py-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span className="animate-pulse">Thinking through response...</span>
                    </div>
                  ) : (
                    <div className="text-center text-neutral-500 py-1 text-xs">
                      {isMuted ? 'Microphone muted. Unmute to speak.' : 'Speak naturally or tap any topic below to start'}
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Quick Topics Carousel (Single-line horizontal scroll) */}
              <div className="w-full shrink-0 pt-2 border-t border-neutral-800/40">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {QUICK_TOPICS.map((topic, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap', 'med');
                        setTranscript(topic);
                        handleProcessVoiceQuery(topic);
                      }}
                      className={`text-[11px] whitespace-nowrap px-3 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                        visualHapticsEnabled ? 'active:scale-95' : ''
                      } ${
                        isDark
                          ? 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-850 hover:border-amber-500/40 text-neutral-300 hover:text-white'
                          : 'border-neutral-200 bg-neutral-100 hover:bg-white hover:border-amber-500/40 text-neutral-700 hover:text-neutral-900'
                      }`}
                    >
                      "{topic}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* CONVERSATION TRANSCRIPT LOG TAB */
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/60 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                    Dialogue Transcript ({turns.length} turns)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {turns.length > 0 && onSendToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap', 'low');
                        const compiled = turns
                          .map((t) => `${t.role === 'user' ? 'User' : 'ForgeX'}: ${t.content}`)
                          .join('\n\n');
                        onSendToChat(`[Voice Call Transcript]:\n\n${compiled}`);
                        onClose();
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-amber-400 flex items-center gap-1 font-medium transition-colors"
                      title="Send full voice dialogue to chat session"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Send to Chat</span>
                    </button>
                  )}
                  {turns.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap', 'low');
                        handleClearHistory();
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Transcript Message Stack */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-3 custom-scrollbar pr-1">
                {turns.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-amber-400" />
                    <p className="text-xs font-medium">No conversation turns recorded yet.</p>
                    <p className="text-[11px] text-neutral-500 mt-1">Speak into your microphone or tap a topic to begin talking.</p>
                  </div>
                ) : (
                  turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl text-xs space-y-1.5 transition-all ${
                        turn.role === 'user'
                          ? 'bg-amber-500/10 border border-amber-500/25 text-amber-100 ml-6'
                          : isDark
                          ? 'bg-neutral-900/90 border border-neutral-800 text-neutral-200 mr-6'
                          : 'bg-neutral-100 border border-neutral-200 text-neutral-800 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 font-semibold">
                        <span className={turn.role === 'user' ? 'text-amber-400' : 'text-neutral-300'}>
                          {turn.role === 'user' ? 'You' : 'ForgeX AI'}
                        </span>
                        <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div className="text-xs leading-relaxed">
                        <MarkdownRenderer content={turn.content} theme={theme} className="text-xs" />
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptBottomRef} />
              </div>
            </div>
          )}
        </main>

        {/* BOTTOM FIXED CONTROL ISLAND: Hands-Free Toggle + Primary Action + End Call */}
        <footer className={`shrink-0 p-3 sm:p-4 border-t flex items-center justify-between gap-2 sm:gap-3 ${
          isDark ? 'border-neutral-800/80 bg-neutral-950/90' : 'border-neutral-200 bg-neutral-50/90'
        }`}>
          {/* Left Controls: Hands-Free & Mute */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', 'low');
                setContinuousCall(!continuousCall);
              }}
              title={continuousCall ? 'Continuous Hands-Free Call enabled' : 'Push-To-Talk Mode enabled'}
              className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                continuousCall
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : isDark
                  ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {continuousCall ? <PhoneCall className="w-3.5 h-3.5" /> : <PhoneOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{continuousCall ? 'Hands-Free' : 'Push-To-Talk'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                isMuted
                  ? 'border-red-500/40 bg-red-500/15 text-red-400'
                  : isDark
                  ? 'border-neutral-800 text-neutral-400 hover:bg-neutral-900 hover:text-white'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Center Main Action Button */}
          <div className="flex items-center justify-center">
            {status === 'speaking' ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('interrupt', 'high');
                  handleInterrupt();
                }}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <VolumeX className="w-4 h-4" />
                <span>Interrupt & Speak</span>
              </button>
            ) : status === 'listening' ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('turn', 'med');
                  handleStopListening();
                }}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-red-400 transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer animate-pulse"
              >
                <MicOff className="w-4 h-4" />
                <span>Process Turn</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap', 'med');
                  startListeningLoop();
                }}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Start Speaking</span>
              </button>
            )}
          </div>

          {/* Right Action: End Call Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {transcript && onSendToChat && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap', 'low');
                  onSendToChat(`[Voice Call Query]: ${transcript}`);
                  onClose();
                }}
                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition-colors ${
                  isDark
                    ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-300'
                    : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                }`}
                title="Send current speech to Chat"
              >
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">To Chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', 'low');
                handleEndCall();
              }}
              className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="End Voice Call Session"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
