import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';

const ALLOWED_AUDIO = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac'];

const PRESET_OPTIONS = [
  { value: '4', label: 'Full 4-Stem Split' },
  { value: '2', label: '2-Stem (Vocals + Instrumental)' },
];

const STEM_PRESETS: { id: string; label: string; selectedStemIds: Record<string, boolean> }[] = [
  { id: 'all', label: 'All stems', selectedStemIds: { vocals: true, drums: true, bass: true, other: true } },
  { id: 'acappella', label: 'A Cappella', selectedStemIds: { vocals: true, drums: false, bass: false, other: false } },
  { id: 'instrumental', label: 'Instrumental', selectedStemIds: { vocals: false, drums: true, bass: true, other: true } },
];

const STEM_OPTIONS_4 = [
  { id: 'vocals', label: 'Vocals' },
  { id: 'drums', label: 'Drums' },
  { id: 'bass', label: 'Bass' },
  { id: 'other', label: 'Other' },
];

export interface StemItem {
  name: string;
  url: string;
  size: number;
}

interface SplitConsoleProps {
  stemsCount: '2' | '4';
  onStemsCountChange: (v: '2' | '4') => void;
  splitFile: File | null;
  onSplitFileChange: (f: File | null) => void;
  splitStatus: 'idle' | 'loading' | 'error';
  splitError: string | null;
  onSplit: () => Promise<void>;
  selectedStemIds: Record<string, boolean>;
  onSelectedStemIdsChange: (v: Record<string, boolean>) => void;
}

function SplitConsole({
  stemsCount,
  onStemsCountChange,
  splitFile,
  onSplitFileChange,
  splitStatus,
  splitError,
  onSplit,
  selectedStemIds,
  onSelectedStemIdsChange,
}: SplitConsoleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [stemServiceReady, setStemServiceReady] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stems/health')
      .then((r) => (cancelled ? undefined : r.ok))
      .then((ok) => { if (!cancelled) setStemServiceReady(ok ?? false); })
      .catch(() => { if (!cancelled) setStemServiceReady(false); });
    return () => { cancelled = true; };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && ALLOWED_AUDIO.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      onSplitFileChange(file);
    }
  };

  const handleStemToggle = (id: string) => {
    onSelectedStemIdsChange({ ...selectedStemIds, [id]: !selectedStemIds[id] });
  };

  return (
    <div className="glass-panel mirror-sheen rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow">Split Console</p>
          <h2 className="font-display text-2xl tracking-[-0.04em] text-white">
            Upload, isolate, and route stems
          </h2>
        </div>
        <div className="inline-flex items-center gap-3 rounded-full border border-amber-200/10 bg-white/5 px-4 py-2 text-sm text-white/70">
          <span className="status-light" />
          Active session: {splitFile?.name ?? 'No file selected'}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'group relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/25 p-6 text-left transition duration-300',
            isDragging && 'border-[var(--accent)] shadow-[0_0_0_1px_rgba(255,134,92,0.4),0_24px_60px_rgba(255,90,61,0.12)]'
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,170,90,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_58%)]" />
          <div className="relative space-y-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 16V4" strokeLinecap="round" />
                <path d="M7 9.5 12 4l5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 18.5c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-2xl tracking-[-0.04em] text-white">
                Drop audio to ignite a split
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/66">
                Accept a mixdown, choose the stem set, then run the split. Stems are generated by the backend and can be loaded to tracks.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.28em] text-white/48">
              {['WAV', 'MP3', 'FLAC'].map((fmt) => (
                <span key={fmt} className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{fmt}</span>
              ))}
            </div>
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_AUDIO.join(',')}
          className="hidden"
          aria-label="Choose audio file to split into stems"
          title="Choose audio file to split into stems"
          onChange={(e) => {
            const f = e.target.files?.[0];
            onSplitFileChange(f ?? null);
          }}
        />

        <div className="rounded-[1.8rem] border border-white/10 bg-black/25 p-5">
          <div className="space-y-5">
            <div>
              <label id="split-extraction-label" className="text-xs uppercase tracking-[0.3em] text-white/44">Extraction Mode</label>
              <select
                value={stemsCount}
                onChange={(e) => onStemsCountChange(e.target.value as '2' | '4')}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-[var(--accent)]"
                aria-labelledby="split-extraction-label"
              >
                {PRESET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-950 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {stemsCount === '4' && (
              <>
                <div>
                  <label id="stem-preset-label" htmlFor="stem-preset-select" className="text-xs uppercase tracking-[0.3em] text-white/44">Stem preset</label>
                  <select
                    id="stem-preset-select"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-[var(--accent)]"
                    aria-labelledby="stem-preset-label"
                    defaultValue="all"
                    onChange={(e) => {
                      const preset = STEM_PRESETS.find((p) => p.id === e.target.value);
                      if (preset) onSelectedStemIdsChange(preset.selectedStemIds);
                    }}
                  >
                    {STEM_PRESETS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-zinc-950 text-white">{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/44">Stem Selection</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {STEM_OPTIONS_4.map((stem) => (
                    <label
                      key={stem.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 cursor-pointer"
                    >
                      <span>{stem.label}</span>
                      <input
                        type="checkbox"
                        checked={selectedStemIds[stem.id] !== false}
                        onChange={() => handleStemToggle(stem.id)}
                        className="h-4 w-4 rounded border-white/20 bg-transparent text-amber-300 focus:ring-amber-300"
                      />
                    </label>
                  ))}
                </div>
              </div>
              </>
            )}

            {stemServiceReady === false && (
              <p className="text-xs text-amber-400/90">
                Stem service not running — start Python: <code className="rounded bg-white/10 px-1">cd server &amp;&amp; source venv/bin/activate &amp;&amp; python python_service/stem_splitter.py</code>
              </p>
            )}
            <button
              type="button"
              disabled={!splitFile || splitStatus === 'loading'}
              onClick={() => void onSplit()}
              className="fire-button w-full justify-center"
            >
              {splitStatus === 'loading' ? 'Splitting stems…' : 'Split and Generate Stem Rack'}
            </button>
            {splitStatus === 'error' && splitError && (
              <p className="text-sm text-red-400 whitespace-pre-wrap break-words">{splitError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplitConsole;
