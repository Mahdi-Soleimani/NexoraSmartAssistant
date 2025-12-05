import React, { useEffect, useRef } from 'react';

interface NeuralNetworkBackgroundProps {
    active: boolean;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
}

const NeuralNetworkBackground: React.FC<NeuralNetworkBackgroundProps> = ({ active }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const frameRef = useRef<number>(0);
    const dimensionsRef = useRef({ width: 0, height: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            dimensionsRef.current = { width: canvas.width, height: canvas.height };
            initParticles();
        };

        const initParticles = () => {
            const pCount = Math.floor((window.innerWidth * window.innerHeight) / 15000); // Density
            particlesRef.current = [];
            for (let i = 0; i < pCount; i++) {
                particlesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    radius: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.5 + 0.1,
                });
            }
        };

        const draw = () => {
            if (!ctx || !canvas) return;

            // Clear with fading trail if active, else clean clear
            ctx.fillStyle = active ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // If inactive, we might stop rendering or render very dimly. 
            // User asked for this "When the user speaks". So maybe 0 alpha when not active or just don't render.
            // But a smooth transition is better.
            const masterAlpha = active ? 1 : 0;

            if (masterAlpha <= 0.01) {
                // just clear and return to save resources if completely invisible
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                frameRef.current = requestAnimationFrame(draw);
                return;
            }

            const particles = particlesRef.current;

            // Update and draw particles
            particles.forEach((p, i) => {
                // Move
                if (active) {
                    p.x += p.vx * 2; // Move faster when active
                    p.y += p.vy * 2;
                } else {
                    p.x += p.vx * 0.5;
                    p.y += p.vy * 0.5;
                }

                // Bounce
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // Draw Dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(34, 211, 238, ${p.alpha * masterAlpha})`; // Cyan cyan-400
                ctx.fill();
            });

            // Draw Connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p1 = particles[i];
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - distance / 150) * 0.2 * masterAlpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            frameRef.current = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frameRef.current);
        };
    }, [active]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-0'}`}
        />
    );
};

export default NeuralNetworkBackground;
