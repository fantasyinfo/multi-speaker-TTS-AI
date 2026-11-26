import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { connectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { closeSqliteStore } from '../src/services/sqliteProjectStore.js';
import {
  readSavedDefaultCharacters,
  syncDefaultCharactersFromCartesia,
  writeSavedDefaultCharacters,
} from '../src/services/defaultCharactersRepository.js';

test('defaultCharactersRepository syncs Cartesia saved voices and persists them forever in SQLite', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cartesia-defaults-test-'));
  const dbPath = path.join(tempDir, 'studio.sqlite');
  const prevMode = env.dbMode;
  const prevPath = env.sqlitePath;

  try {
    env.dbMode = 'sqlite';
    env.sqlitePath = dbPath;
    await connectDb();

    const mockCartesiaVoices = async () => [
      { id: 'voice-kabir', name: 'Kabir - Service Integrator', language: 'hi', tagline: 'Composed delivery' },
      { id: 'voice-meera', name: 'Meera - Bright Companion', language: 'hi', tagline: 'Friendly Hindi female' },
      { id: 'voice-rupee', name: 'Rupee Rani', language: 'hi', tagline: '' },
      { id: 'voice-mohan', name: 'Mohan_dada', language: 'hi', tagline: '' },
      { id: 'voice-chintu', name: 'Chintu', language: 'hi', tagline: '' },
      { id: 'voice-gaurav', name: 'Gaurav', language: 'en', tagline: '' },
    ];

    const synced = await syncDefaultCharactersFromCartesia({ fetcher: mockCartesiaVoices });
    assert.equal(synced.syncedFromCartesia, true);
    assert.equal(synced.characters.length, 6);
    assert.deepEqual(
      synced.characters.map((c) => c.name),
      ['Kabir', 'Meera', 'Rupee Rani', 'Mohan Dada', 'Chintu', 'Gaurav']
    );
    assert.equal(synced.characters[3].voiceId, 'voice-mohan');

    // Customize speed on one character and verify persistence across reopen
    synced.characters[3].speed = 0.9;
    await writeSavedDefaultCharacters(synced.characters);

    await closeSqliteStore();
    await connectDb();

    const reloaded = await readSavedDefaultCharacters();
    assert.equal(reloaded.length, 6);
    assert.equal(reloaded[3].speed, 0.9);
    assert.equal(reloaded[3].voiceId, 'voice-mohan');
  } finally {
    env.dbMode = prevMode;
    env.sqlitePath = prevPath;
    await closeSqliteStore();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
