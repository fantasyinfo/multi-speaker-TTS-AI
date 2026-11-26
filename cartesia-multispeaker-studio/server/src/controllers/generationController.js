import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { extractEmotionFromDialogue } from '../utils/dialogueParser.js';
import { synthesizeSpeech } from '../services/cartesiaService.js';
import {
  cleanupDir,
  cleanupOldOutputFiles,
  mergeWavBuffers,
  saveOutputAudio,
  writeTempClip,
} from '../services/audioService.js';
import {
  createGenerationJob,
  getGenerationJob,
  updateGenerationJob,
} from '../services/generationJobStore.js';

function validateGenerationPayload(body) {
  const { projectName, speakers, dialogueLines, generationSettings } = body || {};

  if (!Array.isArray(speakers) || speakers.length === 0) {
    throw new AppError('Add at least one speaker before generating audio', 400, 'NO_SPEAKERS');
  }

  if (!Array.isArray(dialogueLines) || dialogueLines.length === 0) {
    throw new AppError('Add at least one dialogue line before generating audio', 400, 'NO_DIALOGUE_LINES');
  }

  const speakerMap = new Map();
  for (const speaker of speakers) {
    if (speaker?.id) {
      speakerMap.set(speaker.id, speaker);
    }
  }

  const orderedLines = [...dialogueLines].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (let i = 0; i < orderedLines.length; i += 1) {
    const line = orderedLines[i];
    const lineNum = i + 1;
    const speaker = speakerMap.get(line.speakerId);

    if (!speaker) {
      throw new AppError(
        `Dialogue line #${lineNum} is missing a valid speaker assignment`,
        400,
        'MISSING_SPEAKER'
      );
    }

    if (!speaker.voiceId || !String(speaker.voiceId).trim()) {
      throw new AppError(
        `Speaker "${speaker.name}" (used in line #${lineNum}) has no assigned Cartesia voice`,
        400,
        'MISSING_VOICE_ASSIGNMENT'
      );
    }

    if (!line.text || !String(line.text).trim()) {
      throw new AppError(
        `Dialogue line #${lineNum} (${speaker.name}) has empty dialogue text`,
        400,
        'EMPTY_DIALOGUE_TEXT'
      );
    }

    const parsed = extractEmotionFromDialogue(line.text);
    if (!parsed.transcript) {
      throw new AppError(
        `Dialogue line #${lineNum} (${speaker.name}) only contains an emotion tag "[${parsed.emotion}]" with no dialogue text`,
        400,
        'EMPTY_DIALOGUE_TEXT'
      );
    }
  }

  return {
    projectName: String(projectName || 'Cartesia Story').trim(),
    speakerMap,
    orderedLines,
    settings: {
      modelId: generationSettings?.modelId || env.cartesiaModel || 'sonic-3.6',
      language: generationSettings?.language || 'hi',
      outputFormat: {
        container: 'wav',
        encoding: 'pcm_s16le',
        sampleRate: Number(generationSettings?.outputFormat?.sampleRate || 44100),
      },
      defaultSpeed: Number(generationSettings?.defaultSpeed ?? 1.0),
      pauseMs: Number(generationSettings?.pauseMs ?? 350),
      normalizeAudio: Boolean(generationSettings?.normalizeAudio),
    },
  };
}

async function runGenerationJob(jobId, validated) {
  const { projectName, speakerMap, orderedLines, settings } = validated;
  const tmpJobDir = path.join(env.tmpDir, jobId);
  const clipBuffers = [];
  const warnings = [];

  updateGenerationJob(jobId, { status: 'processing' });

  try {
    for (let i = 0; i < orderedLines.length; i += 1) {
      const line = orderedLines[i];
      const speaker = speakerMap.get(line.speakerId);
      const lineNumber = i + 1;

      updateGenerationJob(jobId, {
        currentLineNumber: lineNumber,
        currentSpeakerName: speaker.name,
      });

      const { emotion: bracketEmotion, transcript } = extractEmotionFromDialogue(line.text);
      const effectiveLanguage = speaker.language || settings.language || 'hi';
      const effectiveSpeed = line.speed ?? speaker.speed ?? settings.defaultSpeed ?? 1.0;
      const effectiveEmotion = bracketEmotion || line.emotion || speaker.emotion || 'neutral';

      const { audioBuffer, warning } = await synthesizeSpeech({
        voiceId: speaker.voiceId,
        transcript,
        modelId: settings.modelId,
        language: effectiveLanguage,
        speed: effectiveSpeed,
        emotion: effectiveEmotion,
        outputFormat: settings.outputFormat,
      });

      if (warning) {
        warnings.push(`Line #${lineNumber} (${speaker.name}): ${warning}`);
      }

      // Persist temp clip during job execution, then clean up in finally block
      await writeTempClip(tmpJobDir, i, audioBuffer);
      clipBuffers.push(audioBuffer);

      updateGenerationJob(jobId, {
        completedLines: lineNumber,
        warnings: [...warnings],
      });
    }

    updateGenerationJob(jobId, {
      status: 'merging',
      currentSpeakerName: 'Merging WAV tracks',
    });

    const merged = mergeWavBuffers(clipBuffers, {
      pauseMs: settings.pauseMs,
      normalize: settings.normalizeAudio,
    });

    const saved = await saveOutputAudio(env.outputDir, jobId, projectName, merged.buffer);
    cleanupOldOutputFiles(env.outputDir).catch(() => {});

    updateGenerationJob(jobId, {
      status: 'completed',
      result: {
        jobId,
        filename: saved.downloadFilename,
        storedFilename: saved.storedFilename,
        lineCount: orderedLines.length,
        durationSeconds: merged.durationSeconds,
        sampleRate: merged.sampleRate,
        numChannels: merged.numChannels,
        bitsPerSample: merged.bitsPerSample,
        totalBytes: merged.totalBytes,
        audioUrl: `/api/generate/${jobId}/audio`,
        downloadUrl: `/api/generate/${jobId}/audio?download=1`,
      },
    });
  } catch (err) {
    const job = getGenerationJob(jobId);
    const failedLine = job?.currentLineNumber || 1;
    const failedSpeaker = job?.currentSpeakerName || 'Unknown speaker';
    const message = err?.message || 'Audio generation failed';

    updateGenerationJob(jobId, {
      status: 'failed',
      error: {
        code: err?.code || 'GENERATION_FAILED',
        message: `Failed at line #${failedLine} (${failedSpeaker}): ${message}`,
        lineNumber: failedLine,
        speakerName: failedSpeaker,
      },
    });
  } finally {
    await cleanupDir(tmpJobDir);
  }
}

