import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, BriefcaseMetal, PencilSimple,
  Spinner, Trash,
} from '@phosphor-icons/react';
import { apiListProjects, apiCreateProject, apiUpdateProject, apiDeleteProject, Project } from '../lib/api';
import ModernModal from '../components/ui/ModernModal';

type ModalMode = 'new' | 'edit' | null;

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
const inpReadonly = 'w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-sm text-t3 outline-none cursor-not-allowed';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const res = await apiListProjects(search || undefined, 'all');
    if (res.success) setProjects(res.data.projects);
    setLoading(false);
  }, [search]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  function openNew() {
    setName('');
    setSelected(null);
    setError(null);
    setModalMode('new');
  }

  function openEdit(p: Project) {
    setName(p.name);
    setSelected(p);
    setError(null);
    setModalMode('edit');
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = modalMode === 'new'
      ? await apiCreateProject({ name: name.trim() })
      : await apiUpdateProject(selected!._id, { name: name.trim() });
    setSaving(false);
    if (!res.success) {
      setError((res as any).message || 'Save failed.');
      return;
    }
    setModalMode(null);
    loadProjects();
  }

  async function handleDelete(id: string) {
    setSaving(true);
    const res = await apiDeleteProject(id);
    setSaving(false);
    setConfirmDeleteId(null);
    if (!res.success) return;
    loadProjects();
  }

  const formContent = (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}

      {modalMode === 'edit' && selected && (
        <div>
          <label className="block text-xs text-t3 mb-1.5">Project ID</label>
          <input className={inpReadonly} value={selected.projectCode} disabled readOnly />
        </div>
      )}

      <div>
        <label className="block text-xs text-t3 mb-1.5">Project Name *</label>
        <input className={inp} value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Kigali Warehouse Expansion"
          autoFocus />
        {modalMode === 'new' && (
          <p className="text-[11px] text-t3 mt-1.5">An ID will be assigned automatically.</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Projects</h1>
            <p className="text-sm text-t3 mt-1">{projects.length} projects</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Project
          </button>
        </div>

        <div className="relative max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
            placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <BriefcaseMetal size={40} className="mb-2 opacity-40" />
              <p>No projects found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/30">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider w-[200px]">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projects.map(p => (
                    <tr key={p._id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-accent">{p.projectCode}</td>
                      <td className="px-4 py-3.5 font-medium text-t1">{p.name}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2 text-t3">
                          <button onClick={() => openEdit(p)}
                            className="hover:text-t1 p-1.5 rounded hover:bg-surface transition-colors">
                            <PencilSimple size={14} />
                          </button>
                          {confirmDeleteId === p._id ? (
                            <button onClick={() => handleDelete(p._id)} disabled={saving}
                              className="px-2 py-1 text-[11px] border border-rose-500 text-rose-400 bg-rose-500/10 rounded hover:bg-rose-500/20 transition-colors flex items-center gap-1">
                              {saving ? <Spinner size={11} className="animate-spin" /> : <Trash size={11} />} Confirm
                            </button>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(p._id)}
                              className="hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}
        </div>
      </div>

      <ModernModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'new' ? 'Create New Project' : 'Rename Project'}
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Create Project' : 'Save Changes'}
          </button>
        }
      >
        {formContent}
      </ModernModal>
    </>
  );
}
