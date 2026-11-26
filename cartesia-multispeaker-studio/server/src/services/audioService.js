import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../utils/errors.js';

/**
 * Parse a RIFF/WAVE PCM buffer and extract format metadata and raw audio frames.
 */
export function parseWavBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) {
    throw new AppError('Invalid WAV audio data: buffer is too small', 422, 'INVALID_WAV');
  }

  const riffHeader = buffer.toString('ascii', 0, 4);
  const waveHeader = buffer.toString('ascii', 8, 12);

  if (riffHeader !== 'RIFF' || waveHeader !== 'WAVE') {
    throw new AppError('Invalid WAV audio data: missing RIFF/WAVE header', 422, 'INVALID_WAV');
  }

  let offset = 12;
  let fmt = null;
  const dataChunks = [];

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = Math.min(chunkDataStart + chunkSize, buffer.length);

    if (chunkId === 'fmt ') {
      if (chunkSize < 16 || chunkDataStart + 16 > buffer.length) {
        throw new AppError('Invalid WAV fmt chunk', 422, 'INVALID_WAV');
      }
      fmt = {
        audioFormat: buffer.readUInt16LE(chunkDataStart),
        numChannels: buffer.readUInt16LE(chunkDataStart + 2),
        sampleRate: buffer.readUInt32LE(chunkDataStart + 4),
        byteRate: buffer.readUInt32LE(chunkDataStart + 8),
        blockAlign: buffer.readUInt16LE(chunkDataStart + 12),
        bitsPerSample: buffer.readUInt16LE(chunkDataStart + 14),
      };
    } else if (chunkId === 'data') {
      dataChunks.push(buffer.subarray(chunkDataStart, chunkDataEnd));
    }

    // RIFF chunks are word-aligned (even byte boundary)
    const paddedSize = chunkSize + (chunkSize % 2);
    const nextOffset = chunkDataStart + paddedSize;
    if (nextOffset <= offset) {
      break;
    }
    offset = nextOffset;
  }

  if (!fmt) {
    throw new AppError('Invalid WAV audio data: missing fmt chunk', 422, 'INVALID_WAV');
  }

  if (fmt.audioFormat !== 1) {
    throw new AppError(
      `Unsupported WAV audio format (${fmt.audioFormat}). Expected uncompressed PCM (format 1).`,
      422,
      'UNSUPPORTED_WAV_FORMAT'
    );
  }

  if (dataChunks.length === 0) {
    throw new AppError('Invalid WAV audio data: missing data chunk', 422, 'INVALID_WAV');
  }

  const pcmData = dataChunks.length === 1 ? dataChunks[0] : Buffer.concat(dataChunks);
  return { ...fmt, pcmData };
}

/**
 * Generate silence PCM bytes aligned to blockAlign for the given WAV format.
 */
export function createSilencePcm(durationMs, format) {
  const clampedMs = Math.max(0, Math.min(5000, Number(durationMs) || 0));
  if (clampedMs === 0) {
    return Buffer.alloc(0);
  }

  const totalFrames = Math.round((format.sampleRate * clampedMs) / 1000);
  const byteLength = totalFrames * format.blockAlign;
  const silence = Buffer.alloc(byteLength);

  if (format.bitsPerSample === 8) {
    silence.fill(0x80);
  }
  return silence;
}

/**
 * Safely peak-normalize signed 16-bit PCM audio to targetPeak (default 0.92) without clipping.
 */
export function normalizePcm16(pcmBuffer, targetPeak = 0.92) {
  if (!Buffer.isBuffer(pcmBuffer) || pcmBuffer.length < 2) {
    return pcmBuffer;
  }

  const sampleCount = Math.floor(pcmBuffer.length / 2);
  let maxAbs = 0;

  for (let i = 0; i < sampleCount; i += 1) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    const abs = Math.abs(sample);
    if (abs > maxAbs) {
      maxAbs = abs;
    }
  }

  if (maxAbs === 0) {
    return pcmBuffer;
  }

  const desiredMax = Math.floor(32767 * targetPeak);
  const gain = desiredMax / maxAbs;

  // Avoid boosting tiny noise floors excessively (cap gain at 4x)
  if (gain >= 0.98 && gain <= 1.02) {
    return pcmBuffer;
  }
  const safeGain = Math.min(gain, 4.0);

  const normalized = Buffer.allocUnsafe(pcmBuffer.length);
  for (let i = 0; i < sampleCount; i += 1) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    const scaled = Math.max(-32768, Math.min(32767, Math.round(sample * safeGain)));
    normalized.writeInt16LE(scaled, i * 2);
  }

  return normalized;
}

/**
 * Write a canonical 44-byte RIFF/WAVE PCM header around raw PCM bytes.
 */
