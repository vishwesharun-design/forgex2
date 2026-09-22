import { VoiceOption } from '../types';

export class VoiceController {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private animFrameId: number | null = null;
  private onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  private onStatusChange?: (
    status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported',
    error?: string
  ) => void;
  private onLevelUpdate?: (level: number) => void;
  private lastCapturedText: string = '';

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Cached voices ready
      };
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && (
      'SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window ||
      Boolean(navigator.mediaDevices?.getUserMedia)
    );
  }

  public getVoices(): VoiceOption[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    const list = window.speechSynthesis.getVoices();
    return list.map((v) => ({
      id: v.voiceURI,
      name: `${v.name} (${v.lang})`,
      lang: v.lang,
    }));
  }

  public setVoiceByUri(uri: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const list = window.speechSynthesis.getVoices();
    this.selectedVoice = list.find((v) => v.voiceURI === uri) || null;
  }

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

    // Interrupt any ongoing AI speech
    this.interruptSpeaking();

    // 1. Request hardware microphone access
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
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
      onStatus(
        'unsupported',
        isDenied
          ? 'Microphone permission denied. Please allow microphone permissions in your browser bar.'
          : 'Could not connect to microphone. Please check your system audio device.'
      );
      return false;
    }

    // 2. AudioContext Analyzer for real-time waveform pulse
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && this.mediaStream) {
        if (this.audioContext && this.audioContext.state !== 'closed') {
          this.audioContext.close().catch(() => {});
        }
        this.audioContext = new AudioContextClass();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          if (!this.isListening) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          this.onLevelUpdate?.(level);
          this.animFrameId = requestAnimationFrame(loop);
        };
        loop();
      }
    } catch (acErr) {
      console.warn('AudioContext visualization setup failed:', acErr);
    }

    // 3. Setup MediaRecorder for universal AI transcription backup
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(250);
    } catch (recErr) {
      console.warn('MediaRecorder error:', recErr);
    }

    // 4. Setup SpeechRecognition (fresh instance every time)
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        if (this.recognition) {
          try {
            this.recognition.stop();
          } catch {}
        }

        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

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
          console.warn('Speech recognition warning:', event.error);
          if (event.error === 'not-allowed') {
            this.onStatusChange?.('unsupported', 'Microphone access blocked.');
          }
        };

        recognition.onend = () => {
          // If stopped while isListening is still true, don't crash
        };

        this.recognition = recognition;
        this.recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition failed to start directly:', e);
      }
    }

    this.isListening = true;
    onStatus('listening');
    return true;
  }

  public async stopListening(): Promise<string> {
    this.isListening = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onLevelUpdate?.(0);

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.recognition) {
      try {
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

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
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
        const fullBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(fullBlob);
        const dataUrl = await base64Promise;

        const storedApiKey = localStorage.getItem('forgex_api_key') || '';
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
          },
          body: JSON.stringify({
            audioBase64: dataUrl,
            mimeType: 'audio/webm',
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
        console.warn('Audio fallback transcription error:', transcribeErr);
      }
    }

    this.onStatusChange?.('idle');
    return this.lastCapturedText.trim();
  }

  public interruptSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public speak(text: string, onComplete?: () => void): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onComplete?.();
      return;
    }

    this.interruptSpeaking();

    // Clean markdown symbols for natural speech
    const speechText = text
      .replace(/[#*`_~\[\]\(\)\{\}]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .slice(0, 1200);

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

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStatusChange?.('speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.onStatusChange?.('idle');
      onComplete?.();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.onStatusChange?.('idle');
      onComplete?.();
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const voiceController = new VoiceController();
