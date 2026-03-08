import { useState, useRef, useCallback, useEffect } from 'react';
import { useDawStore } from '../store/dawStore';
import { cn } from '../utils/cn';
import type { StemItem } from './SplitConsole';

const STEM_GLOW: Record<string, { glow: string; soft: string }> = {
  vocals: { glow: '#ff845c', soft: 'rgba(255, 132, 92, 0.36)' },
  drums: { glow: '#ffb347', soft: 'rgba(255, 179, 71, 0.34)' },
  bass: { glow: '#ff5a3d', soft: 'rgba(255, 90, 61, 0.34)' },
  other: { glow: '#ffd36a', soft: 'rgba(255, 211, 106, 0.32)' },
  instrumental: { glow: '#a78bfa', soft: 'rgba(167, 139, 250, 0.32)' },
};

function getStemStyle(name: string): { glow: string; soft: string } {
  const key = name.toLowerCase().replace(/\s+/g, '_');
  return STEM_GLOW[key] ?? STEM_GLOW.other ?? { glow: '#ffd36a', soft: 'rgba(255, 211, 106, 0.32)' };
}

function simpleWaveform(seed: number, length = 48): number[] {
  return Array.from({ length }, (_, i) => {
    const t = (i / length) * Math.PI * 2 + seed;
    return Math.max(0.15, Math.min(1, 0.5 + 0.4 * Math.sin(t) + 0.15 * Math.sin(t * 3)));
  });
}

/** Downsample AudioBuffer channel to N bars (max abs value per bucket). */
function bufferToWaveformBars(buffer: AudioBuffer, barCount: number): number[] {
  const channel = buffer.getChannelData(0);
  const len = channel.length;
  const block = Math.floor(len / barCount);
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const start = i * block;
    const end = i === barCount - 1 ? len : start + block;
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channel[j] ?? 0);
      if (abs > max) max = abs;
    }
    bars.push(Math.max(0.12, Math.min(1, max * 2)));
  }
  return bars;
}

interface StemRackProps {
  stems: StemItem[];
  selectedStemIds: Record<string, boolean>;
  onLoadToTracks: () => void;
}

interface TrimState {
  start: number;
  end: number;
}

const defaultTrim = (): TrimState => ({ start: 0, end: 100 });

