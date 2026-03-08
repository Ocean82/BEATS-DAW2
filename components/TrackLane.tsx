import { Track, useDawStore } from '../store/dawStore';
import Clip from './Clip';
import { cn } from '../utils/cn';

interface TrackLaneProps {
  track: Track;
}

function TrackLane({ track }: TrackLaneProps) {
  const beatsPerPixel = 0.1;
  const { selectedTrackId, selectTrack } = useDawStore();
  const isSelected = selectedTrackId === track.id;
  const laneSelector = `track-lane-${track.id.replace(/[^a-z0-9-_]/gi, '-')}`;
  const laneBg = `${track.color}20`;

  return (
    <div className="flex items-center h-24 border-b border-white/10">
      <style>{`.${laneSelector}{background-color:${laneBg}}`}</style>
      <button
        type="button"
        onClick={() => selectTrack(track.id)}
        className={cn(
          'w-48 p-4 h-full flex flex-col justify-center text-left transition-colors rounded-l-xl border border-white/10',
          isSelected
            ? 'bg-[var(--accent)]/20 ring-2 ring-[var(--accent)]'
            : 'bg-black/25 hover:bg-white/5'
        )}
      >
        <p className="font-display font-semibold text-white">{track.name}</p>
        <p className="text-xs uppercase tracking-wider text-white/50">{track.type}</p>
      </button>
      <div
        role="button"
        tabIndex={0}
        onClick={() => selectTrack(track.id)}
        onKeyDown={(e) => e.key === 'Enter' && selectTrack(track.id)}
        className={cn(
          laneSelector,
          'flex-grow h-full relative cursor-pointer',
          isSelected && 'ring-1 ring-inset ring-[var(--accent)]/50'
        )}
      >
        {track.clips.map((clip) => (
          <Clip key={clip.id} clip={clip} beatsPerPixel={beatsPerPixel} />
        ))}
      </div>
    </div>
  );
}

export default TrackLane;
