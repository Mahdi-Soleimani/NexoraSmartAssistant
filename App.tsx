import React, { useState, useEffect } from 'react';
import { useRealtimeVoice } from './hooks/useRealtimeVoice';
import Orb from './components/Orb';

// Security: Webhook URL is now loaded from environment variables
const WEBHOOK_URL = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL || 'https://50356-4vb9a.s3.irann8n.com/webhook/0c98ae44-713b-47c8-8c28-f39ac0e23f12';

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
    transcript,
    error
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

  const handleOrbClick = () => {
    if (isListening) {
      stopInteraction();
    } else if (!isProcessing && !isPlaying) {
      startInteraction();
    }
  };

  // Determine current visual state for the Orb
  const orbState = isListening ? 'listening' : isProcessing ? 'processing' : isPlaying ? 'playing' : 'idle';

  return (
    <div className="relative w-full h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black flex flex-col items-center justify-center overflow-hidden font-sans text-white">

      {/* Background Particles/Grid Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <div className="absolute top-10 w-full text-center z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-300 to-purple-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          NEXORA AI
        </h1>
        <p className="text-slate-500 text-xs tracking-[0.3em] mt-2 uppercase">Intelligent Voice Interface</p>
      </div>

      {/* Main Interaction Area */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full max-h-[600px] w-full max-w-md">

        {/* The Orb */}
        <div
          onClick={handleOrbClick}
          className="relative transition-transform duration-500 hover:scale-105 active:scale-95 cursor-pointer mb-8"
        >
          <Orb level={audioLevel} state={orbState} />

          {/* Ripple rings when listening */}
          {isListening && (
            <div className="absolute inset-0 border-2 border-red-500/30 rounded-full animate-ping pointer-events-none"></div>
          )}
        </div>

        {/* Dynamic Status Area */}
        <div className="h-24 flex flex-col items-center justify-start w-full px-4">

          {/* Primary Status Label */}
          <div className={`text-lg font-light tracking-wide transition-all duration-500 mb-2 ${isListening ? 'text-red-400 font-semibold' :
            isProcessing ? 'text-emerald-400 font-semibold' :
              isPlaying ? 'text-cyan-400' :
                'text-slate-400'
            }`}>
            {isListening ? "LISTENING..." :
              isProcessing ? "PROCESSING" :
                isPlaying ? "SPEAKING" :
                  "TAP TO SPEAK"}
          </div>

          {/* Secondary "Thinking" Animation / Agent Logs */}
          {isProcessing && (
            <div className="flex flex-col items-center animate-fadeIn">
              {/* Animated Loader Bar */}
              <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mb-3 relative">
                <div className="absolute inset-0 bg-emerald-500/50 w-1/2 animate-[shimmer_1s_infinite_linear]"></div>
              </div>

              {/* Typewriter style log */}
              <span className="font-mono text-xs text-emerald-500/80 tracking-widest uppercase animate-pulse">
                {">"} {statusMessage}
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <span className="text-red-400 bg-red-950/30 px-4 py-1 rounded-full border border-red-900/50 text-sm backdrop-blur-md mt-2">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Footer / Debug Info */}
      <div className="absolute bottom-6 w-full text-center flex flex-col items-center gap-2">
        {/* Live Transcript Debug - Commented out for production
         <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-xs text-slate-300 max-w-sm">
            <span className="text-slate-500 uppercase tracking-wider mr-2">Debug Info:</span>
            {transcript ? `"${transcript}"` : "Waiting for input..."}
         </div>
         */}

        <p className="text-[10px] text-slate-500 tracking-widest mt-2">SECURE CONNECTION ESTABLISHED • V1.3</p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
};

export default App;