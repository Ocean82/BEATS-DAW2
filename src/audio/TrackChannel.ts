import * as Tone from 'tone';

export class TrackChannel {
  public readonly channel: Tone.Channel;
  private players: Map<string, Tone.Player> = new Map();

  constructor() {
    this.channel = new Tone.Channel(0, 0).toDestination();
  }

  public addClip(clipId: string, buffer: AudioBuffer): void {
    if (this.players.has(clipId)) {
      this.players.get(clipId)?.dispose();
    }
    const player = new Tone.Player(buffer).connect(this.channel);
    this.players.set(clipId, player);
  }

  public playClip(clipId: string, time: number): void {
    const player = this.players.get(clipId);
    if (player) {
      player.start(time);
    }
  }

  public setVolume(db: number): void {
    this.channel.volume.value = db;
  }

  public setPan(pan: number): void {
    this.channel.pan.value = pan;
  }

  public setMute(muted: boolean): void {
    this.channel.mute = muted;
  }

  public setSolo(solo: boolean): void {
    if (solo) {
      this.channel.solo = true;
    } else {
      this.channel.solo = false;
    }
  }
}
