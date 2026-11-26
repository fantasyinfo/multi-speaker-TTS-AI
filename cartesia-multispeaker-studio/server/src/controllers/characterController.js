import {
  readSavedDefaultCharacters,
  syncDefaultCharactersFromCartesia,
  writeSavedDefaultCharacters,
} from '../services/defaultCharactersRepository.js';
import { AppError } from '../utils/errors.js';

export async function getDefaultCharacters(_req, res, next) {
  try {
    let characters = await readSavedDefaultCharacters();
    let syncedFromCartesia = false;

    // First run (nothing persisted yet): auto-populate from user's Cartesia Saved & Owned voices
    if (characters.length === 0) {
      try {
        const synced = await syncDefaultCharactersFromCartesia();
        characters = synced.characters;
        syncedFromCartesia = synced.syncedFromCartesia;
      } catch {
        // Return empty cleanly if Cartesia is temporarily unreachable
      }
    }

    res.json({ characters, syncedFromCartesia });
  } catch (err) {
    next(err);
  }
}

export async function saveDefaultCharacters(req, res, next) {
  try {
    const { characters } = req.body || {};
    if (!Array.isArray(characters)) {
      throw new AppError('characters array is required', 400, 'VALIDATION_ERROR');
    }

    const saved = await writeSavedDefaultCharacters(characters);
    res.json({ characters: saved });
  } catch (err) {
    next(err);
  }
}

export async function syncDefaultCharacters(_req, res, next) {
  try {
    const { characters, syncedFromCartesia } = await syncDefaultCharactersFromCartesia();
    res.json({ characters, syncedFromCartesia });
  } catch (err) {
    next(err);
  }
}
