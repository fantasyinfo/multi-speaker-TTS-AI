import express from 'express';
import {
  getVoiceOptions,
  getVoicePreview,
  getVoices,
} from '../controllers/voiceController.js';

const router = express.Router();

router.get('/', getVoices);
router.get('/options', getVoiceOptions);
router.get('/preview', getVoicePreview);

export default router;