export function buildWavBuffer(pcmData, format) {
  const header = Buffer.alloc(44);
  const dataSize = pcmData.length;
  const byteRate = format.sampleRate * format.numChannels * (format.bitsPerSample / 8);
  const blockAlign = format.numChannels * (format.bitsPerSample / 8);

  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 4, 'ascii');

  header.write('fmt ', 12, 4, 'ascii');
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format = 1
  header.writeUInt16LE(format.numChannels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);

  header.write('data', 36, 4, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Merge multiple WAV buffers sequentially with configurable silence pauses and format verification.
 */
export function mergeWavBuffers(wavBuffers, options = {}) {
  if (!Array.isArray(wavBuffers) || wavBuffers.length === 0) {
    throw new AppError('At least one audio clip is required for merging', 400, 'NO_AUDIO_CLIPS');
  }

  const pauseMs = Number(options.pauseMs ?? 350);
  const normalize = Boolean(options.normalize);

  const parsedClips = wavBuffers.map((buf, index) => {
    try {
      return parseWavBuffer(buf);
    } catch (err) {
      throw new AppError(
        `Clip #${index + 1} could not be parsed: ${err.message}`,
        422,
        'AUDIO_PARSE_ERROR'
      );
    }
  });

  const base = parsedClips[0];
  for (let i = 1; i < parsedClips.length; i += 1) {
    const clip = parsedClips[i];
    if (
      clip.audioFormat !== base.audioFormat ||
      clip.numChannels !== base.numChannels ||
      clip.sampleRate !== base.sampleRate ||
      clip.bitsPerSample !== base.bitsPerSample
    ) {
      throw new AppError(
        `Incompatible WAV format at clip #${i + 1}: expected ${base.sampleRate}Hz/${base.numChannels}ch/${base.bitsPerSample}-bit, got ${clip.sampleRate}Hz/${clip.numChannels}ch/${clip.bitsPerSample}-bit`,
        422,
        'INCOMPATIBLE_AUDIO_FORMAT'
      );
    }
  }

  const silenceBuffer = createSilencePcm(pauseMs, base);
  const segments = [];

  for (let i = 0; i < parsedClips.length; i += 1) {
    let pcm = parsedClips[i].pcmData;
    if (normalize && base.bitsPerSample === 16) {
      pcm = normalizePcm16(pcm);
    }
    segments.push(pcm);
    if (i < parsedClips.length - 1 && silenceBuffer.length > 0) {
      segments.push(silenceBuffer);
    }
  }

  const combinedPcm = Buffer.concat(segments);
  const finalWav = buildWavBuffer(combinedPcm, base);
  const bytesPerSecond = base.sampleRate * base.numChannels * (base.bitsPerSample / 8);
  const durationSeconds = bytesPerSecond > 0 ? Number((combinedPcm.length / bytesPerSecond).toFixed(2)) : 0;

  return {
    buffer: finalWav,
    durationSeconds,
    sampleRate: base.sampleRate,
    numChannels: base.numChannels,
    bitsPerSample: base.bitsPerSample,
    totalBytes: finalWav.length,
  };
}

/**
 * Create a safe filesystem filename derived from a project name.
 */
export function sanitizeFilename(name) {
  const cleaned = String(name || 'cartesia-story')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return (cleaned || 'cartesia-story').slice(0, 64);
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeTempClip(tmpJobDir, index, wavBuffer) {
  await ensureDir(tmpJobDir);
  const filename = `line-${String(index + 1).padStart(4, '0')}.wav`;
  const filePath = path.join(tmpJobDir, filename);
  await fs.writeFile(filePath, wavBuffer);
  return filePath;
}

export async function cleanupDir(dirPath) {
  if (!dirPath) return;
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

export async function saveOutputAudio(outputDir, jobId, projectName, wavBuffer) {
  await ensureDir(outputDir);
  const baseName = sanitizeFilename(projectName);
  const downloadFilename = `${baseName}.wav`;
  const storedFilename = `${jobId}-${downloadFilename}`;
  const fullPath = path.join(outputDir, storedFilename);
  await fs.writeFile(fullPath, wavBuffer);
  return { storedFilename, downloadFilename, fullPath };
}

export async function cleanupOldOutputFiles(outputDir, maxAgeMs = 2 * 60 * 60 * 1000) {
  try {
    await ensureDir(outputDir);
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    const now = Date.now();
    await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.endsWith('.wav'))
        .map(async (entry) => {
          const fullPath = path.join(outputDir, entry.name);
          const stat = await fs.stat(fullPath);
          if (now - stat.mtimeMs > maxAgeMs) {
            await fs.unlink(fullPath).catch(() => {});
          }
        })
    );
  } catch {
    // Ignore periodic cleanup errors
  }
}
