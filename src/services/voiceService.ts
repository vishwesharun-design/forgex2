import { VoiceOption } from '../types';

export class VoiceController {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  private onStatusChange?: (status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported', error?: string) => void;

  constructor() {
    this.initSpeechRecognition();
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
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
        const text = final || interim;
        if (text && this.onTranscriptUpdate) {
          // Interrupt AI if user speaks
          if (this.isSpeaking) {
            this.interruptSpeaking();
          }
          this.onTranscriptUpdate(text, Boolean(final));
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.onStatusChange?.('unsupported', 'Microphone access was denied. Please allow microphone permissions.');
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (_e) {
            this.isListening = false;
          }
        }
      };
    } catch (err) {
      console.warn('Failed to initialize speech recognition:', err);
    }
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

  public startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStatus: (status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported', error?: string) => void
  ): boolean {
    if (!this.isSupported() || !this.recognition) {
      onStatus('unsupported', 'Speech Recognition is not supported on this browser or requires HTTPS.');
      return false;
    }

    this.onTranscriptUpdate = onTranscript;
    this.onStatusChange = onStatus;

    try {
      this.interruptSpeaking();
      this.recognition.start();
      this.isListening = true;
      onStatus('listening');
      return true;
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      return false;
    }
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_e) {}
    }
    this.onStatusChange?.('idle');
  }

  public interruptSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  public speak(
    text: string,
    onComplete?: () => void
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onComplete?.();
      return;
    }

    this.interruptSpeaking();

    // Clean markdown symbols for cleaner natural speech
    const speechText = text
      .replace(/[#*`_~\[\]\(\)\{\}]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .slice(0, 1000);

    const utterance = new SpeechSynthesisUtterance(speechText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
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
