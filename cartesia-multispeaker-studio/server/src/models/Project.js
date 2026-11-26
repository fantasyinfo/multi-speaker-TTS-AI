import mongoose from 'mongoose';

const SpeakerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: [true, 'Speaker name is required'], trim: true, maxlength: 80 },
    voiceId: { type: String, default: '', trim: true },
    voiceName: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    avatarColor: { type: String, default: '#9AABFF', trim: true },
    language: { type: String, default: 'hi', trim: true },
    speed: { type: Number, default: 1.0, min: 0.6, max: 1.5 },
    emotion: { type: String, default: 'neutral', trim: true },
  },
  { _id: false }
);

const DialogueLineSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    speakerId: { type: String, required: true, trim: true },
    text: { type: String, default: '', maxlength: 5000 },
    speed: { type: Number, default: 1.0, min: 0.6, max: 1.5 },
    emotion: { type: String, default: 'neutral', trim: true },
  },
  { _id: false }
);

const GenerationSettingsSchema = new mongoose.Schema(
  {
    modelId: { type: String, default: 'sonic-3.6', trim: true },
    language: { type: String, default: 'hi', trim: true },
    outputFormat: {
      container: { type: String, enum: ['wav'], default: 'wav' },
      encoding: { type: String, enum: ['pcm_s16le'], default: 'pcm_s16le' },
      sampleRate: { type: Number, enum: [16000, 22050, 24000, 44100, 48000], default: 44100 },
    },
    defaultSpeed: { type: Number, default: 1.0, min: 0.6, max: 1.5 },
    pauseMs: { type: Number, default: 350, min: 0, max: 5000 },
    normalizeAudio: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [120, 'Project name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    speakers: {
      type: [SpeakerSchema],
      default: [],
    },
    dialogueLines: {
      type: [DialogueLineSchema],
      default: [],
    },
    generationSettings: {
      type: GenerationSettingsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export const Project = mongoose.model('Project', ProjectSchema);
