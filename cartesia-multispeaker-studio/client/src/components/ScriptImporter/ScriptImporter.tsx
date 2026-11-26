import { useMemo, useState } from 'react';
import { AlertTriangle, FileText, UserPlus, X } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';
import { parseDialogueScript } from '../../utils/scriptParser';

interface ScriptImporterProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_SCRIPT = `MOHAN: [calm] बेटा, आज हम बचत के बारे में बात करेंगे।

CHINTU: [curious] लेकिन दादाजी, पैसे बचते ही नहीं हैं!

[happy] RUPAYA RANI: छोटी आदतें बड़े बदलाव ला सकती हैं।`;

export function ScriptImporter({ isOpen, onClose }: ScriptImporterProps) {
  const { project, addSpeaker, importDialogueLines } = useStudioStore();
  const [rawScript, setRawScript] = useState(SAMPLE_SCRIPT);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({});

  const parsed = useMemo(
    () => parseDialogueScript(rawScript, project.speakers),
    [rawScript, project.speakers]
  );

  if (!isOpen) return null;

  const resolvedLines = parsed.lines.map((item) => {
    const speakerId = item.matchedSpeakerId || manualMappings[item.rawSpeaker] || '';
    const speaker = project.speakers.find((s) => s.id === speakerId);
    return {
      ...item,
      resolvedSpeakerId: speakerId,
      speaker,
    };
  });

  const unresolvedSpeakers = Array.from(
    new Set(
      resolvedLines
        .filter((line) => !line.resolvedSpeakerId)
        .map((line) => line.rawSpeaker)
    )
  );

  const handleCreateSpeakerFromRaw = (rawName: string) => {
    const formattedName =
      rawName === 'Unassigned'
        ? `Narrator ${project.speakers.length + 1}`
        : rawName
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    const created = addSpeaker({ name: formattedName });
    setManualMappings((prev) => ({
      ...prev,
      [rawName]: created.id,
    }));
  };

  const handleImport = () => {
    if (resolvedLines.length === 0) return;

    const toImport = resolvedLines.map((line) => ({
      speakerId: line.resolvedSpeakerId,
      text: line.text,
      speed: line.speaker?.speed ?? project.generationSettings.defaultSpeed ?? 1.0,
      emotion: line.emotion || 'neutral',
    }));

    importDialogueLines(toImport, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="studio-card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden bg-[#111A2D]">
        <div className="flex items-center justify-between border-b border-[rgba(145,160,189,0.16)] px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-[#EDF2FF]">
              <FileText className="h-4 w-4 text-[#9AABFF]" />
              <span>Import Structured Script</span>
            </h3>
            <p className="mt-0.5 text-xs text-[#91A0BD]">
              Paste dialogue formatted as <code className="text-[#EDF2FF]">SPEAKER: dialogue</code>.
              No lines are ever silently discarded.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#91A0BD] transition hover:bg-white/10 hover:text-[#EDF2FF]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#91A0BD]">
              Paste Script Text
            </label>
            <textarea
              rows={7}
              value={rawScript}
              onChange={(e) => setRawScript(e.target.value)}
              placeholder="MOHAN: बेटा, आज हम बचत के बारे में बात करेंगे।"
              className="studio-input w-full p-3 font-sans text-sm leading-relaxed"
            />
          </div>

          {unresolvedSpeakers.length > 0 && (
            <div className="rounded-xl border border-amber-400/35 bg-amber-950/30 p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Unmatched speaker label(s) detected. Map each to a character or create a new one:
                </span>
              </div>
              <div className="space-y-2">
                {unresolvedSpeakers.map((rawName) => (
                  <div
                    key={rawName}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0B1020]/60 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-amber-200">{rawName}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={manualMappings[rawName] || ''}
                        onChange={(e) =>
                          setManualMappings((prev) => ({
                            ...prev,
                            [rawName]: e.target.value,
                          }))
                        }
                        className="studio-input px-2.5 py-1 text-xs"
                      >
                        <option value="">Leave unassigned (assign later)</option>
                        {project.speakers.map((s) => (
                          <option key={s.id} value={s.id}>
                            Map to {s.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleCreateSpeakerFromRaw(rawName)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#17233B] px-2.5 py-1 text-xs font-medium text-[#9AABFF] hover:bg-[#1E2D4B]"
                      >
                        <UserPlus className="h-3 w-3" />
                        <span>Create Character</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parsed Preview */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-[#91A0BD]">
              <span>Parsed Preview ({resolvedLines.length} dialogue blocks)</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                  />
                  <span>Append to script</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  <span>Replace existing</span>
                </label>
              </div>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[rgba(145,160,189,0.14)] bg-[#0E1628] p-3">
              {resolvedLines.length === 0 ? (
                <p className="text-center text-xs text-[#91A0BD]">
                  Paste lines above to preview parsed dialogue.
                </p>
              ) : (
                resolvedLines.map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-0.5 font-mono text-[#91A0BD]">
                      #{String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${
                        line.speaker
                          ? 'bg-[#17233B] text-[#76DFBD]'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {line.speaker ? line.speaker.name : `${line.rawSpeaker} (unassigned)`}
                    </span>
                    {line.emotion && (
                      <span className="shrink-0 rounded bg-[#9AABFF]/15 px-1.5 py-0.5 text-[11px] capitalize text-[#9AABFF]">
                        {line.emotion}
                      </span>
                    )}
                    <span className="text-[#EDF2FF]">{line.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[rgba(145,160,189,0.16)] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-[#91A0BD] hover:text-[#EDF2FF]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={resolvedLines.length === 0}
            className="rounded-lg bg-[#9AABFF] px-4 py-1.5 text-xs font-semibold text-[#0B1020] transition hover:bg-[#b2c0ff] disabled:opacity-40"
          >
            Import {resolvedLines.length} Line{resolvedLines.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
