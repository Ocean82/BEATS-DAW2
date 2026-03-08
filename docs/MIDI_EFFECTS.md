# MIDI Effects System

## Overview

The MIDI Effects system provides real-time MIDI processing capabilities for transforming and enhancing MIDI input and playback. All effects are CPU-only, browser-based, and work in real-time with minimal latency.

## Architecture

```
User Input / MIDI Clip
        ↓
   Transposer (pitch shift)
        ↓
   Quantizer (snap to scale)
        ↓
   Chord Generator (expand to chords)
        ↓
   Note Repeater (create repeats)
        ↓
   Arpeggiator (sequence notes)
        ↓
   Audio Engine (playback)
```

## Effects

### 1. Transposer
Shifts MIDI notes up or down by semitones or octaves.

**Parameters:**
- **Semitones**: -24 to +24 semitones
- **Octaves**: -2 to +2 octaves

**Use Cases:**
- Quick key changes
- Octave doubling
- Pitch correction

### 2. Scale Quantizer
Snaps incoming MIDI notes to a predefined scale, ensuring all notes stay in key.

**Parameters:**
- **Enabled**: ON/OFF toggle
- **Root**: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
- **Scale**: Chromatic, Major, Minor, Pentatonic, Blues, Dorian, Mixolydian
- **Strength**: 0-100% (blend between original and quantized)

**Use Cases:**
- Ensuring melodies stay in key
- Correcting off-key performances
- Creative scale-based transformations

### 3. Chord Generator
Transforms single notes into full chords with various voicings and inversions.

**Parameters:**
- **Enabled**: ON/OFF toggle
- **Chord Type**: major, minor, maj7, min7, dom7, sus2, sus4, dim, aug, add9
- **Voicing**: close, open, drop2, drop3
- **Inversion**: 0, 1, 2, 3
- **Strum Speed**: 0-150ms delay between notes

**Voicing Types:**
- **Close**: Notes stacked closely together
- **Open**: Notes spread across octaves
- **Drop2**: Second highest note dropped an octave
- **Drop3**: Third highest note dropped an octave

**Use Cases:**
- One-finger chord playing
- Automatic harmonization
- Creating lush pad sounds
- Guitar-style strumming

### 4. Note Repeater
Rapidly triggers notes at a defined rate, creating rhythmic patterns and stuttering effects.

**Parameters:**
- **Enabled**: ON/OFF toggle
- **Rate**: 1/1, 1/2, 1/4, 1/8, 1/16, 1/32 (subdivisions per beat)
- **Repeats**: 2-16 repetitions
- **Velocity Decay**: 0-90% (how much velocity decreases per repeat)
- **Pitch Offset**: -12 to +12 semitones (pitch shift per repeat)

**Use Cases:**
- Stuttering effects
- Rhythmic patterns
- Glitch effects
- Melodic sequences

### 5. Arpeggiator
Automatically plays notes from a chord in a defined pattern.

**Parameters:**
- **Enabled**: ON/OFF toggle
- **Pattern**: up, down, updown, downup, random, chord, played
- **Rate**: 1/1, 1/2, 1/4, 1/8, 1/16, 1/32 (subdivisions per beat)
- **Octaves**: 1-4 octaves to span
- **Gate Length**: 10-100% (note duration relative to step)

**Pattern Types:**
- **Up**: Ascending order
- **Down**: Descending order
- **UpDown**: Up then down (excluding endpoints on return)
- **DownUp**: Down then up (excluding endpoints on return)
- **Random**: Random order
- **Chord**: All notes at once
- **Played**: Order as played

**Use Cases:**
- Classic synth arpeggios
- Rhythmic chord patterns
- Melodic sequences
- Trance-style leads

## Usage

### Accessing MIDI Effects

1. Select a MIDI track (synth, drums, or sampler)
2. Click **MIDI FX** in the side panel
3. Enable and configure desired effects

### Per-Track Configuration

Each track has its own independent MIDI effects chain. This allows:
- Different effects on different tracks
- Complex layering possibilities
- Flexible routing options

### Real-Time vs. Clip Playback

