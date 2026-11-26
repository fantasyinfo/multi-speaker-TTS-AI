import crypto from 'crypto';

const jobs = new Map();
const MAX_STORED_JOBS = 40;

export function createGenerationJob({ projectName, totalLines }) {
  const jobId = crypto.randomUUID();
  const job = {
    jobId,
    projectName: projectName || 'Untitled Story',
    status: 'queued',
    totalLines,
    completedLines: 0,
    currentLineNumber: 0,
    currentSpeakerName: '',
    warnings: [],
    error: null,
    result: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.set(jobId, job);
  pruneOldJobs();
  return job;
}

export function getGenerationJob(jobId) {
  return jobs.get(jobId) || null;
}

export function updateGenerationJob(jobId, patch) {
  const existing = jobs.get(jobId);
  if (!existing) return null;
  Object.assign(existing, patch, { updatedAt: Date.now() });
  return existing;
}

function pruneOldJobs() {
  if (jobs.size <= MAX_STORED_JOBS) return;
  const sorted = Array.from(jobs.values()).sort((a, b) => a.createdAt - b.createdAt);
  const toRemove = sorted.length - MAX_STORED_JOBS;
  for (let i = 0; i < toRemove; i += 1) {
    jobs.delete(sorted[i].jobId);
  }
}
