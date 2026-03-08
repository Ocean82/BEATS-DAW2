import React, { useEffect } from "react";
import { useDawStore } from "../store/dawStore";
import { Button } from "./Button";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  CircleDot,
  Repeat,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "../utils/cn";

function TransportBar() {
  const {
    isPlaying,
    setPlaying,
    isLooping,
    setLooping,
    bpm,
    setBpm,
    metronomeOn,
    setMetronome,
    setCurrentBeat,
    loopEnd,
    isRecording,
    setRecording,
    undoHistory,
    redoStack,
    undo,
    redo,
    currentBeat,
  } = useDawStore();

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        redo();
      } else if (e.code === "Space") {
        e.preventDefault();
        setPlaying(!isPlaying);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPlaying, setPlaying, undo, redo]);

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!Number.isNaN(value) && value >= 40 && value <= 300) setBpm(value);
  };

  const handleStop = () => {
    setPlaying(false);
    setCurrentBeat(0);
  };

  // Format beat as bar:beat display
  const bar = Math.floor(currentBeat / 4) + 1;
  const beat = Math.floor(currentBeat % 4) + 1;
  const position = `${bar}:${beat}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[1.6rem] border border-white/10 bg-black/25 mt-4">
      {/* Left: playback controls */}
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={() => setCurrentBeat(0)} aria-label="Rewind to start">
          <SkipBack className="w-5 h-5" />
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleStop} aria-label="Stop and return to start">
          <Square className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCurrentBeat(loopEnd)} aria-label="Fast-forward to loop end">
          <SkipForward className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRecording(!isRecording)}
          aria-label={isRecording ? "Stop recording" : "Record"}
          title={isRecording ? "Stop recording" : "Record"}
          className={cn(isRecording && "border-red-400/50 text-red-400")}
        >
          <CircleDot className="w-5 h-5" />
        </Button>
      </div>

      {/* Centre: position display */}
      <div className="font-mono text-sm text-white/70 tabular-nums tracking-widest px-4 py-2 rounded-xl border border-white/8 bg-black/30 select-none">
        {position}
      </div>

      {/* Right: loop, metronome, undo/redo, BPM */}
      <div className="flex items-center gap-2">
        <Button
          variant={isLooping ? "accent" : "ghost"}
          size="sm"
          onClick={() => setLooping(!isLooping)}
          aria-label={isLooping ? "Loop on" : "Loop off"}
          title="Toggle loop"
        >
          <Repeat className="w-5 h-5" />
        </Button>

        <Button
          variant={metronomeOn ? "accent" : "ghost"}
          size="sm"
          onClick={() => setMetronome(!metronomeOn)}
          aria-label={metronomeOn ? "Metronome on" : "Metronome off"}
        >
          <span className="text-sm font-bold leading-none">♩</span>
        </Button>

        <div className="h-5 w-px bg-white/15" aria-hidden />

        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={undoHistory.length === 0}
          aria-label="Undo (Ctrl+Z)"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={redoStack.length === 0}
          aria-label="Redo (Ctrl+Y)"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-5 h-5" />
        </Button>

        <div className="h-5 w-px bg-white/15" aria-hidden />

        <div className="flex items-center gap-2">
          <label htmlFor="transport-bpm" className="text-sm text-white/50">
            BPM
          </label>
          <input
            id="transport-bpm"
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={handleBpmChange}
            aria-label="Tempo in beats per minute"
            className="w-20 px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-white text-center"
          />
        </div>
      </div>
    </div>
  );
}

export default TransportBar;
