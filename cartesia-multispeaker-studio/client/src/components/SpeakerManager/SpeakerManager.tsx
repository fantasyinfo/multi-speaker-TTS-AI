import { useState } from 'react';
import { Mic2, Plus, RefreshCw, Trash2, UserPlus, Volume2 } from 'lucide-react';
import { CartesiaVoice, Speaker } from '../../types/studio';
import { useStudioStore } from '../../store/useStudioStore';
import { SPEAKER_COLORS } from '../../utils/defaults';
import { VoicePickerModal } from './VoicePickerModal';

export function SpeakerManager() {
  const {
    project,
    languages,
    syncingCharacters,
    characterSyncError,
    syncSavedCharacters,
    addSpeaker,
    updateSpeaker,
    removeSpeaker,
  } = useStudioStore();

  const [pickingSpeakerId, setPickingSpeakerId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeSpeaker = project.speakers.find((s) => s.id === pickingSpeakerId) || null;

  const handleAssignVoice = (voice: CartesiaVoice) => {
    if (!activeSpeaker) return;
    updateSpeaker(activeSpeaker.id, {
      voiceId: voice.id,
      voiceName: voice.name,
    });
  };

  return (
    <section className="studio-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#EDF2FF]">
            <Mic2 className="h-4 w-4 text-[#9AABFF]" />
            <span>Characters &amp; Voices</span>
          </h2>
          <p className="mt-0.5 text-xs text-[#91A0BD]">
            Saved Cartesia voices stay synced permanently as your default cast.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={syncSavedCharacters}
            disabled={syncingCharacters}
            title="Pull saved & owned voices from your Cartesia account"
            className="inline-flex items-center gap-1 rounded-lg border border-[rgba(145,160,189,0.2)] bg-[#0E1628] px-2.5 py-1.5 text-xs font-medium text-[#76DFBD] transition hover:border-[#76DFBD]/50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingCharacters ? 'animate-spin' : ''}`} />
            <span>{syncingCharacters ? 'Syncing...' : 'Sync Saved'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const created = addSpeaker();
              setExpandedId(created.id);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#17233B] px-3 py-1.5 text-xs font-medium text-[#9AABFF] ring-1 ring-[#9AABFF]/30 transition hover:bg-[#1E2D4B]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {characterSyncError && (
        <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-950/35 px-3 py-2 text-xs text-rose-200">
          {characterSyncError}
        </div>
      )}

      {project.speakers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgba(145,160,189,0.25)] p-6 text-center">
          <p className="text-sm text-[#91A0BD]">No speakers yet.</p>
          <button
            type="button"
            onClick={() => addSpeaker()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#9AABFF] px-3 py-1.5 text-xs font-semibold text-[#0B1020]"
          >
            <Plus className="h-3.5 w-3.5" />
            Create First Character
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {project.speakers.map((speaker: Speaker) => {
            const isExpanded = expandedId === speaker.id;
            const hasVoice = Boolean(speaker.voiceId);

            return (
              <div
                key={speaker.id}
                className="rounded-xl border border-[rgba(145,160,189,0.16)] bg-[#0E1628]/80 p-3.5 transition hover:border-[rgba(145,160,189,0.3)]"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-[#0B1020]"
                      style={{ backgroundColor: speaker.avatarColor || '#9AABFF' }}
                    >
                      {speaker.name.slice(0, 2).toUpperCase() || 'SP'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={speaker.name}
                        onChange={(e) => updateSpeaker(speaker.id, { name: e.target.value })}
                        placeholder="Character name..."
                        className="w-full bg-transparent text-sm font-semibold text-[#EDF2FF] focus:outline-none"
                      />
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                        {hasVoice ? (
                          <span className="inline-flex items-center gap-1 truncate text-[#76DFBD]">
                            <Volume2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{speaker.voiceName || speaker.voiceId}</span>
                          </span>
                        ) : (
                          <span className="text-amber-300">No Cartesia voice assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPickingSpeakerId(speaker.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                        hasVoice
                          ? 'border border-[rgba(145,160,189,0.24)] bg-[#17233B] text-[#EDF2FF] hover:border-[#9AABFF]/50'
                          : 'bg-[#9AABFF] text-[#0B1020] hover:bg-[#b2c0ff]'
                      }`}
                    >
                      {hasVoice ? 'Change Voice' : 'Assign Voice'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : speaker.id)}
                      className="rounded-lg px-2 py-1 text-xs text-[#91A0BD] transition hover:bg-white/5 hover:text-[#EDF2FF]"
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSpeaker(speaker.id)}
                      disabled={project.speakers.length <= 1}
                      title={
                        project.speakers.length <= 1
                          ? 'Keep at least one speaker'
                          : 'Remove speaker'
                      }
                      className="rounded-lg p-1 text-[#91A0BD] transition hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-[rgba(145,160,189,0.12)] pt-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#91A0BD]">
                        Character Notes / Description
                      </label>
                      <input
                        type="text"
                        value={speaker.description}
                        onChange={(e) =>
                          updateSpeaker(speaker.id, { description: e.target.value })
                        }
                        placeholder="e.g. Warm elderly narrator..."
                        className="studio-input w-full px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#91A0BD]">
                        Default Language
                      </label>
                      <select
                        value={speaker.language}
                        onChange={(e) =>
                          updateSpeaker(speaker.id, { language: e.target.value })
                        }
                        className="studio-input w-full px-2 py-1.5 text-xs"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-[140px] flex-1">
                        <div className="mb-1 flex justify-between text-[11px] text-[#91A0BD]">
                          <span>Default Speed</span>
                          <span className="font-mono text-[#EDF2FF]">
                            {speaker.speed.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.6}
                          max={1.5}
                          step={0.05}
                          value={speaker.speed}
                          onChange={(e) =>
                            updateSpeaker(speaker.id, { speed: Number(e.target.value) })
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <span className="mb-1 block text-[11px] text-[#91A0BD]">Badge Color</span>
                        <div className="flex items-center gap-1.5">
                          {SPEAKER_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => updateSpeaker(speaker.id, { avatarColor: color })}
                              className={`h-4 w-4 rounded-full transition ${
                                speaker.avatarColor === color
                                  ? 'scale-110 ring-2 ring-white'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: color }}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <VoicePickerModal
        isOpen={Boolean(activeSpeaker)}
        speakerName={activeSpeaker?.name || ''}
        currentVoiceId={activeSpeaker?.voiceId || ''}
        onSelect={handleAssignVoice}
        onClose={() => setPickingSpeakerId(null)}
      />
    </section>
  );
}
