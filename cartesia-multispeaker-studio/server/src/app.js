import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { getDbStatus } from './config/db.js';
import { checkCartesiaConnection } from './services/cartesiaService.js';
import projectRoutes from './routes/projectRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import generationRoutes from './routes/generationRoutes.js';
import characterRoutes from './routes/characterRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: env.clientOrigin.split(',').map((s) => s.trim()),
      credentials: false,
      exposedHeaders: ['X-Cartesia-Warning', 'Content-Disposition'],
    })
  );

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', async (_req, res) => {
    const db = getDbStatus();
    const cartesia = await checkCartesiaConnection();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongodb: db,
      cartesia: {
        configured: cartesia.configured,
        connected: cartesia.connected,
        status: cartesia.status,
        message: cartesia.message,
        version: env.cartesiaVersion,
        defaultModel: env.cartesiaModel,
      },
    });
  });

  app.use('/api/projects', projectRoutes);
  app.use('/api/voices', voiceRoutes);
  app.use('/api/generate', generationRoutes);
  app.use('/api/characters', characterRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
