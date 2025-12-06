
import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeVoice } from './hooks/useRealtimeVoice';
import ParticleOrb from './components/ParticleOrb';
import { Mic, Radio, Zap, Activity, Chrome } from 'lucide-react';
import NeuralNetworkBackground from './components/NeuralNetworkBackground';
import ProcessingFlow from './components/ProcessingFlow';
import { soundManager } from './utils/SoundManager';

const WEBHOOK_URL = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL || '';

const AGENT_MESSAGES = [
  "Encrypting audio stream...",
  "Handshaking with Neural Core...",
  "Agent V: Parsing intent...",
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
  const hasInteractedRef = useRef(false);

  // Initialize Audio Engine on first interaction
  const handleStart = async () => {
    if (!hasInteractedRef.current) {
      await soundManager.resume();
      soundManager.playAmbientHum();
      soundManager.playActivation();
      hasInteractedRef.current = true;
    }
  };

  // Cycle through "Agent" messages
  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      let i = 0;
      setStatusMessage(AGENT_MESSAGES[0]);
      interval = setInterval(() => {
        i = (i + 1) % AGENT_MESSAGES.length;
        setStatusMessage(AGENT_MESSAGES[i]);
      }, 1500);
    } else {
      setStatusMessage("");
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Sonic Triggers
  useEffect(() => {
    if (isListening) soundManager.playClick();
    if (isProcessing) soundManager.playProcessChirp();
    if (isPlaying) soundManager.playSuccess();
  }, [isListening, isProcessing, isPlaying]);

  const handleOrbClick = () => {
    handleStart();
    if (isListening) {
      stopInteraction();
    } else if (!isProcessing && !isPlaying) {
      startInteraction();
    }
  };

  const appState = isListening ? 'listening' : isProcessing ? 'processing' : isPlaying ? 'speaking' : 'idle';
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-cyan-500/30">

      {!isSecure && (
        <div className="absolute top-0 left-0 w-full bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 text-[10px] md:text-xs font-mono text-center py-2 z-[100] backdrop-blur-md">
          ⚠️ MICROPHONE REQUIRES HTTPS. IF ON MOBILE, USE LOCALHOST OR ENABLE SSL.
        </div>
      )}

      {/* Reactive Background */}
      <div className="absolute inset-0 pointer-events-none">
        <NeuralNetworkBackground active={isListening || isProcessing || isPlaying} audioLevel={audioLevel} />

        {/* Glow Blobs */}
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen transition-all duration-[2000ms] ${isProcessing ? 'bg-purple-500/30 scale-110' : ''}`} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] mix-blend-screen transition-all duration-[2000ms] delay-1000 ${isListening ? 'bg-red-500/20 scale-110' : ''}`} />

        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Chrome Badge */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-white/10 transition-colors cursor-help group">
        <Chrome className="w-4 h-4 text-cyan-400 animate-pulse group-hover:animate-spin" />
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-300 font-medium tracking-wide font-mono">
          <span className="text-cyan-400 font-bold">Chrome</span>
          <span>بهینه شده برای</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-[500px] h-full py-20 md:py-480 md:justify-center md:gap-8 w-full max-w-2xl px-6">

        {/* Header */}
        <div className="text-center space-y-1 md:space-y-0 mt-4 md:mt-0 flex-shrink-0">
          <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            NEXORA AI
          </h1>
          <p className="text-xs md:text-base text-cyan-500/80 font-mono tracking-[0.2em] uppercase">
            Intelligent Voice Interface
          </p>
        </div>

        {/* Live Transcription Overlay - Dynamic & Floating */}
        <div className="h-12 md:h-16 flex items-end justify-center w-full flex-shrink-0">
          {transcript && (isListening || isProcessing) ? (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <p className="text-lg md:text-2xl font-light text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                "{transcript}"
              </p>
            </div>
          ) : (
            <div className="h-4 md:h-8" /> // Spacer
          )}
        </div>

        {/* Orb Container */}
        <div
          onClick={handleOrbClick}
          className={`relative group cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95 flex-shrink-0 my-4 md:my-0`}
        >
          {/* Ambient Glow behind Orb */}
          <div className={`absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-full blur-[80px] transition-opacity duration-1000 ${isListening || isProcessing ? 'opacity-100 scale-125' : 'opacity-40 scale-100'}`} />

          {/* 3D Particle System */}
          <ParticleOrb
            state={isPlaying ? 'playing' : isProcessing ? 'processing' : isListening ? 'listening' : 'idle'}
            audioLevel={audioLevel}
          />

          {/* Tap Prompt (Only when idle) */}
          {!isListening && !isProcessing && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-cyan-400/50 text-xs font-mono tracking-[0.3em] animate-pulse mt-32 md:mt-48">INITIALIZE</span>
            </div>
          )}
        </div>

        {/* Status & Processing Flow */}
        <div className="h-24 w-full flex flex-col items-center justify-end gap-2 md:gap-4 flex-shrink-0 mb-4 md:mb-0">

          {/* Pipeline Visualization */}
          <div className="h-10 md:h-auto flex items-center justify-center">
            {(isListening || isProcessing || isPlaying) && (
              <ProcessingFlow state={appState} />
            )}
          </div>

          {/* System Status Text */}
          {!error && !transcript && (
            <div className="flex items-center gap-2 text-cyan-400/60 font-mono text-xs tracking-widest uppercase">
              {isProcessing && <Activity className="w-3 h-3 animate-spin" />}
              <span>
                {statusMessage || (isPlaying ? "Synthesizing Audio Output..." : "System Standby")}
              </span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-3 rounded-lg backdrop-blur-md text-sm font-mono flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-shake mt-4 fixed bottom-10 z-50">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default App;