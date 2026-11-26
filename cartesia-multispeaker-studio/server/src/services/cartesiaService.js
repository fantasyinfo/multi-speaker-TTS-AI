import axios from 'axios';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const CARTESIA_BASE_URL = 'https://api.cartesia.ai';

export const SUPPORTED_MODELS = [
  { id: 'sonic-3.6', label: 'Sonic 3.6 (Latest)', description: 'Highest quality, expressive Hindi/Hinglish & English' },
  { id: 'sonic-3.5', label: 'Sonic 3.5', description: 'Stable Sonic 3 generation model' },
  { id: 'sonic-3', label: 'Sonic 3', description: 'Base Sonic 3 model' },
];

export const SUPPORTED_LANGUAGES = [
  { code: 'hi', label: 'Hindi / Hinglish (hi)' },
  { code: 'en', label: 'English (en)' },
  { code: 'bn', label: 'Bengali (bn)' },
  { code: 'mr', label: 'Marathi (mr)' },
  { code: 'ta', label: 'Tamil (ta)' },
  { code: 'te', label: 'Telugu (te)' },
  { code: 'gu', label: 'Gujarati (gu)' },
  { code: 'kn', label: 'Kannada (kn)' },
  { code: 'ml', label: 'Malayalam (ml)' },
  { code: 'pa', label: 'Punjabi (pa)' },
  { code: 'es', label: 'Spanish (es)' },
  { code: 'fr', label: 'French (fr)' },
  { code: 'de', label: 'German (de)' },
  { code: 'ja', label: 'Japanese (ja)' },
  { code: 'ar', label: 'Arabic (ar)' },
];

export const SUPPORTED_EMOTIONS = [
  'neutral',
  'calm',
  'happy',
  'excited',
  'curious',
  'sad',
  'angry',
  'scared',
  'content',
  'enthusiastic',
  'grateful',
  'confident',
  'nostalgic',
  'anxious',
  'frustrated',
  'surprised',
  'mysterious',
  'contemplative',
];

function getAuthHeaders(extraHeaders = {}) {
  if (!env.cartesiaApiKey) {
    throw new AppError(
      'Cartesia API key is not configured on the server. Add CARTESIA_API_KEY to server/.env.',
      503,
      'CARTESIA_NOT_CONFIGURED'
    );
  }

  return {
    Authorization: `Bearer ${env.cartesiaApiKey}`,
    'Cartesia-Version': env.cartesiaVersion,
    ...extraHeaders,
  };
}

function clampSpeed(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1.0;
  return Math.max(0.6, Math.min(1.5, Number(num.toFixed(2))));
}

function mapAxiosError(err, fallbackMessage) {
  if (err instanceof AppError) return err;

  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return new AppError(
      'Cartesia API request timed out. Please try again.',
      504,
      'CARTESIA_TIMEOUT'
    );
  }

  if (err.response) {
    const status = err.response.status;
    let detailMessage = fallbackMessage;

    if (Buffer.isBuffer(err.response.data)) {
      try {
        const parsed = JSON.parse(err.response.data.toString('utf8'));
        detailMessage = parsed.error || parsed.message || parsed.detail || detailMessage;
      } catch {
        const raw = err.response.data.toString('utf8').slice(0, 240);
        if (raw) detailMessage = raw;
      }
    } else if (err.response.data && typeof err.response.data === 'object') {
      detailMessage =
        err.response.data.error ||
        err.response.data.message ||
        err.response.data.detail ||
        detailMessage;
    }

    if (status === 401 || status === 403) {
      return new AppError(
        'Cartesia API authentication failed. Verify CARTESIA_API_KEY in server/.env.',
        502,
        'CARTESIA_AUTH_ERROR'
      );
    }

    if (status === 429) {
      return new AppError(
        'Cartesia API rate limit reached. Please wait a moment and retry.',
        429,
        'CARTESIA_RATE_LIMIT'
      );
    }

    return new AppError(`Cartesia API error (${status}): ${detailMessage}`, 502, 'CARTESIA_API_ERROR');
  }

  return new AppError(fallbackMessage, 502, 'CARTESIA_NETWORK_ERROR');
}

function normalizeVoice(voice) {
  const visibility = voice.visibility || (voice.is_public ? 'public' : 'private');
  const isOwner =
    typeof voice.is_owner === 'boolean'
      ? voice.is_owner
      : visibility === 'private' || visibility === 'owner';
  const isPublic =
    typeof voice.is_public === 'boolean' ? voice.is_public : visibility === 'public';

  const accents = Array.isArray(voice.accents) ? voice.accents : [];
  const primaryLanguage =
    voice.language ||
    (accents.length > 0 ? accents[0].language || accents[0].locale || '' : '') ||
    '';

  return {
    id: voice.id,
    name: voice.name || 'Unnamed Voice',
    description: voice.description || '',
    tagline: voice.tagline || '',
    language: primaryLanguage,
    accents,
    gender: voice.gender || null,
    visibility,
    isOwner,
    isPublic,
    isStarred: Boolean(voice.is_starred),
    previewFileUrl: voice.preview_file_url || null,
    createdAt: voice.created_at || null,
  };
}

export async function checkCartesiaConnection() {
  if (!env.cartesiaApiKey) {
    return {
      configured: false,
      connected: false,
      status: 'unconfigured',
      message: 'CARTESIA_API_KEY is not set in server/.env',
    };
  }

  try {
    await axios.get(`${CARTESIA_BASE_URL}/voices`, {
      headers: getAuthHeaders(),
      params: { limit: 1 },
      timeout: 8000,
    });
    return {
      configured: true,
      connected: true,
      status: 'connected',
      message: 'Connected to Cartesia API',
    };
  } catch (err) {
    const mapped = mapAxiosError(err, 'Unable to verify Cartesia API connection');
    return {
      configured: true,
      connected: false,
      status: 'error',
      message: mapped.message,
    };
  }
}

