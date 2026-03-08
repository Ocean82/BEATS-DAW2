import * as Tone from 'tone';
import { TrackChannel } from './TrackChannel';

class AudioEngine {
  private static instance: AudioEngine;
  private contextStarted = false;
  private tracks: Map<string, TrackChannel> = new Map();

  // Metronome
  private metronome: Tone.Synth | null = null;
  private metronomePart: Tone.Part | null = null;
  private metronomeActive = false;

  // Playhead RAF handle
  private rafHandle: number | null = null;
  private onBeatCallback: ((beat: number) => void) | null = null;

  private constructor() {
    // Do not touch Tone here — context must be resumed after a user gesture (Chrome autoplay policy).
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  // ─── Context lifecycle ───────────────────────────────────────────────────────

  /** Call from a user gesture (e.g. Play, or adding a clip). Resumes/creates the AudioContext. */
  public async start(): Promise<void> {
    if (this.contextStarted && Tone.getContext().state === 'running') return;
    await Tone.start();
    this.contextStarted = true;
    console.log('Audio context started');
  }

  // ─── Transport ───────────────────────────────────────────────────────────────

  public async play(): Promise<void> {
    await this.start();
    Tone.Transport.bpm.value = Tone.Transport.bpm.value ?? 120;
    Tone.Transport.start();
    this.startPlayheadRaf();
  }

  public pause(): void {
    Tone.Transport.pause();
    this.stopPlayheadRaf();
  }

  public stop(): void {
    Tone.Transport.stop();
    this.stopPlayheadRaf();
    // Notify subscribers of beat 0
    this.onBeatCallback?.(0);
  }

  public seek(beat: number): void {
    const bpm = Tone.Transport.bpm.value;
    const seconds = (beat / bpm) * 60;
    Tone.Transport.seconds = seconds;
    this.onBeatCallback?.(beat);
  }

  public setBpm(bpm: number): void {
    Tone.Transport.bpm.value = bpm;
  }

  public setLooping(looping: boolean, startBeat: number, endBeat: number): void {
    Tone.Transport.loop = looping;
    if (looping) {
      const bpm = Tone.Transport.bpm.value;
      Tone.Transport.loopStart = `${(startBeat / bpm) * 60}`;
      Tone.Transport.loopEnd = `${(endBeat / bpm) * 60}`;
    }
  }

  // ─── Playhead callback (requestAnimationFrame loop) ──────────────────────────

  public setOnBeatCallback(cb: (beat: number) => void): void {
    this.onBeatCallback = cb;
  }

  private startPlayheadRaf(): void {
    this.stopPlayheadRaf();
    const tick = () => {
      if (Tone.Transport.state === 'started') {
        const seconds = Tone.Transport.seconds;
        const bpm = Tone.Transport.bpm.value;
        const beat = (seconds / 60) * bpm;
        this.onBeatCallback?.(beat);
      }
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  private stopPlayheadRaf(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  // ─── Track management ────────────────────────────────────────────────────────

  public addTrack(trackId: string): void {
    if (!this.tracks.has(trackId)) {
      this.tracks.set(trackId, new TrackChannel());
    }
  }

  public removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.dispose();
      this.tracks.delete(trackId);
    }
  }

  public async scheduleClip(trackId: string, clipId: string, buffer: AudioBuffer, startBeat: number): Promise<void> {
    await this.start();
    const track = this.tracks.get(trackId);
    if (track) {
      const bpm = Tone.Transport.bpm.value;
      const startSeconds = (startBeat / bpm) * 60;
      track.addClip(clipId, buffer);
      track.playClip(clipId, startSeconds);
    }
  }

  public stopTrackClips(trackId: string): void {
    this.tracks.get(trackId)?.stopAll();
  }

  // ─── Per-track parameters ────────────────────────────────────────────────────

  public updateTrackVolume(trackId: string, volume: number): void {
    this.tracks.get(trackId)?.setVolume(Tone.gainToDb(volume));
  }

  public updateTrackPan(trackId: string, pan: number): void {
    this.tracks.get(trackId)?.setPan(pan);
  }

  public updateTrackMute(trackId: string, muted: boolean): void {
    this.tracks.get(trackId)?.setMute(muted);
  }

  public updateTrackSolo(trackId: string, solo: boolean): void {
    this.tracks.get(trackId)?.setSolo(solo);
  }

  public updateTrackGain(trackId: string, gain: number): void {
    this.tracks.get(trackId)?.setGain(gain);
  }

  public updateTrackPhaseInvert(trackId: string, inverted: boolean): void {
    this.tracks.get(trackId)?.setPhaseInvert(inverted);
  }

  // ─── Per-track effects ───────────────────────────────────────────────────────

  public updateTrackEq(trackId: string, low: number, mid: number, high: number): void {
    this.tracks.get(trackId)?.setEq(low, mid, high);
  }

  public updateTrackCompressor(trackId: string, threshold: number, ratio: number): void {
    this.tracks.get(trackId)?.setCompressor(threshold, ratio);
  }

  public updateTrackDelayWet(trackId: string, wet: number): void {
    this.tracks.get(trackId)?.setDelayWet(wet);
  }

  public updateTrackReverbWet(trackId: string, wet: number): void {
    this.tracks.get(trackId)?.setReverbWet(wet);
  }

  // ─── Metronome ───────────────────────────────────────────────────────────────

  public async setMetronome(active: boolean): Promise<void> {
    if (active === this.metronomeActive) return;
    this.metronomeActive = active;

    if (active) {
      await this.start();
      if (!this.metronome) {
        this.metronome = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.01 },
          volume: -10,
        }).toDestination();
      }
      if (!this.metronomePart) {
        // Build a repeating pattern driven by time signature (default 4/4)
        // Beat index 0 = downbeat (higher pitch), 1-3 = subdivisions
        this.metronomePart = new Tone.Part(
          (time: number, value: { accent: boolean }) => {
            if (!this.metronome) return;
            this.metronome.triggerAttackRelease(
              value.accent ? 'C5' : 'G4',
              '32n',
              time
            );
          },
          [
            { time: '0:0:0', accent: true },
            { time: '0:1:0', accent: false },
            { time: '0:2:0', accent: false },
            { time: '0:3:0', accent: false },
          ]
        );
        this.metronomePart.loop = true;
        this.metronomePart.loopEnd = '1m';
      }
      this.metronomePart.start(0);
    } else {
      this.metronomePart?.stop();
      this.metronomePart?.dispose();
      this.metronomePart = null;
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
