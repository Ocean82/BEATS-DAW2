
import React from 'react';
import { useDawStore } from '../store/dawStore';
import { Volume2, Headphones, Mic, GitBranch, FlipHorizontal2, Circle } from 'lucide-react';
import { cn } from '../utils/cn';

const trackIcons = {
  audio: Headphones,
  synth: GitBranch,
  drums: Mic,
  sampler: Volume2,
};

function MixerPanel() {
  const {
    tracks,
    selectedTrackId,
    updateTrack,
    masterVolume,
    setMasterVolume,
    masteringBypass,
    setMasteringBypass,
    vocalStemCleanup,
    setVocalStemCleanup,
  } = useDawStore();

  return (
    <div className="space-y-4">
      {/* ── Master section ─────────────────────────────────────────────── */}
      <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.26em] text-white/42">Master</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMasteringBypass(!masteringBypass)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition',
                masteringBypass
                  ? 'border-amber-300/40 text-amber-200/90 bg-amber-300/10'
                  : 'border-white/10 text-white/40 bg-white/5'
              )}
            >
              {masteringBypass ? 'Bypass ON' : 'Bypass'}
            </button>
            <button
              type="button"
              onClick={() => setVocalStemCleanup(!vocalStemCleanup)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition',
                vocalStemCleanup
                  ? 'border-cyan-300/40 text-cyan-200/90 bg-cyan-300/10'
                  : 'border-white/10 text-white/40 bg-white/5'
              )}
            >
              Vocal HP
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="master-vol" className="text-xs uppercase tracking-[0.22em] text-white/42 whitespace-nowrap">
            Level
          </label>
          <input
            id="master-vol"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            aria-label="Master volume"
            className="burn-slider flex-1"
          />
          <span className="w-10 text-right text-xs tabular-nums text-white/60">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>

      {/* ── Per-track strips ───────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map((track, index) => {
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
              {/* Track header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[var(--accent)]" />
                  <div className="font-display text-lg tracking-[-0.03em] text-white">{track.name}</div>
                </div>
                <div className="flex gap-1.5">
                  {/* Mute */}
                  <button
                    type="button"
                    onClick={() => updateTrack(track.id, { muted: !track.muted })}
                    className={cn(
                      'icon-button text-xs py-1 px-2.5 transition',
                      track.muted && 'border-amber-300/30 text-amber-200 bg-amber-300/10'
                    )}
                    aria-label={track.muted ? 'Unmute' : 'Mute'}
                  >
                    M
                  </button>
                  {/* Solo */}
                  <button
                    type="button"
                    onClick={() => updateTrack(track.id, { solo: !track.solo })}
                    className={cn(
                      'icon-button text-xs py-1 px-2.5 transition',
                      track.solo && 'border-cyan-300/30 text-cyan-200 bg-cyan-300/10'
                    )}
                    aria-label={track.solo ? 'Un-solo' : 'Solo'}
                  >
                    S
                  </button>
                  {/* Arm */}
                  <button
                    type="button"
                    onClick={() => updateTrack(track.id, { armed: !track.armed })}
                    className={cn(
                      'icon-button text-xs py-1 px-2 transition',
                      track.armed && 'border-red-400/40 text-red-300 bg-red-400/10'
                    )}
                    aria-label={track.armed ? 'Disarm' : 'Arm for recording'}
                    title="Arm for recording"
                  >
                    <Circle className="w-3 h-3" fill={track.armed ? 'currentColor' : 'none'} />
                  </button>
                  {/* Phase invert */}
                  <button
                    type="button"
                    onClick={() => {
                      updateTrack(track.id, { phaseInverted: !track.phaseInverted });
                    }}
                    className={cn(
                      'icon-button text-xs py-1 px-2 transition',
                      track.phaseInverted && 'border-purple-400/40 text-purple-300 bg-purple-400/10'
                    )}
                    aria-label={track.phaseInverted ? 'Disable phase invert' : 'Phase invert'}
                    title="Phase invert (flip polarity)"
                  >
                    <FlipHorizontal2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Faders */}
              <div className="space-y-3">
                {/* Volume */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                    <label htmlFor={`vol-${tid}`}>Level</label>
                    <span>{Math.round(track.volume * 100)}%</span>
                  </div>
                  <input
                    id={`vol-${tid}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={track.volume}
                    aria-label="Track volume"
                    onChange={(e) =>
                      updateTrack(track.id, { volume: parseFloat(e.target.value) })
                    }
                    className="burn-slider"
                  />
                </div>
                {/* Pan */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                    <label htmlFor={`pan-${tid}`}>Pan</label>
                    <span>
                      {track.pan <= -0.05 ? 'L' : track.pan >= 0.05 ? 'R' : 'C'}{' '}
                      {Math.abs(Math.round(track.pan * 100))}
                    </span>
                  </div>
                  <input
                    id={`pan-${tid}`}
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={track.pan}
                    aria-label="Track pan"
                    onChange={(e) =>
                      updateTrack(track.id, { pan: parseFloat(e.target.value) })
                    }
                    className="burn-slider"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MixerPanel;
