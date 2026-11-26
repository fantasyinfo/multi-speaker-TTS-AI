import { GenerationSettings, LanguageOption, ModelOption, ProjectData } from '../types/studio';

export const SPEAKER_COLORS = [
  '#9AABFF',
  '#76DFBD',
  '#F5B971',
  '#F28B82',
  '#C58AF9',
  '#78D9EC',
  '#FDD663',
  '#FF8BCB',
];

export const DEFAULT_MODELS: ModelOption[] = [
  { id: 'sonic-3.6', label: 'Sonic 3.6 (Latest)', description: 'Best quality for Hindi/Hinglish & English storytelling' },
  { id: 'sonic-3.5', label: 'Sonic 3.5', description: 'Stable Sonic 3 release' },
  { id: 'sonic-3', label: 'Sonic 3', description: 'Base Sonic 3 model' },
];

export const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: 'hi', label: 'Hindi / Hinglish (hi)' },
  { code: 'en', label: 'English (en)' },
  { code: 'bn', label: 'Bengali (bn)' },
  { code: 'mr', label: 'Marathi (mr)' },
  { code: 'ta', label: 'Tamil (ta)' },
  { code: 'te', label: 'Telugu (te)' },
  { code: 'gu', label: 'Gujarati (gu)' },
  { code: 'kn', label: 'Kannada (kn)' },
  { code: 'ml', label: 'Malayalam (ml)' },
  { code: 'pa', label: 'Punjabi (pa)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'de', label: 'German (de)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'ar', label: 'Arabic (ar)' },
];

export const DEFAULT_EMOTIONS: string[] = [
  'neutral',
  'calm',
  'happy',
  'excited',
  'curious',
  'sad',
  'angry',
  'scared',
  'content',
  'enthusiastic',
  'grateful',
  'confident',
  'nostalgic',
  'anxious',
  'frustrated',
  'surprised',
  'mysterious',
  'contemplative',
];

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  modelId: 'sonic-3.6',
  language: 'hi',
  outputFormat: {
    container: 'wav',
    encoding: 'pcm_s16le',
    sampleRate: 44100,
  },
  defaultSpeed: 1.0,
  pauseMs: 350,
  normalizeAudio: false,
};

export function createStarterProject(): ProjectData {
  return {
    name: 'Mohan Ki Samajh – Saving Story',
    description: 'Hindi/Hinglish YouTube storytelling project with three expressive characters.',
    speakers: [
      {
        id: 'spk-mohan',
        name: 'Mohan Dada',
        voiceId: '',
        voiceName: '',
        description: 'Warm, wise elderly grandfather voice',
        avatarColor: '#9AABFF',
        language: 'hi',
        speed: 0.95,
        emotion: 'calm',
      },
      {
        id: 'spk-chintu',
        name: 'Chintu',
        voiceId: '',
        voiceName: '',
        description: 'Energetic young adult navigating monthly expenses',
        avatarColor: '#76DFBD',
        language: 'hi',
        speed: 1.05,
        emotion: 'curious',
      },
      {
        id: 'spk-rupaya',
        name: 'Rupaya Rani',
        voiceId: '',
        voiceName: '',
        description: 'Clear, encouraging narrator guiding financial wisdom',
        avatarColor: '#F5B971',
        language: 'hi',
        speed: 1.0,
        emotion: 'happy',
      },
    ],
    dialogueLines: [
      {
        id: 'line-1',
        order: 1,
        speakerId: 'spk-mohan',
        text: '[calm] बेटा, आज मैं तुम्हें पैसे बचाने का एक आसान तरीका बताऊंगा।',
        speed: 0.95,
        emotion: 'calm',
      },
      {
        id: 'line-2',
        order: 2,
        speakerId: 'spk-chintu',
        text: '[curious] लेकिन दादाजी, मेरी सैलरी तो महीने के बीच में ही खत्म हो जाती है!',
        speed: 1.05,
        emotion: 'curious',
      },
      {
        id: 'line-3',
        order: 3,
        speakerId: 'spk-rupaya',
        text: '[happy] तो चलिए, आज से पैसों को समझदारी से संभालना सीखते हैं।',
        speed: 1.0,
        emotion: 'happy',
      },
    ],
    generationSettings: { ...DEFAULT_GENERATION_SETTINGS },
  };
}

export function createBlankProject(name = 'Untitled Story'): ProjectData {
  return {
    name,
    description: '',
    speakers: [
      {
        id: `spk-${crypto.randomUUID().slice(0, 8)}`,
        name: 'Narrator',
        voiceId: '',
        voiceName: '',
        description: 'Primary storyteller',
        avatarColor: '#9AABFF',
        language: 'hi',
        speed: 1.0,
        emotion: 'neutral',
      },
    ],
    dialogueLines: [
      {
        id: `line-${crypto.randomUUID().slice(0, 8)}`,
        order: 1,
        speakerId: '',
        text: '',
        speed: 1.0,
        emotion: 'neutral',
      },
    ],
    generationSettings: { ...DEFAULT_GENERATION_SETTINGS },
  };
}
