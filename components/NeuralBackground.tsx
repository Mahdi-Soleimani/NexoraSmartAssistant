import React, { useEffect, useRef } from 'react';

interface NeuralProps {
    active: boolean;
}

const NeuralBackground: React.FC<NeuralProps> = ({ active }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', resize);
        resize();

        // Particle Config
        const particles: { x: number; y: number; vx: number; vy: number }[] = [];
        const particleCount = 60;
        const connectionDist = 150;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5
            });
        }

        let animationId: number;
        let time = 0;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            const speedMultiplier = active ? 2.5 : 0.5;
            time += 0.01 * speedMultiplier;

            // Update and Draw Particles
            ctx.fillStyle = active ? 'rgba(34, 211, 238, 0.4)' : 'rgba(148, 163, 184, 0.2)';

            particles.forEach((p, i) => {
                p.x += p.vx * speedMultiplier;
                p.y += p.vy * speedMultiplier;

                // Bounce
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                // Draw Node
                ctx.beginPath();
                ctx.arc(p.x, p.y, active ? 1.5 : 1, 0, Math.PI * 2);
                ctx.fill();

                // Connect
                for (let j = i + 1; j < particleCount; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDist) {
                        const alpha = (1 - dist / connectionDist) * (active ? 0.3 : 0.05);
                        ctx.strokeStyle = active ? `rgba(34, 211, 238, ${alpha})` : `rgba(148, 163, 184, ${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [active]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-40" />;
};

export default NeuralBackground;
