# Project: Cartesia Multi-Speaker Studio

Act as a senior MERN stack engineer, software architect, and UI/UX designer.

Build a clean, modern, responsive web application called **Cartesia Multi-Speaker Studio** using the MERN stack with Vite.

The application will integrate with the Cartesia Text-to-Speech API and allow users to create multi-character voiceovers by assigning different Cartesia voices to individual characters and dialogue lines.

The primary use case is producing Hindi/Hinglish storytelling voiceovers for YouTube videos.

Do not build a generic dashboard or an unnecessarily complex enterprise application. Focus on a simple, polished, fast, and intuitive audio-production workflow.

## 1. Technology stack

Frontend:
- React
- Vite
- JavaScript or TypeScript (prefer TypeScript)
- Tailwind CSS
- Lucide React icons
- React Router
- Axios or native fetch
- Zustand or React Context for lightweight state management

Backend:
- Node.js
- Express.js
- MongoDB with Mongoose
- Cartesia REST API integration
- dotenv
- Multer only if file uploads are needed
- Native Node.js audio/file handling where practical

Development:
- Frontend: Vite development server
- Backend: Express server
- Environment variables for all secrets and configuration
- Clear separation between frontend and backend

## 2. Core application concept

The application should allow users to:

1. Create a project.
2. Add multiple characters/speakers.
3. Assign a different Cartesia voice to each speaker.
4. Write or paste dialogue.
5. Assign each dialogue line to a speaker.
6. Configure voice settings.
7. Generate audio.
8. Combine generated dialogue into one continuous audio file.
9. Preview and download the final audio.

Example:

Project: Mohan Ki Samajh – Saving Story

Characters:
- Mohan Dada → User's cloned elderly male voice
- Chintu → Cartesia library voice
- Rupaya Rani → User's cloned female voice

Dialogue:
- Mohan Dada: "बेटा, आज मैं तुम्हें पैसे बचाने का एक आसान तरीका बताऊंगा।"
- Chintu: "लेकिन दादाजी, मेरी सैलरी तो महीने के बीच में ही खत्म हो जाती है!"
- Rupaya Rani: "तो चलिए, आज से पैसों को समझदारी से संभालना सीखते हैं।"

The application should generate the individual dialogue clips and combine them into one audio file in the correct order.

IMPORTANT: Cartesia's standard TTS bytes endpoint generates speech for one selected voice per request. Implement multi-speaker generation by making separate API requests for each dialogue line and combining the resulting audio clips on the backend. Do not assume Cartesia provides a single-request multi-speaker synthesis endpoint.

## 3. UI/UX design direction

Create a premium-looking, minimal dark interface.

Design inspiration:
- Modern audio-production tools
- Linear
- ElevenLabs
- Descript
- Notion

Visual requirements:
- Dark navy/charcoal background.
- Subtle gradients.
- Soft borders.
- Rounded cards.
- Good spacing and typography.
- Clear visual hierarchy.
- Minimal unnecessary decoration.
- Responsive layout for desktop and mobile.
- Large, readable controls.
- Smooth but restrained transitions.

Suggested color palette:
- Background: #0B1020
- Cards: #111A2D
- Secondary surfaces: #17233B
- Primary accent: #9AABFF
- Secondary accent: #76DFBD
- Main text: #EDF2FF
- Muted text: #91A0BD

The UI should feel like a real production tool, not an admin template.

## 4. Main application layout

Create a single main workspace with these areas:

### A. Header

Display:
- Application logo/icon
- Cartesia Multi-Speaker Studio
- Current project name
- API connection status
- Settings button

### B. Project section

Allow users to:
- Create a new project.
- Rename a project.
- Save project data.
- Load previous projects.
- Delete projects with confirmation.

Persist projects in MongoDB.

### C. Character / speaker manager

Users should be able to add, edit, and remove speakers.

Each speaker should contain:
- Speaker name
- Assigned Cartesia voice ID
- Voice display name
- Optional character description
- Optional avatar/color
- Default language
- Default speed
- Default emotion

Start with these example characters:
- Mohan Dada
- Chintu
- Rupaya Rani

These should be editable examples, not hardcoded application restrictions.

Provide a voice selector populated from the authenticated Cartesia account.

Display voice metadata where available:
- Voice name
- Voice ID
- Owner/private status
- Public/private access
- Language
- Preview audio if a preview URL is available

Users must be able to select both their own cloned voices and eligible public/library voices.

### D. Dialogue editor

