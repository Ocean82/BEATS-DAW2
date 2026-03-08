import React, { useState, useCallback } from 'react';
import { mockUAL, UIState } from './ual/mockUAL';
import { useDawStore } from './store/dawStore';
import { exportMasterWav } from './utils/exportWav';
import SplitConsole from './components/SplitConsole';
import StemRack from './components/StemRack';
import SignalFlow from './components/SignalFlow';
import TrackFolder from './components/TrackFolder';
import TransportBar from './components/TransportBar';
import Timeline from './components/Timeline';
import MixerPanel from './components/MixerPanel';
import EffectsPanel from './components/EffectsPanel';
import type { StemItem } from './components/SplitConsole';

const DEFAULT_UI_STATE: UIState = {
  summary: 'Ready',
  tradeoffs: [],
  mastering_status: 'Not mastering-safe',
  confidence: 0.95,
  tracks: [],
};

const PIPELINE_STEPS = 4;

function App() {
  const [uiState, setUiState] = useState<UIState | null>(null);
  const state = uiState ?? DEFAULT_UI_STATE;

  const [stems, setStems] = useState<StemItem[]>([]);
  const [uploadName, setUploadName] = useState('');
  const [splitStatus, setSplitStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitProgress, setSplitProgress] = useState(0);
  const [pipelineIndex, setPipelineIndex] = useState(PIPELINE_STEPS - 1);
  const [stemsCount, setStemsCount] = useState<'2' | '4'>('4');
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [selectedStemIds, setSelectedStemIds] = useState<Record<string, boolean>>({
    vocals: true,
    drums: true,
    bass: true,
    other: true,
  });
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);

  const { addAudioClipFromUrl, addTrack, tracks, bpm, masterVolume } = useDawStore();

  React.useEffect(() => {
    mockUAL.subscribe(setUiState);
  }, []);

  const runSplit = useCallback(async () => {
    if (!splitFile) return;
    setSplitStatus('loading');
    setSplitError(null);
    setSplitProgress(0);
    setPipelineIndex(0);

    const progressInterval = window.setInterval(() => {
      setSplitProgress((p) => {
        if (p >= 100) {
          window.clearInterval(progressInterval);
          return 100;
        }
        const next = Math.min(100, p + 4);
        setPipelineIndex(() => (next < 25 ? 0 : next < 50 ? 1 : next < 75 ? 2 : 3));
        return next;
      });
    }, 120);

    try {
      const formData = new FormData();
      formData.append('file', splitFile);
      formData.append('stems', stemsCount);
      formData.append('quality', 'high');

      const res = await fetch('/api/stems/split', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Split failed: ${res.status}`);
      }

      const data = (await res.json()) as { stems: StemItem[] };
      const newStems = data.stems ?? [];
      setStems(newStems);
      setUploadName(splitFile.name);
      setSplitFile(null);
      setSplitProgress(100);
      setPipelineIndex(PIPELINE_STEPS - 1);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : String(err));
      setSplitStatus('error');
    } finally {
      window.clearInterval(progressInterval);
      setSplitStatus('idle');
    }
  }, [splitFile, stemsCount]);

  const handleExportWav = useCallback(async () => {
    setExportStatus('loading');
    setExportError(null);
    try {
      await exportMasterWav({ tracks, bpm, masterVolume });
      setExportStatus('idle');
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
      setExportStatus('error');
    }
  }, [tracks, bpm, masterVolume]);

  const loadAllStemsToTracks = useCallback(async () => {
    const filtered = stems.filter((s) => {
      const key = s.name.toLowerCase().replace(/\s+/g, '_');
      return selectedStemIds[key] !== false;
    });
    if (filtered.length === 0) return;
    let currentTracks = useDawStore.getState().tracks;
    while (currentTracks.length < filtered.length) {
      addTrack('audio');
      currentTracks = useDawStore.getState().tracks;
    }
    for (let i = 0; i < filtered.length && i < currentTracks.length; i++) {
      await addAudioClipFromUrl(currentTracks[i].id, filtered[i].url, filtered[i].name);
    }
  }, [stems, selectedStemIds, addTrack, addAudioClipFromUrl]);

  return (
    <div className="app-shell min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="fire-orb left-[-8rem] top-[-6rem] h-80 w-80" />
        <div className="fire-orb right-[-10rem] top-20 h-[26rem] w-[26rem] opacity-75" />
        <div className="fire-orb bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] opacity-60" />
        <div className="mesh-overlay" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-panel mirror-sheen flex flex-col gap-6 rounded-[2rem] px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-100/80">
              Burnt Beats
              <span className="h-1 w-1 rounded-full bg-[var(--accent)] shadow-[0_0_14px_var(--accent)]" />
              Stem Splitter / Mixer / Master
            </div>
            <div className="space-y-3">
              <h1 className="font-display max-w-4xl text-4xl leading-none tracking-[-0.05em] text-white sm:text-5xl lg:text-[4.6rem]">
                Fire-polished stem control with mirrored glass precision.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                Split vocals, drums, bass, and other into a focused workspace with instant audition, waveform previews, and a dedicated mix surface.
              </p>
            </div>
          </div>
          <div className="grid w-full max-w-xl grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/42">Model</div>
              <div className="mt-2 text-base font-semibold text-white">Demucs 4.0</div>
              <div className="mt-1 text-xs leading-5 text-white/46">44.1kHz stereo</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/42">Preview</div>
              <div className="mt-2 text-base font-semibold text-white">Hear Stem</div>
              <div className="mt-1 text-xs leading-5 text-white/46">One-click audition</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/42">Workflow</div>
              <div className="mt-2 text-base font-semibold text-white">Folder Tracks</div>
              <div className="mt-1 text-xs leading-5 text-white/46">Split → load → mix</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/42">Export</div>
              <div className="mt-2 text-base font-semibold text-white">Offline Master</div>
              <div className="mt-1 text-xs leading-5 text-white/46">WAV bounce ready</div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <SplitConsole
              stemsCount={stemsCount}
              onStemsCountChange={setStemsCount}
              splitFile={splitFile}
              onSplitFileChange={setSplitFile}
              splitStatus={splitStatus}
              splitError={splitError}
              onSplit={runSplit}
              selectedStemIds={selectedStemIds}
              onSelectedStemIdsChange={setSelectedStemIds}
            />
            <StemRack
              stems={stems}
              selectedStemIds={selectedStemIds}
              onLoadToTracks={loadAllStemsToTracks}
            />
            <div className="glass-panel rounded-[2rem] p-4">
              <p className="eyebrow mb-2">Timeline</p>
              <TransportBar />
              <Timeline />
            </div>
          </div>

          <div className="space-y-6">
            <SignalFlow
              isSplitting={splitStatus === 'loading'}
              progress={splitProgress}
              currentStepIndex={pipelineIndex}
            />
            <TrackFolder
              uploadName={uploadName}
              stems={stems}
              selectedStemIds={selectedStemIds}
              onLoadToTracks={loadAllStemsToTracks}
            />
            <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
              <div className="mb-5">
                <p className="eyebrow">Mix Surface</p>
                <h2 className="font-display text-2xl tracking-[-0.04em] text-white">Master-ready faders and shaping</h2>
              </div>
              <MixerPanel />
              <EffectsPanel />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/42">Master Chain</div>
                  <div className="mt-3 space-y-3 text-sm text-white/68">
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span>Glue compression</span>
                      <span>2.4 dB GR</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span>Limiter ceiling</span>
                      <span>-0.8 dB</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                      <span>Loudness target</span>
                      <span>-9 LUFS</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/42 mb-3">Final Export</div>
                  <p className="text-sm text-white/68 mb-4">OfflineAudioContext render → WAV blob → browser download</p>
                  <button
                    type="button"
                    onClick={() => void handleExportWav()}
                    disabled={exportStatus === 'loading'}
                    className="fire-button w-full justify-center"
                  >
                    {exportStatus === 'loading' ? 'Exporting…' : 'Export Master WAV'}
                  </button>
                  {exportStatus === 'error' && exportError && (
                    <p className="mt-2 text-sm text-red-400">{exportError}</p>
                  )}
                </div>
              </div>
              <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/35 p-4">
                <p className="eyebrow">Implementation Notes</p>
                <div className="mt-3 font-mono text-[12px] leading-6 text-white/62 space-y-1">
                  <div>Frontend: SplitConsole → POST /api/stems/split</div>
                  <div>Backend: Python /split → torchaudio resample → Demucs inference</div>
                  <div>Stems saved → job_id and paths returned → Load to tracks → Web Audio buffers → DAW timeline and export</div>
                </div>
              </div>
            </div>
            <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
              <p className="eyebrow">Agent Status</p>
              <div className="mt-3 text-sm text-white/80">{state.summary}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
