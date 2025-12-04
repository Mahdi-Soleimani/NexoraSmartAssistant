import React, { useEffect, useRef } from 'react';

interface OrbProps {
  level: number; // 0 to 1
  state: 'idle' | 'listening' | 'processing' | 'playing';
}

const Orb: React.FC<OrbProps> = ({ level, state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI setup
    const dpr = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const animate = () => {
      timeRef.current += 0.01;
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size);
      
      const centerX = size / 2;
      const centerY = size / 2;
      
      // Base Settings
      let baseRadius = 80;
      let color1 = '#3b82f6'; // Blue
      let color2 = '#8b5cf6'; // Purple
      let noiseMagnitude = 0;

      if (state === 'listening') {
        // Dynamic expansion based on audio level
        baseRadius = 85 + (level * 100); 
        
        if (level > 0.2) {
            color1 = '#f43f5e'; // Rose
            color2 = '#f97316'; // Orange
        } else {
            color1 = '#ec4899'; // Pink
            color2 = '#8b5cf6'; // Purple
        }

      } else if (state === 'processing') {
        // Processing State: Tighter, faster vibration, "Digital" colors
        baseRadius = 70 + Math.sin(timeRef.current * 15) * 1.5; 
        color1 = '#10b981'; // Emerald
        color2 = '#06b6d4'; // Cyan
      } else if (state === 'playing') {
        baseRadius = 85 + Math.sin(timeRef.current * 2) * 10; // Slow, deep breathing
        color1 = '#3b82f6'; // Blue
        color2 = '#6366f1'; // Indigo
      } else {
        // Idle
        baseRadius = 80 + Math.sin(timeRef.current) * 5;
      }

      // -- 1. Draw Core Liquid Blob --
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.1, centerX, centerY, baseRadius * 1.5);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.6, color2);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      // Increase vertex count for smoother liquid
      const points = 40; 
      for (let i = 0; i <= points; i++) {
        const angle = (Math.PI * 2 * i) / points;
        
        // Calculate Noise
        let noise = 0;
        if (state === 'listening') {
           const wave1 = Math.sin(angle * 6 + timeRef.current * 10);
           const wave2 = Math.cos(angle * 3 - timeRef.current * 5);
           const wave3 = Math.sin(angle * 9 + timeRef.current * 2);
           noise = (wave1 + wave2 + (wave3 * 0.5)) * (level * 30 + 5);
        } else if (state === 'processing') {
           // Digital spike noise
           noise = (Math.random() - 0.5) * 5;
        } else {
           noise = Math.sin(angle * 3 + timeRef.current * 2) * 5;
        }

        const r = baseRadius + noise;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // -- 2. Draw Inner Highlight --
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      const glossX = centerX - baseRadius * 0.3;
      const glossY = centerY - baseRadius * 0.3;
      ctx.arc(glossX, glossY, baseRadius * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // -- 3. Extra Visuals for 'Processing' --
      if (state === 'processing') {
        const ringRadius = baseRadius + 30;
        
        // Ring 1 (Spinner)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(timeRef.current * 4);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 2;
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 1.3); 
        ctx.stroke();
        ctx.restore();

        // Ring 2 (Counter-Spinner)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-timeRef.current * 3);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 10]);
        ctx.arc(0, 0, ringRadius + 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Data Streams (Particles moving inward)
        const particleCount = 8;
        for (let p = 0; p < particleCount; p++) {
          const angle = (p / particleCount) * Math.PI * 2 + timeRef.current;
          const dist = 140 - ((timeRef.current * 100 + p * 20) % 60); // Move from 140 down to 80
          if (dist > 80) {
            const px = centerX + Math.cos(angle) * dist;
            const py = centerY + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.fillStyle = '#a7f3d0'; // Light green
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // -- 4. Extra Visuals for 'Playing' --
      if (state === 'playing') {
          const rippleCount = 3;
          for (let r = 0; r < rippleCount; r++) {
            const expansion = (timeRef.current * 40 + r * 50) % 100;
            const alpha = 1 - (expansion / 100);
            
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.4})`;
            ctx.lineWidth = 1;
            ctx.arc(centerX, centerY, baseRadius + expansion, 0, Math.PI * 2);
            ctx.stroke();
          }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [level, state]);

  return (
    <canvas 
      ref={canvasRef} 
      className="transition-transform duration-300 ease-out pointer-events-none"
    />
  );
};

export default Orb;