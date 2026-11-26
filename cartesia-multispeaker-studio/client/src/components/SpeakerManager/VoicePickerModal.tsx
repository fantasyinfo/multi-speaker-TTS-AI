import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Globe,
  Lock,
  Play,
  RefreshCw,
  Search,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { CartesiaVoice } from '../../types/studio';
import { useStudioStore } from '../../store/useStudioStore';
import { getVoicePreviewProxyUrl } from '../../services/api';

interface VoicePickerModalProps {
  isOpen: boolean;
  speakerName: string;
  currentVoiceId: string;
  onSelect: (voice: CartesiaVoice) => void;
  onClose: () => void;
}

export function VoicePickerModal({
  isOpen,
  speakerName,
  currentVoiceId,
  onSelect,
  onClose,
}: VoicePickerModalProps) {
  const { voices, voicesLoading, voicesError, loadVoices } = useStudioStore();
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'saved' | 'owner' | 'public'>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen && voices.length === 0 && !voicesLoading) {
      loadVoices(true);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPreviewingId(null);
    };
  }, [isOpen]);

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const v of voices) {
      if (v.language) langs.add(v.language);
    }
    return Array.from(langs).sort();
  }, [voices]);

  const filteredVoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return voices.filter((v) => {
      if (ownershipFilter === 'saved' && !v.isStarred && !v.isOwner) return false;
      if (ownershipFilter === 'owner' && !v.isOwner) return false;
      if (ownershipFilter === 'public' && (!v.isPublic || v.isOwner)) return false;
      if (languageFilter !== 'all' && v.language !== languageFilter) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.tagline.toLowerCase().includes(q)
      );
    });
  }, [voices, search, ownershipFilter, languageFilter]);

  const togglePreview = (voice: CartesiaVoice) => {
    setPreviewError(null);
    if (previewingId === voice.id) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }

    if (!voice.previewFileUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(getVoicePreviewProxyUrl(voice.previewFileUrl));
    audioRef.current = audio;
    setPreviewingId(voice.id);

    audio.onended = () => setPreviewingId(null);
    audio.onerror = () => {
      setPreviewingId(null);
      setPreviewError(`Could not play preview for "${voice.name}".`);
    };
    audio.play().catch(() => {
      setPreviewingId(null);
      setPreviewError(`Audio playback blocked or unavailable for "${voice.name}".`);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="studio-card flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden bg-[#111A2D]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[rgba(145,160,189,0.16)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#EDF2FF]">
              Assign Cartesia Voice for <span className="text-[#9AABFF]">{speakerName}</span>
            </h3>
            <p className="mt-0.5 text-xs text-[#91A0BD]">
              Select from your cloned/owned voices or Cartesia public library voices.
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

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[rgba(145,160,189,0.14)] bg-[#0E1628]/70 px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91A0BD]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voice name, description, or ID..."
              className="studio-input w-full py-1.5 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="flex items-center rounded-lg border border-[rgba(145,160,189,0.2)] bg-[#0B1020] p-0.5 text-xs">
            {(['all', 'saved', 'owner', 'public'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setOwnershipFilter(tab)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize transition ${
                  ownershipFilter === tab
                    ? 'bg-[#17233B] text-[#9AABFF]'
                    : 'text-[#91A0BD] hover:text-[#EDF2FF]'
                }`}
              >
                {tab === 'saved' ? 'Saved' : tab === 'owner' ? 'My Voices' : tab === 'public' ? 'Library' : 'All'}
              </button>
            ))}
          </div>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="studio-input px-2.5 py-1.5 text-xs"
          >
            <option value="all">All Languages</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadVoices(true)}
            disabled={voicesLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(145,160,189,0.2)] px-2.5 py-1.5 text-xs text-[#91A0BD] transition hover:border-[#9AABFF]/40 hover:text-[#EDF2FF]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${voicesLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Voice List */}
        <div className="flex-1 overflow-y-auto p-5">
          {previewError && (
            <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              {previewError}
            </div>
          )}

          {voicesLoading ? (
            <div className="flex flex-col items-center justify-center py-14 text-sm text-[#91A0BD]">
              <RefreshCw className="mb-3 h-6 w-6 animate-spin text-[#9AABFF]" />
              Loading voices from your Cartesia account...
            </div>
          ) : voicesError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-5 text-center">
              <p className="text-sm font-medium text-rose-200">{voicesError}</p>
              <p className="mt-1 text-xs text-[#91A0BD]">
                Ensure <code className="text-[#EDF2FF]">CARTESIA_API_KEY</code> is set in{' '}
                <code className="text-[#EDF2FF]">server/.env</code> and the backend is running.
              </p>
            </div>
          ) : filteredVoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#91A0BD]">
              No voices match your filters.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredVoices.map((voice) => {
                const isSelected = voice.id === currentVoiceId;
                const isPlaying = previewingId === voice.id;
                return (
                  <div
                    key={voice.id}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 transition ${
                      isSelected
                        ? 'border-[#76DFBD]/70 bg-[#17233B]'
                        : 'border-[rgba(145,160,189,0.16)] bg-[#0E1628]/80 hover:border-[#9AABFF]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#9AABFF]" />
                            <span className="truncate text-sm font-semibold text-[#EDF2FF]">
                              {voice.name}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-[#91A0BD]">
                            {voice.id}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {voice.isOwner ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#9AABFF]/15 px-2 py-0.5 text-[10px] font-medium text-[#9AABFF]">
                              <Lock className="h-2.5 w-2.5" />
                              Private / Owned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#76DFBD]/15 px-2 py-0.5 text-[10px] font-medium text-[#76DFBD]">
                              <Globe className="h-2.5 w-2.5" />
                              Public
                            </span>
                          )}
                        </div>
                      </div>

                      {(voice.tagline || voice.description) && (
                        <p className="mt-2 line-clamp-2 text-xs text-[#91A0BD]">
                          {voice.tagline || voice.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[rgba(145,160,189,0.1)] pt-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#91A0BD]">
                        {voice.language && (
                          <span className="rounded bg-[#17233B] px-1.5 py-0.5 font-mono uppercase text-[#EDF2FF]">
                            {voice.language}
                          </span>
                        )}
                        {voice.gender && <span className="capitalize">{voice.gender}</span>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {voice.previewFileUrl && (
                          <button
                            type="button"
                            onClick={() => togglePreview(voice)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[rgba(145,160,189,0.22)] px-2.5 py-1 text-xs text-[#EDF2FF] transition hover:border-[#9AABFF]/50"
                          >
                            {isPlaying ? (
                              <>
                                <Square className="h-3 w-3 fill-current text-[#76DFBD]" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 fill-current text-[#9AABFF]" />
                                <span>Preview</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(voice);
                            onClose();
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-[#76DFBD] text-[#0B1020]'
                              : 'bg-[#9AABFF] text-[#0B1020] hover:bg-[#b2c0ff]'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                          <span>{isSelected ? 'Selected' : 'Use Voice'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
