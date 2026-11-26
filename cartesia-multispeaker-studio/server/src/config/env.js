import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(serverRoot, '.env') });

export const env = {
  port: Number(process.env.PORT || 5001),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cartesia_studio',
  dbMode: (process.env.DB_MODE || 'auto').trim().toLowerCase(),
  sqlitePath: path.join(serverRoot, 'data', 'cartesia_studio.sqlite'),
  cartesiaApiKey: (process.env.CARTESIA_API_KEY || '').trim(),
  cartesiaVersion: (process.env.CARTESIA_VERSION || '2026-08-14').trim(),
  cartesiaModel: (process.env.CARTESIA_MODEL || 'sonic-3.6').trim(),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  tmpDir: path.join(serverRoot, 'tmp'),
  outputDir: path.join(serverRoot, 'output'),
};
