
// Mock UI Adaptation Layer (UAL)
// This simulates the behavior of the real UAL.

import { useDawStore, Track } from '../store/dawStore';

// --- Intent Contract ---

export type UIIntent =
  | { type: 'split_stems'; file: File }
  | { type: 'remix_audio'; trackId: string; volume: number; pan: number }
  | { type: 'toggle_mute'; trackId: string }
  | { type: 'toggle_solo'; trackId: string };

// --- State Contract ---

export interface UIState {
  summary: string;
  tradeoffs: string[];
  mastering_status: string;
  confidence: number;
  tracks: Track[];
}

// --- Mock UAL Implementation ---

class MockUAL {
  private subscribers: ((state: UIState) => void)[] = [];

  constructor() {
    // Subscribe to the dawStore and notify subscribers when it changes.
    useDawStore.subscribe((state) => {
      const uiState = this.mapDawStateToUIState(state);
      this.notify(uiState);
    });
  }

  public subscribe(callback: (state: UIState) => void) {
    this.subscribers.push(callback);
    // Immediately notify the new subscriber with the current state.
    const uiState = this.mapDawStateToUIState(useDawStore.getState());
    callback(uiState);
  }

  public sendIntent(intent: UIIntent) {
    // In a real UAL, this would send the intent to the agent system.
    // Here, we just update the dawStore directly.
    const { updateTrack } = useDawStore.getState();

    switch (intent.type) {
      case 'remix_audio':
        updateTrack(intent.trackId, { volume: intent.volume, pan: intent.pan });
        break;
      case 'toggle_mute': {
        const track = useDawStore.getState().tracks.find((t) => t.id === intent.trackId);
        if (track) {
          updateTrack(intent.trackId, { muted: !track.muted });
        }
        break;
      }
      case 'toggle_solo': {
        const track = useDawStore.getState().tracks.find((t) => t.id === intent.trackId);
        if (track) {
          updateTrack(intent.trackId, { solo: !track.solo });
        }
        break;
      }
      case 'split_stems':
        // Simulate a delay for the stem splitting process.
        setTimeout(() => {
          console.log('Stems split!');
        }, 2000);
        break;
    }
  }

  private mapDawStateToUIState(dawState: { tracks: Track[] }): UIState {
    // In a real UAL, this would be a more sophisticated mapping.
    return {
      summary: 'Ready',
      tradeoffs: [],
      mastering_status: 'Not mastering-safe',
      confidence: 0.95,
      tracks: dawState.tracks,
    };
  }

  private notify(state: UIState) {
    this.subscribers.forEach((callback) => callback(state));
  }
}

export const mockUAL = new MockUAL();
