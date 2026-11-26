import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AudioLines, Check, FolderOpen, Loader2, Save, Settings } from 'lucide-react';
import { useStudioStore } from '../../store/useStudioStore';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    project,
    isDirty,
    isSaving,
    saveError,
    isSettingsPanelOpen,
    toggleSettingsPanel,
    setSettingsPanelOpen,
    setProjectMeta,
    saveCurrentProject,
  } = useStudioStore();

  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async () => {
    const saved = await saveCurrentProject();
    if (saved) {
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const handleSettingsClick = () => {
    if (location.pathname !== '/') {
      setSettingsPanelOpen(true);
      navigate('/');
      return;
    }
    toggleSettingsPanel();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(145,160,189,0.16)] bg-[#0B1020]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand + Active Project Name */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-0.5 transition hover:bg-white/5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#9AABFF] to-[#76DFBD] text-[#0B1020] shadow-md shadow-[#9AABFF]/20">
              <AudioLines className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight text-[#EDF2FF] sm:inline">
              Cartesia Multi-Speaker Studio
            </span>
          </Link>

          <div className="flex min-w-0 max-w-xs flex-1 items-center gap-2">
            <input
              type="text"
              value={project.name}
              onChange={(e) => setProjectMeta({ name: e.target.value })}
              aria-label="Current project name"
              placeholder="Project name..."
              className="studio-input w-full truncate px-3 py-1.5 text-xs font-medium sm:text-sm"
            />
            {isDirty && (
              <span
                title="Unsaved changes"
                className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
              />
            )}
          </div>
        </div>

        {/* Minimal Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            title={saveError || 'Save project'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9AABFF]/15 px-3 py-1.5 text-xs font-semibold text-[#9AABFF] ring-1 ring-[#9AABFF]/30 transition hover:bg-[#9AABFF]/25 disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : justSaved ? (
              <Check className="h-3.5 w-3.5 text-[#76DFBD]" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : justSaved ? 'Saved' : 'Save'}</span>
          </button>

          <Link
            to="/projects"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              location.pathname === '/projects'
                ? 'border-[#76DFBD]/50 bg-[#17233B] text-[#EDF2FF]'
                : 'border-[rgba(145,160,189,0.2)] bg-[#111A2D] text-[#91A0BD] hover:text-[#EDF2FF]'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5 text-[#76DFBD]" />
            <span className="hidden sm:inline">Projects</span>
          </Link>

          <button
            type="button"
            onClick={handleSettingsClick}
            aria-expanded={location.pathname === '/' && isSettingsPanelOpen}
            title="Toggle Character Voices & Generation Settings"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              location.pathname === '/' && isSettingsPanelOpen
                ? 'border-[#9AABFF]/60 bg-[#17233B] text-[#EDF2FF]'
                : 'border-[rgba(145,160,189,0.2)] bg-[#111A2D] text-[#EDF2FF] hover:border-[#9AABFF]/40'
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-[#9AABFF]" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="border-t border-rose-500/30 bg-rose-950/50 px-4 py-1.5 text-center text-xs text-rose-200">
          Save failed: {saveError}
        </div>
      )}
    </header>
  );
}
