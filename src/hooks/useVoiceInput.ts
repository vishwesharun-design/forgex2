import { useState, useRef, useEffect, useCallback } from 'react';

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onSpeechFinished?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = ({ onTranscript, onSpeechFinished, onError }: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);

  // Store options in refs so re-renders do NOT recreate callbacks or trigger cleanup
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const onSpeechFinishedRef = useRef(onSpeechFinished);
  onSpeechFinishedRef.current = onSpeechFinished;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const hasTranscribedSpeechRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  const isSpeechRecSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    clearSilenceTimer();
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
  }, [clearSilenceTimer]);

  const sendAudioForFallbackTranscription = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 500) {
      onSpeechFinishedRef.current?.('');
      return;
    }
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
      const pureBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1].trim() : dataUrl.trim();

      const storedApiKey = localStorage.getItem('forgex_api_key') || '';
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
        },
        body: JSON.stringify({
          audioBase64: pureBase64,
          mimeType: (audioBlob.type || 'audio/webm').split(';')[0],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = (data.transcript || '').trim();
        if (text) {
          onTranscriptRef.current?.(text, true);
          onSpeechFinishedRef.current?.(text);
          hasTranscribedSpeechRef.current = true;
          return;
        }
      }
      onSpeechFinishedRef.current?.('');
    } catch (err: any) {
      console.warn('Fallback audio transcription failed:', err);
      onSpeechFinishedRef.current?.('');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    isListeningRef.current = false;
    setIsListening(false);

    const capturedText = latestTranscriptRef.current.trim();

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
    let recorderActive = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      recorderActive = true;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Safe ignore
      }
    }

    cleanupAudio();

    if (capturedText) {
      onSpeechFinishedRef.current?.(capturedText);
    } else if (!recorderActive) {
      onSpeechFinishedRef.current?.('');
    }
  }, [cleanupAudio, clearSilenceTimer]);

  const resetSilenceTimer = useCallback((delay = 2500) => {
    clearSilenceTimer();
    // Only auto-stop after speech has actually been detected
    if (hasTranscribedSpeechRef.current && latestTranscriptRef.current.trim().length > 0) {
      silenceTimerRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          stopListening();
        }
      }, delay);
    }
  }, [clearSilenceTimer, stopListening]);

  const startListening = useCallback(async () => {
    setError(null);
    hasTranscribedSpeechRef.current = false;
    latestTranscriptRef.current = '';
    audioChunksRef.current = [];
    clearSilenceTimer();

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
        ? 'Microphone permission denied. Please allow microphone permissions in your browser.'
        : 'Could not access microphone hardware. Please check your audio input device.';
      setError(msg);
      onErrorRef.current?.(msg);
      setIsListening(false);
      isListeningRef.current = false;
      onSpeechFinishedRef.current?.('');
      return;
    }

    isListeningRef.current = true;
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
          const level = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(level);

          if (level > 20) {
            resetSilenceTimer(2500);
          }

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
        } else if (!hasTranscribedSpeechRef.current) {
          onSpeechFinishedRef.current?.('');
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
          let fullTranscript = '';
          let interimTranscript = '';

          for (let i = 0; i < event.results.length; ++i) {
            const piece = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              fullTranscript += piece + ' ';
            } else {
              interimTranscript += piece;
            }
          }

          const currentPiece = (fullTranscript + interimTranscript).trim();
          if (currentPiece) {
            hasTranscribedSpeechRef.current = true;
            latestTranscriptRef.current = currentPiece;
            onTranscriptRef.current?.(currentPiece, Boolean(fullTranscript.trim()));
            resetSilenceTimer(2500);
          }
        };

        recognition.onspeechend = () => {
          if (hasTranscribedSpeechRef.current && latestTranscriptRef.current.trim().length > 0) {
            resetSilenceTimer(1500);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Web Speech Recognition event error:', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone permission blocked in browser.');
            onSpeechFinishedRef.current?.('');
          } else if (event.error === 'network') {
            console.log('Web Speech network offline, relying on AI voice transcription.');
          } else if (event.error === 'no-speech') {
            // User hasn't spoken yet; keep listening
          }
        };

        recognition.onend = () => {
          // If speech recognition ended naturally while user is still listening, try to resume
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognition.start();
            } catch {
              // Ignore
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (speechErr) {
        console.warn('SpeechRecognition start failed, fallback to audio recorder:', speechErr);
      }
    }
  }, [cleanupAudio, clearSilenceTimer, isSpeechRecSupported, resetSilenceTimer, sendAudioForFallbackTranscription]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current || isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Keep a ref to stopListening for unmount ONLY
  const stopListeningRef = useRef(stopListening);
  stopListeningRef.current = stopListening;

  useEffect(() => {
    return () => {
      // ONLY clean up when hook/component unmounts, never on re-render!
      stopListeningRef.current();
    };
  }, []);

  return {
    isListening,
    isProcessing,
    isSupported: true,
    audioLevel,
    durationSeconds,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearError: () => setError(null),
  };
};
