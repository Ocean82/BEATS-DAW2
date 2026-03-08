import React from 'react';
import { mockUAL, UIState } from '../ual/mockUAL';
import { useDawStore } from '../store/dawStore';

function EffectsPanel() {
  const [uiState, setUiState] = React.useState<UIState | null>(null);
  const { tracks, selectedTrackId, updateTrackEffects } = useDawStore();

  React.useEffect(() => {
    mockUAL.subscribe(setUiState);
  }, []);

  if (!uiState) {
    return null;
  }

  const activeTrackId = selectedTrackId ?? tracks[0]?.id;
  const track = tracks.find((t) => t.id === activeTrackId);
  if (!track) {
    return null;
  }

  const { effects } = track;
  const tid = track.id.replace(/\W/g, '-');

  return (
    <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
      <h3 className="font-display text-lg tracking-[-0.03em] text-white mb-4">Effects — {track.name}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
            <label id={`eq-low-${tid}`}>EQ Low</label>
            <span>{effects.eqLow} dB</span>
          </div>
          <input
            id={`eq-low-${tid}`}
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={effects.eqLow}
            className="burn-slider"
            aria-labelledby={`eq-low-${tid}`}
            onChange={(e) =>
              updateTrackEffects(track.id, { eqLow: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
            <label id={`eq-mid-${tid}`}>EQ Mid</label>
            <span>{effects.eqMid} dB</span>
          </div>
          <input
            id={`eq-mid-${tid}`}
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={effects.eqMid}
            className="burn-slider"
            aria-labelledby={`eq-mid-${tid}`}
            onChange={(e) =>
              updateTrackEffects(track.id, { eqMid: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
            <label id={`eq-high-${tid}`}>EQ High</label>
            <span>{effects.eqHigh} dB</span>
          </div>
          <input
            id={`eq-high-${tid}`}
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={effects.eqHigh}
            className="burn-slider"
            aria-labelledby={`eq-high-${tid}`}
            onChange={(e) =>
              updateTrackEffects(track.id, { eqHigh: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
            <label id={`reverb-${tid}`}>Reverb</label>
            <span>{Math.round(effects.reverbWet * 100)}%</span>
          </div>
          <input
            id={`reverb-${tid}`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={effects.reverbWet}
            className="burn-slider"
            aria-labelledby={`reverb-${tid}`}
            onChange={(e) =>
              updateTrackEffects(track.id, { reverbWet: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
            <label id={`delay-${tid}`}>Delay</label>
            <span>{Math.round(effects.delayWet * 100)}%</span>
          </div>
          <input
            id={`delay-${tid}`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={effects.delayWet}
            className="burn-slider"
            aria-labelledby={`delay-${tid}`}
            onChange={(e) =>
              updateTrackEffects(track.id, { delayWet: parseFloat(e.target.value) })
            }
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
            <label id={`comp-thresh-${tid}`}>Comp Thresh</label>
            <span>{effects.compThreshold} dB</span>
          </div>
          <input
            id={`comp-thresh-${tid}`}
            type="range"
            min="-40"
            max="0"
            step="1"
            value={effects.compThreshold}
            className="burn-slider"
            aria-labelledby={`comp-thresh-${tid}`}
            onChange={(e) =>
              updateTrackEffects(track.id, {
                compThreshold: parseFloat(e.target.value),
              })
            }
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
            <label id={`comp-ratio-${tid}`}>Comp Ratio</label>
            <span>{effects.compRatio}:1</span>
          </div>
          <input
            id={`comp-ratio-${tid}`}
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={effects.compRatio}
            className="burn-slider"
            aria-labelledby={`comp-ratio-${tid}`}
            onChange={(e) =>
              updateTrackEffects(track.id, {
                compRatio: parseFloat(e.target.value),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export default EffectsPanel;
