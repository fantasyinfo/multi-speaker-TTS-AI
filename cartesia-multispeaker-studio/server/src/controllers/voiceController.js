import {
  checkCartesiaConnection,
  fetchVoicePreview,
  listVoices,
  SUPPORTED_EMOTIONS,
  SUPPORTED_LANGUAGES,
  SUPPORTED_MODELS,
} from '../services/cartesiaService.js';
import { AppError } from '../utils/errors.js';

export async function getVoices(req, res, next) {
  try {
    const query = String(req.query.q || '').trim();
    const language = String(req.query.language || '').trim();
    const ownership = String(req.query.ownership || 'all').trim();

    const voices = await listVoices({ query, language, ownership });
    res.json({
      voices,
      count: voices.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function getVoicePreview(req, res, next) {
  try {
    const url = String(req.query.url || '').trim();
    if (!url) {
      throw new AppError('Preview URL query parameter is required', 400, 'MISSING_PREVIEW_URL');
    }

    const { buffer, contentType } = await fetchVoicePreview(url);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function getVoiceOptions(_req, res, next) {
  try {
    const status = await checkCartesiaConnection();
    res.json({
      connection: status,
      models: SUPPORTED_MODELS,
      languages: SUPPORTED_LANGUAGES,
      emotions: SUPPORTED_EMOTIONS,
    });
  } catch (err) {
    next(err);
  }
}
