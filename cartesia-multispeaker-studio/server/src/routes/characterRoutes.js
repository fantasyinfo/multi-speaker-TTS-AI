import express from 'express';
import {
  getDefaultCharacters,
  saveDefaultCharacters,
  syncDefaultCharacters,
} from '../controllers/characterController.js';

const router = express.Router();

router.get('/defaults', getDefaultCharacters);
router.put('/defaults', saveDefaultCharacters);
router.post('/defaults/sync', syncDefaultCharacters);

export default router;