This is the most important part of the application.

Create an easy-to-use dialogue editor where users can add dialogue blocks in sequence.

Each dialogue block should contain:
- Sequence number
- Speaker selector
- Dialogue text area
- Emotion selector
- Speed control
- Delete button
- Optional preview button

Supported emotions should follow the Cartesia API's supported emotion values. Examples include:
- Neutral
- Calm
- Happy
- Excited
- Curious
- Sad
- Angry
- Scared
- Content

Allow users to:
- Add dialogue blocks.
- Delete dialogue blocks.
- Change speaker assignment.
- Reorder dialogue blocks using drag and drop.
- Duplicate a dialogue block.
- Edit dialogue text.
- Paste long scripts.
- Automatically assign sequential numbering.

Keep the dialogue editor visually clean and easy to operate.

### E. Script import

Add an optional script-import feature.

Allow users to paste structured dialogue in a format such as:

MOHAN: बेटा, आज हम बचत के बारे में बात करेंगे।

CHINTU: लेकिन दादाजी, पैसे बचते ही नहीं हैं!

RUPAYA RANI: छोटी आदतें बड़े बदलाव ला सकती हैं।

Provide a simple parser that matches speaker names to existing characters.

If a speaker name cannot be matched, show a clear warning and allow the user to map it manually.

Do not silently discard any dialogue.

### F. Generation settings

Provide:
- Cartesia model selector.
- Language selector.
- Audio output format.
- Default voice speed.
- Optional pause between dialogue blocks.
- Optional normalization setting if implemented safely.

Initial model options:
- sonic-3.6
- sonic-3.5
- sonic-3

Verify model availability against current Cartesia documentation before relying on a particular model.

Supported languages should be based on Cartesia's current API documentation. Include Hindi and English as initial options.

### G. Audio generation

When the user clicks Generate Audio:

1. Validate the project.
2. Validate speaker assignments.
3. Validate dialogue text.
4. Create generation jobs for dialogue blocks.
5. Call Cartesia TTS for each dialogue line using the assigned voice.
6. Preserve the original dialogue order.
7. Combine the generated audio clips.
8. Return one final audio file.
9. Display the audio player.
10. Allow the user to download the final audio.

Show:
- Generation progress.
- Current dialogue number.
- Current speaker.
- Completed dialogue count.
- Error details if a line fails.

Do not pretend generation succeeded if any required line failed.

For the first version, sequential generation is acceptable and preferred for reliability. Design the service so controlled concurrency can be added later.

### H. Audio preview and export

After successful generation, show:
- HTML audio player.
- Download button.
- Final file name.
- Number of dialogue lines.
- Total audio duration, if available.
- Regenerate option.

Allow individual dialogue previews if practical.

Use a sensible output filename based on the project name.

## 5. Cartesia API integration

Use the official Cartesia API documentation:

TTS bytes:
https://docs.cartesia.ai/api-reference/tts/bytes

List voices:
https://docs.cartesia.ai/api-reference/voices/list

Clone voice:
https://docs.cartesia.ai/api-reference/voices/clone

Keep all Cartesia API requests on the Express backend.

Never expose the Cartesia API key in frontend code, browser storage, API responses, or client-side environment variables.

Use environment variables:

Backend .env:

CARTESIA_API_KEY=
CARTESIA_VERSION=2026-08-14
CARTESIA_MODEL=sonic-3.6
MONGODB_URI=mongodb://127.0.0.1:27017/cartesia_studio
PORT=5000

Frontend .env:

VITE_API_BASE_URL=http://localhost:5000/api

Use the currently supported Cartesia API version and verify it against official documentation during implementation.

### Voice listing

Implement:

GET /api/voices

The backend should:
- Authenticate using the server-side API key.
- Request voices from Cartesia.
- Handle pagination.
- Normalize the response.
- Return only fields required by the frontend.
- Handle API errors clearly.

### Text-to-speech generation

Use:

POST https://api.cartesia.ai/tts/bytes

The request should include:
- model_id
- transcript
- voice
- language
- output_format
- generation_config

Use WAV PCM output initially so individual clips can be combined reliably.

Example output format:

{
  "container": "wav",
  "encoding": "pcm_s16le",
  "sample_rate": 44100
}

Use the voice ID assigned to each dialogue block.

Pass supported emotion and speed parameters where supplied.

### Audio merging

Implement audio merging on the backend.

Do not simply concatenate WAV files byte-for-byte because that can produce invalid WAV files with multiple headers.

