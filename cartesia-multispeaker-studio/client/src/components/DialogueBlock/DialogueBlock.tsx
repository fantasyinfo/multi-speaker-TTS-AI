import { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Loader2,
  Play,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { DialogueLine, Speaker } from '../../types/studio';
import { useStudioStore } from '../../store/useStudioStore';
import { extractApiErrorMessage, previewDialogueClip } from '../../services/api';
import { extractEmotionFromDialogue } from '../../utils/dialogueEmotion';

interface DialogueBlockProps {
  line: DialogueLine;
  index: number;
  totalLines: number;
  speakers: Speaker[];
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  isDragTarget: boolean;
}

export function DialogueBlock({
  line,
  index,
  totalLines,
  speakers,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
}: DialogueBlockProps) {
  const {
    project,
    updateDialogueLine,
    removeDialogueLine,
    duplicateDialogueLine,
    reorderDialogueLines,
  } = useStudioStore();

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const assignedSpeaker = speakers.find((s) => s.id === line.speakerId);
  const parsedDialogue = useMemo(() => extractEmotionFromDialogue(line.text), [line.text]);

  const handleSpeakerChange = (newSpeakerId: string) => {
    const nextSpeaker = speakers.find((s) => s.id === newSpeakerId);
    updateDialogueLine(line.id, {
      speakerId: newSpeakerId,
      ...(nextSpeaker ? { speed: nextSpeaker.speed } : {}),
    });
  };

  const handlePreview = async () => {
    setPreviewError(null);

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!assignedSpeaker?.voiceId) {
      setPreviewError('Open Settings at the top to assign a Cartesia voice to this speaker.');
      return;
    }

    if (!parsedDialogue.transcript) {
      setPreviewError('Enter spoken dialogue text to preview.');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const { blob } = await previewDialogueClip({
        voiceId: assignedSpeaker.voiceId,
        text: line.text,
        modelId: project.generationSettings.modelId,
        language: assignedSpeaker.language || project.generationSettings.language,
        speed: line.speed,
        emotion: parsedDialogue.emotion || 'neutral',
        sampleRate: project.generationSettings.outputFormat.sampleRate,
      });

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      setIsPreviewLoading(false);
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(objectUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setPreviewError('Unable to play preview audio.');
        URL.revokeObjectURL(objectUrl);
      };
      await audio.play();
    } catch (err) {
      setIsPreviewLoading(false);
      setIsPlaying(false);
      setPreviewError(extractApiErrorMessage(err, 'Preview failed'));
    }
  };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      className={`group rounded-2xl border p-4 transition ${
        isDragTarget
          ? 'border-[#9AABFF] bg-[#17233B]/90 ring-2 ring-[#9AABFF]/30'
          : 'border-[rgba(145,160,189,0.16)] bg-[#111A2D]/90 hover:border-[rgba(145,160,189,0.3)]'
      }`}
    >
      {/* Block Top Controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            title="Drag to reorder"
            className="cursor-grab text-[#91A0BD] hover:text-[#EDF2FF] active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </span>

          <span className="rounded-md bg-[#17233B] px-2 py-0.5 font-mono text-xs font-semibold text-[#9AABFF]">
            #{String(line.order).padStart(2, '0')}
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: assignedSpeaker?.avatarColor || '#64748B' }}
            />
            <select
              value={line.speakerId}
              onChange={(e) => handleSpeakerChange(e.target.value)}
              aria-label={`Speaker for line ${line.order}`}
              className="studio-input px-2.5 py-1 text-xs font-medium"
            >
              <option value="">Select Speaker...</option>
              {speakers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.voiceId ? '' : '(No voice)'}
                </option>
              ))}
            </select>
          </div>

          {parsedDialogue.emotion && (
            <span
              title="Detected from [emotion] tag and applied separately to TTS"
              className="inline-flex items-center gap-1 rounded-full bg-[#9AABFF]/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[#9AABFF]"
            >
              <Sparkles className="h-3 w-3" />
              {parsedDialogue.emotion}
            </span>
          )}

          {assignedSpeaker && !assignedSpeaker.voiceId && (
            <span className="rounded bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-300">
              Needs Voice
            </span>
          )}
        </div>

        {/* Speed & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(145,160,189,0.2)] bg-[#0E1628] px-2 py-1">
            <span className="text-[11px] text-[#91A0BD]">Speed</span>
            <input
              type="range"
              min={0.6}
              max={1.5}
              step={0.05}
              value={line.speed}
              onChange={(e) => updateDialogueLine(line.id, { speed: Number(e.target.value) })}
              className="w-16"
            />
            <span className="w-9 text-right font-mono text-[11px] text-[#EDF2FF]">
              {line.speed.toFixed(2)}x
            </span>
          </div>

          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewLoading}
            title="Preview this dialogue line"
            className="inline-flex items-center gap-1 rounded-lg border border-[rgba(145,160,189,0.22)] bg-[#17233B] px-2.5 py-1 text-xs font-medium text-[#EDF2FF] transition hover:border-[#76DFBD]/50 disabled:opacity-50"
          >
            {isPreviewLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9AABFF]" />
            ) : isPlaying ? (
              <Square className="h-3.5 w-3.5 fill-current text-[#76DFBD]" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current text-[#76DFBD]" />
            )}
            <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Preview'}</span>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => reorderDialogueLines(index, index - 1)}
              disabled={index === 0}
              title="Move up"
              className="rounded-lg p-1.5 text-[#91A0BD] transition hover:bg-white/5 hover:text-[#EDF2FF] disabled:opacity-30"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => reorderDialogueLines(index, index + 1)}
              disabled={index === totalLines - 1}
              title="Move down"
              className="rounded-lg p-1.5 text-[#91A0BD] transition hover:bg-white/5 hover:text-[#EDF2FF] disabled:opacity-30"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => duplicateDialogueLine(line.id)}
              title="Duplicate line"
              className="rounded-lg p-1.5 text-[#91A0BD] transition hover:bg-white/5 hover:text-[#EDF2FF]"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removeDialogueLine(line.id)}
              title="Delete line"
              className="rounded-lg p-1.5 text-[#91A0BD] transition hover:bg-rose-500/15 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dialogue Text Area */}
      <textarea
        rows={2}
        value={line.text}
        onChange={(e) => updateDialogueLine(line.id, { text: e.target.value })}
        placeholder="Example: [excited] नमस्ते! Type or paste Hindi, Hinglish, or English dialogue..."
        className="studio-input w-full resize-y px-3.5 py-2.5 text-sm leading-relaxed text-[#EDF2FF] placeholder-[#91A0BD]/50"
      />

      {previewError && <p className="mt-2 text-xs text-rose-300">{previewError}</p>}
    </div>
  );
}
