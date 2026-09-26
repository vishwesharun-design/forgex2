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
  Settings,
  AlertCircle,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  History,
  RotateCcw,
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
  const [showLog, setShowLog] = useState<boolean>(false);

  const silenceTimerRef = useRef<any>(null);
  const continuousCallRef = useRef<boolean>(continuousCall);
  const turnsRef = useRef<ConversationTurn[]>(turns);
  const isProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    continuousCallRef.current = continuousCall;
  }, [continuousCall]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Handle hardware interruption callback
  useEffect(() => {
    voiceController.setOnInterrupt(() => {
      setWasInterrupted(true);
      setStatus('listening');
      setTranscript('');
      // Resume listening loop immediately to catch user's interruption turn
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
    }, 400);

    return () => {
      clearTimeout(timer);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isOpen]);

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceUri(uri);
    voiceController.setVoiceByUri(uri);
  };

  const startListeningLoop = async () => {
    setErrorMessage('');
    const started = await voiceController.startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (wasInterrupted) {
          setWasInterrupted(false);
        }

        // Auto-silence detection for real human-like dialogue
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (text.trim().length > 1) {
          const timeoutMs = isFinal ? 600 : 1300;
          silenceTimerRef.current = setTimeout(() => {
            if (!isProcessingRef.current) {
              handleProcessVoiceQuery(text.trim());
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
      }
    );

    if (!started) {
      setStatus('unsupported');
    }
  };

  const handleInterrupt = () => {
    setWasInterrupted(true);
    voiceController.interruptSpeaking();
    setStatus('listening');
    setTranscript('');
    startListeningLoop();
  };

  const handleStopListening = async () => {
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

  const handleProcessVoiceQuery = async (queryText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    await voiceController.stopListening();
    setLiveAudioLevel(0);
    setStatus('thinking');

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
            'You are ForgeX, an all-in-one AI creation and intelligence platform. ONLY if the user explicitly asks who created you, who made you, or who your creator is, state that you were created by VishweshVarman. Do NOT mention your creator unprompted. You are in a live real-time voice phone conversation with the user. Talk like a real, charismatic, thoughtful human being in natural spoken English. Keep your spoken answers concise, engaging, warm, and direct (1 to 3 short sentences). Avoid robotic bullet points, asterisks, lists, URLs, or markdown formatting because your response is being spoken aloud. If the user interrupted you, seamlessly acknowledge their point naturally.',
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
      isProcessingRef.current = false;

      // Speak back with interruptibility
      voiceController.speak(reply, () => {
        // When AI finishes speaking naturally:
        if (continuousCallRef.current) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        id="modal-live-voice"
        className={`w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-8 flex flex-col items-center relative overflow-hidden my-auto ${
          isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Top Action Bar */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-neutral-800/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PhoneCall className="w-3.5 h-3.5" />
            </div>
            <span className="font-display font-bold text-sm">ForgeX Live Voice</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              BETA
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowLog(!showLog)}
              title="Toggle Conversation Transcript"
              className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-colors border ${
                showLog
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold'
                  : isDark
                  ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-400'
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Transcript</span>
            </button>

            <button
              onClick={() => {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                voiceController.stopListening();
                voiceController.interruptSpeaking();
                onClose();
              }}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-neutral-900 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title="Close Voice Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Conversation Transcript Drawer */}
        {showLog ? (
          <div className="w-full max-h-80 overflow-y-auto space-y-3 mb-4 p-3 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 custom-scrollbar">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                Dialogue Log ({turns.length} turns)
              </span>
              {turns.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[10px] text-neutral-400 hover:text-red-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {turns.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">No turns recorded yet. Speak to start the dialogue!</p>
            ) : (
              turns.map((turn, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    turn.role === 'user'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200 ml-4'
                      : 'bg-neutral-950/80 border border-neutral-800 text-neutral-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 font-semibold">
                    <span>{turn.role === 'user' ? 'You' : 'ForgeX AI'}</span>
                    <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <MarkdownRenderer content={turn.content} theme={theme} className="text-xs" />
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              wasInterrupted
                ? 'bg-amber-400 animate-ping'
                : status === 'listening'
                ? 'bg-red-500 animate-ping'
                : status === 'speaking'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'thinking'
                ? 'bg-amber-500 animate-spin'
                : 'bg-neutral-600'
            }`}
          />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
            {wasInterrupted
              ? 'INTERRUPTED — LISTENING TO YOU...'
              : status === 'listening'
              ? 'LISTENING... (SPEAK NATURALLY)'
              : status === 'thinking'
              ? 'REASONING & THINKING...'
              : status === 'speaking'
              ? 'AI TALKING (INTERRUPT ANYTIME)...'
              : status === 'unsupported'
              ? 'MICROPHONE ACCESS BLOCKED'
              : 'CONNECTED — READY TO TALK'}
          </span>
        </div>

        {/* Central Audio Waveform Pulsing Sphere — Clicking or speaking immediately interrupts! */}
        <div
          onClick={() => {
            if (status === 'speaking') {
              handleInterrupt();
            } else if (status === 'idle') {
              startListeningLoop();
            }
          }}
          title={status === 'speaking' ? 'Click to interrupt AI' : status === 'listening' ? 'Listening...' : 'Click to talk'}
          className="relative my-4 flex items-center justify-center cursor-pointer group"
        >
          {/* Subtle Outer Glow Rings */}
          {status === 'listening' && (
            <div
              className="absolute rounded-full bg-red-500/10 transition-transform duration-100 ease-out"
              style={{
                width: `${160 + liveAudioLevel * 0.9}px`,
                height: `${160 + liveAudioLevel * 0.9}px`,
              }}
            />
          )}

          {status === 'speaking' && (
            <div
              className="absolute rounded-full bg-amber-500/15 animate-ping"
              style={{ width: '180px', height: '180px' }}
            />
          )}

          <div
            className={`w-36 h-36 rounded-full transition-all duration-300 flex items-center justify-center relative select-none ${
              status === 'speaking'
                ? 'bg-gradient-to-tr from-amber-500/40 via-amber-400/25 to-orange-500/40 ring-8 ring-amber-500/25 scale-110 shadow-2xl shadow-amber-500/30'
                : status === 'listening'
                ? 'bg-gradient-to-tr from-red-500/40 via-rose-500/30 to-amber-500/20 ring-8 ring-red-500/30 shadow-2xl shadow-red-500/20'
                : status === 'thinking'
                ? 'bg-gradient-to-tr from-amber-500/30 to-blue-500/30 scale-95 animate-pulse'
                : 'bg-neutral-900 border border-neutral-800 group-hover:border-amber-500/50'
            }`}
            style={{
              transform: status === 'listening' ? `scale(${1 + liveAudioLevel / 200})` : undefined,
            }}
          >
            {status === 'speaking' ? (
              <div className="flex flex-col items-center">
                <Volume2 className="w-12 h-12 text-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold text-amber-300 mt-1 uppercase tracking-wider">Tap to Interrupt</span>
              </div>
            ) : status === 'listening' ? (
              <Mic className="w-12 h-12 text-red-400 animate-pulse" />
            ) : status === 'thinking' ? (
              <Sparkles className="w-12 h-12 text-amber-400 animate-spin" />
            ) : (
              <Radio className="w-12 h-12 text-neutral-400 group-hover:text-amber-400 transition-colors" />
            )}
          </div>
        </div>

        {/* Live Audio Level Meter */}
        {status === 'listening' && (
          <div className="flex items-center gap-1 my-2 h-4">
            {[20, 45, 75, 100, 75, 45, 20].map((threshold, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  liveAudioLevel >= threshold * 0.4 ? 'bg-red-400' : 'bg-neutral-800'
                }`}
                style={{
                  height: `${Math.max(4, (liveAudioLevel / 100) * 16)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Live Transcript / Speech Display with MarkdownRenderer */}
        <div className="w-full text-center space-y-2 mb-5 min-h-[64px] px-2">
          {transcript && (
            <div className="text-xs font-semibold text-neutral-200 bg-neutral-900/70 p-3 rounded-2xl border border-neutral-800/80 text-left">
              <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block mb-1">
                {wasInterrupted ? 'Interruption detected:' : 'You said:'}
              </span>
              <p className="italic">"{transcript}"</p>
            </div>
          )}

          {aiSpeechResponse && status === 'speaking' && (
            <div className="text-xs text-neutral-100 bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/30 text-left">
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold mb-1">
                <span>ForgeX Response:</span>
                <span className="text-[9px] text-neutral-400">Speak to interrupt anytime</span>
              </div>
              <MarkdownRenderer content={aiSpeechResponse} theme={theme} className="text-xs" />
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Interactive Control Buttons */}
        <div className="flex items-center gap-3 mb-5 flex-wrap justify-center">
          {status === 'speaking' ? (
            <button
              onClick={handleInterrupt}
              className="px-6 py-3 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <VolumeX className="w-4 h-4" />
              <span>Interrupt / Talk Now</span>
            </button>
          ) : status === 'listening' ? (
            <button
              onClick={handleStopListening}
              className="px-6 py-3 rounded-2xl bg-red-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-red-400 transition-all shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Process Turn Now</span>
            </button>
          ) : (
            <button
              onClick={startListeningLoop}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Start Speaking</span>
            </button>
          )}

          {/* Continuous Dialogue Toggle */}
          <button
            type="button"
            onClick={() => setContinuousCall(!continuousCall)}
            title={continuousCall ? 'Continuous hands-free conversation is enabled' : 'Push-to-talk mode enabled'}
            className={`px-3.5 py-3 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              continuousCall
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            {continuousCall ? <PhoneCall className="w-3.5 h-3.5" /> : <PhoneOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{continuousCall ? 'Live Call (Hands-Free)' : 'Push-To-Talk'}</span>
          </button>

          {transcript && onSendToChat && (
            <button
              onClick={() => {
                onSendToChat(`[Voice Call Query]: ${transcript}`);
                onClose();
              }}
              className="px-4 py-3 rounded-2xl border border-neutral-800 hover:bg-neutral-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-amber-400" />
              <span>Send to Chat</span>
            </button>
          )}
        </div>

        {/* Quick Voice Prompt Suggestions */}
        <div className="w-full pt-3.5 border-t border-neutral-800/60 mb-3">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Say or click any topic to start talking:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              'Give me a creative idea for an AI application',
              'Explain how neural diffusion synthesizes visual frames',
              'Brainstorm 3 catchy names for a tech startup',
            ].map((promptText, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTranscript(promptText);
                  handleProcessVoiceQuery(promptText);
                }}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/70 hover:border-amber-500/50 hover:text-amber-300 text-neutral-300 transition-colors text-left"
              >
                "{promptText}"
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selector */}
        {availableVoices.length > 0 && (
          <div className="w-full pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              AI Voice Persona:
            </span>
            <select
              value={selectedVoiceUri}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="px-2 py-1 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-200 text-xs focus:outline-none focus:border-amber-500 max-w-[240px] truncate"
            >
              {availableVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
