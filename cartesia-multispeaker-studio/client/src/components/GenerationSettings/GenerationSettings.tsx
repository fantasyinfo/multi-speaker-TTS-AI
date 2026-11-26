import { Sliders } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';

export function GenerationSettings() {
  const { project, models, languages, updateGenerationSettings } = useStudioStore();
  const settings = project.generationSettings;

  return (
    <section className="studio-card p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#EDF2FF]">
          <Sliders className="h-4 w-4 text-[#9AABFF]" />
          <span>Generation Settings</span>
        </h2>
        <p className="mt-0.5 text-xs text-[#91A0BD]">
          Configure Cartesia model, output WAV sample rate, and inter-line pacing.
        </p>
      </div>

      <div className="space-y-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#91A0BD]">
              Cartesia Model
            </label>
            <select
              value={settings.modelId}
              onChange={(e) => updateGenerationSettings({ modelId: e.target.value })}
              className="studio-input w-full px-3 py-2 text-xs"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#91A0BD]">
              Default Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => updateGenerationSettings({ language: e.target.value })}
              className="studio-input w-full px-3 py-2 text-xs"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#91A0BD]">
              Output Format (WAV PCM)
            </label>
            <select
              value={settings.outputFormat.sampleRate}
              onChange={(e) =>
                updateGenerationSettings({
                  outputFormat: {
                    container: 'wav',
                    encoding: 'pcm_s16le',
                    sampleRate: Number(e.target.value),
                  },
                })
              }
              className="studio-input w-full px-3 py-2 text-xs"
            >
              <option value={44100}>WAV 16-bit PCM • 44.1 kHz (Recommended)</option>
              <option value={48000}>WAV 16-bit PCM • 48.0 kHz (Video)</option>
              <option value={24000}>WAV 16-bit PCM • 24.0 kHz</option>
              <option value={22050}>WAV 16-bit PCM • 22.05 kHz</option>
              <option value={16000}>WAV 16-bit PCM • 16.0 kHz</option>
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[#91A0BD]">Default Speed</span>
              <span className="font-mono text-[#EDF2FF]">{settings.defaultSpeed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.6}
              max={1.5}
              step={0.05}
              value={settings.defaultSpeed}
              onChange={(e) =>
                updateGenerationSettings({ defaultSpeed: Number(e.target.value) })
              }
              className="mt-2 w-full"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[#91A0BD]">Pause Between Dialogue Lines</span>
            <span className="font-mono text-[#EDF2FF]">{settings.pauseMs} ms</span>
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={settings.pauseMs}
            onChange={(e) => updateGenerationSettings({ pauseMs: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[rgba(145,160,189,0.14)] bg-[#0E1628]/70 px-3 py-2.5 text-xs">
          <div>
            <div className="font-medium text-[#EDF2FF]">Normalize Track Levels</div>
            <div className="text-[11px] text-[#91A0BD]">
              Balance peak volume gently across speakers without clipping.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.normalizeAudio}
            onChange={(e) => updateGenerationSettings({ normalizeAudio: e.target.checked })}
            className="h-4 w-4 rounded accent-[#76DFBD]"
          />
        </label>
      </div>
    </section>
  );
}
