import { CheckCircle2, Database, KeyRound, RefreshCw, Server, XCircle } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export function Settings() {
  const { health, refreshHealth, loadVoices, voices } = useStudioStore();

  const handleRecheck = async () => {
    await refreshHealth();
    await loadVoices(true);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#EDF2FF]">Studio Diagnostics &amp; Settings</h1>
          <p className="mt-1 text-xs text-[#91A0BD]">
            Verify backend connectivity, MongoDB persistence, and Cartesia API status.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRecheck}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#17233B] px-3.5 py-2 text-xs font-medium text-[#9AABFF] ring-1 ring-[#9AABFF]/30 hover:bg-[#1E2D4B]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Recheck Connections</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Cartesia Status */}
        <div className="studio-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#EDF2FF]">
              <KeyRound className="h-4 w-4 text-[#9AABFF]" />
              <span>Cartesia TTS API</span>
            </div>
            {health?.cartesia.connected ? (
              <CheckCircle2 className="h-5 w-5 text-[#76DFBD]" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-400" />
            )}
          </div>

          <p className="mt-2 text-xs text-[#91A0BD]">
            {health?.cartesia.message || 'Checking Cartesia connection...'}
          </p>

          <dl className="mt-4 space-y-1.5 border-t border-[rgba(145,160,189,0.12)] pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-[#91A0BD]">API Key Stored</dt>
              <dd className="text-[#EDF2FF]">Server-side only (.env)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#91A0BD]">Cartesia Version</dt>
              <dd className="font-mono text-[#EDF2FF]">
                {health?.cartesia.version || '2026-08-14'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#91A0BD]">Default Model</dt>
              <dd className="font-mono text-[#EDF2FF]">
                {health?.cartesia.defaultModel || 'sonic-3.6'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#91A0BD]">Cached Voices</dt>
              <dd className="font-mono text-[#EDF2FF]">{voices.length}</dd>
            </div>
          </dl>
        </div>

        {/* Storage Status */}
        <div className="studio-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#EDF2FF]">
              <Database className="h-4 w-4 text-[#76DFBD]" />
              <span>
                {health?.mongodb.backend === 'sqlite'
                  ? 'Project Storage (Local SQLite)'
                  : 'Project Storage (MongoDB)'}
              </span>
            </div>
            {health?.mongodb.connected ? (
              <CheckCircle2 className="h-5 w-5 text-[#76DFBD]" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400" />
            )}
          </div>

          <p className="mt-2 text-xs text-[#91A0BD]">
            Active backend:{' '}
            <span className="font-medium uppercase text-[#EDF2FF]">
              {health?.mongodb.backend || 'unknown'}
            </span>
            {health?.mongodb.backend === 'sqlite' && health.mongodb.sqlitePath
              ? ` — ${health.mongodb.sqlitePath}`
              : health?.mongodb.error
                ? ` — ${health.mongodb.error}`
                : ''}
          </p>

          <div className="mt-4 rounded-xl bg-[#0E1628] p-3 text-xs text-[#91A0BD]">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-[#EDF2FF]">
              <Server className="h-3.5 w-3.5 text-[#9AABFF]" />
              <span>Security Guarantee</span>
            </div>
            Cartesia API keys are never sent to the browser, stored in MongoDB, or logged by the
            Express server. All TTS calls and WAV merging run strictly on the backend.
          </div>
        </div>
      </div>

      {/* Configuration Guide */}
      <div className="studio-card mt-6 p-5">
        <h2 className="text-sm font-semibold text-[#EDF2FF]">Backend Environment Configuration</h2>
        <p className="mt-1 text-xs text-[#91A0BD]">
          Configure these environment variables in{' '}
          <code className="text-[#EDF2FF]">server/.env</code> and restart the backend server:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0B1020] p-4 font-mono text-xs leading-relaxed text-[#76DFBD]">
{`CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VERSION=2026-08-14
CARTESIA_MODEL=sonic-3.6
MONGODB_URI=mongodb://127.0.0.1:27017/cartesia_studio
PORT=5001`}
        </pre>
      </div>
    </main>
  );
}
