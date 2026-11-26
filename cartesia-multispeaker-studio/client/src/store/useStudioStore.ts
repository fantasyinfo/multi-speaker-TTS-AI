import { create } from 'zustand';
import {
  CartesiaVoice,
  DialogueLine,
  GenerationJobStatus,
  GenerationSettings,
  HealthStatus,
  LanguageOption,
  ModelOption,
  ProjectData,
  Speaker,
} from '../types/studio';
import {
  createBlankProject,
  createStarterProject,
  DEFAULT_EMOTIONS,
  DEFAULT_LANGUAGES,
  DEFAULT_MODELS,
  SPEAKER_COLORS,
} from '../utils/defaults';
import {
  createProject,
  extractApiErrorMessage,
  fetchDefaultCharacters,
  fetchGenerationStatus,
  fetchHealth,
  fetchProject,
  fetchVoiceOptions,
  fetchVoices,
  saveDefaultCharacters,
  startAudioGeneration,
  syncDefaultCharacters,
  updateProject,
} from '../services/api';

interface StudioState {
  project: ProjectData;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;

  health: HealthStatus | null;
  voices: CartesiaVoice[];
  voicesLoading: boolean;
  voicesError: string | null;

  defaultCharacters: Speaker[];
  syncingCharacters: boolean;
  characterSyncError: string | null;

  models: ModelOption[];
  languages: LanguageOption[];
  emotions: string[];

  generationJob: GenerationJobStatus | null;
  isGenerating: boolean;
  generationError: string | null;

  isSettingsPanelOpen: boolean;
  toggleSettingsPanel: () => void;
  setSettingsPanelOpen: (open: boolean) => void;

  initializeStudio: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  loadVoices: (force?: boolean) => Promise<void>;
  syncSavedCharacters: () => Promise<void>;

  setProjectMeta: (patch: Partial<Pick<ProjectData, 'name' | 'description'>>) => void;
  newProject: (useStarter?: boolean) => void;
  loadSavedProject: (id: string) => Promise<void>;
  saveCurrentProject: () => Promise<ProjectData | null>;

  addSpeaker: (speaker?: Partial<Speaker>) => Speaker;
  updateSpeaker: (id: string, patch: Partial<Speaker>) => void;
  removeSpeaker: (id: string) => void;

  addDialogueLine: (afterIndex?: number, initial?: Partial<DialogueLine>) => void;
  updateDialogueLine: (id: string, patch: Partial<DialogueLine>) => void;
  removeDialogueLine: (id: string) => void;
  duplicateDialogueLine: (id: string) => void;
  reorderDialogueLines: (fromIndex: number, toIndex: number) => void;
  importDialogueLines: (lines: Array<Omit<DialogueLine, 'id' | 'order'>>, mode: 'append' | 'replace') => void;

  updateGenerationSettings: (patch: Partial<GenerationSettings>) => void;
  startGeneration: () => Promise<void>;
  clearGenerationState: () => void;
}

let pollTimer: number | null = null;
let defaultCharactersSaveTimer: number | null = null;

function scheduleDefaultCharactersPersist(speakers: Speaker[]) {
  if (defaultCharactersSaveTimer !== null) {
    window.clearTimeout(defaultCharactersSaveTimer);
  }
  defaultCharactersSaveTimer = window.setTimeout(() => {
    saveDefaultCharacters(speakers).catch(() => {});
  }, 400);
}

function matchStarterLinesToSpeakers(
  lines: DialogueLine[],
  oldSpeakers: Speaker[],
  newSpeakers: Speaker[]
): DialogueLine[] {
  if (newSpeakers.length === 0) return lines;
  const oldMap = new Map(oldSpeakers.map((s) => [s.id, s.name.toLowerCase()]));

  const findTargetId = (oldSpeakerId: string, fallbackIndex: number): string => {
    const oldName = (oldMap.get(oldSpeakerId) || '').replace(/rupaya/i, 'rupee');
    if (oldName) {
      const exact = newSpeakers.find(
        (s) => s.name.toLowerCase() === oldName
      );
      if (exact) return exact.id;

      const firstWord = oldName.split(/\s+/)[0];
      const partial = newSpeakers.find(
        (s) =>
          s.name.toLowerCase().includes(firstWord) ||
          firstWord.includes(s.name.toLowerCase().split(/\s+/)[0])
      );
      if (partial) return partial.id;
    }
    return newSpeakers[fallbackIndex % newSpeakers.length].id;
  };

  return lines.map((line, idx) => ({
    ...line,
    speakerId: findTargetId(line.speakerId, idx),
  }));
}

