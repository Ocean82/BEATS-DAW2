import type { Track, Clip } from '../store/dawStore';

const SAMPLE_RATE = 44100;

function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  function writeString(offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ExportMixParams {
  tracks: Track[];
  bpm: number;
  masterVolume: number;
}

/**
 * Renders the current mix (all tracks with clips) to a WAV file using OfflineAudioContext
 * and returns the blob. Applies per-track volume and pan; respects mute/solo.
 */
export async function renderMixToWav(params: ExportMixParams): Promise<Blob> {
  const { tracks, bpm, masterVolume } = params;

  let totalBeats = 0;
  const clipsWithTrack: { clip: Clip; track: Track }[] = [];
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.audioBuffer) {
        clipsWithTrack.push({ clip, track });
        const endBeat = clip.startBeat + clip.durationBeats;
        if (endBeat > totalBeats) totalBeats = endBeat;
      }
    }
  }

  if (clipsWithTrack.length === 0) {
    throw new Error('No audio clips to export');
  }

  const durationSeconds = Math.max(0.1, beatsToSeconds(totalBeats, bpm));
  const totalLength = Math.ceil(durationSeconds * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(2, totalLength, SAMPLE_RATE);

  const hasSolo = tracks.some((t) => t.solo);

  for (const { clip, track } of clipsWithTrack) {
    const buffer = clip.audioBuffer as AudioBuffer;
    if (track.muted || (hasSolo && !track.solo)) continue;

    const gainNode = ctx.createGain();
    gainNode.gain.value = track.volume * masterVolume;
    const panner = ctx.createStereoPanner();
    panner.pan.value = track.pan;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(ctx.destination);

    const startTime = beatsToSeconds(clip.startBeat, bpm);
    source.start(startTime);
    source.stop(startTime + buffer.duration);
  }

  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
}

/**
 * Renders mix to WAV and triggers browser download.
 */
export async function exportMasterWav(params: ExportMixParams, filename?: string): Promise<void> {
  const blob = await renderMixToWav(params);
  const name = filename ?? `burnt-beats-master-${Date.now()}.wav`;
  triggerDownload(blob, name);
}
