import { AppError } from '../utils/errors.js';
import {
  findProjectById,
  insertProject,
  listAllProjects,
  normalizeLineOrders,
  removeProject,
  saveProjectUpdate,
} from '../services/projectRepository.js';

export async function listProjects(_req, res, next) {
  try {
    const projects = await listAllProjects();

    const summaries = projects.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      speakerCount: p.speakers?.length || 0,
      lineCount: p.dialogueLines?.length || 0,
      language: p.generationSettings?.language || 'hi',
      modelId: p.generationSettings?.modelId || 'sonic-3.6',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.json({ projects: summaries });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req, res, next) {
  try {
    const project = await findProjectById(req.params.id);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const { name, description, speakers, dialogueLines, generationSettings } = req.body || {};

    if (!name || !String(name).trim()) {
      throw new AppError('Project name is required', 400, 'VALIDATION_ERROR');
    }

    const project = await insertProject({
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      speakers: Array.isArray(speakers) ? speakers : [],
      dialogueLines: Array.isArray(dialogueLines) ? normalizeLineOrders(dialogueLines) : [],
      generationSettings: generationSettings || {},
    });

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { name, description, speakers, dialogueLines, generationSettings } = req.body || {};

    const updatePayload = {};
    if (name !== undefined) {
      if (!String(name).trim()) {
        throw new AppError('Project name cannot be empty', 400, 'VALIDATION_ERROR');
      }
      updatePayload.name = String(name).trim();
    }
    if (description !== undefined) updatePayload.description = String(description).trim();
    if (Array.isArray(speakers)) updatePayload.speakers = speakers;
    if (Array.isArray(dialogueLines)) {
      updatePayload.dialogueLines = normalizeLineOrders(dialogueLines);
    }
    if (generationSettings && typeof generationSettings === 'object') {
      updatePayload.generationSettings = generationSettings;
    }

    const project = await saveProjectUpdate(req.params.id, updatePayload);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    res.json({ project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const deleted = await removeProject(req.params.id);
    if (!deleted) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
    res.json({ deletedId: deleted._id });
  } catch (err) {
    next(err);
  }
}