export async function startGeneration(req, res, next) {
  try {
    if (!env.cartesiaApiKey) {
      throw new AppError(
        'Cartesia API key is not configured. Add CARTESIA_API_KEY to server/.env and restart the backend.',
        503,
        'CARTESIA_NOT_CONFIGURED'
      );
    }

    const validated = validateGenerationPayload(req.body);
    const job = createGenerationJob({
      projectName: validated.projectName,
      totalLines: validated.orderedLines.length,
    });

    // Run sequential synthesis asynchronously so frontend can display real-time progress
    runGenerationJob(job.jobId, validated).catch(() => {});

    res.status(202).json({
      jobId: job.jobId,
      status: job.status,
      totalLines: job.totalLines,
    });
  } catch (err) {
    next(err);
  }
}

export function getGenerationStatus(req, res, next) {
  try {
    const job = getGenerationJob(req.params.jobId);
    if (!job) {
      throw new AppError('Generation job not found', 404, 'JOB_NOT_FOUND');
    }

    res.json({
      jobId: job.jobId,
      status: job.status,
      projectName: job.projectName,
      totalLines: job.totalLines,
      completedLines: job.completedLines,
      currentLineNumber: job.currentLineNumber,
      currentSpeakerName: job.currentSpeakerName,
      warnings: job.warnings,
      error: job.error,
      result: job.result,
    });
  } catch (err) {
    next(err);
  }
}

export function getGeneratedAudio(req, res, next) {
  try {
    const job = getGenerationJob(req.params.jobId);
    if (!job || job.status !== 'completed' || !job.result) {
      throw new AppError('Generated audio is not available for this job', 404, 'AUDIO_NOT_FOUND');
    }

    const safeBase = path.basename(job.result.storedFilename);
    const fullPath = path.join(env.outputDir, safeBase);

    if (!fs.existsSync(fullPath)) {
      throw new AppError('Generated audio file has expired or been removed', 404, 'AUDIO_FILE_MISSING');
    }

    res.setHeader('Content-Type', 'audio/wav');
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${job.result.filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${job.result.filename}"`);
    }

    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    next(err);
  }
}

export async function previewDialogueLine(req, res, next) {
  try {
    const { voiceId, text, modelId, language, speed, emotion, sampleRate } = req.body || {};

    if (!voiceId) {
      throw new AppError('Assign a Cartesia voice to this speaker first', 400, 'MISSING_VOICE_ID');
    }
    if (!text || !String(text).trim()) {
      throw new AppError('Enter dialogue text to preview', 400, 'EMPTY_DIALOGUE_TEXT');
    }

    const { emotion: bracketEmotion, transcript } = extractEmotionFromDialogue(text);
    if (!transcript) {
      throw new AppError(
        'Enter spoken dialogue text after the [emotion] tag to preview',
        400,
        'EMPTY_DIALOGUE_TEXT'
      );
    }

    const { audioBuffer, warning } = await synthesizeSpeech({
      voiceId,
      transcript,
      modelId: modelId || env.cartesiaModel || 'sonic-3.6',
      language: language || 'hi',
      speed: speed ?? 1.0,
      emotion: bracketEmotion || emotion || 'neutral',
      outputFormat: {
        container: 'wav',
        encoding: 'pcm_s16le',
        sampleRate: Number(sampleRate || 44100),
      },
    });

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    if (warning) {
      res.setHeader('X-Cartesia-Warning', warning);
    }
    res.send(audioBuffer);
  } catch (err) {
    next(err);
  }
}
