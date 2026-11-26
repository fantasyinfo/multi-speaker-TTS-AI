import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  FolderOpen,
  Loader2,
  Mic2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ProjectSummary } from '../types/studio';
import {
  deleteProject,
  extractApiErrorMessage,
  fetchProjects,
  updateProject,
} from '../services/api';
import { useStudioStore } from '../store/useStudioStore';

export function Projects() {
  const navigate = useNavigate();
  const { loadSavedProject, newProject, project: activeProject, setProjectMeta } = useStudioStore();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadList = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProjects();
      setProjects(list);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load saved projects'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleOpenProject = async (id: string) => {
    setBusyId(id);
    try {
      await loadSavedProject(id);
      navigate('/');
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load project'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRenameSubmit = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setBusyId(id);
    try {
      const updated = await updateProject(id, { name: trimmed });
      setProjects((prev) =>
        prev.map((p) => (p._id === id ? { ...p, name: updated.name, updatedAt: updated.updatedAt || p.updatedAt } : p))
      );
      if (activeProject._id === id) {
        setProjectMeta({ name: updated.name });
      }
      setRenamingId(null);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to rename project'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to delete project'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[#EDF2FF]">
            <FolderOpen className="h-5 w-5 text-[#76DFBD]" />
            <span>Saved Story Projects</span>
          </h1>
          <p className="mt-1 text-xs text-[#91A0BD]">
            Load, rename, or remove multi-speaker projects stored in MongoDB or local SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadList}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(145,160,189,0.2)] bg-[#111A2D] px-3 py-2 text-xs font-medium text-[#EDF2FF] hover:border-[#9AABFF]/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              newProject(false);
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#9AABFF] px-3.5 py-2 text-xs font-semibold text-[#0B1020] hover:bg-[#b2c0ff]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Blank Project</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/35 p-4 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div>
            <div className="font-semibold">Unable to access projects</div>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="studio-card flex items-center justify-center py-16 text-sm text-[#91A0BD]">
          <Loader2 className="mr-2.5 h-5 w-5 animate-spin text-[#9AABFF]" />
          Loading projects from MongoDB...
        </div>
      ) : projects.length === 0 ? (
        <div className="studio-card p-12 text-center">
          <p className="text-sm font-medium text-[#EDF2FF]">No saved projects yet.</p>
          <p className="mt-1 text-xs text-[#91A0BD]">
            Return to the Studio and click <strong className="text-[#EDF2FF]">Save</strong> to store
            your current story in MongoDB.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((proj) => {
            const isActive = activeProject._id === proj._id;
            const isConfirming = confirmDeleteId === proj._id;
            const isRenaming = renamingId === proj._id;

            return (
              <div
                key={proj._id}
                className={`studio-card flex flex-col justify-between p-5 ${
                  isActive ? 'border-[#9AABFF]/60' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {isRenaming ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(proj._id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          autoFocus
                          className="studio-input flex-1 px-2.5 py-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameSubmit(proj._id)}
                          className="rounded-lg bg-[#76DFBD] px-2.5 py-1 text-xs font-semibold text-[#0B1020]"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <h2 className="text-base font-semibold text-[#EDF2FF]">{proj.name}</h2>
                    )}

                    {isActive && (
                      <span className="shrink-0 rounded-full bg-[#76DFBD]/15 px-2 py-0.5 text-[10px] font-semibold text-[#76DFBD]">
                        Active
                      </span>
                    )}
                  </div>

                  {proj.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-[#91A0BD]">{proj.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#91A0BD]">
                    <span className="inline-flex items-center gap-1">
                      <Mic2 className="h-3.5 w-3.5 text-[#9AABFF]" />
                      {proj.speakerCount} speakers
                    </span>
                    <span>{proj.lineCount} lines</span>
                    <span className="rounded bg-[#17233B] px-1.5 py-0.5 font-mono text-[11px] uppercase text-[#EDF2FF]">
                      {proj.language}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(proj.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[rgba(145,160,189,0.12)] pt-3">
                  {isConfirming ? (
                    <div className="flex w-full items-center justify-between gap-2 text-xs">
                      <span className="text-rose-300">Delete this project?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-2.5 py-1 text-[#91A0BD] hover:text-[#EDF2FF]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(proj._id)}
                          disabled={busyId === proj._id}
                          className="rounded-lg bg-rose-500 px-2.5 py-1 font-semibold text-white"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(proj._id);
                            setRenameValue(proj.name);
                          }}
                          title="Rename project"
                          className="rounded-lg p-1.5 text-[#91A0BD] hover:bg-white/5 hover:text-[#EDF2FF]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(proj._id)}
                          title="Delete project"
                          className="rounded-lg p-1.5 text-[#91A0BD] hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenProject(proj._id)}
                        disabled={busyId === proj._id}
                        className="rounded-lg bg-[#17233B] px-3.5 py-1.5 text-xs font-semibold text-[#9AABFF] ring-1 ring-[#9AABFF]/30 transition hover:bg-[#1E2D4B]"
                      >
                        {busyId === proj._id ? 'Opening...' : 'Open in Studio'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
