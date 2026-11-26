export interface Speaker {
  id: string;
  name: string;
  voiceId: string;
  voiceName: string;
  description: string;
  avatarColor: string;
  language: string;
  speed: number;
  emotion: string;
}

export interface DialogueLine {
  id: string;
  order: number;
  speakerId: string;
  text: string;
  speed: number;
  emotion: string;
}

export interface GenerationSettings {
  modelId: string;
  language: string;
  outputFormat: {
    container: 'wav';
    encoding: 'pcm_s16le';
    sampleRate: number;
  };
  defaultSpeed: number;
  pauseMs: number;
  normalizeAudio: boolean;
}

export interface ProjectData {
  _id?: string;
  name: string;
  description: string;
  speakers: Speaker[];
  dialogueLines: DialogueLine[];
  generationSettings: GenerationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectSummary {
  _id: string;
  name: string;
  description: string;
  speakerCount: number;
  lineCount: number;
  language: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartesiaVoice {
  id: string;
  name: string;
  description: string;
  tagline: string;
  language: string;
  accents: Array<{ language?: string; locale?: string }>;
  gender: string | null;
  visibility: string;
  isOwner: boolean;
  isPublic: boolean;
  isStarred?: boolean;
  previewFileUrl: string | null;
  createdAt: string | null;
}

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export interface LanguageOption {
  code: string;
  label: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  mongodb: {
    backend?: 'mongodb' | 'sqlite' | 'none';
    connected: boolean;
    state: string;
    error: string | null;
    sqlitePath?: string;
  };
  cartesia: {
    configured: boolean;
    connected: boolean;
    status: 'connected' | 'unconfigured' | 'error';
    message: string;
    version: string;
    defaultModel: string;
  };
}

export interface GenerationResult {
  jobId: string;
  filename: string;
  lineCount: number;
  durationSeconds: number;
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  totalBytes: number;
  audioUrl: string;
  downloadUrl: string;
}

export interface GenerationJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'merging' | 'completed' | 'failed';
  projectName: string;
  totalLines: number;
  completedLines: number;
  currentLineNumber: number;
  currentSpeakerName: string;
  warnings: string[];
  error: {
    code: string;
    message: string;
    lineNumber?: number;
    speakerName?: string;
  } | null;
  result: GenerationResult | null;
}
