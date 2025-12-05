import { useRef, useState, useCallback, useEffect } from 'react';
import { calculateRMS, base64ToBlob } from '../utils/audioUtils';

interface UseVoiceReturn {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  audioLevel: number;
  transcript: string;
  startInteraction: () => Promise<void>;
  stopInteraction: () => void;
  error: string | null;
}


export const useRealtimeVoice = (webhookUrl: string): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // VAD Refs
  const lastSpeechTimeRef = useRef<number>(0);
  const hasSpokenRef = useRef<boolean>(false);
  const isListeningRef = useRef(false);

  // Sync ref for animation loop
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Audio Context for Visualization only
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestAnimFrameRef = useRef<number | null>(null);

  // Speech Recognition
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Mobile friendly
      recognition.interimResults = true; // For ghost transcript
      recognition.maxAlternatives = 1;
      recognition.lang = 'fa-IR'; // Default to Persian

      recognition.onresult = async (event: any) => {
        // Clear watchdog if we validly hear something
        if (timerRef.current) clearTimeout(timerRef.current);

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Update UI with whatever we have (interim or final)
        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setTranscript(currentText);
          console.log("Hearing:", currentText);
        }

        if (finalTranscript) {
          console.log("Recognized Final:", finalTranscript);
          stopInteraction();
          await sendTextToWebhook(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (timerRef.current) clearTimeout(timerRef.current);

        if (event.error === 'not-allowed') {
          setError("Microphone blocked. Check permissions or HTTPS.");
        } else if (event.error === 'no-speech') {
          setError("No speech detected.");
        } else if (event.error === 'network') {
          setError("Network error during recognition.");
        } else if (event.error === 'aborted') {
          // Ignore
        } else {
          setError(`Voice Error: ${event.error}`);
        }
        stopInteraction();
      };

      // Handle aggressive mobile stop
      recognition.onend = () => {
        // If we didn't get a final result and we are still "listening" state-wise (and no error), 
        // it might be a silent close. But stopInteraction sets listening=false.
        // We can just ensure cleanup happens.
        // stopInteraction(); // Double safety
      };

      recognitionRef.current = recognition;
    } else {
      setError("Browser does not support Web Speech API.");
    }

    return () => cleanup();
  }, [webhookUrl]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (requestAnimFrameRef.current) {
      cancelAnimationFrame(requestAnimFrameRef.current);
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  };

  const analyzeAudioLevel = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);

    const rms = calculateRMS(dataArray);
    // Smooth dampening
    setAudioLevel(prev => prev * 0.8 + (rms * 8) * 0.2);

    // Manual VAD (Voice Activity Detection)
    if (isListeningRef.current) {
      const threshold = 0.02; // Adjust sensitivity
      if (rms > threshold) {
        lastSpeechTimeRef.current = Date.now();
        hasSpokenRef.current = true;
      } else if (hasSpokenRef.current) {
        // If silence for > 1.5s after speaking, force stop
        const silenceDuration = Date.now() - lastSpeechTimeRef.current;
        if (silenceDuration > 1500) {
          console.log("VAD: Silence detected, stopping...");
          stopInteraction();
        }
      }
    }

    requestAnimFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
  };

  const startInteraction = useCallback(async () => {
    if (isPlaying) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setIsPlaying(false);
    }

    // Reset VAD state
    lastSpeechTimeRef.current = Date.now();
    hasSpokenRef.current = false;

    setError(null);
    try {
      // 0. Detect Mobile (Simple UA check)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (!isMobile) {
        // 1. Start Microphone for Visualization (AudioContext) - DESKTOP ONLY
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        analyzeAudioLevel();
      } else {
        console.warn("Mobile device detected: Visualizer disabled to ensure Speech Recognition reliability.");
      }

      // 2. Start Speech Recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Recognition already started", e);
        }
        setIsListening(true);
      }

      // 3. Auto-stop after 10 seconds
      if (timerRef.current) clearTimeout(timerRef.current);

      // Explicitly define window.setTimeout to avoid type confusion with Node.js
      timerRef.current = window.setTimeout(() => {
        console.warn("Time limit reached");
        if (recognitionRef.current) {
          // Abort to prevent processing partial speech as a valid command
          recognitionRef.current.abort();
        }
        stopInteraction();
        setError("Time limit reached (10s).");
      }, 10000);

    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      // If desktop fails visuals, we might still be able to do speech, but usually permission is global.
      // However, if it was a getUserMedia error on desktop, we should probably stop.
      // On mobile, we bypassed getUserMedia, so we won't catch here unless logic above fails.
      setError("Microphone access denied.");
      setIsListening(false);
    }
  }, [isPlaying]);

  const stopInteraction = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Stop Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* ignore if already stopped */ }
    }

    // Stop Visualization stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (requestAnimFrameRef.current) {
      cancelAnimationFrame(requestAnimFrameRef.current);
    }

    setIsListening(false);
    setAudioLevel(0);
  }, []);

  const sendTextToWebhook = async (text: string) => {
    setIsProcessing(true);
    try {
      if (!webhookUrl) throw new Error("Webhook URL is missing");

      console.log("Sending to Webhook:", webhookUrl, { text });

      // Send JSON payload
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text }),
      });

      console.log("Webhook Response Status:", response.status);
      const contentType = response.headers.get('content-type');
      console.log("Webhook Content-Type:", contentType);

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      let responseBlob: Blob;

      if (contentType && contentType.includes('application/json')) {
        const textData = await response.text();
        console.log("Webhook Response Body:", textData);

        if (!textData) {
          throw new Error("n8n Server Error: Returned empty response. Check 'Respond to Webhook' node.");
        }

        const json = JSON.parse(textData);

        if (json.audio) {
          // Assume base64 audio
          responseBlob = base64ToBlob(json.audio);
        } else if (json.message || json.error) {
          throw new Error(`Server: ${json.message || json.error}`);
        } else {
          console.warn("Received JSON:", json);
          // Fallback: maybe the JSON *is* the message?
          throw new Error("n8n Error: JSON missing 'audio' field.");
        }
      } else {
        // Binary mode
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          throw new Error("n8n Server Error: Returned empty binary response.");
        }
        responseBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      }

      playResponseAudio(responseBlob);

    } catch (err: any) {
      console.error("Processing error:", err);
      setError("Connection to NexoraAI failed.");
      setIsProcessing(false);
    }
  };

  const playResponseAudio = (blob: Blob) => {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setIsProcessing(false);
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = async (e: Event | string) => {
      console.error("Audio playback error", e);
      let errCode: number | string = 'Unknown';
      if (typeof e !== 'string' && (e as Event).target) {
        errCode = ((e as Event).target as HTMLAudioElement).error?.code || 'Unknown';
      }

      // Attempt to peek at the content if it failed
      let msg = `Err: Size=${blob.size}b, Code=${errCode}`;
      if (typeof errCode === 'number' && errCode === 4) {
        // Source not supported - might be text/json masked as audio
        const text = await blob.slice(0, 50).text();
        msg += ` Content="${text.replace(/\n/g, ' ')}..."`;
      }
      setError(msg);
      setIsPlaying(false);
      setIsProcessing(false);
    };

    setIsProcessing(false);
    setIsPlaying(true);
    audio.load(); // Ensure source is loaded
    audio.play();
  };

  return {
    isListening,
    isProcessing,
    isPlaying,
    audioLevel,
    transcript,
    startInteraction,
    stopInteraction,
    error
  };
};