export async function listVoices({
  query = '',
  language = '',
  ownership = 'all',
  savedOnly = false,
} = {}) {
  const headers = getAuthHeaders();
  const collected = [];
  let cursor = null;
  let pageCount = 0;
  const maxPages = 20;

  try {
    do {
      const params = {
        limit: 100,
        'expand[]': 'preview_file_url',
      };
      if (cursor) params.starting_after = cursor;
      if (query) params.q = query;
      if (language) params.language = language;
      if (ownership === 'owner') params.is_owner = true;
      if (savedOnly || ownership === 'saved') params.is_starred = true;

      const response = await axios.get(`${CARTESIA_BASE_URL}/voices`, {
        headers,
        params,
        timeout: 15000,
      });

      const payload = response.data || {};
      const items = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      for (const rawVoice of items) {
        collected.push(normalizeVoice(rawVoice));
      }

      const hasMore = Boolean(payload.has_more);
      cursor = hasMore && payload.next_page ? payload.next_page : null;
      pageCount += 1;
    } while (cursor && pageCount < maxPages);

    if (ownership === 'public') {
      return collected.filter((v) => v.isPublic && !v.isOwner);
    }

    return collected;
  } catch (err) {
    throw mapAxiosError(err, 'Failed to fetch voices from Cartesia');
  }
}

/**
 * Fetch the user's Saved (starred) voices, falling back to owned voices if none are starred.
 */
export async function listSavedAndOwnedVoices() {
  const [starred, owned] = await Promise.all([
    listVoices({ savedOnly: true }),
    listVoices({ ownership: 'owner' }),
  ]);

  const byId = new Map();
  for (const voice of starred) {
    byId.set(voice.id, voice);
  }
  for (const voice of owned) {
    if (!byId.has(voice.id)) {
      byId.set(voice.id, voice);
    }
  }

  return Array.from(byId.values());
}

export async function synthesizeSpeech({
  voiceId,
  transcript,
  modelId,
  language,
  speed,
  emotion,
  outputFormat,
}) {
  if (!voiceId) {
    throw new AppError('Voice ID is required for synthesis', 400, 'MISSING_VOICE_ID');
  }
  if (!transcript || !transcript.trim()) {
    throw new AppError('Dialogue transcript cannot be empty', 400, 'EMPTY_TRANSCRIPT');
  }

  const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
  const selectedModel = modelId || env.cartesiaModel || 'sonic-3.6';
  const selectedLanguage = language || 'hi';
  const normalizedEmotion = emotion && emotion !== 'neutral' ? emotion.toLowerCase() : null;

  const buildPayload = (includeEmotion) => ({
    model_id: selectedModel,
    transcript: transcript.trim(),
    voice: {
      mode: 'id',
      id: voiceId,
    },
    language: selectedLanguage,
    output_format: {
      container: 'wav',
      encoding: outputFormat?.encoding || 'pcm_s16le',
      sample_rate: Number(outputFormat?.sampleRate || 44100),
    },
    generation_config: {
      speed: clampSpeed(speed ?? 1.0),
      volume: 1.0,
      ...(includeEmotion && normalizedEmotion ? { emotion: normalizedEmotion } : {}),
    },
  });

  try {
    const response = await axios.post(
      `${CARTESIA_BASE_URL}/tts/bytes`,
      buildPayload(Boolean(normalizedEmotion)),
      {
        headers,
        responseType: 'arraybuffer',
        timeout: 45000,
        maxContentLength: 50 * 1024 * 1024,
      }
    );

    return {
      audioBuffer: Buffer.from(response.data),
      warning: null,
    };
  } catch (err) {
    const mapped = mapAxiosError(err, 'Failed to synthesize speech via Cartesia');

    // If Cartesia rejects emotion on a non-English/unsupported language, retry once cleanly without emotion
    if (
      normalizedEmotion &&
      err.response?.status === 400 &&
      /emotion/i.test(mapped.message)
    ) {
      try {
        const retryResponse = await axios.post(
          `${CARTESIA_BASE_URL}/tts/bytes`,
          buildPayload(false),
          {
            headers,
            responseType: 'arraybuffer',
            timeout: 45000,
            maxContentLength: 50 * 1024 * 1024,
          }
        );
        return {
          audioBuffer: Buffer.from(retryResponse.data),
          warning: `Emotion "${normalizedEmotion}" was ignored by Cartesia for language "${selectedLanguage}".`,
        };
      } catch (retryErr) {
        throw mapAxiosError(retryErr, 'Failed to synthesize speech via Cartesia');
      }
    }

    throw mapped;
  }
}

export async function fetchVoicePreview(previewUrl) {
  let parsed;
  try {
    parsed = new URL(previewUrl);
  } catch {
    throw new AppError('Invalid preview URL', 400, 'INVALID_PREVIEW_URL');
  }

  const allowedHosts = ['cartesia.ai', 'api.cartesia.ai', 'files.cartesia.ai'];
  const isAllowed = allowedHosts.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );

  if (parsed.protocol !== 'https:' || !isAllowed) {
    throw new AppError('Untrusted preview audio URL host', 400, 'UNTRUSTED_PREVIEW_URL');
  }

  try {
    const response = await axios.get(parsed.toString(), {
      headers: getAuthHeaders(),
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 15 * 1024 * 1024,
    });

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'audio/wav',
    };
  } catch (err) {
    throw mapAxiosError(err, 'Unable to load voice preview audio');
  }
}
