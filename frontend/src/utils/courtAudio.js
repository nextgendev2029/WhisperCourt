/**
 * Whisper Court - Synthesized Aristocratic Audio Engine
 * Uses the Web Audio API to create authentic courtroom acoustic cues:
 * - Gavel strikes (resonant wood strike + hollow decay)
 * - Tension chords (minor harmonic string shimmer)
 * - Parchment rustles (gentle filtered noise burst)
 * - Wax ballot seal (heavy damp thud)
 * - Contradiction alert (sharp dissonant chime)
 * - Verdict exile bell (solemn low-frequency cathedral resonance)
 * 
 * ZERO external assets or downloads required.
 * Muted by default to avoid browser autoplay policy issues.
 */

class CourtAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = true; // Safe default
    this.volume = 0.5;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (!this.muted) {
      this.init();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  canPlay() {
    return !this.muted && this.ctx && this.ctx.state !== 'suspended';
  }

  /**
   * Resonant Gavel Strike: Two sharp transients (wood block meeting sounding block)
   */
  playGavel() {
    if (!this.canPlay()) return;
    try {
      const t = this.ctx.currentTime;

      // Primary wood strike
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(140, t);
      osc1.frequency.exponentialRampToValueAtTime(45, t + 0.18);
      gain1.gain.setValueAtTime(0.7 * this.volume, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.25);

      // Secondary chamber echo (sounding board resonance)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(75, t);
      osc2.frequency.exponentialRampToValueAtTime(30, t + 0.45);
      gain2.gain.setValueAtTime(0.4 * this.volume, t + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.02);
      osc2.stop(t + 0.55);
    } catch (e) {
      console.warn('[CourtAudio] Gavel failed:', e);
    }
  }

  /**
   * Tension Chime: Minor third chord with subtle beating to signal suspicion
   */
  playTension() {
    if (!this.canPlay()) return;
    try {
      const t = this.ctx.currentTime;
      const freqs = [220, 261.63, 311.13]; // A minor with diminished fifth flavor
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12 * this.volume, t + 0.2 + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 1.3);
      });
    } catch (e) {
      console.warn('[CourtAudio] Tension failed:', e);
    }
  }

  /**
   * Contradiction Warning: Sharp, authoritative harmonic dissonance
   */
  playContradiction() {
    if (!this.canPlay()) return;
    try {
      const t = this.ctx.currentTime;
      const freqs = [370, 392, 554.37]; // F#4, G4, C#5 (Tritone clash)
      freqs.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        // Lowpass filter to keep it aristocratic, not electronic
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);

        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.75);
      });
    } catch (e) {
      console.warn('[CourtAudio] Contradiction failed:', e);
    }
  }

  /**
   * Wax Ballot Seal: Heavy dampened thud as a vote is cast
   */
  playBallotSeal() {
    if (!this.canPlay()) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);
      gain.gain.setValueAtTime(0.6 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch (e) {
      console.warn('[CourtAudio] Ballot seal failed:', e);
    }
  }

  /**
   * Cathedral Verdict Bell: Deep, solemn low-frequency resonance
   */
  playVerdict() {
    if (!this.canPlay()) return;
    try {
      const t = this.ctx.currentTime;
      const freqs = [110, 220, 277.18]; // A2 fundamental with major third
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 2.3);
      });
    } catch (e) {
      console.warn('[CourtAudio] Verdict bell failed:', e);
    }
  }

  /**
   * Parchment Rustle / Quill: Subtle noise sweep on testimony arrival
   */
  playParchment() {
    if (!this.canPlay()) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.04;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.setValueAtTime(3, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
    } catch (e) {
      console.warn('[CourtAudio] Parchment failed:', e);
    }
  }
}

export const courtAudio = new CourtAudioEngine();