function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function renumberLines(lines: DialogueLine[]): DialogueLine[] {
  return lines.map((line, index) => ({
    ...line,
    order: index + 1,
  }));
}

export const useStudioStore = create<StudioState>((set, get) => ({
  project: createStarterProject(),
  isDirty: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,

  health: null,
  voices: [],
  voicesLoading: false,
  voicesError: null,

  defaultCharacters: [],
  syncingCharacters: false,
  characterSyncError: null,

  models: DEFAULT_MODELS,
  languages: DEFAULT_LANGUAGES,
  emotions: DEFAULT_EMOTIONS,

  generationJob: null,
  isGenerating: false,
  generationError: null,

  isSettingsPanelOpen: false,
  toggleSettingsPanel: () => set((state) => ({ isSettingsPanelOpen: !state.isSettingsPanelOpen })),
  setSettingsPanelOpen: (open) => set({ isSettingsPanelOpen: open }),

  initializeStudio: async () => {
    await get().refreshHealth();

    try {
      const options = await fetchVoiceOptions();
      set({
        models: options.models?.length ? options.models : DEFAULT_MODELS,
        languages: options.languages?.length ? options.languages : DEFAULT_LANGUAGES,
        emotions: options.emotions?.length ? options.emotions : DEFAULT_EMOTIONS,
      });
    } catch {
      // Keep default options if backend is still starting
    }

    if (get().health?.cartesia.configured) {
      await get().loadVoices();
    }

    try {
      const { characters } = await fetchDefaultCharacters();
      if (characters.length > 0) {
        set((state) => {
          const isUnmodifiedDraft = !state.project._id && !state.isDirty;
          if (!isUnmodifiedDraft) {
            return { defaultCharacters: characters };
          }
          return {
            defaultCharacters: characters,
            project: {
              ...state.project,
              speakers: characters,
              dialogueLines: matchStarterLinesToSpeakers(
                state.project.dialogueLines,
                state.project.speakers,
                characters
              ),
            },
          };
        });
      }
    } catch {
      // Keep starter defaults if backend is unavailable
    }
  },

  syncSavedCharacters: async () => {
    set({ syncingCharacters: true, characterSyncError: null });
    try {
      const { characters } = await syncDefaultCharacters();
      set((state) => ({
        defaultCharacters: characters,
        syncingCharacters: false,
        project: {
          ...state.project,
          speakers: characters.length > 0 ? characters : state.project.speakers,
          dialogueLines:
            characters.length > 0
              ? matchStarterLinesToSpeakers(
                  state.project.dialogueLines,
                  state.project.speakers,
                  characters
                )
              : state.project.dialogueLines,
        },
      }));
    } catch (err) {
      set({
        syncingCharacters: false,
        characterSyncError: extractApiErrorMessage(err, 'Unable to sync saved Cartesia voices'),
      });
    }
  },

  refreshHealth: async () => {
    try {
      const health = await fetchHealth();
      set({ health });
    } catch {
      set({
        health: {
          status: 'unreachable',
          timestamp: new Date().toISOString(),
          mongodb: { connected: false, state: 'disconnected', error: 'Server unreachable' },
          cartesia: {
            configured: false,
            connected: false,
            status: 'error',
            message: 'Backend server unreachable',
            version: '2026-08-14',
            defaultModel: 'sonic-3.6',
          },
        },
      });
    }
  },

  loadVoices: async (force = false) => {
    if (!force && get().voices.length > 0) return;
    set({ voicesLoading: true, voicesError: null });
    try {
      const voices = await fetchVoices();
      set({ voices, voicesLoading: false });
    } catch (err) {
      set({
        voicesLoading: false,
        voicesError: extractApiErrorMessage(err, 'Failed to fetch voices from Cartesia'),
      });
    }
  },

  setProjectMeta: (patch) => {
    set((state) => ({
      project: { ...state.project, ...patch },
      isDirty: true,
    }));
  },

  newProject: (useStarter = false) => {
    stopPolling();
    const { defaultCharacters } = get();
    const nextProject = useStarter ? createStarterProject() : createBlankProject();

    if (defaultCharacters.length > 0) {
      nextProject.dialogueLines = matchStarterLinesToSpeakers(
        nextProject.dialogueLines,
        nextProject.speakers,
        defaultCharacters
      );
      nextProject.speakers = defaultCharacters.map((c) => ({ ...c }));
    } else if (!useStarter && nextProject.speakers[0] && nextProject.dialogueLines[0]) {
      nextProject.dialogueLines[0].speakerId = nextProject.speakers[0].id;
    }

    set({
      project: nextProject,
      isDirty: false,
      saveError: null,
      generationJob: null,
      generationError: null,
      isGenerating: false,
    });
  },

  loadSavedProject: async (id) => {
    stopPolling();
    const loaded = await fetchProject(id);
    set({
      project: {
        ...loaded,
        dialogueLines: renumberLines(loaded.dialogueLines || []),
      },
      isDirty: false,
      saveError: null,
      lastSavedAt: loaded.updatedAt || new Date().toISOString(),
      generationJob: null,
      generationError: null,
      isGenerating: false,
    });
  },

  saveCurrentProject: async () => {
    const { project } = get();
    set({ isSaving: true, saveError: null });
    try {
      const saved = project._id
        ? await updateProject(project._id, project)
        : await createProject(project);

      set({
        project: {
          ...saved,
          dialogueLines: renumberLines(saved.dialogueLines || []),
        },
        isDirty: false,
        isSaving: false,
        lastSavedAt: saved.updatedAt || new Date().toISOString(),
      });
      return saved;
    } catch (err) {
      set({
        isSaving: false,
        saveError: extractApiErrorMessage(err, 'Failed to save project'),
      });
      return null;
    }
  },

  addSpeaker: (partial) => {
    const state = get();
    const color =
      partial?.avatarColor || SPEAKER_COLORS[state.project.speakers.length % SPEAKER_COLORS.length];
    const speaker: Speaker = {
      id: `spk-${crypto.randomUUID().slice(0, 8)}`,
      name: partial?.name || `Character ${state.project.speakers.length + 1}`,
      voiceId: partial?.voiceId || '',
      voiceName: partial?.voiceName || '',
      description: partial?.description || '',
      avatarColor: color,
      language: partial?.language || state.project.generationSettings.language || 'hi',
      speed: partial?.speed ?? state.project.generationSettings.defaultSpeed ?? 1.0,
      emotion: partial?.emotion || 'neutral',
    };

    const nextSpeakers = [...state.project.speakers, speaker];
    set({
      defaultCharacters: nextSpeakers,
      project: {
        ...state.project,
        speakers: nextSpeakers,
      },
      isDirty: true,
    });
    scheduleDefaultCharactersPersist(nextSpeakers);

    return speaker;
  },

  updateSpeaker: (id, patch) => {
    set((state) => {
      const nextSpeakers = state.project.speakers.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      );
      scheduleDefaultCharactersPersist(nextSpeakers);
      return {
        defaultCharacters: nextSpeakers,
        project: {
          ...state.project,
          speakers: nextSpeakers,
        },
        isDirty: true,
      };
    });
  },

  removeSpeaker: (id) => {
    set((state) => {
      const remainingSpeakers = state.project.speakers.filter((s) => s.id !== id);
      const fallbackId = remainingSpeakers[0]?.id || '';
      scheduleDefaultCharactersPersist(remainingSpeakers);
      return {
        defaultCharacters: remainingSpeakers,
        project: {
          ...state.project,
          speakers: remainingSpeakers,
          dialogueLines: state.project.dialogueLines.map((line) =>
            line.speakerId === id ? { ...line, speakerId: fallbackId } : line
          ),
        },
        isDirty: true,
      };
    });
  },

  addDialogueLine: (afterIndex, initial) => {
    set((state) => {
      const defaultSpeaker = state.project.speakers[0];
      const newLine: DialogueLine = {
        id: `line-${crypto.randomUUID().slice(0, 8)}`,
        order: state.project.dialogueLines.length + 1,
        speakerId: initial?.speakerId ?? defaultSpeaker?.id ?? '',
        text: initial?.text ?? '',
        speed: initial?.speed ?? defaultSpeaker?.speed ?? state.project.generationSettings.defaultSpeed,
        emotion: initial?.emotion ?? defaultSpeaker?.emotion ?? 'neutral',
      };

      const nextLines = [...state.project.dialogueLines];
      if (typeof afterIndex === 'number' && afterIndex >= 0 && afterIndex < nextLines.length) {
        nextLines.splice(afterIndex + 1, 0, newLine);
      } else {
        nextLines.push(newLine);
      }

      return {
        project: {
          ...state.project,
          dialogueLines: renumberLines(nextLines),
        },
        isDirty: true,
      };
    });
  },

  updateDialogueLine: (id, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        dialogueLines: state.project.dialogueLines.map((line) =>
          line.id === id ? { ...line, ...patch } : line
        ),
      },
      isDirty: true,
    }));
  },

  removeDialogueLine: (id) => {
    set((state) => ({
      project: {
        ...state.project,
        dialogueLines: renumberLines(state.project.dialogueLines.filter((l) => l.id !== id)),
      },
      isDirty: true,
    }));
  },

  duplicateDialogueLine: (id) => {
    set((state) => {
      const index = state.project.dialogueLines.findIndex((l) => l.id === id);
      if (index === -1) return state;
      const source = state.project.dialogueLines[index];
      const copy: DialogueLine = {
        ...source,
        id: `line-${crypto.randomUUID().slice(0, 8)}`,
      };
      const nextLines = [...state.project.dialogueLines];
      nextLines.splice(index + 1, 0, copy);
      return {
        project: {
          ...state.project,
          dialogueLines: renumberLines(nextLines),
        },
        isDirty: true,
      };
    });
  },

  reorderDialogueLines: (fromIndex, toIndex) => {
    set((state) => {
      const list = [...state.project.dialogueLines];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= list.length ||
        toIndex >= list.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return {
        project: {
          ...state.project,
          dialogueLines: renumberLines(list),
        },
        isDirty: true,
      };
    });
  },

  importDialogueLines: (lines, mode) => {
    set((state) => {
      const created: DialogueLine[] = lines.map((line, idx) => ({
        id: `line-${crypto.randomUUID().slice(0, 8)}-${idx}`,
        order: idx + 1,
        speakerId: line.speakerId,
        text: line.text,
        speed: line.speed,
        emotion: line.emotion,
      }));

      const combined =
        mode === 'replace' ? created : [...state.project.dialogueLines, ...created];

      return {
        project: {
          ...state.project,
          dialogueLines: renumberLines(combined),
        },
        isDirty: true,
      };
    });
  },

  updateGenerationSettings: (patch) => {
    set((state) => ({
      project: {
        ...state.project,
        generationSettings: {
          ...state.project.generationSettings,
          ...patch,
          outputFormat: {
            ...state.project.generationSettings.outputFormat,
            ...(patch.outputFormat || {}),
          },
        },
      },
      isDirty: true,
    }));
  },

  startGeneration: async () => {
    stopPolling();
    const { project } = get();
    set({
      isGenerating: true,
      generationError: null,
      generationJob: null,
    });

    try {
      const started = await startAudioGeneration({
        projectName: project.name,
        speakers: project.speakers,
        dialogueLines: project.dialogueLines,
        generationSettings: project.generationSettings,
      });

      const initialStatus = await fetchGenerationStatus(started.jobId);
      set({ generationJob: initialStatus });

      if (initialStatus.status === 'completed' || initialStatus.status === 'failed') {
        set({
          isGenerating: false,
          generationError: initialStatus.error?.message || null,
        });
        return;
      }

      pollTimer = window.setInterval(async () => {
        try {
          const status = await fetchGenerationStatus(started.jobId);
          set({ generationJob: status });

          if (status.status === 'completed') {
            stopPolling();
            set({ isGenerating: false, generationError: null });
          } else if (status.status === 'failed') {
            stopPolling();
            set({
              isGenerating: false,
              generationError: status.error?.message || 'Audio generation failed',
            });
          }
        } catch (pollErr) {
          stopPolling();
          set({
            isGenerating: false,
            generationError: extractApiErrorMessage(pollErr, 'Lost connection while checking generation progress'),
          });
        }
      }, 400);
    } catch (err) {
      stopPolling();
      set({
        isGenerating: false,
        generationError: extractApiErrorMessage(err, 'Unable to start audio generation'),
      });
    }
  },

  clearGenerationState: () => {
    stopPolling();
    set({
      generationJob: null,
      generationError: null,
      isGenerating: false,
    });
  },
}));
