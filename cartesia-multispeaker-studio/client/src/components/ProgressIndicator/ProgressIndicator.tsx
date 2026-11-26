import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { GenerationJobStatus } from '../../types/studio';

interface ProgressIndicatorProps {
  job: GenerationJobStatus | null;
  isGenerating: boolean;
  error: string | null;
}

export function ProgressIndicator({ job, isGenerating, error }: ProgressIndicatorProps) {
  if (!job && !isGenerating && !error) return null;

  const total = job?.totalLines || 0;
  const completed = job?.completedLines || 0;
  const percent =
    job?.status === 'completed'
      ? 100
      : total > 0
        ? Math.min(96, Math.round((completed / total) * 100))
        : 10;

  return (
    <div className="studio-card p-4">
      {error || job?.status === 'failed' ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/35 p-3.5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-rose-200">Audio Generation Failed</div>
            <p className="mt-1 text-xs leading-relaxed text-rose-200/90">
              {error || job?.error?.message || 'An unexpected error occurred during synthesis.'}
            </p>
          </div>
        </div>
      ) : job?.status === 'completed' ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-[#76DFBD]" />
            <div>
              <div className="text-sm font-semibold text-[#EDF2FF]">
                Merged Story Audio Ready
              </div>
              <div className="text-xs text-[#91A0BD]">
                {completed} of {total} dialogue clips synthesized and combined cleanly.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-[#EDF2FF]">
              <Loader2 className="h-4 w-4 animate-spin text-[#9AABFF]" />
              <span>
                {job?.status === 'merging'
                  ? 'Merging WAV tracks with silence pacing...'
                  : job?.currentLineNumber
                    ? `Synthesizing line #${job.currentLineNumber} of ${total} (${job.currentSpeakerName})`
                    : 'Initializing generation job...'}
              </span>
            </div>
            <span className="font-mono text-[#9AABFF]">
              {completed}/{total} ({percent}%)
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-[#0B1020]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#9AABFF] to-[#76DFBD] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {job?.warnings && job.warnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-950/30 p-2.5 text-xs text-amber-200">
          {job.warnings.map((w, idx) => (
            <div key={idx}>{w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
