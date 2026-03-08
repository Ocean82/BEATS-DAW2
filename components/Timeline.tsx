
import { useRef } from 'react';
import { useDawStore } from '../store/dawStore';
import TrackLane from './TrackLane';
import { cn } from '../utils/cn';

const BEATS_PER_PIXEL = 0.1;       // matches TrackLane
const RULER_HEIGHT = 32;            // px
const BAR_BEATS = 4;               // 4/4 time

/** Ruler component — draws bar numbers and beat ticks */
function BeatRuler({ totalBeats, currentBeat }: { totalBeats: number; currentBeat: number }) {
  const bars = Math.ceil(totalBeats / BAR_BEATS) + 4;
  const totalPx = totalBeats / BEATS_PER_PIXEL;

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-t-lg bg-white/5 border-b border-white/10 select-none"
      style={{ height: RULER_HEIGHT, minWidth: totalPx }}
    >
      {/* Bar markers */}
      {Array.from({ length: bars }, (_, bar) => {
        const beat = bar * BAR_BEATS;
        const x = beat / BEATS_PER_PIXEL;
        return (
          <div
            key={bar}
            className="absolute top-0 flex flex-col items-start"
            style={{ left: x }}
          >
            <div className="h-full w-px bg-white/20" />
            <span
              className="absolute top-1 left-1 text-[9px] text-white/40 font-mono tabular-nums"
            >
              {bar + 1}
            </span>
          </div>
        );
      })}

      {/* Quarter-beat minor ticks */}
      {Array.from({ length: bars * BAR_BEATS }, (_, b) => {
        const x = b / BEATS_PER_PIXEL;
        if (b % BAR_BEATS === 0) return null; // bar lines already drawn
        return (
          <div
            key={`tick-${b}`}
            className="absolute bottom-0 w-px bg-white/10"
            style={{ left: x, height: 10 }}
          />
        );
      })}

      {/* Playhead on ruler */}
      <div
        className="absolute inset-y-0 w-0.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] pointer-events-none z-10 transition-none"
        style={{ left: currentBeat / BEATS_PER_PIXEL }}
      />
    </div>
  );
}

function Timeline() {
  const { tracks, currentBeat, markers } = useDawStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Total visible beats — enough to show all clips plus some breathing room
  const maxBeat = tracks.reduce(
    (acc, t) =>
      t.clips.reduce(
        (a, c) => Math.max(a, c.startBeat + c.durationBeats),
        acc
      ),
    64
  );
  const totalBeats = Math.max(64, maxBeat + 16);
  const totalPx = totalBeats / BEATS_PER_PIXEL;

  return (
    <div className="mt-4">
      <div className="rounded-[1.6rem] border border-white/10 bg-black/25 overflow-hidden">
        <div
          ref={containerRef}
          className="relative overflow-x-auto"
          style={{ minWidth: '100%' }}
        >
          {/* ── Ruler ─────────────────────────────────────────────────────── */}
          <BeatRuler totalBeats={totalBeats} currentBeat={currentBeat} />

          {/* ── Arrangement markers ───────────────────────────────────────── */}
          {markers.length > 0 && (
            <div className="relative" style={{ height: 22, minWidth: totalPx }}>
              {markers.map((marker) => (
                <div
                  key={marker.id}
                  className="absolute top-0 flex items-center gap-1 pointer-events-none"
                  style={{ left: marker.beat / BEATS_PER_PIXEL }}
                >
                  <div
                    className="h-5 w-0.5 rounded-full"
                    style={{ backgroundColor: marker.color }}
                  />
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: marker.color }}
                  >
                    {marker.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Track lanes ───────────────────────────────────────────────── */}
          <div className={cn('relative', markers.length === 0 && 'mt-0')} style={{ minWidth: totalPx }}>
            {tracks.map((track) => (
              <TrackLane key={track.id} track={track} totalBeats={totalBeats} />
            ))}

            {/* Playhead overlay spanning all lanes */}
            <div
              className="absolute inset-y-0 w-0.5 bg-[var(--accent)] shadow-[0_0_12px_var(--accent)] opacity-80 pointer-events-none z-20 transition-none"
              style={{ left: currentBeat / BEATS_PER_PIXEL }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
