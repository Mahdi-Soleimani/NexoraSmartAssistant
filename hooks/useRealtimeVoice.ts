import { useRef, useState, useCallback, useEffect } from 'react';

interface UseVoiceReturn {
  isListening: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  audioLevel: number;
  startInteraction: () => Promise<void>;
  stopInteraction: () => void;
  error: string | null;
}

export const useRealtimeVoice = (webhookUrl: string): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const simulationFrameRef = useRef<number | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; 
      recognition.interimResults = false;
      recognition.lang = 'fa-IR'; // Persian
      
      recognition.onstart = () => {
        setIsListening(true);
        startSimulation();
      };

      recognition.onend = () => {
        if (isListening && !isProcessing) {
             stopInteraction();
        }
      };

      recognition.onresult = async (event: any) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const transcript = event.results[0][0].transcript;
        console.log("Recognized:", transcript);
        
        // Stop listening immediately upon result
        stopInteraction(); 
        
        // Send to n8n
        await sendTextToWebhook(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (timerRef.current) clearTimeout(timerRef.current);
        
        if (event.error === 'no-speech') {
          setError("No speech detected.");
        } else if (event.error === 'not-allowed') {
          setError("Microphone permission denied.");
        } else if (event.error === 'aborted') {
            // Ignore
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
    if (timerRef.current) clearTimeout(timerRef.current);
    if (simulationFrameRef.current) cancelAnimationFrame(simulationFrameRef.current);
    if (audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); } catch(e) { /* ignore */ }
    }
  };

  const startSimulation = () => {
    let t = 0;
    const update = () => {
      t += 0.1;
      const noise = Math.random() * 0.5;
      const sine = (Math.sin(t) + 1) / 2; // 0 to 1
      const level = 0.2 + (noise * 0.4) + (sine * 0.2); 
      
      setAudioLevel(level);
      simulationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  };

  const startInteraction = useCallback(async () => {
    if (isPlaying) {
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        setIsPlaying(false);
    }
    
    setError(null);
    setIsProcessing(false);

    try {
      if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.warn("Recognition already active", e);
            setIsListening(true);
            startSimulation();
            return;
        }
      }

      // 10s Timer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.abort(); 
        stopInteraction();
        setError("Time limit reached (10s).");
      }, 10000);

    } catch (err: any) {
      console.error("Start error:", err);
      setError("Could not start microphone.");
      setIsListening(false);
    }
  }, [isPlaying]); 

  const stopInteraction = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (simulationFrameRef.current) cancelAnimationFrame(simulationFrameRef.current);
    
    // Stop Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch(e) { /* ignore */ }
    }
    
    setIsListening(false);
    setAudioLevel(0);
  }, []);

  const sendTextToWebhook = async (text: string) => {
    setIsProcessing(true);
    setAudioLevel(0.5); // Set a steady level for "Processing" animation
    setError(null);
    
    try {
      if (!webhookUrl) throw new Error("Webhook URL is missing");

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });

      console.debug('Webhook response status:', response.status);
      const contentType = response.headers.get('content-type') || '';
      console.debug('Webhook content-type:', contentType);

      if (!response.ok) {
        // try to read body for clearer message
        const textBody = await response.text().catch(() => '');
        throw new Error(`Webhook returned ${response.status}: ${textBody || response.statusText}`);
      }

      // If server didn't return audio, show error with server message
      if (!contentType.startsWith('audio/')) {
        // try read text (maybe it's JSON error)
        const textBody = await response.text().catch(() => '');
        console.error('Expected audio but got:', contentType, textBody);
        throw new Error(`Webhook did not return audio. (${contentType})`);
      }

      const responseBlob = await response.blob();
      console.debug('Received blob', responseBlob.type, responseBlob.size);
      if (responseBlob.size === 0) throw new Error('Received empty audio payload.');

      playResponseAudio(responseBlob);

    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err?.message || "Connection to NexoraAI failed.");
      setIsProcessing(false);
      setAudioLevel(0);
    }
  };

  const playResponseAudio = (blob: Blob) => {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.crossOrigin = 'anonymous';
    audioPlayerRef.current = audio;

    // When audio can play, stop "processing" UI and start visual sim
    audio.oncanplay = () => {
      setIsProcessing(false);
      // DO NOT set isPlaying true here — we will set it after successful play()
    };

    audio.onplay = () => {
        setIsPlaying(true);
        // Animate for playback
        startSimulation(); 
    };

    audio.onended = () => {
      setIsPlaying(false);
      if (simulationFrameRef.current) cancelAnimationFrame(simulationFrameRef.current);
      setAudioLevel(0);
      try { URL.revokeObjectURL(audioUrl); } catch(e) { /* ignore */ }
    };

    audio.onerror = (e) => {
      console.error("Playback error", e);
      setError("Could not play response.");
      setIsProcessing(false);
      setIsPlaying(false);
      try { URL.revokeObjectURL(audioUrl); } catch(e) { /* ignore */ }
    };

    // handle autoplay policy / promise rejection
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(() => {
        // playback started successfully
        setIsProcessing(false);
        // isPlaying will be set in onplay
      }).catch((playErr: any) => {
        console.error('Playback was blocked or failed:', playErr);
        setError('Browser blocked audio playback. Please tap to play the response.');
        setIsProcessing(false);
        setIsPlaying(false);
        // keep the object URL so user can manually trigger play if desired
      });
    }
  };

  return {
    isListening,
    isProcessing,
    isPlaying,
    audioLevel,
    startInteraction,
    stopInteraction,
    error
  };
};