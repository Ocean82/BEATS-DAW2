import React, { useState } from 'react';
import { useDawStore } from '../store/dawStore';
import { UploadCloud, Scissors } from 'lucide-react';
import { cn } from '../utils/cn';

const ALLOWED_AUDIO = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac'];

interface StemItem {
  name: string;
  url: string;
  size: number;
}

function StemSplitter() {
  const [isDragging, setIsDragging] = useState(false);
  const [stemsCount, setStemsCount] = useState<'2' | '4'>('4');
  const [quality] = useState('high');
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitStatus, setSplitStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [splitError, setSplitError] = useState<string | null>(null);

  const { addAudioClip, addAudioClipFromUrl, addTrack, tracks } = useDawStore();

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0 && tracks.length > 0) {
      console.log('Track ID:', tracks[0].id);
      addAudioClip(tracks[0].id, files[0]);
    }
  };

  const handleSplitSubmit = async () => {
    if (!splitFile || tracks.length === 0) return;
    setSplitStatus('loading');
    setSplitError(null);
    try {
      const formData = new FormData();
      formData.append('file', splitFile);
      formData.append('stems', stemsCount);
      formData.append('quality', quality);

      const res = await fetch('/api/stems/split', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Split failed: ${res.status}`);
      }

      const data = (await res.json()) as { stems: StemItem[] };
      const stems = data.stems ?? [];
      const needTracks = stems.length;
      let currentTracks = useDawStore.getState().tracks;
      while (currentTracks.length < needTracks) {
        addTrack('audio');
        currentTracks = useDawStore.getState().tracks;
      }
      for (let i = 0; i < stems.length && i < currentTracks.length; i++) {
        await addAudioClipFromUrl(currentTracks[i].id, stems[i].url, stems[i].name);
      }
      setSplitStatus('idle');
      setSplitFile(null);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : String(err));
      setSplitStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'relative border-2 border-dashed border-gray-400 rounded-lg p-8 text-center transition-all duration-300',
          { 'border-primary bg-primary/10': isDragging }
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <UploadCloud className="w-16 h-16 text-gray-400" />
          <p className="text-text-muted">
            Drag & drop your audio file here to add it to the first track.
          </p>
        </div>
        <input
          type="file"
          accept={ALLOWED_AUDIO.join(',')}
          aria-label="Add audio file to first track"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => {
            const files = e.target.files;
            if (files?.length > 0 && tracks.length > 0) {
              addAudioClip(tracks[0].id, files[0]);
            }
          }}
        />
      </div>

      <div className="rounded-lg border border-gray-600 bg-gray-800/50 p-4 space-y-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          Split to stems
        </h3>
        <p className="text-sm text-text-muted">
          Choose 2 or 4 stems, pick a file, then run the split. Stems are added to the timeline (one
          per track).
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">Stem count:</span>
            <select
              aria-label="Choose 2 or 4 stems"
              value={stemsCount}
              onChange={(e) => setStemsCount(e.target.value as '2' | '4')}
              className="rounded bg-gray-700 text-white border border-gray-600 px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="2">2 stems — vocals + instrumental</option>
              <option value="4">4 stems — vocals, drums, bass, other</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-sm text-text-muted">File:</span>
            <input
              type="file"
              accept={ALLOWED_AUDIO.join(',')}
              aria-label="Audio file for stem split"
              className="text-sm text-text-muted file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-white"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setSplitFile(f ?? null);
                setSplitError(null);
              }}
            />
            {splitFile && (
              <span className="text-sm text-gray-400 truncate max-w-[140px]">{splitFile.name}</span>
            )}
          </label>
          <button
            type="button"
            disabled={!splitFile || splitStatus === 'loading'}
            onClick={handleSplitSubmit}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {splitStatus === 'loading' ? 'Splitting…' : 'Split'}
          </button>
        </div>
        {splitStatus === 'error' && splitError && (
          <p className="text-sm text-red-400">{splitError}</p>
        )}
      </div>
    </div>
  );
}

export default StemSplitter;
