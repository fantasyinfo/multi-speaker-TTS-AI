import { Clock, Download, FileAudio, RotateCcw } from 'lucide-react';
import { GenerationResult } from '../../types/studio';
import { resolveBackendAudioUrl } from '../../services/api';

interface AudioPlayerProps {
  result: GenerationResult | null;
  onRegenerate: () => void;
  isGenerating: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${mins}:${secs}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AudioPlayer({ result, onRegenerate, isGenerating }: AudioPlayerProps) {
  if (!result) return null;

  const streamUrl = resolveBackendAudioUrl(result.audioUrl);
  const downloadUrl = resolveBackendAudioUrl(result.downloadUrl);

  return (
    <section className="studio-card border-[#76DFBD]/30 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#EDF2FF]">
            <FileAudio className="h-4 w-4 text-[#76DFBD]" />
            <span className="truncate">{result.filename}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#91A0BD]">
            <span>{result.lineCount} dialogue lines</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(result.durationSeconds)}
            </span>
            <span>
              {(result.sampleRate / 1000).toFixed(1)} kHz • {result.bitsPerSample}-bit WAV
            </span>
            <span>{formatFileSize(result.totalBytes)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(145,160,189,0.24)] bg-[#17233B] px-3 py-1.5 text-xs font-medium text-[#EDF2FF] transition hover:border-[#9AABFF]/50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Regenerate</span>
          </button>

          <a
            href={downloadUrl}
            download={result.filename}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#76DFBD] px-3.5 py-1.5 text-xs font-semibold text-[#0B1020] transition hover:bg-[#8be7ca]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download WAV</span>
          </a>
        </div>
      </div>

      <audio
        key={result.jobId}
        controls
        src={streamUrl}
        className="w-full rounded-lg"
      />
    </section>
  );
}
