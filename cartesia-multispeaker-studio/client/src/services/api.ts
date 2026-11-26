import axios, { AxiosError } from 'axios';
import {
  CartesiaVoice,
  GenerationJobStatus,
  HealthStatus,
  LanguageOption,
  ModelOption,
  ProjectData,
  ProjectSummary,
} from '../types/studio';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export function extractApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
    const serverMsg = axiosErr.response?.data?.error?.message;
    if (serverMsg) return serverMsg;
    if (axiosErr.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!axiosErr.response) return 'Unable to reach backend server. Ensure the Express server is running.';
    return axiosErr.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function resolveBackendAudioUrl(relativeOrAbsoluteUrl: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsoluteUrl)) return relativeOrAbsoluteUrl;
  const origin = API_BASE_URL.replace(/\/api$/, '');
  return `${origin}${relativeOrAbsoluteUrl.startsWith('/') ? '' : '/'}${relativeOrAbsoluteUrl}`;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>('/health');
  return data;
}

export async function fetchVoices(params?: {
  q?: string;
  language?: string;
  ownership?: string;
}): Promise<CartesiaVoice[]> {
  const { data } = await apiClient.get<{ voices: CartesiaVoice[] }>('/voices', { params });
  return data.voices;
}

export async function fetchVoiceOptions(): Promise<{
  models: ModelOption[];
  languages: LanguageOption[];
  emotions: string[];
}> {
  const { data } = await apiClient.get<{
    models: ModelOption[];
    languages: LanguageOption[];
    emotions: string[];
  }>('/voices/options');
  return data;
}

export function getVoicePreviewProxyUrl(previewFileUrl: string): string {
  return `${API_BASE_URL}/voices/preview?url=${encodeURIComponent(previewFileUrl)}`;
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const { data } = await apiClient.get<{ projects: ProjectSummary[] }>('/projects');
  return data.projects;
}

export async function fetchProject(id: string): Promise<ProjectData> {
  const { data } = await apiClient.get<{ project: ProjectData }>(`/projects/${id}`);
  return data.project;
}

export async function createProject(project: ProjectData): Promise<ProjectData> {
  const { data } = await apiClient.post<{ project: ProjectData }>('/projects', project);
  return data.project;
}

export async function updateProject(id: string, project: Partial<ProjectData>): Promise<ProjectData> {
  const { data } = await apiClient.put<{ project: ProjectData }>(`/projects/${id}`, project);
  return data.project;
}

export async function deleteProject(id: string): Promise<string> {
  const { data } = await apiClient.delete<{ deletedId: string }>(`/projects/${id}`);
  return data.deletedId;
}

export async function fetchDefaultCharacters(): Promise<{
  characters: ProjectData['speakers'];
  syncedFromCartesia: boolean;
}> {
  const { data } = await apiClient.get<{
    characters: ProjectData['speakers'];
    syncedFromCartesia: boolean;
  }>('/characters/defaults');
  return data;
}

export async function saveDefaultCharacters(
  characters: ProjectData['speakers']
): Promise<ProjectData['speakers']> {
  const { data } = await apiClient.put<{ characters: ProjectData['speakers'] }>(
    '/characters/defaults',
    { characters }
  );
  return data.characters;
}

export async function syncDefaultCharacters(): Promise<{
  characters: ProjectData['speakers'];
  syncedFromCartesia: boolean;
}> {
  const { data } = await apiClient.post<{
    characters: ProjectData['speakers'];
    syncedFromCartesia: boolean;
  }>('/characters/defaults/sync');
  return data;
}

export async function startAudioGeneration(payload: {
  projectName: string;
  speakers: ProjectData['speakers'];
  dialogueLines: ProjectData['dialogueLines'];
  generationSettings: ProjectData['generationSettings'];
}): Promise<{ jobId: string; status: string; totalLines: number }> {
  const { data } = await apiClient.post('/generate', payload);
  return data;
}

export async function fetchGenerationStatus(jobId: string): Promise<GenerationJobStatus> {
  const { data } = await apiClient.get<GenerationJobStatus>(`/generate/${jobId}/status`);
  return data;
}

export async function previewDialogueClip(payload: {
  voiceId: string;
  text: string;
  modelId: string;
  language: string;
  speed: number;
  emotion: string;
  sampleRate: number;
}): Promise<{ blob: Blob; warning: string | null }> {
  const response = await apiClient.post('/generate/preview', payload, {
    responseType: 'blob',
    timeout: 45000,
  });
  const warning = (response.headers['x-cartesia-warning'] as string | undefined) || null;
  return { blob: response.data, warning };
}
