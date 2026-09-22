import { useState, useRef, useEffect, useCallback } from 'react';

interface UseVoiceInputOptions {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = ({ onTranscript, onError }: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const hasTranscribedSpeechRef = useRef<boolean>(false);

  const isSpeechRecSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
    setDurationSeconds(0);
  }, []);

  const sendAudioForFallbackTranscription = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 500) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const dataUrl = await base64Promise;

      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({
          audioBase64: dataUrl,
          mimeType: audioBlob.type || 'audio/webm',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.transcript && data.transcript.trim()) {
          onTranscript(data.transcript.trim(), true);
          hasTranscribedSpeechRef.current = true;
        }
      }
    } catch (err: any) {
      console.warn('Fallback audio transcription failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    setIsListening(false);

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Safe ignore
      }
      recognitionRef.current = null;
    }

    // Stop Media Recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Safe ignore
      }
    }

    cleanupAudio();
  }, [cleanupAudio]);

  const startListening = useCallback(async () => {
    setError(null);
    hasTranscribedSpeechRef.current = false;
    audioChunksRef.current = [];

    // 1. Request microphone stream via getUserMedia
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (micErr: any) {
      const isDenied = micErr?.name === 'NotAllowedError' || micErr?.name === 'PermissionDeniedError';
      const msg = isDenied
        ? 'Microphone permission denied. Please click the camera/microphone icon in your address bar to allow access.'
        : 'Could not access microphone hardware. Please check your audio input device.';
      setError(msg);
      onError?.(msg);
      setIsListening(false);
      return;
    }

    setIsListening(true);

    // 2. Setup AudioContext Analyser for live visualizer wave
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    } catch {
      // AudioContext optional for meter
    }

    // 3. Setup Duration Timer
    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // 4. Setup MediaRecorder for universal AI transcription backup
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (!hasTranscribedSpeechRef.current && audioChunksRef.current.length > 0) {
          const fullBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          await sendAudioForFallbackTranscription(fullBlob);
        }
      };

      recorder.start(250); // Slice chunks every 250ms
    } catch (recErr) {
      console.warn('MediaRecorder setup error:', recErr);
    }

    // 5. Setup Web Speech Recognition if available
    if (isSpeechRecSupported) {
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          const currentPiece = finalTranscript || interimTranscript;
          if (currentPiece.trim()) {
            hasTranscribedSpeechRef.current = true;
            onTranscript(currentPiece.trim(), Boolean(finalTranscript));
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Web Speech Recognition event error:', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone permission blocked in browser.');
          } else if (event.error === 'network') {
            // Speech network failed, fallback MediaRecorder will process audio automatically
            console.log('Web Speech network offline, relying on AI voice transcription.');
          }
        };

        recognition.onend = () => {
          // If speech recognition ends naturally but recorder is active,
          // let recorder handle finish on stop
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (speechErr) {
        console.warn('SpeechRecognition start failed, fallback to audio recorder:', speechErr);
      }
    }
  }, [cleanupAudio, isSpeechRecSupported, onError, onTranscript, sendAudioForFallbackTranscription]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isProcessing,
    isSupported: true, // Always supported via Speech API or MediaRecorder fallback!
    audioLevel,
    durationSeconds,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearError: () => setError(null),
  };
};
