import * as Tone from 'tone';
import { TrackChannel } from './TrackChannel';

class AudioEngine {
  private static instance: AudioEngine;
  private context: Tone.Context;
  private tracks: Map<string, TrackChannel> = new Map();

  private constructor() {
    this.context = Tone.getContext();
    Tone.Transport.bpm.value = 120;
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async start(): Promise<void> {
    if (this.context.state !== 'running') {
      await Tone.start();
      console.log('Audio context started');
    }
  }

  public play(): void {
    this.start();
    Tone.Transport.start();
  }

  public pause(): void {
    Tone.Transport.pause();
  }

  public setBpm(bpm: number): void {
    Tone.Transport.bpm.value = bpm;
  }

  public addTrack(trackId: string): void {
    if (!this.tracks.has(trackId)) {
      this.tracks.set(trackId, new TrackChannel());
    }
  }

  public removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.channel.dispose();
      this.tracks.delete(trackId);
    }
  }

  public scheduleClip(trackId: string, clipId: string, buffer: AudioBuffer, startTime: number): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.addClip(clipId, buffer);
      track.playClip(clipId, startTime);
    }
  }

  public updateTrackVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.setVolume(Tone.gainToDb(volume));
    }
  }

  public updateTrackPan(trackId: string, pan: number): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.setPan(pan);
    }
  }

  public updateTrackMute(trackId: string, muted: boolean): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.setMute(muted);
    }
  }

  public updateTrackSolo(trackId: string, solo: boolean): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.setSolo(solo);
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
