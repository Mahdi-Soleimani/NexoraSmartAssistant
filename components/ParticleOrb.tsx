
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleOrbProps {
    state: 'idle' | 'listening' | 'processing' | 'playing';
    audioLevel: number; // 0 to 1
}

const COUNT = 2000;

// Helper to generate different shapes
const generateParticles = (shape: 'sphere' | 'mic' | 'brain' | 'wave') => {
    const positions = new Float32Array(COUNT * 3);
    const color = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
        let x, y, z;

        if (shape === 'sphere') {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 2.5 + Math.random() * 0.1;
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
    const spherePos = useMemo(() => generateParticles('sphere'), []);
    const micPos = useMemo(() => generateParticles('mic'), []);
    const brainPos = useMemo(() => generateParticles('brain'), []);
    const wavePos = useMemo(() => generateParticles('wave'), []);

    // Buffer attributes
    const geometryRef = useRef<THREE.BufferGeometry>(null!);

    // Current positions array (mutable)
    const currentPositions = useMemo(() => new Float32Array(COUNT * 3), []);

    // Initialize current positions to sphere
    useEffect(() => {
        currentPositions.set(spherePos);
        if (geometryRef.current) {
            geometryRef.current.attributes.position.needsUpdate = true;
        }
    }, []);

    useFrame(() => {
        if (!points.current) return;

        let target: Float32Array;
        let speed = 0.05;

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

        const positions = points.current.geometry.attributes.position.array as Float32Array;

        // Lerp positions
        const time = Date.now() * 0.001;

        for (let i = 0; i < COUNT; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            let tx = target[ix];
            let ty = target[iy];
            let tz = target[iz];

            // Add dynamic movement
            if (state === 'playing') {
                // Animate wave
                // Re-calculate wave Y based on time
                ty = Math.sin(tx * 0.8 + time * 5) * Math.cos(tz * 0.8 + time * 3) * (1.5 + audioLevel * 2);
            } else if (state === 'processing') {
                // Pulse brain
                tx = tx * (1 + Math.sin(time * 3) * 0.02);
                ty = ty * (1 + Math.sin(time * 3) * 0.02);
                tz = tz * (1 + Math.sin(time * 3) * 0.02);
            } else if (state === 'listening') {
                // Vibrate mic slightly
                tx += (Math.random() - 0.5) * 0.01;
            } else {
                // Breathing sphere
                const scale = 1 + Math.sin(time) * 0.05;
                tx *= scale;
                ty *= scale;
                tz *= scale;
            }

            positions[ix] += (tx - positions[ix]) * speed;
            positions[iy] += (ty - positions[iy]) * speed;
            positions[iz] += (tz - positions[iz]) * speed;
        }

        points.current.geometry.attributes.position.needsUpdate = true;

        // Rotate entire system slowly
        points.current.rotation.y += 0.002;
    });

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
            <pointsMaterial
                size={0.15}
                color={state === 'listening' ? '#ef4444' : state === 'playing' ? '#22d3ee' : state === 'processing' ? '#a855f7' : '#06b6d4'}
                transparent
                opacity={0.8}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
};

export default function ParticleOrb({ state, audioLevel }: ParticleOrbProps) {
    return (
        <div className="w-[400px] h-[400px] relative">
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }} gl={{ antialias: true, alpha: true }}>
                <Particles state={state} audioLevel={audioLevel} />
            </Canvas>
        </div>
    );
}
