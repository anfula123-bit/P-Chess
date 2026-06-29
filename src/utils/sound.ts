/**
 * Sound Manager
 * Web Audio API-based sound effects
 */

const SOUND_FILES = {
  move: '/sounds/move.mp3',
  capture: '/sounds/capture.mp3',
  check: '/sounds/check.mp3',
  checkmate: '/sounds/checkmate.mp3',
  castle: '/sounds/castle.mp3',
  promote: '/sounds/promote.mp3',
  gameStart: '/sounds/game-start.mp3',
  illegal: '/sounds/illegal.mp3',
};

export type SoundType = keyof typeof SOUND_FILES;

class SoundManager {
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private volume: number = 0.7;
  private loaded: boolean = false;

  /**
   * Initialize audio context (must be called from user interaction)
   */
  async init(): Promise<void> {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadAllSounds();
      this.loaded = true;
    } catch (e) {
      console.warn('Sound initialization failed:', e);
    }
  }

  /**
   * Preload all sound effects
   */
  private async loadAllSounds(): Promise<void> {
    if (!this.audioContext) return;

    const loadPromises = Object.entries(SOUND_FILES).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.buffers.set(key, audioBuffer);
      } catch {
        // Sound file not found — generate a synthetic sound
        this.buffers.set(key, this.generateSyntheticSound(key as SoundType));
      }
    });

    await Promise.allSettled(loadPromises);
  }

  /**
   * Generate synthetic sounds as fallback
   */
  private generateSyntheticSound(type: SoundType): AudioBuffer {
    const ctx = this.audioContext!;
    const sampleRate = ctx.sampleRate;

    // Different durations for different sounds
    const durations: Record<SoundType, number> = {
      move: 0.08,
      capture: 0.15,
      check: 0.2,
      checkmate: 0.5,
      castle: 0.12,
      promote: 0.25,
      gameStart: 0.3,
      illegal: 0.1,
    };

    const frequencies: Record<SoundType, number[]> = {
      move: [800],
      capture: [400, 200],
      check: [600, 900],
      checkmate: [300, 500, 700, 900],
      castle: [500, 700],
      promote: [400, 600, 800],
      gameStart: [523, 659, 784],
      illegal: [200],
    };

    const duration = durations[type];
    const freqs = frequencies[type];
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 15); // Fast decay
      let sample = 0;

      for (let j = 0; j < freqs.length; j++) {
        const delay = j * 0.03;
        if (t >= delay) {
          sample += Math.sin(2 * Math.PI * freqs[j] * (t - delay)) * envelope;
        }
      }

      data[i] = sample / freqs.length * 0.3;
    }

    return buffer;
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType): void {
    if (!this.audioContext || this.volume === 0) return;

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const buffer = this.buffers.get(type);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = this.volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  /**
   * Set volume (0-1)
   */
  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
}

// Singleton instance
export const soundManager = new SoundManager();
