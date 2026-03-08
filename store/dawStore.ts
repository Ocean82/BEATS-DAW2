
import { create } from 'zustand';
// import { MidiEffectsConfig, defaultMidiEffects } from '../audio/midiEffects';
// import { midiEffectsManager } from '../audio/midiEffectsManager';
// import { MasteringSettings, DEFAULT_MASTERING } from '../audio/masteringEngine';
import { audioEngine } from '../src/audio/audioEngine';

export type TrackType = 'audio' | 'synth' | 'drums' | 'sampler';

export interface Clip {
  id: string;
  trackId: string;
  startBeat: number;
  durationBeats: number;
  color: string;
  name: string;
  audioBuffer?: AudioBuffer;
  midiNotes?: MidiNote[];
  waveformData?: number[];
}

export interface MidiNote {
  note: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
}

export interface TrackEffects {
  gain: number;
  pan: number;
  reverbWet: number;
  delayWet: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  compThreshold: number;
  compRatio: number;
  vibe: number; // macro knob
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  phaseInverted?: boolean;
  clips: Clip[];
  effects: TrackEffects;
  // midiEffects: MidiEffectsConfig;
  instrument?: string;
}

export interface ArrangementMarker {
  id: string;
  beat: number;
  label: string;
  color: string;
}

export type ActivePanel = 'timeline' | 'piano' | 'drums' | 'arpeggiator' | 'tuner' | 'eq' | 'mixer' | 'library' | 'midiEffects';
export type ArpMode = 'up' | 'down' | 'random' | 'chord';
export type Scale = 'chromatic' | 'major' | 'minor' | 'pentatonic' | 'blues' | 'dorian' | 'mixolydian';

const MAX_UNDO_STEPS = 50;
const UNDO_DEBOUNCE_MS = 600;

/** Snapshot of mix state for undo/redo (tracks mix params, master, mastering) */
export interface MixSnapshot {
  tracks: Array<{
    id: string;
    volume: number;
    pan: number;
    muted: boolean;
    solo: boolean;
    phaseInverted: boolean;
    effects: TrackEffects;
  }>;
  bpm: number;
  masterVolume: number;
  masterTranspose: number;
  // mastering: MasteringSettings;
  masteringBypass: boolean;
}

interface DAWState {
  // Transport
  isPlaying: boolean;
  isRecording: boolean;
  isLooping: boolean;
  bpm: number;
  timeSignatureNum: number;
  timeSignatureDen: number;
  currentBeat: number;
  loopStart: number;
  loopEnd: number;
  metronomeOn: boolean;
  masterVolume: number;
  masterTranspose: number;
  // mastering: MasteringSettings;
  masteringBypass: boolean; // For A/B comparison
  vocalStemCleanup: boolean; // Highpass on Vocals track to reduce rumble

  // Undo/redo (mix only)
  undoHistory: MixSnapshot[];
  redoStack: MixSnapshot[];
  lastUndoPushTime: number;

  // Tracks
  tracks: Track[];
  selectedTrackId: string | null;
  selectedClipId: string | null;

  // UI
  activePanel: ActivePanel;
  zoomLevel: number;
  scrollLeft: number;
  markers: ArrangementMarker[];

  // Smart Instruments
  selectedScale: Scale;
  selectedRoot: number; // 0=C, 1=C#, etc.
  arpMode: ArpMode;
  arpRate: number; // subdivisions per beat
  arpOctaves: number;
  arpActive: boolean;
  heldChord: number[];

  // Drummer XY
  drummerX: number; // 0-1 simple->complex
  drummerY: number; // 0-1 soft->loud
  drummerStyle: string;

  // Recording
  recordingBuffer: Float32Array[];

  // Actions
  setPlaying: (v: boolean) => void;
  setRecording: (v: boolean) => void;
  setLooping: (v: boolean) => void;
  setBpm: (v: number) => void;
  setCurrentBeat: (v: number) => void;
  setMetronome: (v: boolean) => void;
  setMasterVolume: (v: number) => void;
  setMasterTranspose: (v: number) => void;
  // setMastering: (settings: Partial<MasteringSettings>) => void;
  setMasteringBypass: (bypass: boolean) => void;
  setVocalStemCleanup: (v: boolean) => void;

  addTrack: (type: TrackType) => void;
  removeTrack: (id: string) => void;
  selectTrack: (id: string | null) => void;
  selectClip: (id: string | null) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  updateTrackEffects: (id: string, updates: Partial<TrackEffects>) => void;
  // updateTrackMidiEffects: (id: string, updates: Partial<MidiEffectsConfig>) => void;

  addClip: (clip: Clip) => void;
  removeClip: (trackId: string, clipId: string) => void;

  setActivePanel: (panel: ActivePanel) => void;
  setZoom: (v: number) => void;
  setScrollLeft: (v: number) => void;

