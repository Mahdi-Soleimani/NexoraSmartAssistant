
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface ParticleOrbProps {
    state: 'idle' | 'listening' | 'processing' | 'playing';
    audioLevel: number; // 0 to 1
}

const COUNT = 2500; // Increased particle count for denser visual

// Helper to generate different shapes
const generateParticles = (shape: 'sphere' | 'mic' | 'brain' | 'wave') => {
    const positions = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
        let x, y, z;

        if (shape === 'sphere') {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 2.5 + Math.random() * 0.2; // Slight thickness
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);
        } else if (shape === 'mic') {
            // Cylinder body
            const h = (Math.random() - 0.5) * 4;
            let r = 1.0;
            if (h > 1.5) { // Head
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                const rHead = 1.2;
                x = rHead * Math.sin(phi) * Math.cos(theta);
                y = rHead * Math.sin(phi) * Math.sin(theta) + 1.5;
                z = rHead * Math.cos(phi);
            } else {
                const theta = Math.random() * Math.PI * 2;
                x = r * Math.cos(theta);
                z = r * Math.sin(theta);
                y = h;
            }
        } else if (shape === 'brain') {
            // Two ellipsoids
            const side = Math.random() > 0.5 ? 1 : -1;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            const r = 2;
            // x squished slightly, separated by side
            x = (r * 0.8 * Math.sin(phi) * Math.cos(theta)) + (side * 0.6);
            y = r * Math.sin(phi) * Math.sin(theta) * 0.8;
            z = r * Math.cos(phi) * 1.2;

            // Add "convolution" noise
            x += (Math.random() - 0.5) * 0.2;
            y += (Math.random() - 0.5) * 0.2;
            z += (Math.random() - 0.5) * 0.2;

        } else { // Wave
            const u = Math.random() * 10 - 5; // x range
            const v = Math.random() * 10 - 5; // z range
            x = u;
            z = v;
            // Sine wave pattern
            y = Math.sin(u * 0.8) * Math.cos(v * 0.8) * 1.5;
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    return positions;
};

const Particles = ({ state, audioLevel }: { state: string, audioLevel: number }) => {
    const points = useRef<THREE.Points>(null!);

    // Immutable target shapes
    const spherePos = useMemo(() => generateParticles('sphere'), []);
    const micPos = useMemo(() => generateParticles('mic'), []);
    const brainPos = useMemo(() => generateParticles('brain'), []);
    const wavePos = useMemo(() => generateParticles('wave'), []);

    // Random offsets for noise transition
    const noiseOffsets = useMemo(() => {
        const arr = new Float32Array(COUNT * 3);
        for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * 4;
        return arr;
    }, []);

    const geometryRef = useRef<THREE.BufferGeometry>(null!);
    const currentPositions = useMemo(() => new Float32Array(COUNT * 3), []);

    // We keep track of "current visual state" to detect transitions
    const prevState = useRef(state);
    const transitionProgress = useRef(0); // 0 to 1
    const isTransitioning = useRef(false);

    // Initialize
    useEffect(() => {
        currentPositions.set(spherePos);
        if (geometryRef.current) {
            geometryRef.current.attributes.position.needsUpdate = true;
        }
    }, []);

    useFrame((_, delta) => {
        if (!points.current) return;

        let target: Float32Array;
        let speed = 0.05;

        // Detect state change
        if (state !== prevState.current) {
            isTransitioning.current = true;
            transitionProgress.current = 0;
            prevState.current = state;
        }

        // Determine target shape
        if (state === 'listening') {
            target = micPos;
            speed = 0.08;
        } else if (state === 'processing') {
            target = brainPos;
            speed = 0.03;
        } else if (state === 'playing') {
            target = wavePos;
            speed = 0.1;
        } else {
            target = spherePos;
            speed = 0.05;
        }

        // Handle Transition Impulse (Noise burst)
        let noiseFactor = 0;
        if (isTransitioning.current) {
            transitionProgress.current += delta * 2; // Transition takes ~0.5s

            // Parabola: 0 -> 1 -> 0
            // x from 0 to 1. y = 4x(1-x). Peak at 0.5 is 1.
            const t = Math.min(transitionProgress.current, 1);
            noiseFactor = 4 * t * (1 - t) * 0.5; // Max noise multiplier 0.5

            if (transitionProgress.current >= 1) {
                isTransitioning.current = false;
                noiseFactor = 0;
            }
        }

        const positions = points.current.geometry.attributes.position.array as Float32Array;
        const time = Date.now() * 0.001;

        for (let i = 0; i < COUNT; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            let tx = target[ix];
            let ty = target[iy];
            let tz = target[iz];

            // Add dynamic movement specific to state
            if (state === 'playing') {
                // Wave Animation
                ty = Math.sin(tx * 0.8 + time * 5) * Math.cos(tz * 0.8 + time * 3) * (1.5 + audioLevel * 2);
            } else if (state === 'processing') {
                // Pulse Brain
                const pulse = 1 + Math.sin(time * 3) * 0.02;
                tx *= pulse; ty *= pulse; tz *= pulse;
            } else if (state === 'listening') {
                // Mic Vibrate
                tx += (Math.random() - 0.5) * 0.01;
            } else {
                // Breathing Sphere
                const scale = 1 + Math.sin(time) * 0.05;
                tx *= scale; ty *= scale; tz *= scale;
            }

            // Apply Transition Noise ("Scattering Effect")
            if (noiseFactor > 0) {
                tx += noiseOffsets[ix] * noiseFactor;
                ty += noiseOffsets[iy] * noiseFactor;
                tz += noiseOffsets[iz] * noiseFactor;
            }

            // Lerp towards target
            positions[ix] += (tx - positions[ix]) * speed;
            positions[iy] += (ty - positions[iy]) * speed;
            positions[iz] += (tz - positions[iz]) * speed;
        }

        points.current.geometry.attributes.position.needsUpdate = true;
        points.current.rotation.y += 0.002;
    });

    const pointColor = useMemo(() => {
        switch (state) {
            case 'listening': return '#ef4444'; // Red
            case 'playing': return '#22d3ee'; // Cyan
            case 'processing': return '#a855f7'; // Purple
            default: return '#0ea5e9'; // Sky Blue
        }
    }, [state]);

    return (
        <points ref={points}>
            <bufferGeometry ref={geometryRef}>
                <bufferAttribute
                    attach="attributes-position"
                    count={COUNT}
                    array={currentPositions}
                    itemSize={3}
                />
            </bufferGeometry>
            {/* 
               IMPORTANT: Use standard pointsMaterial but tweaked for Bloom.
               Bloom glows when color values > 1.0 (HDR). 
               We simply use a bright color, post-processing handles the rest.
            */}
            <pointsMaterial
                size={0.08} // Smaller points for higher resolution feel
                color={pointColor}
                transparent
                opacity={0.9}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
};

export default function ParticleOrb({ state, audioLevel }: ParticleOrbProps) {
    return (
        <div className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] relative transition-all duration-500">
            <Canvas camera={{ position: [0, 0, 9], fov: 60 }} gl={{ antialias: true, alpha: true }}>
                <Particles state={state} audioLevel={audioLevel} />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />

                {/* Post-Processing Pipeline */}
                <EffectComposer>
                    <Bloom
                        luminanceThreshold={0.2}
                        mipmapBlur
                        intensity={1.5}
                        radius={0.6}
                    />
                </EffectComposer>
            </Canvas>
        </div>
    );
}
