import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  level: number;
  isActive: boolean;
  color?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ level, isActive, color = '#3b82f6' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      time += 0.1;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw a flat line or simple pulse
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.strokeStyle = '#334155';
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;

      for (let x = 0; x < width; x++) {
        // Create a waveform based on audio level and sine waves
        // This is a simulation since we passed a single 'level' float instead of raw frequency data
        // for performance in the React state.
        const wave1 = Math.sin(x * 0.05 + time) * (level * 50);
        const wave2 = Math.sin(x * 0.03 - time) * (level * 30);
        const y = centerY + wave1 + wave2;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, level, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={100} 
      className="w-full h-24 rounded-lg bg-slate-900/50 backdrop-blur-sm"
    />
  );
};

export default Visualizer;