  setScale: (scale: Scale) => void;
  setRoot: (root: number) => void;
  setArpMode: (mode: ArpMode) => void;
  setArpRate: (v: number) => void;
  setArpOctaves: (v: number) => void;
  setArpActive: (v: boolean) => void;
  setHeldChord: (notes: number[]) => void;

  setDrummerX: (v: number) => void;
  setDrummerY: (v: number) => void;
  setDrummerStyle: (v: string) => void;

  addMarker: (marker: ArrangementMarker) => void;
  removeMarker: (id: string) => void;
  addAudioClip: (trackId: string, file: File) => Promise<void>;
  addAudioClipFromUrl: (trackId: string, url: string, name: string) => Promise<void>;
  recordMidiEvent: (trackId: string, note: MidiNote) => void;

  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  onBeat: (beat: number) => void;
}

const TRACK_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

const defaultEffects = (): TrackEffects => ({
  gain: 1,
  pan: 0,
  reverbWet: 0.1,
  delayWet: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  compThreshold: -24,
  compRatio: 4,
  vibe: 0,
});

let trackCounter = 0;

const makeTrack = (type: TrackType, idx: number): Track => ({
  id: `track-${Date.now()}-${trackCounter++}`,
  name: type === 'audio' ? `Audio ${idx}` : type === 'synth' ? `Synth ${idx}` : type === 'drums' ? `Drums ${idx}` : `Sampler ${idx}`,
  type,
  color: TRACK_COLORS[idx % TRACK_COLORS.length],
  volume: 0.8,
  pan: 0,
  muted: false,
  solo: false,
  armed: false,
  phaseInverted: false,
  clips: [],
  effects: defaultEffects(),
  // midiEffects: defaultMidiEffects(),
});

function applySnapshot(
  snapshot: MixSnapshot,
  set: (partial: Partial<DAWState>) => void,
  get: () => DAWState
): void {
  const state = get();
  const newTracks = state.tracks.map((t) => {
    const s = snapshot.tracks.find((x) => x.id === t.id);
    if (!s) return t;
    return {
      ...t,
      volume: s.volume,
      pan: s.pan,
      muted: s.muted,
      solo: s.solo,
      phaseInverted: s.phaseInverted,
      effects: s.effects,
    };
  });
  set({
    tracks: newTracks,
    bpm: snapshot.bpm,
    masterVolume: snapshot.masterVolume,
    masterTranspose: snapshot.masterTranspose,
    // mastering: snapshot.mastering,
    masteringBypass: snapshot.masteringBypass,
  });
  snapshot.tracks.forEach((s) => {
    audioEngine.updateTrackVolume(s.id, s.volume);
    audioEngine.updateTrackPan(s.id, s.pan);
    audioEngine.updateTrackPhaseInvert(s.id, s.phaseInverted);
    audioEngine.updateTrackEq(s.id, s.effects.eqLow, s.effects.eqMid, s.effects.eqHigh);
    audioEngine.updateTrackReverbWet(s.id, s.effects.reverbWet);
    audioEngine.updateTrackDelayWet(s.id, s.effects.delayWet);
    audioEngine.updateTrackCompressor(s.id, s.effects.compThreshold, s.effects.compRatio);
  });
}

const initialTracks = [
  makeTrack('drums', 0),
  makeTrack('synth', 1),
  makeTrack('audio', 2),
];
initialTracks.forEach(track => audioEngine.addTrack(track.id));

