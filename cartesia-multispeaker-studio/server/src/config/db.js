import mongoose from 'mongoose';
import { env } from './env.js';
import {
  getSqliteFilePath,
  initSqliteStore,
  isSqliteInitialized,
} from '../services/sqliteProjectStore.js';

let lastMongoError = null;
let activeBackend = 'none'; // 'mongodb' | 'sqlite' | 'none'

export async function connectDb() {
  if (env.dbMode === 'sqlite') {
    await initSqliteStore(env.sqlitePath);
    activeBackend = 'sqlite';
    console.log(`Using local SQLite storage at ${env.sqlitePath}`);
    return true;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 3000,
    });
    lastMongoError = null;
    activeBackend = 'mongodb';
    console.log('MongoDB connected successfully.');
    return true;
  } catch (err) {
    lastMongoError = err.message || 'Unable to connect to MongoDB';
    console.warn(`MongoDB unavailable (${lastMongoError}). Falling back to local SQLite file storage...`);

    if (env.dbMode === 'mongodb') {
      activeBackend = 'none';
      return false;
    }

    try {
      await initSqliteStore(env.sqlitePath);
      activeBackend = 'sqlite';
      console.log(`Local SQLite database ready at ${env.sqlitePath}`);
      return true;
    } catch (sqliteErr) {
      console.error('SQLite initialization failed:', sqliteErr?.message || sqliteErr);
      activeBackend = 'none';
      return false;
    }
  }
}

export function getActiveStorageBackend() {
  if (mongoose.connection.readyState === 1) return 'mongodb';
  if (activeBackend === 'sqlite' && isSqliteInitialized()) return 'sqlite';
  return 'none';
}

export function getDbStatus() {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const backend = getActiveStorageBackend();

  return {
    backend,
    connected: backend === 'mongodb' || backend === 'sqlite',
    state: backend === 'sqlite' ? 'sqlite_ready' : states[readyState] || 'unknown',
    error: backend === 'mongodb' ? null : lastMongoError,
    sqlitePath: backend === 'sqlite' ? getSqliteFilePath() : env.sqlitePath,
  };
}
