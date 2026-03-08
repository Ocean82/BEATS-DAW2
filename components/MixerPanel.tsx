
import React from 'react';
import { mockUAL, UIState } from '../ual/mockUAL';
import { useDawStore } from '../store/dawStore';
import { Volume2, Headphones, Mic, GitBranch } from 'lucide-react';
import { cn } from '../utils/cn';

const trackIcons = {
  audio: Headphones,
  synth: GitBranch,
  drums: Mic,
  sampler: Volume2,
};

function MixerPanel() {
  const [uiState, setUiState] = React.useState<UIState | null>(null);
  const selectedTrackId = useDawStore((s) => s.selectedTrackId);

  React.useEffect(() => {
    mockUAL.subscribe(setUiState);
  }, []);

  if (!uiState) {
    return <div>Loading...</div>;
  }

  return (
      <div className="grid gap-4 md:grid-cols-2">
        {uiState.tracks.map((track, index) => {
          const Icon = trackIcons[track.type as keyof typeof trackIcons] || Volume2;
          const isSelected = selectedTrackId === track.id;
          const tid = `mix-${index}-${track.id.replace(/\W/g, '-')}`;
        return (
          <div
            key={track.id}
            className={cn(
              'rounded-[1.6rem] border border-white/10 bg-black/25 p-4 transition',
              isSelected && 'ring-1 ring-inset ring-[var(--accent)]/50'
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-[var(--accent)]" />
                <div className="font-display text-lg tracking-[-0.03em] text-white">{track.name}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mockUAL.sendIntent({ type: 'toggle_mute', trackId: track.id })}
                  className={cn('icon-button text-sm py-1.5 px-3', track.muted && 'border-amber-300/30 text-amber-100')}
                >
                  Mute
                </button>
                <button
                  type="button"
                  onClick={() => mockUAL.sendIntent({ type: 'toggle_solo', trackId: track.id })}
                  className={cn('icon-button text-sm py-1.5 px-3', track.solo && 'border-amber-300/30 text-amber-100')}
                >
                  Solo
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                  <span>Level</span>
                  <span>{Math.round(track.volume * 100)}%</span>
                </div>
                <input
                  id={`vol-${tid}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  aria-label="Volume"
                  onChange={(e) =>
                    mockUAL.sendIntent({ type: 'remix_audio', trackId: track.id, volume: parseFloat(e.target.value), pan: track.pan })}
                  className="burn-slider"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                  <span>Pan</span>
                  <span>{track.pan <= -0.05 ? 'L' : track.pan >= 0.05 ? 'R' : 'C'} {Math.abs(Math.round(track.pan * 100))}</span>
                </div>
                <input
                  id={`pan-${tid}`}
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={track.pan}
                  aria-label="Pan"
                  onChange={(e) =>
                    mockUAL.sendIntent({ type: 'remix_audio', trackId: track.id, volume: track.volume, pan: parseFloat(e.target.value) })}
                  className="burn-slider"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MixerPanel;
