import { useState, useRef, useEffect, useCallback } from 'react';

interface UseVoiceInputOptions {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = ({ onTranscript, onError }: UseVoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Recognition might already be stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);

    if (!isSupported) {
      const msg = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
      setError(msg);
      onError?.(msg);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

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

        if (finalTranscript) {
          onTranscript(finalTranscript, true);
        } else if (interimTranscript) {
          onTranscript(interimTranscript, false);
        }
      };

      recognition.onerror = (event: any) => {
        let errMessage = 'Microphone speech recognition error';
        if (event.error === 'not-allowed') {
          errMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (event.error === 'no-speech') {
          // No speech detected, ignore or stop
          return;
        } else if (event.error === 'network') {
          errMessage = 'Network error during speech recognition.';
        } else if (event.error === 'audio-capture') {
          errMessage = 'No microphone was found or microphone is in use by another app.';
        }
        setError(errMessage);
        onError?.(errMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      const msg = err?.message || 'Failed to start microphone speech recognition';
      setError(msg);
      onError?.(msg);
      setIsListening(false);
    }
  }, [isSupported, onTranscript, onError]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore unmount stop errors
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearError: () => setError(null),
  };
};
