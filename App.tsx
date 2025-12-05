import React, { useState, useEffect } from 'react';
import { useRealtimeVoice } from './hooks/useRealtimeVoice';
import Orb from './components/Orb';
import { Mic, Radio, Zap, Activity, Chrome } from 'lucide-react'; // Added Chrome icon

import NeuralNetworkBackground from './components/NeuralNetworkBackground';
import ProcessingFlow from './components/ProcessingFlow';

// Security: Webhook URL is now loaded from environment variables
const WEBHOOK_URL = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL || '';

const AGENT_MESSAGES = [
  "Encrypting audio stream...",
  "Handshaking with Neural Core...",
  "Agent V: Parsing intent...",
  "Agent X: Retrieving context...",
  "Running semantic analysis...",
  "Optimizing response vectors...",
  "Synthesizing speech output..."
];

const App: React.FC = () => {
  const {
    isListening,
    isProcessing,
    isPlaying,
    audioLevel,
    startInteraction,
    stopInteraction,
    error,
    transcript
  } = useRealtimeVoice(WEBHOOK_URL);

  const [statusMessage, setStatusMessage] = useState("");

  // Cycle through "Agent" messages when processing to keep user engaged
  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      let i = 0;
      setStatusMessage(AGENT_MESSAGES[0]);
      interval = setInterval(() => {
        i = (i + 1) % AGENT_MESSAGES.length;
        setStatusMessage(AGENT_MESSAGES[i]);
      }, 1500); // Change message every 1.5s
    } else {
      setStatusMessage("");
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Sound Effect Manager
  useEffect(() => {
    if (!isListening && !isProcessing && !isPlaying) return;

    // Simple Web Audio API beeps
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx = new AudioContextCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (isListening) {
        // "Ready" chirp
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (isProcessing) {
        // "Thinking" hum
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.2);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (isPlaying) {
        // "Success" ping
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1500, now + 0.15);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.error("Audio FX error", e);
    }
  }, [isListening, isProcessing, isPlaying]);

  const handleOrbClick = () => {
    if (isListening) {
      stopInteraction();
    } else if (!isProcessing && !isPlaying) {
      startInteraction();
    }
  };

  const appState = isListening ? 'listening' : isProcessing ? 'processing' : isPlaying ? 'speaking' : 'idle';

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-cyan-500/30">

      {/* Background Gradients & Mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <NeuralNetworkBackground active={isListening} />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow delay-1000" />
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Chrome Badge */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-white/10 transition-colors cursor-help group">
        <Chrome className="w-4 h-4 text-cyan-400 animate-pulse group-hover:animate-spin" />
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-300 font-medium tracking-wide font-mono">
          <span className="text-cyan-400 font-bold">Chrome</span>
          <span>بهینه شده برای</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-2xl px-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            NEXORA AI
          </h1>
          <p className="text-sm md:text-base text-cyan-500/80 font-mono tracking-[0.2em] uppercase">
            Intelligent Voice Interface
          </p>
        </div>

        {/* Orb Container */}
        <div
          onClick={isListening ? stopInteraction : startInteraction}
          className={`relative group cursor-pointer transition-all duration-500 ${isListening ? 'scale-110' : 'hover:scale-105'}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-full blur-3xl transition-opacity duration-1000 ${isListening || isProcessing ? 'opacity-100' : 'opacity-0'}`} />
          <Orb
            level={audioLevel}
            state={isPlaying ? 'playing' : isProcessing ? 'processing' : isListening ? 'listening' : 'idle'}
          />

          {/* Tap Prompt (Only when idle) */}
          {!isListening && !isProcessing && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/50 text-xs font-mono tracking-widest animate-pulse">TAP TO START</span>
            </div>
          )}
        </div>

        {/* Operational Transparency (Process Steps) */}
        <div className="h-20 flex items-center justify-center">
          {(isListening || isProcessing || isPlaying) && (
            <ProcessingFlow state={appState} />
          )}
        </div>

        {/* Status Text (Dynamic) */}
        {!error && (
          <div className="h-8 flex flex-col items-center justify-center overflow-hidden">
            <div className="flex items-center gap-2 text-cyan-400/80 font-mono text-xs tracking-widest animate-pulse">
              {isProcessing && <Activity className="w-3 h-3 animate-spin" />}
              <span>
                {statusMessage || (isListening ? "LISTENING..." : isProcessing ? "PROCESSING..." : isPlaying ? "SPEAKING..." : "SYSTEM READY")}
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-lg backdrop-blur-md text-sm font-mono flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-shake">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            {error}
          </div>
        )}
      </div>

      {/* Footer */}

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.05); opacity: 0.3; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;