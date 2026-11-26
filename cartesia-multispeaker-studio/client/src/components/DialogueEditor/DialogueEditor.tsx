import { useState } from 'react';
import { FileText, MessageSquarePlus, Plus } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { DialogueBlock } from '../DialogueBlock/DialogueBlock';
import { ScriptImporter } from '../ScriptImporter/ScriptImporter';

export function DialogueEditor() {
  const { project, addDialogueLine, reorderDialogueLines } = useStudioStore();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      reorderDialogueLines(dragIndex, targetIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <section className="studio-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#EDF2FF]">
            <MessageSquarePlus className="h-4 w-4 text-[#76DFBD]" />
            <span>Dialogue Script</span>
            <span className="rounded-full bg-[#17233B] px-2 py-0.5 text-[11px] font-medium text-[#91A0BD]">
              {project.dialogueLines.length} lines
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-[#91A0BD]">
            Start a line with <code className="text-[#9AABFF]">[emotion]</code> (e.g.{' '}
            <code className="text-[#9AABFF]">[excited]</code>,{' '}
            <code className="text-[#9AABFF]">[calm]</code>) to apply expression automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImporterOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(145,160,189,0.22)] bg-[#17233B] px-3 py-1.5 text-xs font-medium text-[#EDF2FF] transition hover:border-[#9AABFF]/50"
          >
            <FileText className="h-3.5 w-3.5 text-[#9AABFF]" />
            <span>Import Script</span>
          </button>

          <button
            type="button"
            onClick={() => addDialogueLine()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#76DFBD] px-3 py-1.5 text-xs font-semibold text-[#0B1020] transition hover:bg-[#8be7ca]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Line</span>
          </button>
        </div>
      </div>

      {project.dialogueLines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(145,160,189,0.25)] p-10 text-center">
          <p className="text-sm text-[#EDF2FF]">Your script is empty.</p>
          <p className="mt-1 text-xs text-[#91A0BD]">
            Add dialogue blocks one by one or paste a formatted multi-character script.
          </p>
          <div className="mt-4 flex justify-center gap-2.5">
            <button
              type="button"
              onClick={() => addDialogueLine()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#9AABFF] px-3.5 py-2 text-xs font-semibold text-[#0B1020]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Line
            </button>
            <button
              type="button"
              onClick={() => setIsImporterOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(145,160,189,0.25)] px-3.5 py-2 text-xs font-medium text-[#EDF2FF]"
            >
              <FileText className="h-3.5 w-3.5" />
              Import Script
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3" onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}>
          {project.dialogueLines.map((line, index) => (
            <DialogueBlock
              key={line.id}
              line={line}
              index={index}
              totalLines={project.dialogueLines.length}
              speakers={project.speakers}
              onDragStart={(idx) => setDragIndex(idx)}
              onDragOver={(idx) => setDragOverIndex(idx)}
              onDrop={handleDrop}
              isDragTarget={dragOverIndex === index && dragIndex !== index}
            />
          ))}

          <button
            type="button"
            onClick={() => addDialogueLine()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(145,160,189,0.25)] py-3 text-xs font-medium text-[#91A0BD] transition hover:border-[#9AABFF]/50 hover:bg-[#17233B]/40 hover:text-[#EDF2FF]"
          >
            <Plus className="h-4 w-4" />
            <span>Append New Dialogue Line</span>
          </button>
        </div>
      )}

      <ScriptImporter isOpen={isImporterOpen} onClose={() => setIsImporterOpen(false)} />
    </section>
  );
}
