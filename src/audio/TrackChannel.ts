import * as Tone from 'tone';

/**
 * TrackChannel wraps the full per-track DSP graph:
 *
 *   Players → Gain → EQ3 → Compressor → FeedbackDelay → Reverb → Channel → Destination
 *
 * Every node is lazy-created after the first user gesture so we never
 * touch the AudioContext before Chrome's autoplay policy allows it.
 */
export class TrackChannel {
  private _channel: Tone.Channel | null = null;
  private _gain: Tone.Gain | null = null;
  private _eq: Tone.EQ3 | null = null;
  private _compressor: Tone.Compressor | null = null;
  private _delay: Tone.FeedbackDelay | null = null;
  private _reverb: Tone.Reverb | null = null;

  private players: Map<string, Tone.Player> = new Map();

  constructor() {
    // All nodes created lazily on first use.
  }

  // ─── Lazy chain init ────────────────────────────────────────────────────────

  private getChain(): {
    gain: Tone.Gain;
    eq: Tone.EQ3;
    compressor: Tone.Compressor;
    delay: Tone.FeedbackDelay;
    reverb: Tone.Reverb;
    channel: Tone.Channel;
  } {
    if (!this._channel) {
      this._gain = new Tone.Gain(1);
      this._eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
      this._compressor = new Tone.Compressor({ threshold: -24, ratio: 4, attack: 0.003, release: 0.25 });
      this._delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: 0 });
      this._reverb = new Tone.Reverb({ decay: 2.5, wet: 0.1 });
      this._channel = new Tone.Channel(0, 0).toDestination();

      // Wire: Gain → EQ3 → Compressor → Delay → Reverb → Channel
      this._gain.connect(this._eq);
      this._eq.connect(this._compressor);
      this._compressor.connect(this._delay);
      this._delay.connect(this._reverb);
      this._reverb.connect(this._channel);
    }
    return {
      gain: this._gain!,
      eq: this._eq!,
      compressor: this._compressor!,
      delay: this._delay!,
      reverb: this._reverb!,
      channel: this._channel!,
    };
  }

  // ─── Clip management ────────────────────────────────────────────────────────

  public addClip(clipId: string, buffer: AudioBuffer): void {
    if (this.players.has(clipId)) {
      this.players.get(clipId)?.dispose();
    }
    const { gain } = this.getChain();
    const player = new Tone.Player(buffer).connect(gain);
    this.players.set(clipId, player);
  }

  public playClip(clipId: string, time: number): void {
    const player = this.players.get(clipId);
    if (player) {
      player.start(time);
    }
  }

  public stopClip(clipId: string): void {
    this.players.get(clipId)?.stop();
  }

  public stopAll(): void {
    this.players.forEach((p) => { try { p.stop(); } catch { /* already stopped */ } });
  }

  // ─── Channel parameters ──────────────────────────────────────────────────────

  public setVolume(db: number): void {
    this.getChain().channel.volume.value = db;
  }

  public setPan(pan: number): void {
    this.getChain().channel.pan.value = pan;
  }

  public setMute(muted: boolean): void {
    this.getChain().channel.mute = muted;
  }

  public setSolo(solo: boolean): void {
    this.getChain().channel.solo = solo;
  }

  // ─── Gain (pre-chain, separate from fader volume) ───────────────────────────

  public setGain(linear: number): void {
    this.getChain().gain.gain.value = linear;
  }

  // ─── EQ3 ────────────────────────────────────────────────────────────────────

  public setEq(low: number, mid: number, high: number): void {
    const { eq } = this.getChain();
    eq.low.value = low;
    eq.mid.value = mid;
    eq.high.value = high;
  }

  // ─── Compressor ─────────────────────────────────────────────────────────────

  public setCompressor(threshold: number, ratio: number): void {
    const { compressor } = this.getChain();
    compressor.threshold.value = threshold;
    compressor.ratio.value = ratio;
  }

  // ─── Delay ──────────────────────────────────────────────────────────────────

  public setDelayWet(wet: number): void {
    this.getChain().delay.wet.value = wet;
  }

  // ─── Reverb ─────────────────────────────────────────────────────────────────

  public setReverbWet(wet: number): void {
    this.getChain().reverb.wet.value = wet;
  }

  // ─── Phase invert (negate gain to flip polarity) ────────────────────────────

  public setPhaseInvert(inverted: boolean): void {
    // Phase invert = multiply signal by -1 via gain node polarity
    const { gain } = this.getChain();
    gain.gain.value = inverted ? -Math.abs(gain.gain.value) : Math.abs(gain.gain.value);
  }

  // ─── Dispose ────────────────────────────────────────────────────────────────

  public dispose(): void {
    this.players.forEach((p) => p.dispose());
    this.players.clear();
    this._reverb?.dispose();
    this._delay?.dispose();
    this._compressor?.dispose();
    this._eq?.dispose();
    this._gain?.dispose();
    this._channel?.dispose();
    this._reverb = null;
    this._delay = null;
    this._compressor = null;
    this._eq = null;
    this._gain = null;
    this._channel = null;
  }
}