**Real-Time Input** (Piano Keyboard):
- Effects process notes as you play
- Immediate feedback
- Great for performance and experimentation

**Clip Playback** (Timeline):
- Effects process recorded MIDI clips
- Non-destructive (original MIDI preserved)
- Can be changed anytime

### Effect Order

Effects are always processed in this order:
1. Transposer
2. Quantizer
3. Chord Generator
4. Note Repeater
5. Arpeggiator

This order ensures optimal results and prevents conflicts.

## Tips & Tricks

### Creating Complex Arpeggios
1. Enable **Chord Generator** with maj7 or min7
2. Enable **Arpeggiator** with "up" pattern
3. Set arpeggiator to 1/16 rate
4. Play single notes for instant complex arpeggios

### Rhythmic Stutter Effects
1. Enable **Note Repeater**
2. Set rate to 1/16 or 1/32
3. Set repeats to 4-8
4. Add velocity decay of 30-50%
5. Experiment with pitch offset for melodic stutters

### Scale-Locked Improvisation
1. Enable **Quantizer**
2. Set your desired scale and root
3. Set strength to 100%
4. Play freely - all notes will snap to scale

### One-Finger Chord Playing
1. Enable **Chord Generator**
2. Choose chord type (try maj7 or min7)
3. Set voicing to "open" for wider sound
4. Add strum speed for guitar-like feel

### Glitch Effects
1. Enable **Note Repeater** with high repeat count
2. Enable **Transposer** with random semitone shifts
3. Add **Quantizer** to keep it musical
4. Adjust velocity decay for dynamic variation

## Technical Details

### Performance
- All processing happens in the browser
- CPU-only (no GPU required)
- Minimal latency (<10ms typical)
- Efficient algorithms for real-time use

### Data Flow
```typescript
// Real-time input
MidiEffectsChain.processSingleNote(note, velocity)
  → Array<{ note, velocity, delay }>
  → AudioEngine.playNote()

// Clip playback
MidiEffectsChain.process(events: MidiEvent[])
  → MidiEvent[]
  → AudioEngine.scheduleNotes()
```

### State Management
MIDI effects configuration is stored per-track in the Zustand store:
```typescript
interface Track {
  // ... other properties
  midiEffects: MidiEffectsConfig;
}
```

## Future Enhancements

Potential additions:
- MIDI delay effect
- Velocity curves and humanization
- Swing/groove quantization
- MIDI LFO modulation
- Chord progression generator
- Scale detection from MIDI input
- MIDI effect presets
- MIDI effect automation

## API Reference

### MidiEffectsChain

```typescript
class MidiEffectsChain {
  constructor(config: MidiEffectsConfig, bpm: number);
  
  // Update configuration
  updateConfig(config: Partial<MidiEffectsConfig>): void;
  setBpm(bpm: number): void;
  
  // Process MIDI
  process(events: MidiEvent[]): MidiEvent[];
  processSingleNote(note: number, velocity: number): 
    Array<{ note: number; velocity: number; delay: number }>;
  
  // Arpeggiator control
  addArpNote(note: number): void;
  removeArpNote(note: number): void;
  clearArpNotes(): void;
  getArpNextNote(): number | null;
}
```

### MidiEvent

```typescript
interface MidiEvent {
  note: number;        // MIDI note number (0-127)
  velocity: number;    // Velocity (0-1)
  startTime: number;   // Start time in seconds
  duration: number;    // Duration in seconds
}
```

## Troubleshooting

**Effects not working:**
- Ensure track is selected
- Check that effect is enabled (toggle ON)
- Verify track type is not 'audio' (MIDI effects only work on MIDI tracks)

**Arpeggiator not playing:**
- Hold down multiple keys to create a chord
- Check arpeggiator is enabled
- Verify rate and octave settings

**Quantizer changing notes unexpectedly:**
- Check scale and root settings
- Adjust strength parameter for partial quantization
- Disable if you want chromatic freedom

**Performance issues:**
- Reduce number of active effects
- Lower note repeater repeat count
- Reduce arpeggiator octave range