function StemRack({ stems, selectedStemIds, onLoadToTracks }: StemRackProps) {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [stemBuffers, setStemBuffers] = useState<Record<string, AudioBuffer>>({});
  const [trimMap, setTrimMap] = useState<Record<string, TrimState>>({});
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const { addAudioClipFromUrl, addTrack } = useDawStore();

  useEffect(() => {
    if (stems.length === 0) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    let cancelled = false;
    stems.forEach(async (stem) => {
      if (cancelled || stemBuffers[stem.url]) return;
      try {
        const res = await fetch(stem.url);
        const buf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        if (!cancelled) {
          setStemBuffers((prev) => ({ ...prev, [stem.url]: decoded }));
        }
      } catch {
        // ignore decode errors for background waveform
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stems.map((s) => s.url).join(',')]);

  const filteredStems = stems.filter((s) => {
    const key = s.name.toLowerCase().replace(/\s+/g, '_');
    return selectedStemIds[key] !== false;
  });

  const stopPreview = useCallback(() => {
    try {
      sourceRef.current?.stop();
    } catch {
      // already stopped
    }
    sourceRef.current = null;
    setPlayingUrl(null);
  }, []);

  const handleHearStem = async (url: string) => {
    if (playingUrl === url) {
      stopPreview();
      return;
    }
    stopPreview();
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    await ctx.resume();
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      setStemBuffers((prev) => ({ ...prev, [url]: decoded }));

      // Apply trim
      const trim = trimMap[url] ?? defaultTrim();
      const fullDuration = decoded.duration;
      const offsetSec = (trim.start / 100) * fullDuration;
      const playDuration = ((trim.end - trim.start) / 100) * fullDuration;

      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.onended = () => setPlayingUrl(null);
      sourceRef.current = source;
      source.start(0, offsetSec, playDuration);
      setPlayingUrl(url);
    } catch {
      setPlayingUrl(null);
    }
  };

  const sliceBuffer = (buffer: AudioBuffer, ctx: AudioContext, startFraction: number, endFraction: number): AudioBuffer => {
    const sampleRate = buffer.sampleRate;
    const totalSamples = buffer.length;
    const startSample = Math.floor(startFraction * totalSamples);
    const endSample = Math.floor(endFraction * totalSamples);
    const sliceLength = endSample - startSample;
    const sliced = ctx.createBuffer(buffer.numberOfChannels, sliceLength, sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      sliced.copyToChannel(buffer.getChannelData(ch).slice(startSample, endSample), ch);
    }
    return sliced;
  };

  const handleLoadOne = async (stem: StemItem) => {
    const currentTracks = useDawStore.getState().tracks;
    let need = currentTracks.length;
    const stemIndex = filteredStems.findIndex((s) => s.url === stem.url);
    if (stemIndex >= need) {
      while (need <= stemIndex) {
        addTrack('audio');
        need = useDawStore.getState().tracks.length;
      }
    }
    const trackList = useDawStore.getState().tracks;
    const trackId = trackList[stemIndex]?.id;
    if (!trackId) return;

    // If we have a decoded buffer and a non-default trim, slice and load directly
    const buffer = stemBuffers[stem.url];
    const trim = trimMap[stem.url] ?? defaultTrim();
    const hasTrim = trim.start > 0 || trim.end < 100;
    if (buffer && hasTrim) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        const ctx = new Ctor();
        const sliced = sliceBuffer(buffer, ctx, trim.start / 100, trim.end / 100);
        const { addClip } = useDawStore.getState();
        const clipId = `clip-${Date.now()}-trimmed`;
        addClip({
          id: clipId,
          trackId,
          startBeat: 0,
          durationBeats: sliced.duration * (useDawStore.getState().bpm / 60),
          color: '#f43f5e',
          name: stem.name,
          audioBuffer: sliced,
        });
        return;
      }
    }

    await addAudioClipFromUrl(trackId, stem.url, stem.name);
  };

  if (stems.length === 0) return null;

  return (
    <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">Stem Rack</p>
          <h2 className="font-display text-2xl tracking-[-0.04em] text-white">
            Audition and load each stem
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/66">
          {filteredStems.length} stems · Hear stem · Download · Load to track
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredStems.map((stem) => {
          const style = getStemStyle(stem.name);
          const buffer = stemBuffers[stem.url];
          const waveform = buffer ? bufferToWaveformBars(buffer, 48) : simpleWaveform(stem.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
          const isPlaying = playingUrl === stem.url;

          return (
            <article key={stem.url} className="stem-panel rounded-[1.8rem] p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: style.glow, boxShadow: `0 0 16px ${style.soft}` }}
                  />
                  <div>
                    <h3 className="font-display text-xl tracking-[-0.04em] text-white">{stem.name}</h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleHearStem(stem.url)}
                    className={cn('icon-button min-w-[7rem] justify-center', isPlaying && 'border-amber-300/30 bg-white/10')}
                  >
                    {isPlaying ? 'Stop' : 'Hear Stem'}
                  </button>
                  <a
                    href={stem.url}
                    download
                    className="icon-button"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleLoadOne(stem)}
                    className="icon-button"
                  >
                    Load To Track
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.28))] px-4 py-4">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.11),transparent_30%)]" />
                <div className="relative h-20">
                  <div className="relative flex h-full items-end gap-[4px]">
                    {waveform.map((v, i) => (
                      <span
                        key={i}
                        className="wave-bar flex-1 rounded-full min-w-[2px]"
                        style={{
                          height: `${Math.max(8, v * 100)}%`,
                          background: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, ${style.glow} 65%, rgba(255,255,255,0.16) 100%)`,
                          boxShadow: `0 0 12px ${style.soft}`,
                          opacity: i % 2 === 0 ? 0.9 : 0.6,
                        }}
                      />
                    ))}
                  </div>
                  {(() => {
                    const trim = trimMap[stem.url] ?? defaultTrim();
                    return (
                      <>
                        <div
                          className="pointer-events-none absolute inset-y-0 rounded-[1.2rem] border border-white/18 bg-white/6"
                          style={{
                            left: `${trim.start}%`,
                            right: `${100 - trim.end}%`,
                            boxShadow: `inset 0 0 20px ${style.soft}, 0 0 24px ${style.soft}`,
                          }}
                        />
                        <div className="pointer-events-none absolute inset-y-0 w-px bg-white/70" style={{ left: `${trim.start}%` }} />
                        <div className="pointer-events-none absolute inset-y-0 w-px bg-white/70" style={{ left: `${trim.end}%` }} />
                      </>
                    );
                  })()}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label id={`trim-start-${stem.url}`} htmlFor={`trim-start-input-${stem.url}`} className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                      <span>Trim start</span>
                      <span>{trimMap[stem.url]?.start ?? 0}%</span>
                    </label>
                    <input
                      id={`trim-start-input-${stem.url}`}
                      type="range"
                      min={0}
                      max={70}
                      value={trimMap[stem.url]?.start ?? 0}
                      aria-labelledby={`trim-start-${stem.url}`}
                      onChange={(e) => {
                        const start = Math.min(Number(e.target.value), (trimMap[stem.url]?.end ?? 100) - 8);
                        setTrimMap((m) => ({ ...m, [stem.url]: { start, end: m[stem.url]?.end ?? 100 } }));
                      }}
                      className="burn-slider"
                    />
                  </div>
                  <div>
                    <label id={`trim-end-${stem.url}`} htmlFor={`trim-end-input-${stem.url}`} className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                      <span>Trim end</span>
                      <span>{trimMap[stem.url]?.end ?? 100}%</span>
                    </label>
                    <input
                      id={`trim-end-input-${stem.url}`}
                      type="range"
                      min={30}
                      max={100}
                      value={trimMap[stem.url]?.end ?? 100}
                      aria-labelledby={`trim-end-${stem.url}`}
                      onChange={(e) => {
                        const end = Math.max(Number(e.target.value), (trimMap[stem.url]?.start ?? 0) + 8);
                        setTrimMap((m) => ({ ...m, [stem.url]: { start: m[stem.url]?.start ?? 0, end } }));
                      }}
                      className="burn-slider"
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4">
        <button type="button" onClick={onLoadToTracks} className="fire-button w-full justify-center">
          Load All Stems to Tracks
        </button>
      </div>
    </div>
  );
}

export default StemRack;
