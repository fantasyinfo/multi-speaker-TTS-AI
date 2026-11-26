import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import initSqlJs from 'sql.js';

let SQL = null;
let dbInstance = null;
let dbFilePath = null;

async function ensureSqlModule() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

async function persistDatabase() {
  if (!dbInstance || !dbFilePath) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  await fs.mkdir(path.dirname(dbFilePath), { recursive: true });
  const tempPath = `${dbFilePath}.tmp`;
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, dbFilePath);
}

function rowToProject(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    description: row.description || '',
    speakers: JSON.parse(row.speakers_json || '[]'),
    dialogueLines: JSON.parse(row.dialogue_lines_json || '[]'),
    generationSettings: JSON.parse(row.generation_settings_json || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function initSqliteStore(filePath) {
  const SqlModule = await ensureSqlModule();
  dbFilePath = filePath;
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let existingBytes = null;
  try {
    existingBytes = await fs.readFile(filePath);
  } catch {
    existingBytes = null;
  }

  dbInstance = existingBytes ? new SqlModule.Database(existingBytes) : new SqlModule.Database();

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      speakers_json TEXT NOT NULL DEFAULT '[]',
      dialogue_lines_json TEXT NOT NULL DEFAULT '[]',
      generation_settings_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS default_characters (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  await persistDatabase();
  return filePath;
}

export function isSqliteInitialized() {
  return Boolean(dbInstance);
}

export function getSqliteFilePath() {
  return dbFilePath;
}

export async function closeSqliteStore() {
  if (dbInstance) {
    await persistDatabase();
    dbInstance.close();
    dbInstance = null;
  }
}

export function listProjectsSqlite() {
  if (!dbInstance) throw new Error('SQLite store is not initialized');
  const stmt = dbInstance.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
  const results = [];
  while (stmt.step()) {
    results.push(rowToProject(stmt.getAsObject()));
  }
  stmt.free();
  return results;
}

export function getProjectByIdSqlite(id) {
  if (!dbInstance) throw new Error('SQLite store is not initialized');
  const stmt = dbInstance.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1');
  stmt.bind([String(id)]);
  const found = stmt.step() ? rowToProject(stmt.getAsObject()) : null;
  stmt.free();
  return found;
}

export async function createProjectSqlite({
  name,
  description = '',
  speakers = [],
  dialogueLines = [],
  generationSettings = {},
}) {
  if (!dbInstance) throw new Error('SQLite store is not initialized');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  dbInstance.run(
    `INSERT INTO projects (
      id, name, description, speakers_json, dialogue_lines_json, generation_settings_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      description,
      JSON.stringify(speakers),
      JSON.stringify(dialogueLines),
      JSON.stringify(generationSettings),
      now,
      now,
    ]
  );

  await persistDatabase();
  return getProjectByIdSqlite(id);
}

export async function updateProjectSqlite(id, patch) {
  if (!dbInstance) throw new Error('SQLite store is not initialized');
  const existing = getProjectByIdSqlite(id);
  if (!existing) return null;

  const next = {
    name: patch.name !== undefined ? patch.name : existing.name,
    description: patch.description !== undefined ? patch.description : existing.description,
    speakers: patch.speakers !== undefined ? patch.speakers : existing.speakers,
    dialogueLines:
      patch.dialogueLines !== undefined ? patch.dialogueLines : existing.dialogueLines,
    generationSettings:
      patch.generationSettings !== undefined
        ? patch.generationSettings
        : existing.generationSettings,
  };
  const updatedAt = new Date().toISOString();

  dbInstance.run(
    `UPDATE projects
     SET name = ?, description = ?, speakers_json = ?, dialogue_lines_json = ?, generation_settings_json = ?, updated_at = ?
     WHERE id = ?`,
    [
      next.name,
      next.description,
      JSON.stringify(next.speakers),
      JSON.stringify(next.dialogueLines),
      JSON.stringify(next.generationSettings),
      updatedAt,
      String(id),
    ]
  );

  await persistDatabase();
  return getProjectByIdSqlite(id);
}

export async function deleteProjectSqlite(id) {
  if (!dbInstance) throw new Error('SQLite store is not initialized');
  const existing = getProjectByIdSqlite(id);
  if (!existing) return null;

  dbInstance.run('DELETE FROM projects WHERE id = ?', [String(id)]);
  await persistDatabase();
  return existing;
}

export function getDefaultCharactersSqlite() {
  if (!dbInstance) throw new Error('SQLite store is not initialized');
  const stmt = dbInstance.prepare(
    'SELECT data_json FROM default_characters ORDER BY sort_order ASC'
  );
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.data_json) {
      results.push(JSON.parse(row.data_json));
    }
  }
  stmt.free();
  return results;
}

export async function saveDefaultCharactersSqlite(characters) {
  if (!dbInstance) throw new Error('SQLite store is not initialized');
  const now = new Date().toISOString();
  dbInstance.run('DELETE FROM default_characters');

  characters.forEach((char, idx) => {
    dbInstance.run(
      'INSERT INTO default_characters (id, data_json, sort_order, updated_at) VALUES (?, ?, ?, ?)',
      [String(char.id), JSON.stringify(char), idx, now]
    );
  });

  await persistDatabase();
  return getDefaultCharactersSqlite();
}
