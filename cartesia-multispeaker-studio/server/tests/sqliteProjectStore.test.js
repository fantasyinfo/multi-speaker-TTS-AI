import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  closeSqliteStore,
  createProjectSqlite,
  deleteProjectSqlite,
  getProjectByIdSqlite,
  initSqliteStore,
  listProjectsSqlite,
  updateProjectSqlite,
} from '../src/services/sqliteProjectStore.js';

test('sqliteProjectStore persists projects to local SQLite file across reopens', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cartesia-sqlite-test-'));
  const sqliteFile = path.join(tempDir, 'studio.sqlite');

  try {
    await initSqliteStore(sqliteFile);

    const created = await createProjectSqlite({
      name: 'Mohan Ki Samajh – Saving Story',
      description: 'SQLite fallback test',
      speakers: [
        { id: 's1', name: 'Mohan Dada', voiceId: 'v-123', language: 'hi', speed: 1.0, emotion: 'calm' },
      ],
      dialogueLines: [
        { id: 'l1', order: 1, speakerId: 's1', text: 'बेटा, बचत ज़रूरी है।', speed: 1.0, emotion: 'calm' },
      ],
      generationSettings: { modelId: 'sonic-3.6', language: 'hi', pauseMs: 350 },
    });

    assert.ok(created._id);
    assert.equal(created.name, 'Mohan Ki Samajh – Saving Story');

    // Reopen from disk to prove persistence
    await closeSqliteStore();
    await initSqliteStore(sqliteFile);

    const all = listProjectsSqlite();
    assert.equal(all.length, 1);
    assert.equal(all[0].speakers[0].name, 'Mohan Dada');

    const updated = await updateProjectSqlite(created._id, { name: 'Updated Story Title' });
    assert.equal(updated.name, 'Updated Story Title');

    const fetched = getProjectByIdSqlite(created._id);
    assert.equal(fetched.name, 'Updated Story Title');

    const deleted = await deleteProjectSqlite(created._id);
    assert.equal(deleted._id, created._id);
    assert.equal(listProjectsSqlite().length, 0);
  } finally {
    await closeSqliteStore();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
