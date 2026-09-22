import React, { useState, useEffect } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { VoiceOption, ForgeXModelId, ForgeXTheme } from '../types';
import { voiceController } from '../services/voiceService';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  theme: ForgeXTheme;
  selectedModelId: ForgeXModelId;
  onSendToChat?: (text: string) => void;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  isDark,
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

  useEffect(() => {
    if (!isOpen) {
      voiceController.stopListening();
      voiceController.interruptSpeaking();
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

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isOpen, selectedVoiceUri]);

  const handleVoiceChange = (uri: string) => {
    setSelectedVoiceUri(uri);
    voiceController.setVoiceByUri(uri);
  };

  const handleStartListening = async () => {
    setErrorMessage('');
    setTranscript('');
    const started = await voiceController.startListening(
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          handleProcessVoiceQuery(text);
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

  const handleStopListening = async () => {
    const finalSpeech = await voiceController.stopListening();
    setLiveAudioLevel(0);
    if (finalSpeech && finalSpeech.trim()) {
      handleProcessVoiceQuery(finalSpeech.trim());
    } else {
      setStatus('idle');
    }
  };

  const handleInterrupt = () => {
    voiceController.interruptSpeaking();
    setStatus('idle');
  };

  const handleProcessVoiceQuery = async (queryText: string) => {
    await voiceController.stopListening();
    setLiveAudioLevel(0);
    setStatus('thinking');

    try {
      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({
          message: queryText,
          history: [],
          modelId: selectedModelId,
        }),
      });

      if (!res.ok) {
        throw new Error('AI Voice engine response error');
      }

      const data = await res.json();
      const reply = data.reply || 'I received your request.';
      setAiSpeechResponse(reply);

      setStatus('speaking');
      voiceController.speak(reply, () => {
        setStatus('idle');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('idle');
      setErrorMessage(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl p-8 flex flex-col items-center relative overflow-hidden ${
          isDark
            ? 'bg-neutral-950 border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            voiceController.stopListening();
            voiceController.interruptSpeaking();
            onClose();
          }}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              status === 'listening'
                ? 'bg-red-500 animate-ping'
                : status === 'speaking'
                ? 'bg-emerald-500 animate-pulse'
                : status === 'thinking'
                ? 'bg-amber-500 animate-spin'
                : 'bg-neutral-600'
            }`}
          />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
            {status === 'listening'
              ? 'LISTENING TO MICROPHONE...'
              : status === 'thinking'
              ? 'PROCESSING NEURAL AUDIO...'
              : status === 'speaking'
              ? 'AI SPEAKING BACK...'
              : status === 'unsupported'
              ? 'MICROPHONE ACCESS BLOCKED'
              : 'LIVE VOICE MODE ACTIVE'}
          </span>
        </div>

        {/* Central Audio Waveform Pulsing Sphere */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Subtle Outer Glow Rings */}
          {status === 'listening' && (
            <div
              className="absolute rounded-full bg-red-500/10 transition-transform duration-100 ease-out"
              style={{
                width: `${160 + liveAudioLevel * 0.8}px`,
                height: `${160 + liveAudioLevel * 0.8}px`,
              }}
            />
          )}

          <div
            className={`w-36 h-36 rounded-full transition-all duration-300 flex items-center justify-center ${
              status === 'speaking'
                ? 'bg-gradient-to-tr from-amber-500/40 via-amber-400/20 to-orange-500/40 ring-8 ring-amber-500/20 scale-110 shadow-2xl shadow-amber-500/30'
                : status === 'listening'
                ? 'bg-gradient-to-tr from-red-500/40 via-rose-500/30 to-amber-500/20 ring-8 ring-red-500/30 shadow-2xl shadow-red-500/20'
                : status === 'thinking'
                ? 'bg-gradient-to-tr from-amber-500/30 to-blue-500/30 scale-95 animate-pulse'
                : 'bg-neutral-900 border border-neutral-800'
            }`}
            style={{
              transform: status === 'listening' ? `scale(${1 + (liveAudioLevel / 200)})` : undefined,
            }}
          >
            {status === 'speaking' ? (
              <Volume2 className="w-12 h-12 text-amber-400 animate-bounce" />
            ) : status === 'listening' ? (
              <Mic className="w-12 h-12 text-red-400 animate-pulse" />
            ) : status === 'thinking' ? (
              <Sparkles className="w-12 h-12 text-amber-400 animate-spin" />
            ) : (
              <Radio className="w-12 h-12 text-neutral-400" />
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
                  liveAudioLevel >= threshold * 0.5 ? 'bg-red-400' : 'bg-neutral-800'
                }`}
                style={{
                  height: `${Math.max(4, (liveAudioLevel / 100) * 16)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Live Transcript / Speech Display */}
        <div className="w-full text-center space-y-2 mb-6 min-h-[60px] px-2">
          {transcript && (
            <p className="text-xs font-semibold text-neutral-300 italic bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
              "{transcript}"
            </p>
          )}
          {aiSpeechResponse && status === 'speaking' && (
            <p className="text-xs text-amber-300 font-medium line-clamp-4 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              {aiSpeechResponse}
            </p>
          )}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Interactive Control Buttons */}
        <div className="flex items-center gap-3 mb-6 flex-wrap justify-center">
          {status === 'speaking' ? (
            <button
              onClick={handleInterrupt}
              className="px-6 py-3 rounded-2xl bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <VolumeX className="w-4 h-4" />
              <span>Interrupt AI</span>
            </button>
          ) : status === 'listening' ? (
            <button
              onClick={handleStopListening}
              className="px-6 py-3 rounded-2xl bg-red-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-red-400 transition-all shadow-lg shadow-red-500/20 active:scale-95"
            >
              <MicOff className="w-4 h-4" />
              <span>Done Speaking (Process)</span>
            </button>
          ) : (
            <button
              onClick={handleStartListening}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-xs flex items-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>Start Speaking</span>
            </button>
          )}

          {transcript && onSendToChat && (
            <button
              onClick={() => {
                onSendToChat(`[Voice Prompt]: ${transcript}`);
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
        <div className="w-full pt-4 border-t border-neutral-800/60 mb-4">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Or try speaking or clicking a sample prompt:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              'Give me a creative idea for a disco synthwave track',
              'What are the key rendering features in Unreal Engine 5?',
              'Compose a short chorus about neon city lights',
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
              Speech Voice:
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
