import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getGeneratedAudio,
  getGenerationStatus,
  previewDialogueLine,
  startGeneration,
} from '../controllers/generationController.js';

const router = express.Router();

const generationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many audio generation requests. Please wait a few minutes before retrying.',
    },
  },
});

router.post('/', generationLimiter, startGeneration);
router.post('/preview', generationLimiter, previewDialogueLine);
router.get('/:jobId/status', getGenerationStatus);
router.get('/:jobId/audio', getGeneratedAudio);

export default router;
