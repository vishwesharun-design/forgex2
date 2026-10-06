import { VoiceOption } from '../types';

export const GEMINI_AI_VOICES: VoiceOption[] = [
  { id: 'gemini-Zephyr', name: 'Zephyr (Gemini AI · Warm & Natural)', lang: 'en-US' },
  { id: 'gemini-Aoede', name: 'Aoede (Gemini AI · Lively & Expressive)', lang: 'en-US' },
  { id: 'gemini-Kore', name: 'Kore (Gemini AI · Soothing & Clear)', lang: 'en-US' },
  { id: 'gemini-Puck', name: 'Puck (Gemini AI · Charismatic & Upbeat)', lang: 'en-US' },
  { id: 'gemini-Fenrir', name: 'Fenrir (Gemini AI · Deep & Authoritative)', lang: 'en-US' },
  { id: 'gemini-Charon', name: 'Charon (Gemini AI · Calm & Resonant)', lang: 'en-US' },
];

export class VoiceController {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private selectedVoiceUri: string = 'gemini-Zephyr';
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private animFrameId: number | null = null;
  private restartTimer: any = null;
  private speechSafetyTimer: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  private onStatusChange?: (
    status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported',
    error?: string
  ) => void;
  private onLevelUpdate?: (level: number) => void;
  private onInterruptCallback?: () => void;
  private lastCapturedText: string = '';

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Update cached voices
      };
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      (Boolean(navigator.mediaDevices?.getUserMedia) ||
        'SpeechRecognition' in window ||
        'webkitSpeechRecognition' in window)
    );
  }

  public getVoices(): VoiceOption[] {
    const list: VoiceOption[] = [...GEMINI_AI_VOICES];
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const sysVoices = window.speechSynthesis.getVoices();
        for (const v of sysVoices) {
          list.push({
            id: v.voiceURI,
            name: `${v.name} (${v.lang})`,
            lang: v.lang,
          });
        }
      } catch {}
    }
    return list;
  }

  public getSelectedVoiceUri(): string {
    return this.selectedVoiceUri;
  }

  public setVoiceByUri(uri: string): void {
    this.selectedVoiceUri = uri;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const list = window.speechSynthesis.getVoices();
    this.selectedVoice = list.find((v) => v.voiceURI === uri) || null;
  }

  // Starts or resumes persistent listening loop with auto-recovery
  public async startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStatus: (
      status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported',
      error?: string
    ) => void,
    onLevel?: (level: number) => void
  ): Promise<boolean> {
    this.onTranscriptUpdate = onTranscript;
    this.onStatusChange = onStatus;
    this.onLevelUpdate = onLevel;
    this.lastCapturedText = '';
    this.audioChunks = [];
    this.isListening = true;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    // Interrupt any ongoing AI speech
    this.interruptSpeaking();

    // 1. Maintain hardware microphone access (reuse active stream to prevent browser permission drop)
    const isStreamAlive =
      this.mediaStream &&
      this.mediaStream.active &&
      this.mediaStream.getAudioTracks().some((t) => t.readyState === 'live');

    if (!isStreamAlive) {
      try {
        if (this.mediaStream) {
          try {
            this.mediaStream.getTracks().forEach((t) => t.stop());
          } catch {}
          this.mediaStream = null;
        }

        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err: any) {
        console.warn('Microphone access denied or unavailable:', err);
        const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
        this.isListening = false;
        onStatus(
          'unsupported',
          isDenied
            ? 'Microphone permission denied. Please allow microphone permissions in your browser bar.'
            : 'Could not connect to microphone. Please check your system audio device.'
        );
        return false;
      }
    } else if (this.mediaStream) {
      // Re-enable existing audio tracks
      this.mediaStream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
    }

    // 2. AudioContext Analyzer for real-time waveform pulse with auto-resume
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && this.mediaStream) {
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioContextClass();
        }

        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let consecutiveVoiceHits = 0;

        if (this.animFrameId) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }

        const loop = () => {
          if (!this.isListening && !this.isSpeaking) return;

          // Wake up suspended AudioContext if browser paused it during silence
          if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }

          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          this.onLevelUpdate?.(level);

          // Barge-in Voice Activity Detection: If user speaks while AI is talking, immediately cut off AI!
          if (this.isSpeaking && level > 24) {
            consecutiveVoiceHits++;
            if (consecutiveVoiceHits >= 2) {
              this.interruptSpeaking();
              consecutiveVoiceHits = 0;
            }
          } else {
            consecutiveVoiceHits = 0;
          }

          this.animFrameId = requestAnimationFrame(loop);
        };
        loop();
      }
    } catch (acErr) {
      console.warn('AudioContext visualization setup failed:', acErr);
    }

    // 3. Setup MediaRecorder for universal AI transcription backup
    try {
      if (this.mediaStream) {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          try {
            this.mediaRecorder.stop();
          } catch {}
        }

        this.mediaRecorder = mimeType
          ? new MediaRecorder(this.mediaStream, { mimeType })
          : new MediaRecorder(this.mediaStream);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        this.mediaRecorder.start(250);
      }
    } catch (recErr) {
      console.warn('MediaRecorder error:', recErr);
    }

    // 4. Setup SpeechRecognition with auto-restart on browser timeouts/silence
    this.startRecognitionSession();

    onStatus('listening');
    return true;
  }

  // Internal persistent SpeechRecognition session that automatically recovers
  private startRecognitionSession(): void {
    if (!this.isListening) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      if (this.recognition) {
        try {
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.stop();
        } catch {}
        this.recognition = null;
      }

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const text = (final || interim).trim();
        if (text) {
          this.lastCapturedText = text;
          if (this.isSpeaking) {
            this.interruptSpeaking();
          }
          this.onTranscriptUpdate?.(text, Boolean(final));
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        // Non-fatal browser silence or network glitches
        if (error === 'no-speech' || error === 'aborted') {
          return;
        }
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          console.warn('Speech recognition notice:', error);
          return;
        }
      };

      recognition.onend = () => {
        // Browser SpeechRecognition engine shuts down after silence or 60s continuous session.
        // If the user is still in listening mode, automatically restart recognition session!
        if (this.isListening) {
          if (this.restartTimer) {
            clearTimeout(this.restartTimer);
          }
          this.restartTimer = setTimeout(() => {
            if (this.isListening) {
              this.startRecognitionSession();
            }
          }, 80);
        }
      };

      this.recognition = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('SpeechRecognition start error:', e);
      if (this.isListening) {
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          if (this.isListening) this.startRecognitionSession();
        }, 300);
      }
    }
  }

  // Temporarily pauses listening while AI is thinking/speaking, keeping microphone hardware alive
  public pauseListening(): void {
    this.isListening = false;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
  }

  public async stopListening(): Promise<string> {
    this.isListening = false;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onLevelUpdate?.(0);

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    // Stop recorder and collect final audio
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    // If speech recognition already provided a valid transcript, return it
    if (this.lastCapturedText.trim()) {
      this.onStatusChange?.('idle');
      return this.lastCapturedText.trim();
    }

    // Fallback: If no transcript was captured via speech recognition, use Gemini transcription
    if (this.audioChunks.length > 0) {
      try {
        this.onStatusChange?.('thinking');
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const fullBlob = new Blob(this.audioChunks, { type: mimeType });
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(fullBlob);
        const dataUrl = await base64Promise;
        const pureBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1].trim() : dataUrl.trim();

        const storedApiKey = localStorage.getItem('forgex_api_key') || '';
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
          },
          body: JSON.stringify({
            audioBase64: pureBase64,
            mimeType: mimeType.split(';')[0],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.transcript && data.transcript.trim()) {
            const finalSpeech = data.transcript.trim();
            this.lastCapturedText = finalSpeech;
            this.onTranscriptUpdate?.(finalSpeech, true);
            this.onStatusChange?.('idle');
            return finalSpeech;
          }
        }
      } catch (transcribeErr) {
        console.log('Audio fallback transcription notice:', transcribeErr);
      }
    }

    this.onStatusChange?.('idle');
    return this.lastCapturedText.trim();
  }

  // Completely shuts down microphone hardware when closing the call or modal
  public stopSession(): void {
    this.isListening = false;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onLevelUpdate?.(0);

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    this.interruptSpeaking();
    this.onStatusChange?.('idle');
  }

  public setOnInterrupt(cb?: () => void): void {
    this.onInterruptCallback = cb;
  }

  public isCurrentlySpeaking(): boolean {
    return (
      this.isSpeaking ||
      Boolean(this.currentAudio && !this.currentAudio.paused) ||
      (typeof window !== 'undefined' && Boolean(window.speechSynthesis?.speaking))
    );
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public interruptSpeaking(): void {
    if (this.speechSafetyTimer) {
      clearTimeout(this.speechSafetyTimer);
      this.speechSafetyTimer = null;
    }

    let wasSpeaking = this.isSpeaking;

    // 1. Stop HTMLAudioElement (Gemini TTS)
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
      wasSpeaking = true;
    }

    // 2. Stop browser SpeechSynthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          wasSpeaking = true;
        }
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.isSpeaking = false;
    this.onLevelUpdate?.(0);

    if (wasSpeaking && this.onInterruptCallback) {
      try {
        this.onInterruptCallback();
      } catch {}
    }
  }

  // Primary Speech Dispatcher: First attempts real Gemini AI Voice (/api/tts),
  // with instant automatic fallback to SpeechSynthesis and Web Audio if offline.
  public async speak(text: string, onComplete?: () => void): Promise<void> {
    this.interruptSpeaking();

    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~\[\]\(\)\{\}]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .trim();

    if (!cleanSpeech) {
      onComplete?.();
      return;
    }

    this.isSpeaking = true;
    this.onStatusChange?.('speaking');

    // 1. Attempt High-Fidelity Gemini TTS via /api/tts
    try {
      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      const chosenVoice = this.selectedVoiceUri.replace(/^gemini-/i, '') || 'Zephyr';

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({
          text: cleanSpeech,
          voiceName: chosenVoice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audioBase64) {
          await this.playAudioBase64(data.audioBase64, data.mimeType || 'audio/wav', onComplete);
          return;
        }
      }
    } catch (ttsErr) {
      console.log('Gemini TTS synthesis notice, switching to browser speech synthesis:', ttsErr);
    }

    // 2. Resilient Browser SpeechSynthesis Fallback
    this.speakWithSpeechSynthesis(cleanSpeech, onComplete);
  }

  // Plays base64 WAV audio with waveform audio reactivity
  private async playAudioBase64(base64Data: string, mimeType: string, onComplete?: () => void): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        const audio = new Audio(`data:${mimeType};base64,${base64Data}`);
        this.currentAudio = audio;

        // Visual equalizer animation during playback
        let waveInterval: any = null;
        const startWave = () => {
          waveInterval = setInterval(() => {
            if (!this.isSpeaking) {
              clearInterval(waveInterval);
              return;
            }
            // Dynamic voice amplitude modulation between 35 and 90
            const randomLevel = Math.floor(40 + Math.random() * 45);
            this.onLevelUpdate?.(randomLevel);
          }, 80);
        };

        const cleanup = () => {
          if (waveInterval) clearInterval(waveInterval);
          this.currentAudio = null;
          this.isSpeaking = false;
          this.onLevelUpdate?.(0);
          this.onStatusChange?.('idle');
          onComplete?.();
          resolve();
        };

        audio.onplay = () => {
          this.isSpeaking = true;
          this.onStatusChange?.('speaking');
          startWave();
        };

        audio.onended = cleanup;
        audio.onerror = () => {
          if (waveInterval) clearInterval(waveInterval);
          // If audio tag fails, fall back to browser speech synthesis
          this.speakWithSpeechSynthesis(this.lastCapturedText, onComplete);
          resolve();
        };

        audio.play().catch((playErr) => {
          console.warn('Audio play notice:', playErr);
          if (waveInterval) clearInterval(waveInterval);
          this.speakWithSpeechSynthesis(this.lastCapturedText, onComplete);
          resolve();
        });
      } catch (err) {
        console.warn('playAudioBase64 error:', err);
        this.speakWithSpeechSynthesis(this.lastCapturedText, onComplete);
        resolve();
      }
    });
  }

  // Browser SpeechSynthesis fallback with Chrome iframe fixes
  private speakWithSpeechSynthesis(text: string, onComplete?: () => void): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.isSpeaking = false;
      this.onStatusChange?.('idle');
      onComplete?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      // Chrome iframe bug fix: resume paused speech synthesis
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const speechText = text.slice(0, 1000);
      const utterance = new SpeechSynthesisUtterance(speechText);

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      } else {
        const list = window.speechSynthesis.getVoices();
        if (list.length > 0) {
          const engVoice = list.find((v) => v.lang.startsWith('en')) || list[0];
          utterance.voice = engVoice;
        }
      }

      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      let waveInterval: any = null;
      const startWave = () => {
        waveInterval = setInterval(() => {
          if (!this.isSpeaking) {
            clearInterval(waveInterval);
            return;
          }
          const randomLevel = Math.floor(35 + Math.random() * 40);
          this.onLevelUpdate?.(randomLevel);
        }, 80);
      };

      const finish = () => {
        if (this.speechSafetyTimer) {
          clearTimeout(this.speechSafetyTimer);
          this.speechSafetyTimer = null;
        }
        if (waveInterval) clearInterval(waveInterval);
        this.isSpeaking = false;
        this.onLevelUpdate?.(0);
        this.onStatusChange?.('idle');
        onComplete?.();
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.onStatusChange?.('speaking');
        startWave();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      // Safety timeout: In case browser drops utterance in background/iframe
      const timeoutMs = Math.max(3500, speechText.length * 80);
      this.speechSafetyTimer = setTimeout(() => {
        if (this.isSpeaking) {
          window.speechSynthesis.cancel();
          finish();
        }
      }, timeoutMs);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      this.isSpeaking = false;
      this.onStatusChange?.('idle');
      onComplete?.();
    }
  }
}

export const voiceController = new VoiceController();

