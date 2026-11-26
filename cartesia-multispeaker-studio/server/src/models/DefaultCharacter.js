import mongoose from 'mongoose';

const DefaultCharacterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    voiceId: { type: String, default: '', trim: true },
    voiceName: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    avatarColor: { type: String, default: '#9AABFF', trim: true },
    language: { type: String, default: 'hi', trim: true },
    speed: { type: Number, default: 1.0, min: 0.6, max: 1.5 },
    emotion: { type: String, default: 'neutral', trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DefaultCharacter = mongoose.model('DefaultCharacter', DefaultCharacterSchema);
