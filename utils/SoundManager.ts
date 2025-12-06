// Utility to generate procedural futuristic sounds using Web Audio API
// No external assets required.

class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private ambienceOsc: OscillatorNode | null = null;
    private ambienceGain: GainNode | null = null;
    private isMuted: boolean = false;

    constructor() {
        this.init();
    }

    private init() {
        if (typeof window !== 'undefined') {
            const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextCtor) {
                this.ctx = new AudioContextCtor();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.3; // Global volume
                this.masterGain.connect(this.ctx.destination);
            }
        }
    }

    // Call this on first user interaction to resume Context if suspended
    public async resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    public playAmbientHum() {
        if (!this.ctx || !this.masterGain || this.ambienceOsc) return;

        // Create Brown Noise approximation using multiple low frequency oscillators
        // for a deep "server room" or "spaceship engine" thrum

        try {
            const t = this.ctx.currentTime;

            // 1. Low Drone
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.value = 50;

            // Filter to make it "rumble" rather than buzz
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 120;

            const gain = this.ctx.createGain();
            gain.gain.value = 0.05;

            osc1.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc1.start(t);

            // LFO to modulate the drone slightly so it feels "alive"
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.1; // Very slow pulse
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 0.02;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            lfo.start(t);

            // Store references to stop later if needed
            // For simplicity in this singleton, we just keep it running
            this.ambienceOsc = osc1;
            this.ambienceGain = gain;
        } catch (e) {
            console.error("Audio ambience error", e);
        }
    }

    public playClick() {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // High pitched tech click
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05); // Short decay

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.05);
    }

    public playActivation() {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // "Power Up" Sweeping Sine
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.4);

        gain.gain.setValueAtTime(0.0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
        gain.gain.linearRampToValueAtTime(0.0, t + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    public playProcessChirp() {
        if (!this.ctx || !this.masterGain) return;

        // Random "computing" bleeps
        const count = 3;
        const now = this.ctx.currentTime;

        for (let i = 0; i < count; i++) {
            const t = now + (i * 0.1);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const freq = 800 + Math.random() * 500;
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.02, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.05);
        }
    }

    public playSuccess() {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // Harmonious chord (Major Triad)
        const freqs = [523.25, 659.25, 783.99]; // C Major

        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = f;

            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + (i * 0.1));

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.8);
        });
    }
}

export const soundManager = new SoundManager();
