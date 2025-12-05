import React, { useEffect, useRef } from 'react';

interface OrbProps {
  level: number; // 0 to 1
  state: 'idle' | 'listening' | 'processing' | 'playing';
}

// --- CONFIGURATION ---

interface VisualConfig {
  baseRadius: number;
  noiseSpeed: number;
  noiseFreq: number;
  noiseAmpBase: number;
  color1: string;
  color2: string;
  ringAlpha: number;
  particleAlpha: number;
  pulseSpeed: number;
  pulseAmp: number;
}

const STATE_CONFIGS: Record<string, VisualConfig> = {
  idle: {
    baseRadius: 80,
    noiseSpeed: 0.005,
    noiseFreq: 3,
    noiseAmpBase: 5,
    color1: '#3b82f6', // Blue-500
    color2: '#8b5cf6', // Violet-500
    ringAlpha: 0,
    particleAlpha: 0,
    pulseSpeed: 0.02,
    pulseAmp: 4,
  },
  listening: {
    baseRadius: 90,
    noiseSpeed: 0.02,
    noiseFreq: 4,
    noiseAmpBase: 10,
    color1: '#f472b6', // Pink-400
    color2: '#a855f7', // Purple-500
    ringAlpha: 0,
    particleAlpha: 0,
    pulseSpeed: 0.05,
    pulseAmp: 5,
  },
  processing: {
    baseRadius: 70,
    noiseSpeed: 0.04,
    noiseFreq: 15, // High frequency for "thinking"
    noiseAmpBase: 3,
    color1: '#10b981', // Emerald-500
    color2: '#06b6d4', // Cyan-500
    ringAlpha: 1,    // Show rings
    particleAlpha: 1, // Show data particles
    pulseSpeed: 0.1,
    pulseAmp: 3,
  },
  playing: {
    baseRadius: 85,
    noiseSpeed: 0.01,
    noiseFreq: 6,
    noiseAmpBase: 8,
    color1: '#3b82f6', // Blue-500
    color2: '#6366f1', // Indigo-500
    ringAlpha: 0,
    particleAlpha: 0,
    pulseSpeed: 0.04,
    pulseAmp: 10,
  },
};

// --- HELPERS ---

const hexToRgb = (hex: string): number[] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const lerpArray = (start: number[], end: number[], t: number): number[] => {
  return start.map((v, i) => lerp(v, end[i], t));
};