export const useDawStore = create<DAWState>((set, get) => {
  // Register playhead RAF callback — fires every animation frame during playback
  audioEngine.setOnBeatCallback((beat: number) => {
    useDawStore.getState().onBeat(beat);
  });

  return ({
  isPlaying: false,
  isRecording: false,
  isLooping: false,
  bpm: 120,
  timeSignatureNum: 4,
  timeSignatureDen: 4,
  currentBeat: 0,
  loopStart: 0,
  loopEnd: 16,
  metronomeOn: false,
  masterVolume: 0.8,
  masterTranspose: 0,
  // mastering: DEFAULT_MASTERING,
  masteringBypass: false,
  vocalStemCleanup: false,

  undoHistory: [],
  redoStack: [],
  lastUndoPushTime: 0,

  tracks: initialTracks,
  selectedTrackId: null,
  selectedClipId: null,

  activePanel: 'timeline',
  zoomLevel: 1,
  scrollLeft: 0,
  markers: [
    { id: 'm1', beat: 0, label: 'Intro', color: '#6366f1' },
    { id: 'm2', beat: 16, label: 'Verse', color: '#22c55e' },
    { id: 'm3', beat: 32, label: 'Chorus', color: '#f43f5e' },
  ],

  selectedScale: 'major',
  selectedRoot: 0,
  arpMode: 'up',
  arpRate: 4,
  arpOctaves: 2,
  arpActive: false,
  heldChord: [],

  drummerX: 0.3,
  drummerY: 0.6,
  drummerStyle: 'rock',

  recordingBuffer: [],

  setPlaying: (v) => {
    set({ isPlaying: v });
    if (v) {
      void audioEngine.play();
    } else {
      audioEngine.pause();
    }
  },
  onBeat: (beat: number) => set({ currentBeat: beat }),
  setRecording: (v) => set({ isRecording: v }),
  setLooping: (v) => {
    set({ isLooping: v });
    const state = get();
    audioEngine.setLooping(v, state.loopStart, state.loopEnd);
  },

  setBpm: (v) => {
    get().pushUndo();
    set({ bpm: v });
    audioEngine.setBpm(v);
    // midiEffectsManager.setBpm(v);
  },
  setCurrentBeat: (v) => {
    set({ currentBeat: v });
    audioEngine.seek(v);
  },
  setMetronome: (v) => {
    set({ metronomeOn: v });
    void audioEngine.setMetronome(v);
  },
  setMasterVolume: (v) => {
    get().pushUndo();
    set({ masterVolume: v });
  },
  setMasterTranspose: (v) => {
    get().pushUndo();
    set({ masterTranspose: v });
  },
  // setMastering: (settings) => {
  //   get().pushUndo();
  //   set((state) => ({ mastering: { ...state.mastering, ...settings } }));
  // },
  setMasteringBypass: (bypass) => {
    get().pushUndo();
    set({ masteringBypass: bypass });
  },
  setVocalStemCleanup: (v) => set({ vocalStemCleanup: v }),

  addTrack: (type) => {
    const tracks = get().tracks;
    const newTrack = makeTrack(type, tracks.length);
    set({ tracks: [...tracks, newTrack] });
    audioEngine.addTrack(newTrack.id);
  },
  removeTrack: (id) => {
    set({ tracks: get().tracks.filter(t => t.id !== id) });
    audioEngine.removeTrack(id);
  },
  selectTrack: (id) => set({ selectedTrackId: id }),
  selectClip: (id) => set({ selectedClipId: id }),
  updateClip: (id, updates) => {
    set({
      tracks: get().tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => c.id === id ? { ...c, ...updates } : c)
      }))
    });
  },
  updateTrack: (id, updates) => {
    get().pushUndo();
    set({
      tracks: get().tracks.map(t => t.id === id ? { ...t, ...updates } : t)
    });
    if (updates.volume !== undefined) {
      audioEngine.updateTrackVolume(id, updates.volume);
    }
    if (updates.pan !== undefined) {
      audioEngine.updateTrackPan(id, updates.pan);
    }
    if (updates.muted !== undefined) {
      audioEngine.updateTrackMute(id, updates.muted);
    }
    if (updates.solo !== undefined) {
      audioEngine.updateTrackSolo(id, updates.solo);
    }
    if (updates.phaseInverted !== undefined) {
      audioEngine.updateTrackPhaseInvert(id, updates.phaseInverted);
    }
  },
  updateTrackEffects: (id, updates) => {
    get().pushUndo();
    set({
      tracks: get().tracks.map(t => t.id === id ? { ...t, effects: { ...t.effects, ...updates } } : t)
    });
    // Forward to audio engine DSP chain
    const track = get().tracks.find(t => t.id === id);
    if (!track) return;
    const fx = track.effects;
    if (updates.eqLow !== undefined || updates.eqMid !== undefined || updates.eqHigh !== undefined) {
      audioEngine.updateTrackEq(id, fx.eqLow, fx.eqMid, fx.eqHigh);
    }
    if (updates.reverbWet !== undefined) {
      audioEngine.updateTrackReverbWet(id, fx.reverbWet);
    }
    if (updates.delayWet !== undefined) {
      audioEngine.updateTrackDelayWet(id, fx.delayWet);
    }
    if (updates.compThreshold !== undefined || updates.compRatio !== undefined) {
      audioEngine.updateTrackCompressor(id, fx.compThreshold, fx.compRatio);
    }
    if (updates.gain !== undefined) {
      audioEngine.updateTrackGain(id, fx.gain);
    }
  },
  // updateTrackMidiEffects: (id, updates) => set({
  //   tracks: get().tracks.map(t => t.id === id ? { ...t, midiEffects: { ...t.midiEffects, ...updates } } : t)
  // }),

  addClip: (clip) => set({
    tracks: get().tracks.map(t => t.id === clip.trackId ? { ...t, clips: [...t.clips, clip] } : t)
  }),
  removeClip: (trackId, clipId) => set({
    tracks: get().tracks.map(t => t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t)
  }),

  setActivePanel: (panel) => set({ activePanel: panel }),
  setZoom: (v) => set({ zoomLevel: v }),
  setScrollLeft: (v) => set({ scrollLeft: v }),

  setScale: (scale) => set({ selectedScale: scale }),
  setRoot: (root) => set({ selectedRoot: root }),
  setArpMode: (mode) => set({ arpMode: mode }),
  setArpRate: (v) => set({ arpRate: v }),
  setArpOctaves: (v) => set({ arpOctaves: v }),
  setArpActive: (v) => set({ arpActive: v }),
  setHeldChord: (notes) => set({ heldChord: notes }),

  setDrummerX: (v) => set({ drummerX: v }),
  setDrummerY: (v) => set({ drummerY: v }),
  setDrummerStyle: (v) => set({ drummerStyle: v }),

  addMarker: (marker) => set({ markers: [...get().markers, marker] }),
  removeMarker: (id) => set({ markers: get().markers.filter(m => m.id !== id) }),
  addAudioClip: async (trackId, file) => {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      trackId,
      startBeat: 0,
      durationBeats: audioBuffer.duration * (get().bpm / 60),
      color: '#f43f5e',
      name: file.name,
      audioBuffer,
    };

    set({
      tracks: get().tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t)
    });

    void audioEngine.scheduleClip(trackId, newClip.id, audioBuffer, 0);
  },
  addAudioClipFromUrl: async (trackId, url, name) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load audio: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      trackId,
      startBeat: 0,
      durationBeats: audioBuffer.duration * (get().bpm / 60),
      color: '#f43f5e',
      name,
      audioBuffer,
    };

    set({
      tracks: get().tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t)
    });

    void audioEngine.scheduleClip(trackId, newClip.id, audioBuffer, 0);
  },

  pushUndo: () => {
    const state = get();
    const now = Date.now();
    if (state.undoHistory.length > 0 && now - state.lastUndoPushTime < UNDO_DEBOUNCE_MS) return;
    const snapshot: MixSnapshot = {
      tracks: state.tracks.map(t => ({
        id: t.id,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
        phaseInverted: t.phaseInverted ?? false,
        effects: { ...t.effects },
      })),
      bpm: state.bpm,
      masterVolume: state.masterVolume,
      masterTranspose: state.masterTranspose,
      // mastering: { ...state.mastering },
      masteringBypass: state.masteringBypass,
    };
    set({
      undoHistory: [...state.undoHistory.slice(-(MAX_UNDO_STEPS - 1)), snapshot],
      redoStack: [],
      lastUndoPushTime: now,
    });
  },
  undo: () => {
    const state = get();
    if (state.undoHistory.length === 0) return;
    const prev = state.undoHistory[state.undoHistory.length - 1];
    const currentSnapshot: MixSnapshot = {
      tracks: state.tracks.map(t => ({
        id: t.id,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
        phaseInverted: t.phaseInverted ?? false,
        effects: { ...t.effects },
      })),
      bpm: state.bpm,
      masterVolume: state.masterVolume,
      masterTranspose: state.masterTranspose,
      // mastering: { ...state.mastering },
      masteringBypass: state.masteringBypass,
    };
    set({
      undoHistory: state.undoHistory.slice(0, -1),
      redoStack: [...state.redoStack, currentSnapshot],
      lastUndoPushTime: 0,
    });
    applySnapshot(prev, set, get);
  },
  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const next = state.redoStack[state.redoStack.length - 1];
    const currentSnapshot: MixSnapshot = {
      tracks: state.tracks.map(t => ({
        id: t.id,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
        phaseInverted: t.phaseInverted ?? false,
        effects: { ...t.effects },
      })),
      bpm: state.bpm,
      masterVolume: state.masterVolume,
      masterTranspose: state.masterTranspose,
      // mastering: { ...state.mastering },
      masteringBypass: state.masteringBypass,
    };
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoHistory: [...state.undoHistory, currentSnapshot],
      lastUndoPushTime: 0,
    });
    applySnapshot(next, set, get);
  },

  recordMidiEvent: (trackId, note) => {
    const state = get();
    const track = state.tracks.find(t => t.id === trackId);
    if (!track) return;
    
    // Find a clip that encompasses the startBeat, or simply the last clip
    let clip = track.clips[0]; 
    if (!clip) {
        clip = {
            id: `clip-${Date.now()}`,
            trackId,
            startBeat: 0,
            durationBeats: Math.max(16, note.startBeat + note.durationBeats + 4),
            color: track.color,
            name: "Recorded MIDI",
            midiNotes: []
        };
        track.clips.push(clip);
    }
    
    // Ensure clip is long enough
    if (note.startBeat + note.durationBeats > clip.startBeat + clip.durationBeats) {
        clip.durationBeats = Math.max(clip.durationBeats, (note.startBeat + note.durationBeats) - clip.startBeat + 4);
    }
    
    const newNotes = [...(clip.midiNotes || []), note];
    state.updateClip(clip.id, { midiNotes: newNotes });
  },
  });
});
