
import React, { useState } from 'react';
import { Clip as ClipData, useDawStore } from '../store/dawStore';
import { cn } from '../utils/cn';

interface ClipProps {
  clip: ClipData;
  beatsPerPixel: number;
}

function Clip({ clip, beatsPerPixel }: ClipProps) {
  const { selectedClipId, selectClip, selectTrack, updateClip } = useDawStore();
  const isSelected = selectedClipId === clip.id;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  const MIN_DURATION_BEATS = 0.25;
  const clampClip = (startBeat: number, durationBeats: number) => ({
    startBeat: Math.max(0, startBeat),
    durationBeats: Math.max(MIN_DURATION_BEATS, durationBeats),
  });

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);
    selectClip(clip.id);
    selectTrack(clip.trackId);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaX = e.clientX - dragStartX;
    const deltaBeats = deltaX * beatsPerPixel;
    const { startBeat } = clampClip(clip.startBeat + deltaBeats, clip.durationBeats);
    updateClip(clip.id, { startBeat });
    setDragStartX(e.clientX);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

  const handleResizeStart = (e: React.DragEvent<HTMLDivElement>, side: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizing(side);
    setDragStartX(e.clientX);
  };

  const handleResize = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    e.stopPropagation();
    e.preventDefault();
    const deltaX = e.clientX - dragStartX;
    const deltaBeats = deltaX * beatsPerPixel;

    if (isResizing === 'left') {
      const startBeat = clip.startBeat + deltaBeats;
      const durationBeats = clip.durationBeats - deltaBeats;
      const clamped = clampClip(startBeat, durationBeats);
      updateClip(clip.id, clamped);
    } else {
      const durationBeats = Math.max(MIN_DURATION_BEATS, clip.durationBeats + deltaBeats);
      updateClip(clip.id, { durationBeats });
    }
    setDragStartX(e.clientX);
  };

  const handleResizeEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizing(null);
  };

  const clipSelector = `clip-${clip.id.replace(/[^a-z0-9-_]/gi, '-')}`;
  const leftPx = clip.startBeat / beatsPerPixel;
  const widthPx = clip.durationBeats / beatsPerPixel;

  return (
    <>
      <style>{`.${clipSelector}{left:${leftPx}px;width:${widthPx}px;background-color:${clip.color}}`}</style>
      <div
        draggable
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={cn(
          clipSelector,
          'absolute h-16 top-4 rounded-lg p-2 shadow-md cursor-pointer',
          {
            'border-2 border-yellow-400': isSelected,
          }
        )}
        onClick={() => {
          selectClip(clip.id);
          selectTrack(clip.trackId);
        }}
      >
        <p className="text-white font-bold truncate">{clip.name}</p>
        {isSelected && (
          <>
            <div
              draggable
              onDragStart={(e) => handleResizeStart(e, 'left')}
              onDrag={handleResize}
              onDragEnd={handleResizeEnd}
              className="absolute left-0 top-0 h-full w-2 bg-yellow-400 cursor-ew-resize"
            />
            <div
              draggable
              onDragStart={(e) => handleResizeStart(e, 'right')}
              onDrag={handleResize}
              onDragEnd={handleResizeEnd}
              className="absolute right-0 top-0 h-full w-2 bg-yellow-400 cursor-ew-resize"
            />
          </>
        )}
      </div>
    </>
  );
}

export default Clip;
