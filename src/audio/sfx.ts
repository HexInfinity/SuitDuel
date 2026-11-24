import type { SuitId } from '../game/types';

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playCard(suit: SuitId, surged: boolean, enabled: boolean): void {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq: Record<SuitId, number> = {
      hearts: 523.25,
      diamonds: 659.25,
      clubs: 392.0,
      spades: 293.66,
    };

    osc.type = suit === 'spades' || suit === 'clubs' ? 'triangle' : 'sine';
    const f0 = baseFreq[suit];
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(surged ? f0 * 1.5 : f0 * 1.18, now + 0.11);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playOutcome(won: boolean, enabled: boolean): void {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [392.0, 349.23, 293.66];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = won ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    });
  }
}

export const sfx = new SoundEffects();
