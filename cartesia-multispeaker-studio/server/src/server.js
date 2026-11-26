import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { ensureDir } from './services/audioService.js';

async function bootstrap() {
  await ensureDir(env.tmpDir);
  await ensureDir(env.outputDir);
  await connectDb();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Cartesia Multi-Speaker Studio server running on http://localhost:${env.port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${env.port} is already in use (on macOS, AirPlay Receiver often uses port 5000). Update PORT in server/.env (e.g. PORT=5001) and VITE_API_BASE_URL in client/.env.`
      );
      process.exit(1);
    }
    console.error('Server listen error:', err?.message || err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err?.message || err);
  process.exit(1);
});
