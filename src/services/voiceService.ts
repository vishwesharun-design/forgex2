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
  private micAudioContext: AudioContext | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micInitToken: number = 0;
  private playbackAudioContext: AudioContext | null = null;
  private currentBufferSource: AudioBufferSourceNode | null = null;
  private playbackRafId: number | null = null;
  private animFrameId: number | null = null;
  private restartTimer: any = null;
  private speechSafetyTimer: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private persistentAudio: HTMLAudioElement | null = null;
  private persistentUnlocked: boolean = false;
  private pendingBlockedAudio: { base64: string; mimeType: string; text: string } | null = null;
  private currentObjectUrl: string | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
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
      try {
        window.speechSynthesis.getVoices();
      } catch {}
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

  // Valid 20ms silent 8kHz mono PCM WAV so browsers cleanly prime HTMLAudio playback state
  private getSilentUnlockWavUrl(): string {
    return 'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  }

  private ensurePersistentAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (!this.persistentAudio) {
      const audio = document.createElement('audio');
      audio.setAttribute('playsinline', 'true');
      audio.preload = 'auto';
      audio.style.display = 'none';
      try {
        document.body.appendChild(audio);
      } catch {}
      this.persistentAudio = audio;
    }
    return this.persistentAudio;
  }

  /**
   * Synchronously unlocks browser Web Audio, persistent HTMLAudio, & SpeechSynthesis
   * inside a user tap/click/key gesture so async TTS playback is never blocked.
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!this.playbackAudioContext || this.playbackAudioContext.state === 'closed') {
          this.playbackAudioContext = new AudioContextClass();
        }
        if (this.playbackAudioContext.state === 'suspended') {
          this.playbackAudioContext.resume().catch(() => {});
        }
        const buffer = this.playbackAudioContext.createBuffer(1, 1, 22050);
        const source = this.playbackAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.playbackAudioContext.destination);
        source.start(0);
      }
    } catch {}

    try {
      const audio = this.ensurePersistentAudio();
      if (audio && !this.persistentUnlocked && !this.isSpeaking) {
        audio.src = this.getSilentUnlockWavUrl();
        audio.muted = true;
        audio.volume = 1;
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this.persistentUnlocked = true;
            if (!this.isSpeaking) {
              audio.pause();
              audio.muted = false;
              audio.volume = 1;
            }
          }).catch(() => {
            audio.muted = false;
            audio.volume = 1;
          });
        }
      }
    } catch {}

    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } catch {}
  }

  public releaseMicStream(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onLevelUpdate?.(0);
    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {}
      this.micSourceNode = null;
    }
    if (this.micAnalyser) {
      try {
        this.micAnalyser.disconnect();
      } catch {}
      this.micAnalyser = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
      } catch {}
      this.mediaStream = null;
    }
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
    const token = ++this.micInitToken;
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

    // Quietly stop any lingering AI speech without triggering a barge-in loop
    this.interruptSpeaking(false);

    // 1. Maintain hardware microphone access (reuse active stream to prevent browser permission drop)
    const isStreamAlive =
      this.mediaStream &&
      this.mediaStream.active &&
      this.mediaStream.getAudioTracks().some((t) => t.readyState === 'live');

    const acquiredFreshStream = !isStreamAlive;

    if (!isStreamAlive) {
      try {
        if (this.mediaStream) {
          try {
            this.mediaStream.getTracks().forEach((t) => t.stop());
          } catch {}
          this.mediaStream = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // If listening was aborted or restarted while getUserMedia was pending, clean up immediately
        if (!this.isListening || this.micInitToken !== token) {
          try {
            stream.getTracks().forEach((t) => t.stop());
          } catch {}
          return false;
        }
        this.mediaStream = stream;
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
      this.mediaStream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
    }

    if (!this.isListening || this.micInitToken !== token) {
      return false;
    }

    // 2. AudioContext Analyzer for real-time waveform pulse with clean node lifecycle
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && this.mediaStream) {
        if (!this.micAudioContext || this.micAudioContext.state === 'closed') {
          this.micAudioContext = new AudioContextClass();
        }

        if (this.micAudioContext.state === 'suspended') {
          this.micAudioContext.resume().catch(() => {});
        }

        if (this.micSourceNode) {
          try {
            this.micSourceNode.disconnect();
          } catch {}
          this.micSourceNode = null;
        }
        if (this.micAnalyser) {
          try {
            this.micAnalyser.disconnect();
          } catch {}
          this.micAnalyser = null;
        }

        const source = this.micAudioContext.createMediaStreamSource(this.mediaStream);
        const analyser = this.micAudioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        this.micSourceNode = source;
        this.micAnalyser = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let consecutiveVoiceHits = 0;

        if (this.animFrameId) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }

        const loop = () => {
          if (!this.isListening) return;

          if (this.micAudioContext && this.micAudioContext.state === 'suspended') {
            this.micAudioContext.resume().catch(() => {});
          }

          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          this.onLevelUpdate?.(level);

          // Barge-in Voice Activity Detection if listening overlapped with speaking
          if (this.isSpeaking && level > 28) {
            consecutiveVoiceHits++;
            if (consecutiveVoiceHits >= 3) {
              this.interruptSpeaking(true);
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

    // 4. Setup SpeechRecognition with brief settle delay after fresh hardware stream open + auto-restart
    if (acquiredFreshStream) {
      this.restartTimer = setTimeout(() => {
        if (this.isListening && this.micInitToken === token) {
          this.startRecognitionSession();
        }
      }, 140);
    } else {
      this.startRecognitionSession();
    }

    onStatus('listening');
    return true;
  }

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
            this.interruptSpeaking(true);
          }
          this.onTranscriptUpdate?.(text, Boolean(final));
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === 'no-speech') {
          return;
        }
        if (error === 'aborted' || error === 'audio-capture' || error === 'network') {
          if (this.isListening) {
            if (this.restartTimer) clearTimeout(this.restartTimer);
            this.restartTimer = setTimeout(() => {
              if (this.isListening) this.startRecognitionSession();
            }, 300);
          }
          return;
        }
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          console.warn('Speech recognition notice:', error);
        }
      };

      recognition.onend = () => {
        if (this.isListening) {
          if (this.restartTimer) {
            clearTimeout(this.restartTimer);
          }
          this.restartTimer = setTimeout(() => {
            if (this.isListening) {
              this.startRecognitionSession();
            }
          }, 90);
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

  public abortListeningWithoutTranscribe(): void {
    this.micInitToken++;
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

    if (this.mediaRecorder) {
      try {
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.onstop = null;
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch {}
    }

    this.audioChunks = [];
    this.lastCapturedText = '';
    this.releaseMicStream();
  }

  public pauseListening(): void {
    this.micInitToken++;
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

  private flushRecorderStop(): Promise<void> {
    return new Promise((resolve) => {
      const rec = this.mediaRecorder;
      if (!rec || rec.state === 'inactive') {
        resolve();
        return;
      }
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const prevOnStop = rec.onstop;
      rec.onstop = (ev) => {
        if (typeof prevOnStop === 'function') {
          try {
            prevOnStop.call(rec, ev);
          } catch {}
        }
        done();
      };
      try {
        if (typeof rec.requestData === 'function') {
          rec.requestData();
        }
        rec.stop();
      } catch {
        done();
      }
      setTimeout(done, 450);
    });
  }

  public async stopListening(): Promise<string> {
    this.micInitToken++;
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

    // Properly wait for MediaRecorder final chunk flush
    await this.flushRecorderStop();

    if (this.lastCapturedText.trim()) {
      this.onStatusChange?.('idle');
      return this.lastCapturedText.trim();
    }

    // Fallback: Use Gemini multimodal transcription on recorded audio chunks
    if (this.audioChunks.length > 0) {
      try {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const fullBlob = new Blob(this.audioChunks, { type: mimeType });
        if (fullBlob.size > 2400) {
          this.onStatusChange?.('thinking');
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
        }
      } catch (transcribeErr) {
        console.log('Audio fallback transcription notice:', transcribeErr);
      }
    }

    this.onStatusChange?.('idle');
    return this.lastCapturedText.trim();
  }

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

    if (this.micAudioContext && this.micAudioContext.state !== 'closed') {
      this.micAudioContext.close().catch(() => {});
      this.micAudioContext = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    this.interruptSpeaking(false);
    this.onStatusChange?.('idle');
  }

  public setOnInterrupt(cb?: () => void): void {
    this.onInterruptCallback = cb;
  }

  public isCurrentlySpeaking(): boolean {
    return (
      this.isSpeaking ||
      Boolean(this.currentBufferSource) ||
      Boolean(this.currentAudio && !this.currentAudio.paused) ||
      (typeof window !== 'undefined' && Boolean(window.speechSynthesis?.speaking))
    );
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public interruptSpeaking(triggerCallback: boolean = true): void {
    if (this.speechSafetyTimer) {
      clearTimeout(this.speechSafetyTimer);
      this.speechSafetyTimer = null;
    }

    if (this.playbackRafId) {
      cancelAnimationFrame(this.playbackRafId);
      this.playbackRafId = null;
    }

    let wasSpeaking = this.isSpeaking;

    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.onended = null;
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch {}
      this.currentBufferSource = null;
      wasSpeaking = true;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
      wasSpeaking = true;
    }

    if (this.currentObjectUrl) {
      try {
        URL.revokeObjectURL(this.currentObjectUrl);
      } catch {}
      this.currentObjectUrl = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          wasSpeaking = true;
        }
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.currentUtterance = null;
    this.isSpeaking = false;
    this.onLevelUpdate?.(0);

    if (wasSpeaking && triggerCallback && this.onInterruptCallback) {
      try {
        this.onInterruptCallback();
      } catch {}
    }
  }

  public async playSynthesizedResponse(
    text: string,
    audioBase64?: string,
    mimeType?: string,
    onComplete?: () => void,
    onPlaybackBlocked?: () => void
  ): Promise<void> {
    this.interruptSpeaking(false);

    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~\[\]\(\)\{\}]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech && !audioBase64) {
      onComplete?.();
      return;
    }

    // Release hardware microphone while speaking so OS/Bluetooth HFP & AEC ducking never mutes speaker output
    this.pauseListening();
    this.releaseMicStream();
    this.isSpeaking = true;
    this.pendingBlockedAudio = null;
    this.onStatusChange?.('speaking');

    if (audioBase64) {
      await this.playAudioBase64(
        audioBase64,
        mimeType || 'audio/wav',
        cleanSpeech,
        onComplete,
        onPlaybackBlocked
      );
      return;
    }

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
          await this.playAudioBase64(
            data.audioBase64,
            data.mimeType || 'audio/wav',
            cleanSpeech,
            onComplete,
            onPlaybackBlocked
          );
          return;
        }
      }
    } catch (ttsErr) {
      console.log('Gemini TTS synthesis notice, switching to browser speech synthesis:', ttsErr);
    }

    this.speakWithSpeechSynthesis(cleanSpeech, onComplete, onPlaybackBlocked);
  }

  public async replayBlockedAudio(onComplete?: () => void): Promise<boolean> {
    if (!this.pendingBlockedAudio) return false;
    const { base64, mimeType, text } = this.pendingBlockedAudio;
    this.pendingBlockedAudio = null;
    this.unlockAudio();
    await this.playSynthesizedResponse(text, base64, mimeType, onComplete);
    return true;
  }

  // Primary Speech Dispatcher: First attempts real Gemini AI Voice (/api/tts),
  // with seamless WebAudio -> persistent HTMLAudio -> SpeechSynthesis fallback chain.
  public async speak(text: string, onComplete?: () => void): Promise<void> {
    return this.playSynthesizedResponse(text, undefined, undefined, onComplete);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const clean = base64.includes(',') ? base64.split(',')[1].trim() : base64.trim();
    const binaryStr = atob(clean);
    const buffer = new ArrayBuffer(binaryStr.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return buffer;
  }

  // Plays audio via DOM-attached HTMLAudioElement first (clear OS audio routing & reliable playback events),
  // falling back to Web Audio API decodeAudioData, then SpeechSynthesis / onPlaybackBlocked.
  private async playAudioBase64(
    base64Data: string,
    mimeType: string,
    fallbackText: string,
    onComplete?: () => void,
    onPlaybackBlocked?: () => void
  ): Promise<void> {
    let audioArrayBuffer: ArrayBuffer;
    try {
      audioArrayBuffer = this.base64ToArrayBuffer(base64Data);
    } catch {
      this.speakWithSpeechSynthesis(fallbackText, onComplete, onPlaybackBlocked);
      return;
    }

    // Attempt 1: DOM-attached HTMLAudioElement with Blob URL (routes directly through OS/Chrome tab audio)
    const htmlAudioResult = await new Promise<'played' | 'blocked' | 'error'>((resolve) => {
      try {
        const blob = new Blob([audioArrayBuffer.slice(0)], { type: mimeType || 'audio/wav' });
        const objectUrl = URL.createObjectURL(blob);
        this.currentObjectUrl = objectUrl;

        const audio = this.ensurePersistentAudio() || new Audio();
        audio.muted = false;
        audio.volume = 1;
        audio.src = objectUrl;
        this.currentAudio = audio;

        let waveInterval: any = null;
        let settled = false;

        const cleanupState = () => {
          if (waveInterval) {
            clearInterval(waveInterval);
            waveInterval = null;
          }
          if (this.currentObjectUrl === objectUrl) {
            try {
              URL.revokeObjectURL(objectUrl);
            } catch {}
            this.currentObjectUrl = null;
          }
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
        };

        const finishSuccess = () => {
          if (settled) return;
          settled = true;
          cleanupState();
          this.isSpeaking = false;
          this.onLevelUpdate?.(0);
          this.onStatusChange?.('idle');
          onComplete?.();
          resolve('played');
        };

        const failWith = (reason: 'blocked' | 'error') => {
          if (settled) return;
          settled = true;
          cleanupState();
          resolve(reason);
        };

        audio.onplay = () => {
          this.isSpeaking = true;
          this.onStatusChange?.('speaking');
          waveInterval = setInterval(() => {
            if (!this.isSpeaking) {
              clearInterval(waveInterval);
              return;
            }
            const randomLevel = Math.floor(38 + Math.random() * 48);
            this.onLevelUpdate?.(randomLevel);
          }, 80);
        };

        audio.onended = finishSuccess;
        audio.onerror = () => failWith('error');

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            failWith(err?.name === 'NotAllowedError' ? 'blocked' : 'error');
          });
        }
      } catch {
        resolve('error');
      }
    });

    if (htmlAudioResult === 'played' || !this.isSpeaking) {
      return;
    }

    // Attempt 2: Web Audio API decodeAudioData on unlocked playbackAudioContext with explicit GainNode
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!this.playbackAudioContext || this.playbackAudioContext.state === 'closed') {
          this.playbackAudioContext = new AudioContextClass();
        }
        if (this.playbackAudioContext.state === 'suspended') {
          await Promise.race([
            this.playbackAudioContext.resume(),
            new Promise((r) => setTimeout(r, 350)),
          ]);
        }

        if (this.playbackAudioContext.state === 'running') {
          const decodedBuffer = await this.playbackAudioContext.decodeAudioData(
            audioArrayBuffer.slice(0)
          );
          if (!this.isSpeaking) {
            return;
          }

          await new Promise<void>((resolve) => {
            if (!this.playbackAudioContext) {
              resolve();
              return;
            }
            const source = this.playbackAudioContext.createBufferSource();
            source.buffer = decodedBuffer;

            const gainNode = this.playbackAudioContext.createGain();
            gainNode.gain.value = 1.0;

            const analyser = this.playbackAudioContext.createAnalyser();
            analyser.fftSize = 64;
            source.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(this.playbackAudioContext.destination);

            this.currentBufferSource = source;
            this.isSpeaking = true;
            this.onStatusChange?.('speaking');

            const freqData = new Uint8Array(analyser.frequencyBinCount);
            const pumpLevel = () => {
              if (!this.isSpeaking || this.currentBufferSource !== source) return;
              analyser.getByteFrequencyData(freqData);
              let sum = 0;
              for (let i = 0; i < freqData.length; i++) sum += freqData[i];
              const level = Math.min(100, Math.round((sum / freqData.length / 110) * 100));
              this.onLevelUpdate?.(Math.max(12, level));
              this.playbackRafId = requestAnimationFrame(pumpLevel);
            };
            this.playbackRafId = requestAnimationFrame(pumpLevel);

            source.onended = () => {
              if (this.playbackRafId) {
                cancelAnimationFrame(this.playbackRafId);
                this.playbackRafId = null;
              }
              if (this.currentBufferSource === source) {
                this.currentBufferSource = null;
              }
              this.isSpeaking = false;
              this.onLevelUpdate?.(0);
              this.onStatusChange?.('idle');
              onComplete?.();
              resolve();
            };

            source.start(0);
          });
          return;
        }
      }
    } catch (webAudioErr) {
      console.log('WebAudio playback notice:', webAudioErr);
    }

    if (htmlAudioResult === 'blocked' && onPlaybackBlocked) {
      this.pendingBlockedAudio = {
        base64: base64Data,
        mimeType: mimeType || 'audio/wav',
        text: fallbackText,
      };
      this.isSpeaking = false;
      this.onLevelUpdate?.(0);
      this.onStatusChange?.('idle');
      onPlaybackBlocked();
      return;
    }

    this.speakWithSpeechSynthesis(fallbackText, onComplete, onPlaybackBlocked);
  }

  // Browser SpeechSynthesis fallback with Chrome GC, iframe start-check, and fast timeout fixes
  private speakWithSpeechSynthesis(
    text: string,
    onComplete?: () => void,
    onPlaybackBlocked?: () => void
  ): void {
    const cleanText = (text || '').trim();
    if (!cleanText || typeof window === 'undefined' || !window.speechSynthesis) {
      this.isSpeaking = false;
      this.onLevelUpdate?.(0);
      this.onStatusChange?.('idle');
      onComplete?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const speechText = cleanText.slice(0, 1000);
      const utterance = new SpeechSynthesisUtterance(speechText);
      this.currentUtterance = utterance;

      const voices = window.speechSynthesis.getVoices();
      if (this.selectedVoice && !this.selectedVoiceUri.startsWith('gemini-')) {
        utterance.voice = this.selectedVoice;
      } else if (voices.length > 0) {
        const preferred =
          voices.find((v) => v.lang.startsWith('en') && /natural|google|samantha|daniel|aria|jenny/i.test(v.name)) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        if (preferred) utterance.voice = preferred;
      }

      utterance.rate = 1.04;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      let waveInterval: any = null;
      let startWatchdog: any = null;
      let started = false;
      let finished = false;

      const startWave = () => {
        if (waveInterval) clearInterval(waveInterval);
        waveInterval = setInterval(() => {
          if (!this.isSpeaking || finished) {
            clearInterval(waveInterval);
            return;
          }
          const randomLevel = Math.floor(35 + Math.random() * 42);
          this.onLevelUpdate?.(randomLevel);
        }, 80);
      };

      const finish = (blocked = false) => {
        if (finished) return;
        finished = true;
        if (startWatchdog) {
          clearTimeout(startWatchdog);
          startWatchdog = null;
        }
        if (this.speechSafetyTimer) {
          clearTimeout(this.speechSafetyTimer);
          this.speechSafetyTimer = null;
        }
        if (waveInterval) {
          clearInterval(waveInterval);
          waveInterval = null;
        }
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        this.isSpeaking = false;
        this.onLevelUpdate?.(0);
        this.onStatusChange?.('idle');
        if (blocked && onPlaybackBlocked) {
          onPlaybackBlocked();
        } else {
          onComplete?.();
        }
      };

      utterance.onstart = () => {
        started = true;
        if (startWatchdog) {
          clearTimeout(startWatchdog);
          startWatchdog = null;
        }
        this.isSpeaking = true;
        this.onStatusChange?.('speaking');
        startWave();
      };

      utterance.onend = () => finish(false);
      utterance.onerror = () => finish(false);

      // Fail-safe: if iframe speechSynthesis doesn't actually begin within 1.2s, don't hang silently
      startWatchdog = setTimeout(() => {
        if (!started && !finished && !window.speechSynthesis.speaking) {
          try {
            window.speechSynthesis.cancel();
          } catch {}
          finish(Boolean(onPlaybackBlocked));
        }
      }, 1200);

      // Safety timeout in case Chrome drops utterance mid-speech
      const timeoutMs = Math.max(4000, speechText.length * 85);
      this.speechSafetyTimer = setTimeout(() => {
        if (this.isSpeaking && !finished) {
          try {
            window.speechSynthesis.cancel();
          } catch {}
          finish(false);
        }
      }, timeoutMs);

      this.isSpeaking = true;
      this.onStatusChange?.('speaking');
      setTimeout(() => {
        if (!finished && this.currentUtterance === utterance) {
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
            window.speechSynthesis.speak(utterance);
          } catch {
            finish(false);
          }
        }
      }, 65);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
      this.currentUtterance = null;
      this.isSpeaking = false;
      this.onLevelUpdate?.(0);
      this.onStatusChange?.('idle');
      onComplete?.();
    }
  }
}

export const voiceController = new VoiceController();
