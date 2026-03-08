import React from 'react';
import { cn } from '../utils/cn';
import type { StemItem } from './SplitConsole';

const STEM_GLOW: Record<string, string> = {
  vocals: '#ff845c',
  drums: '#ffb347',
  bass: '#ff5a3d',
  other: '#ffd36a',
  instrumental: '#a78bfa',
};

function getGlow(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '_');
  return STEM_GLOW[key] ?? STEM_GLOW.other ?? '#ffd36a';
}

interface TrackFolderProps {
  uploadName: string;
  stems: StemItem[];
  selectedStemIds: Record<string, boolean>;
  onLoadToTracks: () => void;
}

function TrackFolder({ uploadName, stems, selectedStemIds, onLoadToTracks }: TrackFolderProps) {
  const filtered = stems.filter((s) => {
    const key = s.name.toLowerCase().replace(/\s+/g, '_');
    return selectedStemIds[key] !== false;
  });

  return (
    <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Track Folder</p>
          <h2 className="font-display text-2xl tracking-[-0.04em] text-white">
            Split results land where mixing starts
          </h2>
        </div>
        <button type="button" onClick={onLoadToTracks} className="ghost-button" disabled={filtered.length === 0}>
          Load to Tracks
        </button>
      </div>

      <div className="rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/80" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M3.5 7.5c0-1.1.9-2 2-2h4l1.8 1.8H18.5c1.1 0 2 .9 2 2v7.2c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2V7.5Z" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-white">{uploadName.replace(/\.[^/.]+$/, '') || 'Session'}</div>
            <div className="text-xs uppercase tracking-[0.24em] text-white/42">Original mix folder track</div>
          </div>
        </div>
        <div className="mt-4 space-y-3 pl-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
              No stems yet. Run a split above.
            </div>
          ) : (
            filtered.map((stem) => (
              <div
                key={stem.url}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: getGlow(stem.name),
                      boxShadow: `0 0 12px ${getGlow(stem.name)}44`,
                    }}
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{stem.name}</div>
                    <div className="text-xs text-white/46">AudioBuffer ready · Load to track</div>
                  </div>
                </div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/40">Clip ready</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TrackFolder;
