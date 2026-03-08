import React from "react";
import { useDawStore } from "../store/dawStore";
import { Button } from "./Button";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  CircleDot,
  Metronome,
} from "lucide-react";

function TransportBar() {
  const { isPlaying, setPlaying, bpm, setBpm, metronomeOn, setMetronome } =
    useDawStore();

  return (
    <div className="flex items-center justify-between p-4 rounded-[1.6rem] border border-white/10 bg-black/25 mt-4">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <Rewind className="w-6 h-6" />
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>
        <Button variant="ghost" size="sm">
          <FastForward className="w-6 h-6" />
        </Button>
        <Button variant="secondary" size="sm">
          <CircleDot className="w-6 h-6" />
        </Button>
      </div>
      <div className="flex items-center space-x-4">
        <Button
          variant={metronomeOn ? "accent" : "ghost"}
          size="sm"
          onClick={() => setMetronome(!metronomeOn)}
        >
          <Metronome className="w-6 h-6" />
        </Button>
        <div className="flex items-center space-x-2">
          <label htmlFor="transport-bpm" className="text-sm text-text-muted">
            BPM
          </label>
          <input
            id="transport-bpm"
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
            aria-label="Tempo in beats per minute"
            className="w-20 px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-white text-center"
          />
        </div>
      </div>
    </div>
  );
}

export default TransportBar;
