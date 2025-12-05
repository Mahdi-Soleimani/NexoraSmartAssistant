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
      recognition.continuous = false; // Stop after one sentence/result
      recognition.interimResults = false;
      recognition.lang = 'fa-IR'; // Defaulting to Persian as per prompt context, or use navigator.language

      recognition.onresult = async (event: any) => {
        // Clear timer if successful result comes in before 10s
        if (timerRef.current) clearTimeout(timerRef.current);

        const transcriptText = event.results[0][0].transcript;
        console.log("Recognized:", transcriptText);
        setTranscript(transcriptText);
        stopInteraction(); // Stop recording/visualizing
        await sendTextToWebhook(transcriptText);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (timerRef.current) clearTimeout(timerRef.current);

        if (event.error === 'no-speech') {
          setError("No speech detected.");
        } else if (event.error === 'aborted') {
          // Ignore manual aborts or timeout aborts
        } else {
          setError("Voice recognition failed.");
        }
        stopInteraction();
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

    requestAnimFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
  };

  const startInteraction = useCallback(async () => {
    if (isPlaying) {
      // If playing, stop playback and start listening
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setIsPlaying(false);
    }

    setError(null);
    try {
      // 1. Start Microphone for Visualization (AudioContext)
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

      // Send JSON payload
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }

      // Check content type to handle JSON answers vs Binary Audio
      const contentType = response.headers.get('content-type');
      let responseBlob: Blob;

      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();

        if (json.audio) {
          // Assume base64 audio
          responseBlob = base64ToBlob(json.audio);
        } else if (json.message || json.error) {
          throw new Error(`Server: ${json.message || json.error}`);
        } else {
          console.warn("Received JSON:", json);
          throw new Error("Received JSON without 'audio' field. Check n8n workflow.");
        }
      } else {
        // Binary mode: Force 'audio/mpeg' because we confirmed it's an MP3 (ID3 tag)
        // even if server sends application/octet-stream
        const arrayBuffer = await response.arrayBuffer();
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