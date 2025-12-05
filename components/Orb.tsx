import React, { useEffect, useRef } from 'react';

interface OrbProps {
  level: number; // 0 to 1
  state: 'idle' | 'listening' | 'processing' | 'playing';
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
}

const Orb: React.FC<OrbProps> = ({ level, state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // Physics State
  const rotation = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<Point3D[]>([]);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Initialize Cloud
  useEffect(() => {
    const points: Point3D[] = [];
    const numPoints = 200; // Increased Density for high-end look

    for (let i = 0; i < numPoints; i++) {
      // Fibonacci Sphere distribution for even spread
      const y = 1 - (i / (numPoints - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = 2.39996 * i; // Golden Angle

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      points.push({
        x, y, z,
        baseX: x, baseY: y, baseZ: z
      });
    }
    pointsRef.current = points;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Config
    const dpr = window.devicePixelRatio || 1;
    const size = 320;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const cx = size / 2;
    const cy = size / 2;

    const animate = () => {
      // 1. UPDATE PHYSICS
      timeRef.current += 0.01;
      const t = timeRef.current;

      // Mouse Parallax Calculations
      const targetTiltX = ((mouseRef.current.y / window.innerHeight) - 0.5) * 1.5; // Look up/down
      const targetTiltY = ((mouseRef.current.x / window.innerWidth) - 0.5) * 1.5; // Look left/right

      // Soft lerp for the "Eye" following effect
      // We blend the continuous rotation with the mouse tilt
      rotation.current.x += (targetTiltX - rotation.current.x) * 0.05;
      // For Y, we keep spinning but tilt the axis? Or just bias the spin?
      // Let's bias the spin "center" to the mouse.
      // Actually, standard parallax rotates the object to face mouse.

      // Let's separate "Auto Spin" and "Look At"
      // We will apply the look-at as an offset during projection.

      // Default auto-spin speeds
      let radiusScale = 100;
      let autoRotSpeedY = 0.003;
      let jitter = 0;
      let connectionDist = 45;
      let primaryColor = '167, 243, 208';

      if (state === 'idle') {
        radiusScale = 90 + Math.sin(t * 2) * 5;
        autoRotSpeedY = 0.003;
        primaryColor = '59, 130, 246'; // Blue
      } else if (state === 'listening') {
        radiusScale = 110 + level * 60;
        autoRotSpeedY = 0.001;
        jitter = 0.15 + (level * 0.5);
        connectionDist = 55;
        primaryColor = level > 0.4 ? '239, 68, 68' : '244, 114, 182';
      } else if (state === 'processing') {
        radiusScale = 70;
        autoRotSpeedY = 0.2; // Vortex
        primaryColor = '16, 185, 129';
        connectionDist = 60;
      } else if (state === 'playing') {
        radiusScale = 95 + (Math.sin(t * 10) * 10) + (level * 30);
        autoRotSpeedY = 0.01;
        primaryColor = '96, 165, 250';
      }

      // 2. RENDER
      ctx.clearRect(0, 0, size, size);

      // Project Points
      const projected = pointsRef.current.map(p => {
        // Jitter
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;
        const jz = (Math.random() - 0.5) * jitter;

        // Apply Rotation: Auto Spin + Mouse Tilt
        // We add the auto-spin time to the base angle, then rotate by tilt
        const autoAngle = t * (state === 'processing' ? 5 : 0.5); // spin base

        // Complex Rotation Matrix
        // Base spin around Y
        let x = (p.baseX + jx) * Math.cos(autoAngle * autoRotSpeedY * 100 + mouseRef.current.x * 0.001) - (p.baseZ + jz) * Math.sin(autoAngle * autoRotSpeedY * 100 + mouseRef.current.x * 0.001);
        let z = (p.baseX + jx) * Math.sin(autoAngle * autoRotSpeedY * 100 + mouseRef.current.x * 0.001) + (p.baseZ + jz) * Math.cos(autoAngle * autoRotSpeedY * 100 + mouseRef.current.x * 0.001);

        // Tilt X (Look up/down)
        let y = (p.baseY + jy) * Math.cos(targetTiltX) - z * Math.sin(targetTiltX);
        z = (p.baseY + jy) * Math.sin(targetTiltX) + z * Math.cos(targetTiltX);

        // Tilt Y (Look left/right extra)
        const tempX = x * Math.cos(targetTiltY) - z * Math.sin(targetTiltY);
        z = x * Math.sin(targetTiltY) + z * Math.cos(targetTiltY);
        x = tempX;

        // 2D Projection
        const scale = 250 / (250 + z * radiusScale * 0.01);
        const px = cx + x * radiusScale * scale;
        const py = cy + y * radiusScale * scale;

        // Depth of Field (Alpha Calculation)
        // Sharpen the curve: Items in back fade faster
        const normalizedZ = (z + 1) / 2; // 0 (back) to 1 (front)
        const alpha = Math.pow(normalizedZ, 3); // Cubic curve for dramatic depth

        return { x: px, y: py, z, alpha };
      });

      // Draw Connections (Synapses)
      ctx.lineWidth = 0.5;
      projected.forEach((p1, i) => {
        if (p1.z < -0.1) return; // Cull back-facing lines for clean look

        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          if (p2.z < -0.1) continue;

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            // Depth-based opacity for lines
            const opacity = (1 - dist / connectionDist) * p1.alpha * p2.alpha * 0.8;
            ctx.strokeStyle = `rgba(${primaryColor}, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      // Draw Particles
      projected.forEach(p => {
        // Size based on depth (bigger in front)
        const size = Math.max(0.5, (p.z + 1.2) * 1.5);

        ctx.fillStyle = `rgba(${primaryColor}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Highlighting front nodes (Glow)
        if (p.z > 0.6) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgb(${primaryColor})`;
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`; // White hot core
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Outer Ring Shell
      if (state !== 'processing') {
        ctx.strokeStyle = `rgba(${primaryColor}, 0.1)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radiusScale * 1.2, 0, Math.PI * 2);
        ctx.stroke();

        // Counter-rotating ring segments
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-t * 0.2 + targetTiltY); // Rotate with mouse influence
        ctx.strokeStyle = `rgba(${primaryColor}, 0.3)`;
        ctx.beginPath();
        ctx.arc(0, 0, radiusScale * 1.25, 0, 1.5);
        ctx.stroke();
        ctx.restore();
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state, level]); // Re-init if canvas ref changes, but state/level are refs in loop? No, they drive the loop vars inside.
  // Actually, animating refs inside `animate` is better, but `state` is prop.
  // The `animate` function is created once? No, `useEffect` depends on `state`? 
  // If we recreate `animate` every state change, it's fine. 
  // Optimized: Use refs for state inside loop if we want one loop. But recreating easy loop is fine for React.

  return (
    <canvas
      ref={canvasRef}
      className="transition-all duration-700 ease-out"
    />
  );
};

export default Orb;