import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, Settings, Sparkles, Wand2, X } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { SpeakerManager } from '../components/SpeakerManager/SpeakerManager';
import { DialogueEditor } from '../components/DialogueEditor/DialogueEditor';
import { GenerationSettings } from '../components/GenerationSettings/GenerationSettings';
import { ProgressIndicator } from '../components/ProgressIndicator/ProgressIndicator';
import { AudioPlayer } from '../components/AudioPlayer/AudioPlayer';
import { extractEmotionFromDialogue } from '../utils/dialogueEmotion';

export function Studio() {
  const {
    project,
    health,
    isSettingsPanelOpen,
    setSettingsPanelOpen,
    setProjectMeta,
    newProject,
    generationJob,
    isGenerating,
    generationError,
    startGeneration,
  } = useStudioStore();

  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  const preflightIssues = useMemo(() => {
    const issues: string[] = [];
    if (!project.name.trim()) issues.push('Enter a project name.');
    if (project.speakers.length === 0) issues.push('Add at least one speaker.');
    if (project.dialogueLines.length === 0) issues.push('Add at least one dialogue line.');

    const speakerMap = new Map(project.speakers.map((s) => [s.id, s]));
    const missingVoiceSpeakers = new Set<string>();
    let missingSpeakerCount = 0;
    let emptyTextCount = 0;

    for (const line of project.dialogueLines) {
      const spk = speakerMap.get(line.speakerId);
      if (!spk) {
        missingSpeakerCount += 1;
      } else if (!spk.voiceId) {
        missingVoiceSpeakers.add(spk.name);
      }
      const extracted = extractEmotionFromDialogue(line.text);
      if (!extracted.transcript) {
        emptyTextCount += 1;
      }
    }

    if (missingSpeakerCount > 0) {
      issues.push(`${missingSpeakerCount} dialogue line(s) do not have a speaker selected.`);
    }
    if (missingVoiceSpeakers.size > 0) {
      issues.push(
        `Open Settings at the top to assign a Cartesia voice to: ${Array.from(missingVoiceSpeakers).join(', ')}.`
      );
    }
    if (emptyTextCount > 0) {
      issues.push(`${emptyTextCount} dialogue line(s) have empty spoken dialogue text.`);
    }

    return issues;
  }, [project]);

  const handleGenerate = async () => {
    if (preflightIssues.length > 0) {
      setValidationMessages(preflightIssues);
      if (preflightIssues.some((msg) => msg.includes('Cartesia voice'))) {
        setSettingsPanelOpen(true);
      }
      return;
    }
    setValidationMessages([]);
    await startGeneration();
  };

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      {/* Top Action Strip */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgba(145,160,189,0.16)] bg-[#111A2D]/80 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-[#EDF2FF]">
              {project.name || 'Untitled Story'}
            </h1>
            {!project._id && (
              <span className="rounded-full bg-[#9AABFF]/15 px-2 py-0.5 text-[11px] font-medium text-[#9AABFF]">
                Draft
              </span>
            )}
          </div>
          <input
            type="text"
            value={project.description}
            onChange={(e) => setProjectMeta({ description: e.target.value })}
            placeholder="Add a short story description or episode note..."
            className="mt-1 w-full max-w-2xl bg-transparent text-xs text-[#91A0BD] placeholder-[#91A0BD]/50 focus:text-[#EDF2FF] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => newProject(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(145,160,189,0.22)] bg-[#17233B] px-3.5 py-2 text-xs font-medium text-[#EDF2FF] transition hover:border-[#9AABFF]/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#9AABFF]" />
            <span>Load Example Story</span>
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9AABFF] to-[#76DFBD] px-5 py-2 text-sm font-semibold text-[#0B1020] shadow-lg shadow-[#9AABFF]/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Story...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Generate Audio</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* API Key Warning Banner if unconfigured */}
      {health && !health.cartesia.configured && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <span className="font-semibold">Cartesia API key is not configured.</span> Add{' '}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-[#EDF2FF]">
              CARTESIA_API_KEY
            </code>{' '}
            to <code className="rounded bg-black/30 px-1.5 py-0.5 text-[#EDF2FF]">server/.env</code>{' '}
            and restart the backend server to list voices and generate audio.
          </div>
        </div>
      )}

      {/* Validation Checklist */}
      {validationMessages.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-400/35 bg-amber-950/35 p-4 text-xs text-amber-200">
          <div className="mb-1.5 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <span>Complete these items before generating audio:</span>
          </div>
          <ul className="list-inside list-disc space-y-1 text-amber-100/90">
            {validationMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress & Final Audio Output */}
      {(generationJob || isGenerating || generationError) && (
        <div className="mb-6 space-y-4">
          <ProgressIndicator
            job={generationJob}
            isGenerating={isGenerating}
            error={generationError}
          />
          <AudioPlayer
            result={generationJob?.result || null}
            onRegenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>
      )}

      {/* Studio Workspace: Left Character Voices & Settings Panel only shown when top Settings button is active */}
      <div className={isSettingsPanelOpen ? 'grid gap-6 lg:grid-cols-12' : ''}>
        {isSettingsPanelOpen && (
          <aside className="space-y-5 lg:col-span-5 xl:col-span-4">
            <div className="flex items-center justify-between rounded-xl border border-[rgba(145,160,189,0.16)] bg-[#111A2D]/90 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#EDF2FF]">
                <Settings className="h-3.5 w-3.5 text-[#9AABFF]" />
                <span>Character Voices &amp; Settings</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  className="text-[11px] font-medium text-[#9AABFF] hover:underline"
                >
                  Diagnostics
                </Link>
                <button
                  type="button"
                  onClick={() => setSettingsPanelOpen(false)}
                  title="Hide settings panel"
                  className="rounded-lg p-1 text-[#91A0BD] transition hover:bg-white/10 hover:text-[#EDF2FF]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <SpeakerManager />
            <GenerationSettings />
          </aside>
        )}

        <div className={isSettingsPanelOpen ? 'lg:col-span-7 xl:col-span-8' : ''}>
          <DialogueEditor />
        </div>
      </div>
    </main>
  );
}
