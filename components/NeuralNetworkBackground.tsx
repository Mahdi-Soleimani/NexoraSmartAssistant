
import React, { useEffect, useRef } from 'react';

const NeuralNetworkBackground = ({ active, audioLevel = 0 }: { active: boolean, audioLevel?: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioLevelRef = useRef(audioLevel);

    // Keep ref updated without re-running effect
    useEffect(() => {
        audioLevelRef.current = audioLevel;
    }, [audioLevel]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const particles: Particle[] = [];
        const particleCount = 60;
        const connectionDistance = 150;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;
            }

            update() {
                // Access latest audio level from ref
                const level = audioLevelRef.current;
                const speedMultiplier = 1 + (level * 5);

                this.x += this.vx * speedMultiplier;
                this.y += this.vy * speedMultiplier;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            draw() {
                if (!ctx) return;
                const level = audioLevelRef.current;

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = active
                    ? `rgba(34, 211, 238, ${0.5 + level})`
                    : `rgba(255, 255, 255, 0.2)`;
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            const level = audioLevelRef.current;

            particles.forEach((particle, i) => {
                particle.update();
                particle.draw();

                for (let j = i; j < particles.length; j++) {
                    const dx = particles[j].x - particle.x;
                    const dy = particles[j].y - particle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        ctx.beginPath();

                        const opacity = (1 - distance / connectionDistance) * (0.15 + (level * 0.5));

                        ctx.strokeStyle = active
                            ? `rgba(34, 211, 238, ${opacity})`
                            : `rgba(255, 255, 255, ${opacity * 0.5})`;

                        ctx.lineWidth = 1;
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            // Re-init particles on drastic resize? Or just let them be.
            // For simplicity, we just update bounds. Existing particles might eventually float back or we can clamp them.
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, [active]); // Only re-init if 'active' toggles

    return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

export default NeuralNetworkBackground;
