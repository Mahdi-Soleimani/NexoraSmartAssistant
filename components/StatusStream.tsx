import React, { useEffect, useState, useRef } from 'react';

interface StatusStreamProps {
    isProcessing: boolean;
    isPlaying: boolean;
    transcript: string;
}

const LOG_TEMPLATES = [
    "> n8n: Webhook received at {time}",
    "> Gateway: Validating security token...",
    "> Neural Core: Analyzing semantic context...",
    "> n8n_Workflow_24: Executing Node [Sentiment Analysis]",
    "> n8n_Workflow_24: Executing Node [Vector Search]",
    "> DB: Querying knowledge base...",
    "> Context: Retrieved 3 relevant fragments",
    "> LLM: Generating response vectors...",
    "> Audio: Synthesizing speech stream...",
    "> System: Handshake complete."
];

const StatusStream: React.FC<StatusStreamProps> = ({ isProcessing, isPlaying, transcript }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isProcessing) {
            setLogs([`> System: Input received "${transcript.substring(0, 15)}..."`]);
            let step = 0;

            const interval = setInterval(() => {
                if (step < LOG_TEMPLATES.length) {
                    const template = LOG_TEMPLATES[step];
                    const log = template.replace("{time}", new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
                    setLogs(prev => [...prev.slice(-4), log]); // Keep last 5 logs
                    step++;
                }
            }, 300 + Math.random() * 400); // Random typing speed

            return () => clearInterval(interval);
        } else if (isPlaying) {
            setLogs(prev => [...prev, "> System: Output stream active..."]);
        } else {
            setLogs([]);
        }
    }, [isProcessing, isPlaying, transcript]);

    if (!isProcessing && !isPlaying) return null;

    return (
        <div className="font-mono text-[10px] md:text-xs text-cyan-500/80 leading-relaxed h-24 overflow-hidden flex flex-col justify-end">
            {logs.map((log, i) => (
                <div key={i} className="animate-in slide-in-from-left-2 fade-in duration-300 whitespace-nowrap">
                    <span className="text-cyan-700 mr-2">{(i + 1).toString().padStart(2, '0')}</span>
                    {log}
                </div>
            ))}
            <div className="w-2 h-4 bg-cyan-500/50 animate-pulse mt-1" />
        </div>
    );
};

export default StatusStream;