Use a proper WAV parser/merger or a reliable audio processing library such as FFmpeg.

Requirements:
- Ensure matching sample rate, channels, and bit depth.
- Preserve dialogue sequence.
- Support configurable silence between dialogue blocks.
- Produce a valid final WAV file.
- Clean up temporary audio files after processing.
- Return meaningful errors if audio formats are incompatible.

Keep the audio processing service independent from the Express route.

## 6. MongoDB data models

Create appropriate Mongoose models.

### Project

Fields:
- name
- description
- speakers
- dialogueLines
- generationSettings
- createdAt
- updatedAt

### Speaker

Fields:
- name
- voiceId
- voiceName
- description
- language
- speed
- emotion

### DialogueLine

Fields:
- order
- speakerId
- text
- speed
- emotion

Use embedded documents or references as appropriate. Keep the schema simple for the initial version.

Do not store API keys in MongoDB.

## 7. Suggested API routes

Projects:
- GET /api/projects
- POST /api/projects
- GET /api/projects/:id
- PUT /api/projects/:id
- DELETE /api/projects/:id

Voices:
- GET /api/voices

Generation:
- POST /api/generate
- GET /api/generate/:jobId/status (only if implementing background jobs)

Health:
- GET /api/health

Validate incoming data and return consistent JSON error responses.

## 8. Suggested folder structure

cartesia-multispeaker-studio/
  client/
    src/
      components/
        Header/
        SpeakerManager/
        DialogueEditor/
        DialogueBlock/
        ScriptImporter/
        GenerationSettings/
        AudioPlayer/
        ProgressIndicator/
      pages/
        Studio.jsx
        Projects.jsx
        Settings.jsx
      services/
        api.js
      store/
      hooks/
      utils/
      App.jsx
      main.jsx
      index.css
    public/
    package.json
    vite.config.js

  server/
    src/
      config/
        db.js
      models/
        Project.js
      routes/
        projectRoutes.js
        voiceRoutes.js
        generationRoutes.js
      controllers/
      services/
        cartesiaService.js
        audioService.js
      middleware/
        errorHandler.js
      utils/
      app.js
      server.js
    package.json
    .env.example

  README.md

You may adjust the structure if there is a clear architectural reason.

## 9. Error handling and security

Implement:
- Server-side API key protection.
- Request validation.
- Cartesia API timeout handling.
- Useful error messages.
- Safe file naming.
- Temporary file cleanup.
- File size limits.
- Basic request rate limiting for generation.
- No API keys in logs.
- No secrets in Git.
- .gitignore for node_modules, .env, generated audio and temporary files.

Never send raw stack traces to the frontend.

## 10. Development approach

Build in phases.

Phase 1:
- Vite + React setup.
- Express backend.
- MongoDB connection.
- Main UI.
- Responsive speaker manager.
- Dialogue editor using local state.

Phase 2:
- Cartesia API connection.
- Voice listing.
- Voice assignment.
- Connection status.

Phase 3:
- TTS generation.
- Audio merging.
- Progress indicators.
- Audio playback and download.

Phase 4:
- MongoDB project persistence.
- Script import.
- Dialogue reordering.
- Individual dialogue preview.
- Error handling and polish.

Do not implement every advanced feature before the basic generation workflow works.

## 11. Quality expectations

- Write clean, modular, maintainable code.
- Avoid giant React components.
- Use reusable components.
- Keep API integration separate from UI.
- Use meaningful variable names.
- Avoid unnecessary dependencies.
- Do not hardcode voice IDs.
- Do not mock successful API responses in production flows.
- Include useful loading, empty, success, and error states.
- Ensure the application can run locally on macOS.
- Include complete setup instructions in README.md.

## 12. Final deliverables

At completion, provide:
1. Complete working MERN + Vite project.
2. Frontend and backend setup instructions.
3. .env.example files.
4. MongoDB setup instructions.
5. Cartesia API configuration instructions.
6. README.md.
7. Clear explanation of how dialogue generation and WAV merging work.

Before finishing, test:
- Frontend builds successfully.
- Backend starts successfully.
- MongoDB connection works.
- Voice listing works with a valid API key.
- One dialogue line can be generated.
- Multiple dialogue lines can be merged into one playable WAV file.
- API key is never exposed to the browser.

Start by creating the project structure and implementing Phase 1. Do not stop after generating a plan; create the actual files and run the application. Make sensible implementation decisions without repeatedly asking for approval.