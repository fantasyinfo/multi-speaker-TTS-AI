import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createApp } from '../src/app.js';
import { closeSqliteStore, initSqliteStore } from '../src/services/sqliteProjectStore.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function invokeApp(app, { method = 'GET', url = '/', body = undefined } = {}) {
  return new Promise((resolve, reject) => {
    const rawBody = body !== undefined ? Buffer.from(JSON.stringify(body), 'utf8') : null;
    const socket = new PassThrough();
    socket.remoteAddress = '127.0.0.1';
    const req = new http.IncomingMessage(socket);

    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      host: 'localhost:5000',
      ...(rawBody
        ? {
            'content-type': 'application/json',
            'content-length': String(rawBody.length),
          }
        : {}),
    };
    if (rawBody) {
      req.push(rawBody);
    }
    req.push(null);

    const res = new EventEmitter();
    const chunks = [];
    const headers = {};
    res.statusCode = 200;
    res.setHeader = (k, v) => {
      headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => headers[k.toLowerCase()];
    res.removeHeader = (k) => {
      delete headers[k.toLowerCase()];
    };
    res.writeHead = (status, hdrs = {}) => {
      res.statusCode = status;
      for (const [k, v] of Object.entries(hdrs)) {
        headers[k.toLowerCase()] = v;
      }
      return res;
    };
    res.write = (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    };
    res.end = (chunk) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const text = Buffer.concat(chunks).toString('utf8');
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        // non-JSON response
      }
      resolve({ status: res.statusCode, headers, text, json });
    };

    app(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

test('API health, options, and error handling behave safely without leaking secrets', async () => {
  const app = createApp();

  const healthRes = await invokeApp(app, { method: 'GET', url: '/api/health' });
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.json.status, 'ok');
  assert.ok('cartesia' in healthRes.json);
  assert.equal('apiKey' in healthRes.json.cartesia, false);
  assert.equal('cartesiaApiKey' in healthRes.json.cartesia, false);

  const optionsRes = await invokeApp(app, { method: 'GET', url: '/api/voices/options' });
  assert.equal(optionsRes.status, 200);
  assert.ok(optionsRes.json.models.some((m) => m.id === 'sonic-3.6'));
  assert.ok(optionsRes.json.languages.some((l) => l.code === 'hi'));
  assert.ok(optionsRes.json.emotions.includes('excited'));

  const notFoundRes = await invokeApp(app, { method: 'GET', url: '/api/does-not-exist' });
  assert.equal(notFoundRes.status, 404);
  assert.equal(notFoundRes.json.error.code, 'NOT_FOUND');
  assert.equal('stack' in notFoundRes.json.error, false);

  const genRes = await invokeApp(app, { method: 'POST', url: '/api/generate', body: {} });
  assert.ok(genRes.status === 400 || genRes.status === 503);
  assert.ok(genRes.json.error?.code);
  assert.equal('stack' in genRes.json.error, false);
});

test('Project CRUD routes work cleanly with local SQLite fallback', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cartesia-api-sqlite-'));
  const dbPath = path.join(tempDir, 'studio.sqlite');
  const app = createApp();

  try {
    // Initialize SQLite directly? Wait: getActiveStorageBackend checks activeBackend === 'sqlite' via connectDb()
    // Let's set DB_MODE=sqlite via connectDb or test via projectRepository + initSqliteStore:
    await initSqliteStore(dbPath);
    const { connectDb } = await import('../src/config/db.js');
    const { env } = await import('../src/config/env.js');
    const prevMode = env.dbMode;
    const prevPath = env.sqlitePath;
    env.dbMode = 'sqlite';
    env.sqlitePath = dbPath;
    await connectDb();

    const createRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/projects',
      body: {
        name: 'SQLite Story',
        description: 'Testing API CRUD',
        speakers: [{ id: 's1', name: 'Mohan Dada', voiceId: '', language: 'hi', speed: 1, emotion: 'calm' }],
        dialogueLines: [{ id: 'l1', order: 1, speakerId: 's1', text: 'नमस्ते', speed: 1, emotion: 'calm' }],
      },
    });
    assert.equal(createRes.status, 201);
    const createdId = createRes.json.project._id;
    assert.ok(createdId);

    const listRes = await invokeApp(app, { method: 'GET', url: '/api/projects' });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.json.projects.length, 1);
    assert.equal(listRes.json.projects[0].name, 'SQLite Story');

    const updateRes = await invokeApp(app, {
      method: 'PUT',
      url: `/api/projects/${createdId}`,
      body: { name: 'Renamed SQLite Story' },
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.json.project.name, 'Renamed SQLite Story');

    const deleteRes = await invokeApp(app, { method: 'DELETE', url: `/api/projects/${createdId}` });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.json.deletedId, createdId);

    env.dbMode = prevMode;
    env.sqlitePath = prevPath;
  } finally {
    await closeSqliteStore();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
