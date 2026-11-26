import { Project } from '../models/Project.js';
import { getActiveStorageBackend } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import {
  createProjectSqlite,
  deleteProjectSqlite,
  getProjectByIdSqlite,
  listProjectsSqlite,
  updateProjectSqlite,
} from './sqliteProjectStore.js';

function getBackendOrThrow() {
  const backend = getActiveStorageBackend();
  if (backend === 'none') {
    throw new AppError(
      'No project database is available (neither MongoDB nor local SQLite is initialized).',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }
  return backend;
}

export function normalizeLineOrders(lines) {
  return lines.map((line, index) => ({
    ...line,
    order: index + 1,
  }));
}

export async function listAllProjects() {
  const backend = getBackendOrThrow();
  if (backend === 'mongodb') {
    return Project.find()
      .sort({ updatedAt: -1 })
      .select('name description speakers dialogueLines generationSettings createdAt updatedAt')
      .lean();
  }
  return listProjectsSqlite();
}

export async function findProjectById(id) {
  const backend = getBackendOrThrow();
  if (backend === 'mongodb') {
    return Project.findById(id).lean();
  }
  return getProjectByIdSqlite(id);
}

export async function insertProject(payload) {
  const backend = getBackendOrThrow();
  if (backend === 'mongodb') {
    const doc = await Project.create(payload);
    return doc.toObject();
  }
  return createProjectSqlite(payload);
}

export async function saveProjectUpdate(id, updatePayload) {
  const backend = getBackendOrThrow();
  if (backend === 'mongodb') {
    return Project.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).lean();
  }
  return updateProjectSqlite(id, updatePayload);
}

export async function removeProject(id) {
  const backend = getBackendOrThrow();
  if (backend === 'mongodb') {
    return Project.findByIdAndDelete(id).lean();
  }
  return deleteProjectSqlite(id);
}
