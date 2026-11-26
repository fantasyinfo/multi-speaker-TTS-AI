import { DefaultCharacter } from '../models/DefaultCharacter.js';
import { getActiveStorageBackend } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { listSavedAndOwnedVoices } from './cartesiaService.js';
import {
  getDefaultCharactersSqlite,
  saveDefaultCharactersSqlite,
} from './sqliteProjectStore.js';

const DEFAULT_COLORS = [
  '#9AABFF',
  '#76DFBD',
  '#F5B971',
  '#F28B82',
  '#C58AF9',
  '#78D9EC',
  '#FDD663',
  '#FF8BCB',
];

function formatCharacterNameFromVoice(voiceName) {
  const base = String(voiceName || 'Character')
    .split(' - ')[0]
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return 'Character';

  // Title-case multi-word custom names like "Mohan_dada" -> "Mohan Dada"
  return base
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildCharacterFromVoice(voice, index) {
  const slug = formatCharacterNameFromVoice(voice.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    id: `spk-${slug || index + 1}-${voice.id.slice(0, 6)}`,
    name: formatCharacterNameFromVoice(voice.name),
    voiceId: voice.id,
    voiceName: voice.name,
    description: voice.tagline || voice.description || '',
    avatarColor: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    language: voice.language || 'hi',
    speed: 1.0,
    emotion: 'neutral',
  };
}

export async function readSavedDefaultCharacters() {
  const backend = getActiveStorageBackend();
  if (backend === 'mongodb') {
    const docs = await DefaultCharacter.find().sort({ order: 1 }).lean();
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      voiceId: d.voiceId,
      voiceName: d.voiceName,
      description: d.description || '',
      avatarColor: d.avatarColor || '#9AABFF',
      language: d.language || 'hi',
      speed: d.speed ?? 1.0,
      emotion: d.emotion || 'neutral',
    }));
  }

  if (backend === 'sqlite') {
    return getDefaultCharactersSqlite();
  }

  throw new AppError('No project database is available.', 503, 'DATABASE_UNAVAILABLE');
}

export async function writeSavedDefaultCharacters(characters) {
  const normalized = (Array.isArray(characters) ? characters : []).map((c, index) => ({
    id: String(c.id || `spk-default-${index + 1}`),
    name: String(c.name || `Character ${index + 1}`).trim(),
    voiceId: String(c.voiceId || '').trim(),
    voiceName: String(c.voiceName || '').trim(),
    description: String(c.description || '').trim(),
    avatarColor: String(c.avatarColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length]),
    language: String(c.language || 'hi').trim(),
    speed: Number(c.speed ?? 1.0),
    emotion: String(c.emotion || 'neutral').trim(),
    order: index,
  }));

  const backend = getActiveStorageBackend();
  if (backend === 'mongodb') {
    await DefaultCharacter.deleteMany({});
    if (normalized.length > 0) {
      await DefaultCharacter.insertMany(normalized);
    }
    return normalized.map(({ order: _order, ...rest }) => rest);
  }

  if (backend === 'sqlite') {
    return saveDefaultCharactersSqlite(normalized.map(({ order: _order, ...rest }) => rest));
  }

  throw new AppError('No project database is available.', 503, 'DATABASE_UNAVAILABLE');
}

/**
 * Sync saved/owned Cartesia voices into persistent default characters.
 * Preserves existing user customizations (name, color, speed) for already-known voiceIds
 * and appends any newly saved Cartesia voices automatically.
 */
export async function syncDefaultCharactersFromCartesia({ fetcher = listSavedAndOwnedVoices } = {}) {
  const existing = await readSavedDefaultCharacters();

  if (!env.cartesiaApiKey && fetcher === listSavedAndOwnedVoices) {
    return { characters: existing, syncedFromCartesia: false };
  }

  const voices = await fetcher();
  const existingByVoiceId = new Map(
    existing.filter((c) => c.voiceId).map((c) => [c.voiceId, c])
  );

  const merged = [...existing];
  let nextIndex = merged.length;

  for (const voice of voices) {
    if (existingByVoiceId.has(voice.id)) {
      // Refresh voiceName in case it changed on Cartesia, keep custom character name/speed/color
      const target = existingByVoiceId.get(voice.id);
      target.voiceName = voice.name;
      continue;
    }

    // If an existing un-voiced starter character shares the same name (e.g. Mohan Dada, Chintu), bind it!
    const formattedVoiceName = formatCharacterNameFromVoice(voice.name).toLowerCase();
    const unvoicedMatch = merged.find(
      (c) => !c.voiceId && c.name.toLowerCase() === formattedVoiceName
    );
    if (unvoicedMatch) {
      unvoicedMatch.voiceId = voice.id;
      unvoicedMatch.voiceName = voice.name;
      if (!unvoicedMatch.description && (voice.tagline || voice.description)) {
        unvoicedMatch.description = voice.tagline || voice.description;
      }
      continue;
    }

    merged.push(buildCharacterFromVoice(voice, nextIndex));
    nextIndex += 1;
  }

  const saved = await writeSavedDefaultCharacters(merged);
  return { characters: saved, syncedFromCartesia: true };
}
