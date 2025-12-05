import React, { useEffect, useState } from 'react';
import { Mic, Server, Cpu, Volume2 } from 'lucide-react';

interface ProcessingFlowProps {
    state: 'idle' | 'listening' | 'processing' | 'speaking';
}

const ProcessingFlow: React.FC<ProcessingFlowProps> = ({ state }) => {
    const [activeStep, setActiveStep] = useState<number>(-1);

    useEffect(() => {
        if (state === 'listening') setActiveStep(0);
        else if (state === 'processing') setActiveStep(1); // Start at Server
        else if (state === 'speaking') setActiveStep(3);
        else setActiveStep(-1);
    }, [state]);

    // Auto-advance simulation during processing to show "Thinking" flow
    useEffect(() => {
        let interval: any;
        if (state === 'processing') {
            // Animate between Server (1) and Brain (2) to show activity? 
            // Or just highlight the path.
            // User wants: [Mic] -> [Server] -> [Brain] -> [Speaker] sequence appearing.
            // "Show small, glowing icons appearing in sequence"

            // Let's cycle 1 -> 2 -> 1 -> 2 while processing? 
            // Or just light up 1 then 2. 
            // Let's do a progressive light up.

            // Actually, if we are in "processing" state, we have already done "Mic".
            // So we should see Mic (done) -> Server (active) -> Brain (next).

            const sequence = async () => {
                setActiveStep(1); // Server
                setTimeout(() => setActiveStep(2), 800); // Brain
                setTimeout(() => setActiveStep(1), 1600); // Loop or stay?
            };

            // A simple loop for "Thinking"
            let phase = 0;
            interval = setInterval(() => {
                phase = phase === 1 ? 2 : 1;
                setActiveStep(phase);
            }, 600);
        }
        return () => clearInterval(interval);
    }, [state]);

    const steps = [
        { icon: Mic, label: "Input" },
        { icon: Server, label: "Gateway" },
        { icon: Cpu, label: "Neural Core" }, // Brain
        { icon: Volume2, label: "Output" }
    ];

    if (state === 'idle') return null;

    return (
        <div className="flex items-center gap-3 md:gap-6 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-2xl animate-in fade-in zoom-in duration-300">
            {steps.map((step, idx) => {
                const isActive = idx === activeStep;
                // Mic is past if we are processing or speaking
                const isPast = (state === 'processing' && idx < activeStep) || (state === 'speaking' && idx < 3) || (state === 'processing' && idx === 0);

                // Special logic:
                // If listening: idx 0 is active.
                // If processing: idx 1 or 2 is active. idx 0 is past.
                // If speaking: idx 3 is active. 0,1,2 are past.

                let visualState = 'dim';

                if (state === 'listening') {
                    if (idx === 0) visualState = 'active';
                } else if (state === 'processing') {
                    if (idx === 0) visualState = 'past';
                    else if (idx === activeStep) visualState = 'active';
                    else if (idx < activeStep) visualState = 'past';
                } else if (state === 'speaking') {
                    if (idx === 3) visualState = 'active';
                    else visualState = 'past';
                }

                return (
                    <div key={idx} className="relative flex items-center">
                        {/* Connector Line */}
                        {idx > 0 && (
                            <div className={`absolute right-full w-4 md:w-8 h-0.5 -translate-x-1 top-1/2 -translate-y-1/2 transition-colors duration-500 overflow-hidden
                 ${visualState === 'active' || visualState === 'past' ? 'bg-cyan-500/30' : 'bg-white/5'}
               `}>
                                {/* Data Particle Animation */}
                                {(state === 'processing' || state === 'speaking') && visualState !== 'dim' && (
                                    <div className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-data-flow" />
                                )}
                            </div>
                        )}

                        <div className={`
              relative z-10 p-2 rounded-full border transition-all duration-500 flex flex-col items-center
              ${visualState === 'active'
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 scale-110 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                                : visualState === 'past'
                                    ? 'bg-cyan-900/10 border-cyan-500/30 text-cyan-500/50'
                                    : 'bg-white/5 border-white/5 text-slate-600'
                            }
            `}>
                            <step.icon className="w-5 h-5 md:w-6 md:h-6" />

                            {/* Pulse effect for active */}
                            {visualState === 'active' && (
                                <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-50" />
                            )}
                        </div>

                        {/* Label - visible only for active? or all small? */}
                        <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-wider whitespace-nowrap transition-opacity duration-300
              ${visualState === 'active' ? 'text-cyan-400 opacity-100' : 'text-slate-500 opacity-0'}
            `}>
                            {step.label}
                        </span>
                    </div>
                );
            })}

            <style>{`
        @keyframes data-flow {
          0% { left: -50%; }
          100% { left: 100%; }
        }
        .animate-data-flow {
          animation: data-flow 1s infinite linear;
        }
      `}</style>
        </div>
    );
};

export default ProcessingFlow;