const rgbToString = (rgb: number[]) => `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;


const Orb: React.FC<OrbProps> = ({ level, state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mutable state for the animation loop to hold current interpolated values
  const current = useRef({
    radius: 80,
    color1: hexToRgb(STATE_CONFIGS.idle.color1),
    color2: hexToRgb(STATE_CONFIGS.idle.color2),
    noiseAmp: 5,
    ringAlpha: 0,
    particleAlpha: 0,
    time: 0,
  });

  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI setup
    const dpr = window.devicePixelRatio || 1;
    const size = 320; 
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const animate = () => {
      const config = STATE_CONFIGS[state] || STATE_CONFIGS.idle;
      const cur = current.current;

      // 1. Calculate Targets (React to Audio Level)
      let targetRadius = config.baseRadius;
      let targetNoiseAmp = config.noiseAmpBase;
      let targetColor1 = hexToRgb(config.color1);
      let targetColor2 = hexToRgb(config.color2);

      // Dynamic overrides based on audio level
      if (state === 'listening') {
        // Expand and distort based on volume
        targetRadius += level * 60; 
        targetNoiseAmp += level * 50; 

        // Shift color to Red/Amber if loud
        if (level > 0.4) {
           targetColor1 = hexToRgb('#ef4444'); // Red
           targetColor2 = hexToRgb('#f59e0b'); // Amber
        }
      }

      // 2. Interpolate (Lerp) towards targets for smoothness
      // Factor determines speed of transition (0.1 = fast, 0.02 = slow)
      const smoothFactor = 0.08; 

      cur.radius = lerp(cur.radius, targetRadius, smoothFactor);
      cur.noiseAmp = lerp(cur.noiseAmp, targetNoiseAmp, smoothFactor);
      cur.ringAlpha = lerp(cur.ringAlpha, config.ringAlpha, 0.05);
      cur.particleAlpha = lerp(cur.particleAlpha, config.particleAlpha, 0.05);
      
      cur.color1 = lerpArray(cur.color1, targetColor1, smoothFactor);
      cur.color2 = lerpArray(cur.color2, targetColor2, smoothFactor);

      // Increment Time
      let timeSpeed = config.noiseSpeed;
      // Speed up noise when loud
      if (state === 'listening') timeSpeed += level * 0.1;
      cur.time += timeSpeed;

      // --- DRAWING ---
      
      const cx = size / 2;
      const cy = size / 2;
      const t = cur.time;

      ctx.clearRect(0, 0, size, size);

      // A. Background Glow (if rings active)
      if (cur.ringAlpha > 0.01) {
        const glowR = cur.radius + 15 + Math.sin(t * 4) * 5;
        const glow = ctx.createRadialGradient(cx, cy, cur.radius, cx, cy, glowR);
        glow.addColorStop(0, `rgba(16, 185, 129, ${0.2 * cur.ringAlpha})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // B. Liquid Core
      const grad = ctx.createRadialGradient(cx, cy, cur.radius * 0.2, cx, cy, cur.radius * 1.4);
      grad.addColorStop(0, rgbToString(cur.color1));
      grad.addColorStop(0.5, rgbToString(cur.color2));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;

      // Shadow for glow effect
      ctx.shadowBlur = (state === 'listening' && level > 0.2) ? 20 + level * 30 : 0;
      ctx.shadowColor = rgbToString(cur.color1);

      ctx.beginPath();
      const points = 100;
      for (let i = 0; i <= points; i++) {
        const angle = (Math.PI * 2 * i) / points;
        
        // Noise Function
        // Combine low freq sine (shape) and high freq cos (texture)
        const wave1 = Math.sin(angle * 3 + t * config.noiseFreq * 0.2); // Morph
        const wave2 = Math.cos(angle * 10 - t * config.noiseFreq * 0.8) * 0.5; // Detail
        const wave3 = Math.sin(angle * 7 + t * 2) * 0.3; // Asymmetry

        // Apply amplitude
        const noise = (wave1 + wave2 + wave3) * (cur.noiseAmp / 3);
        
        // Add Pulse
        const pulse = Math.sin(t * config.pulseSpeed * 100) * config.pulseAmp;

        const r = cur.radius + noise + pulse;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // C. Gloss
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.ellipse(cx - cur.radius * 0.3, cy - cur.radius * 0.3, cur.radius * 0.15, cur.radius * 0.1, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // D. Rings (Processing)
      if (cur.ringAlpha > 0.01) {
        const ringR = cur.radius + 30;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = cur.ringAlpha;

        // Outer Ring
        ctx.rotate(t * 1.5);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 2.0, 3.2);
        ctx.stroke();
        
        // Inner Ring
        ctx.rotate(-t * 3); // counter rotate
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, ringR - 12, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }

      // E. Data Particles (Processing)
      if (cur.particleAlpha > 0.01) {
        ctx.globalAlpha = cur.particleAlpha;
        const pCount = 8;
        for (let p = 0; p < pCount; p++) {
           const offset = (p * (Math.PI * 2)) / pCount;
           const pTime = (t * 1.5 + offset) % 2; 
           const dist = 130 * (1 - (pTime / 2));
           
           if (dist > 35) {
             const angle = offset + t * 0.5;
             const px = cx + Math.cos(angle) * dist;
             const py = cy + Math.sin(angle) * dist;
             ctx.beginPath();
             ctx.fillStyle = `rgba(167, 243, 208, ${dist/130})`;
             ctx.arc(px, py, 2, 0, Math.PI * 2);
             ctx.fill();
           }
        }
        ctx.globalAlpha = 1;
      }

      // F. Playback Waves (Playing)
      if (state === 'playing') {
          const waveCount = 3;
          for (let w = 0; w < waveCount; w++) {
             const cycle = (t * 0.6 + w * 0.4) % 1;
             const waveR = cur.radius + (cycle * 60);
             const alpha = (1 - cycle) * 0.4;
             
             ctx.beginPath();
             ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
             ctx.lineWidth = 1.5;
             ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
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