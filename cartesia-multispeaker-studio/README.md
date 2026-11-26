# Cartesia Multi-Speaker Studio

A clean, modern MERN + Vite web studio for creating multi-character Hindi, Hinglish, and English storytelling voiceovers powered by the Cartesia Text-to-Speech API.

---

## Features

- **Character & Voice Manager**: Create unlimited characters, customize avatar colors, default language, speed, and emotion, and assign cloned/owned or public library voices directly from your Cartesia account (with audio previews).
- **Interactive Dialogue Editor**: Sequential dialogue blocks with drag-and-drop reordering, up/down controls, line duplication, per-line emotion & speed overrides, and single-line audio preview.
- **Structured Script Importer**: Paste multi-speaker scripts (`SPEAKER: dialogue`), auto-match existing characters, and manually map or create any unmatched speakers without silently discarding text.
- **Sequential TTS + Real-Time Progress**: Synthesizes each line in order through the Express backend while streaming live progress (`line #`, speaker name, completion percentage).
- **Clean Backend WAV Merging**: Parses RIFF/WAVE headers, validates uniform sample rate / channel / bit depth across clips, inserts configurable silence pauses between lines, optionally applies safe peak normalization, and writes a single valid downloadable WAV file.
- **MongoDB Project Persistence**: Save, reload, rename, and delete story projects.
- **Server-Side Security**: Your `CARTESIA_API_KEY` stays strictly in `server/.env` and is never exposed to the browser or stored in MongoDB.

---

## Folder Structure

```text
cartesia-multispeaker-studio/
  client/          # React + TypeScript + Vite + Tailwind CSS + Zustand
  server/          # Node.js + Express + Mongoose + Cartesia & WAV services
  .gitignore
  README.md
```

---

## Prerequisites (macOS)

1. **Node.js** v18+ and **npm**
2. **MongoDB Community Edition** (optional — if MongoDB is unavailable, the backend automatically falls back to a local SQLite database at `server/data/cartesia_studio.sqlite`)
3. **Cartesia API Key** from your Cartesia dashboard

### Installing & Starting MongoDB on macOS

If MongoDB is installed via Homebrew (`mongod` / `mongosh`):

```bash
# Start as a background Homebrew service
brew services start mongodb-community

# Or run manually with a local data directory
mkdir -p ~/mongodb-data
mongod --dbpath ~/mongodb-data
```

Verify MongoDB is running:

```bash
mongosh --eval "db.adminCommand({ ping: 1 })"
```

---

## Setup Instructions

### 1. Backend Setup (`server/`)

```bash
cd server
cp .env.example .env
npm install
```

Edit `server/.env`:

```env
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VERSION=2026-08-14
CARTESIA_MODEL=sonic-3.6
MONGODB_URI=mongodb://127.0.0.1:27017/cartesia_studio
PORT=5001
CLIENT_ORIGIN=http://localhost:5173
```

Start the Express backend:

```bash
npm run dev
# or for production: npm start
```

The backend runs at `http://localhost:5001` (health check: `GET http://localhost:5001/api/health`).

### 2. Frontend Setup (`client/`)

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Cartesia API Configuration

- **Authentication**: Requests use `Authorization: Bearer <CARTESIA_API_KEY>` and `Cartesia-Version: 2026-08-14` strictly from the Express server.
- **Voices Endpoint**: `GET https://api.cartesia.ai/voices` with cursor pagination and `expand[]=preview_file_url`. Voice preview playback is proxied via `GET /api/voices/preview` so API credentials never leave the server.
- **TTS Endpoint**: `POST https://api.cartesia.ai/tts/bytes` using `sonic-3.6` (or `sonic-3.5` / `sonic-3`) and `output_format`:
  ```json
  {
    "container": "wav",
    "encoding": "pcm_s16le",
    "sample_rate": 44100
  }
  ```
- **Hindi / Hinglish**: Sonic-3 natively supports Hindi (`hi`) and Hinglish code-switching in Devanagari, Romanized Hindi, or mixed script.

---

## How Multi-Speaker Generation & WAV Merging Work

1. **Validation**: Before synthesis starts, both frontend and backend validate that every dialogue line has non-empty text and a speaker with an assigned Cartesia `voiceId`.
2. **Sequential Line Synthesis**: Because Cartesia's `/tts/bytes` endpoint renders one voice per request, the backend iterates through dialogue blocks in their exact sequence (`order: 1..N`) and calls `/tts/bytes` with each line's speaker voice, language, speed, and emotion.
3. **RIFF/WAVE Parsing**: Raw byte concatenation of `.wav` files is avoided because each file contains its own `RIFF`/`WAVE` header and metadata chunks. Instead, `server/src/services/audioService.js` parses each clip's `fmt ` and `data` chunks, verifies matching `audioFormat` (PCM), `numChannels`, `sampleRate`, and `bitsPerSample`, and extracts raw PCM frames.
4. **Silence Insertion & Normalization**: Between consecutive dialogue clips, the merger inserts a frame-aligned zero-PCM silence buffer corresponding to `pauseMs`. If audio normalization is enabled, 16-bit PCM samples are peak-scaled safely without clipping.
5. **Canonical WAV Output & Cleanup**: A single 44-byte RIFF/WAVE header is written around the combined PCM stream, saved to `server/output/`, and all temporary per-line files in `server/tmp/<jobId>/` are deleted immediately in a `finally` block.
