import React from 'react';
import { cn } from '../utils/cn';

const PIPELINE_STEPS = [
  { title: 'Upload & Split', blurb: 'FormData enters the Node API, then Demucs renders isolated sources.' },
  { title: 'Preview & Download', blurb: 'Stream each WAV stem for quick auditioning or export.' },
  { title: 'Load To Tracks', blurb: 'Stem buffers register in the audio engine and appear as clips.' },
  { title: 'Mix & Master', blurb: 'Gain, pan, EQ, and offline render create the final master.' },
];

interface SignalFlowProps {
  isSplitting: boolean;
  progress: number;
  currentStepIndex: number;
}

function SignalFlow({ isSplitting, progress, currentStepIndex }: SignalFlowProps) {
  return (
    <div className="glass-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Signal Flow</p>
          <h2 className="font-display text-2xl tracking-[-0.04em] text-white">
            Backend-aware orchestration
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.26em] text-white/42">Job Status</div>
          <div className="mt-1 text-lg font-semibold text-white">{isSplitting ? 'Rendering' : 'Ready'}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
            <span>Split Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#ff633d_0%,#ffbb61_44%,#ffe3a0_100%)] shadow-[0_0_24px_rgba(255,140,80,0.48)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 text-sm text-white/64">{PIPELINE_STEPS[currentStepIndex]?.blurb ?? ''}</div>
        </div>

        <div className="space-y-3">
          {PIPELINE_STEPS.map((step, index) => (
            <div
              key={step.title}
              className={cn(
                'rounded-[1.6rem] border px-4 py-4 transition duration-300',
                index === currentStepIndex &&
                  'border-amber-300/28 bg-[rgba(255,146,88,0.13)] shadow-[0_0_0_1px_rgba(255,157,94,0.12),0_18px_36px_rgba(255,116,56,0.12)]',
                index < currentStepIndex && 'border-white/12 bg-white/6',
                index > currentStepIndex && 'border-white/8 bg-black/20'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex h-3 w-3 rounded-full border border-white/20',
                    index === currentStepIndex && 'bg-[var(--accent)] shadow-[0_0_18px_var(--accent)]',
                    index < currentStepIndex && 'bg-white/60',
                    index > currentStepIndex && 'bg-white/10'
                  )}
                />
                <div className="font-display text-xl tracking-[-0.03em] text-white">{step.title}</div>
              </div>
              <div className="mt-2 pl-6 text-sm leading-6 text-white/60">{step.blurb}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SignalFlow;
