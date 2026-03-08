
import React from 'react';
import { useDawStore } from '../store/dawStore';
import TrackLane from './TrackLane';

function Timeline() {
  const { tracks } = useDawStore();

  return (
    <div className="mt-4">
      <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
        <div className="relative">
          <div className="h-8 rounded-t-lg bg-white/5" aria-hidden />

          {/* Track Lanes */}
          <div>
            {tracks.map(track => (
              <TrackLane key={track.id} track={track} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
