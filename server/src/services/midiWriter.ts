import fs from 'fs/promises';

export interface MidiNote {
  note: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
}

export interface MidiTrack {
  notes: MidiNote[];
  instrument?: number;
}

export interface MidiProject {
  tracks: MidiTrack[];
  bpm: number;
  timeSignatureNum: number;
  timeSignatureDen: number;
  totalBeats: number;
  /** Optional sequence/track name written as MIDI meta 0xFF 0x03. Defaults to "BEATS-DAW Export". */
  title?: string;
}

function writeVarLen(value: number): number[] {
  const buffer: number[] = [];
  let v = value;
  buffer.push(v & 0x7F);
  while ((v >>= 7) > 0) {
    buffer.unshift((v & 0x7F) | 0x80);
  }
  return buffer;
}

function noteOn(channel: number, note: number, velocity: number): number[] {
  return [0x90 | channel, note, velocity];
}

function noteOff(channel: number, note: number): number[] {
  return [0x80 | channel, note, 0];
}

function setTempo(bpm: number): number[] {
  const microsecondsPerBeat = Math.round(60000000 / bpm);
  return [0xFF, 0x51, 0x03, 
    (microsecondsPerBeat >> 16) & 0xFF,
    (microsecondsPerBeat >> 8) & 0xFF,
    microsecondsPerBeat & 0xFF
  ];
}

function timeSignature(num: number, den: number): number[] {
  return [0xFF, 0x58, 0x04, num, Math.log2(den), 24, 8];
}

export async function writeMidiFile(project: MidiProject, outputPath: string): Promise<void> {
  const { tracks, bpm, timeSignatureNum, timeSignatureDen } = project;
  
  const ticksPerBeat = 480;
  const secondsPerBeat = 60 / bpm;

  const events: { tick: number; data: number[] }[] = [];

  const title = (project.title ?? 'BEATS-DAW Export').slice(0, 0x7F);
  const titleBytes = [...Buffer.from(title, 'utf8')];
  events.push({ tick: 0, data: [0xFF, 0x03, ...writeVarLen(titleBytes.length), ...titleBytes] });
  events.push({ tick: 0, data: setTempo(bpm) });
  events.push({ tick: 0, data: timeSignature(timeSignatureNum, timeSignatureDen) });

  tracks.forEach((track, trackIndex) => {
    const channel = trackIndex % 16;
    
    if (track.instrument !== undefined) {
      events.push({
        tick: 0,
        data: [0xC0 | channel, track.instrument]
      });
    }

    track.notes.forEach(note => {
      const startTick = Math.round(note.startBeat * ticksPerBeat);
      const durationTicks = Math.round(note.durationBeats * ticksPerBeat);
      const velocity = Math.round(note.velocity * 127);

      events.push({ tick: startTick, data: noteOn(channel, note.note, velocity) });
      events.push({ tick: startTick + durationTicks, data: noteOff(channel, note.note) });
    });
  });

  events.sort((a, b) => a.tick - b.tick);

  const midiEvents: number[] = [];
  let lastTick = 0;
  
  for (const event of events) {
    const deltaTick = event.tick - lastTick;
    midiEvents.push(...writeVarLen(deltaTick));
    midiEvents.push(...event.data);
    lastTick = event.tick;
  }

  midiEvents.push(0x00, 0xFF, 0x2F, 0x00);

  const headerChunk: number[] = [
    0x4D, 0x54, 0x68, 0x64, // MThd
    0x00, 0x00, 0x00, 0x06, // Chunk size
    0x00, 0x00, // Format 0
    (tracks.length >> 8) & 0xFF, tracks.length & 0xFF, // Num tracks
    (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF // Ticks per beat
  ];

  const trackChunk: number[] = [
    0x4D, 0x54, 0x72, 0x6B, // MTrk
    (midiEvents.length >> 24) & 0xFF,
    (midiEvents.length >> 16) & 0xFF,
    (midiEvents.length >> 8) & 0xFF,
    midiEvents.length & 0xFF,
    ...midiEvents
  ];

  const midiFile = Buffer.from([...headerChunk, ...trackChunk]);
  await fs.writeFile(outputPath, midiFile);
}

interface Track {
  type: string;
  clips: { midiNotes: MidiNote[] }[];
}

export function convertNotesToMidiTracks(tracks: Track[]): MidiTrack[] {
  return tracks.map(track => {
    const instrumentMap: Record<string, number> = {
      'synth': 0,    // Acoustic Grand
      'piano': 0,
      'drums': 0,    // Will use drum channel
      'sampler': 0,
      'audio': -1    // Skip - audio clips handled separately
    };

    const instrument = instrumentMap[track.type] ?? 0;
    
    const notes: MidiNote[] = [];
    
    if (track.clips) {
      for (const clip of track.clips) {
        if (clip.midiNotes && Array.isArray(clip.midiNotes)) {
          notes.push(...clip.midiNotes);
        }
      }
    }

    return {
      notes,
      instrument: instrument >= 0 ? instrument : undefined
    };
  }).filter(t => t.notes.length > 0 || t.instrument !== undefined);
}
