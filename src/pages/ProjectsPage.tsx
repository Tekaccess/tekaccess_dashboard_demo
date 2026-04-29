import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, BriefcaseMetal, PencilSimple,
  Spinner, Trash, CalendarBlank, Package,
} from '@phosphor-icons/react';
import { apiListProjects, apiCreateProject, apiUpdateProject, apiDeleteProject, Project } from '../lib/api';
import ModernModal from '../components/ui/ModernModal';

type ModalMode = 'new' | 'edit' | null;

interface DraftProject {
  name: string;
  quantityTonnes: string;
  endDate: string;
  status: 'active' | 'completed';
}

function emptyDraft(): DraftProject {
  return { name: '', quantityTonnes: '', endDate: '', status: 'active' };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
const inpReadonly = 'w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-sm text-t3 outline-none cursor-not-allowed';

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  on_hold:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
  cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Project | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftProject>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const res = await apiListProjects(search || undefined, statusFilter);
    if (res.success) setProjects(res.data.projects);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  function openNew() {
    setDraft(emptyDraft());
    setSelected(null);
    setError(null);
    setModalMode('new');
  }

  function openEdit(p: Project) {
    setDraft({
      name: p.name,
      quantityTonnes: p.quantityTonnes != null ? String(p.quantityTonnes) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      status: (p.status === 'completed' ? 'completed' : 'active'),
    });
    setSelected(p);
    setError(null);
    setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      setError('Project name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Partial<Project> = {
      name: draft.name.trim(),
      status: draft.status,
      quantityTonnes: draft.quantityTonnes !== '' ? Number(draft.quantityTonnes) : null,
      endDate: draft.endDate || null,
    };
    const res = modalMode === 'new'
      ? await apiCreateProject(payload)
      : await apiUpdateProject(selected!._id, payload);
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

  const activeCount    = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

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
        <input className={inp}
          value={draft.name}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Kigali Warehouse Expansion"
          autoFocus />
        {modalMode === 'new' && (
          <p className="text-[11px] text-t3 mt-1.5">An ID will be assigned automatically.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1.5">Quantity (tonnes)</label>
          <input
            type="number" min={0} step="any"
            className={inp}
            value={draft.quantityTonnes}
            onChange={e => setDraft(d => ({ ...d, quantityTonnes: e.target.value }))}
            placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1.5">Timeline (deadline)</label>
          <input
            type="date"
            className={inp}
            value={draft.endDate}
            onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-3">Status</label>
        <div className="flex gap-3">
          {(['active', 'completed'] as const).map(s => (
            <label
              key={s}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors text-sm font-medium ${
                draft.status === s ? STATUS_STYLES[s] : 'border-border hover:bg-surface text-t3'
              }`}
            >
              <input
                type="radio"
                name="status"
                value={s}
                checked={draft.status === s}
                onChange={() => setDraft(d => ({ ...d, status: s }))}
                className="sr-only"
              />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const modalSummary = (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Project</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          {modalMode === 'edit' && selected && (
            <div className="flex justify-between text-sm">
              <span className="text-t3">Code</span>
              <span className="font-mono font-bold text-accent">{selected.projectCode}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-t3">Status</span>
            <span className={`inline-flex items-center text-xs border rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLES[draft.status]}`}>
              {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Delivery</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Quantity</span>
            <span className="text-t1 font-bold">
              {draft.quantityTonnes !== '' ? `${Number(draft.quantityTonnes).toLocaleString()} t` : '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Timeline</span>
            <span className="text-t1 font-medium">{draft.endDate ? fmtDate(draft.endDate) : '—'}</span>
          </div>
        </div>
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

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total',     value: projects.length, bg: 'bg-blue-500/10',    color: 'text-blue-400',    Icon: BriefcaseMetal },
            { label: 'Active',    value: activeCount,     bg: 'bg-emerald-500/10', color: 'text-emerald-400', Icon: BriefcaseMetal },
            { label: 'Completed', value: completedCount,  bg: 'bg-accent-glow',    color: 'text-accent',      Icon: BriefcaseMetal },
            {
              label: 'Total Tonnes',
              value: projects.reduce((s, p) => s + (p.quantityTonnes ?? 0), 0).toLocaleString(),
              bg: 'bg-amber-500/10', color: 'text-amber-500', Icon: Package,
            },
          ].map(({ label, value, bg, color, Icon }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
                <Icon size={18} weight="duotone" className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-t3">{label}</p>
                <p className="text-xl font-bold text-t1 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
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
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Qty (t)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Timeline</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projects.map(p => (
                    <tr key={p._id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-accent">{p.projectCode}</td>
                      <td className="px-4 py-3.5 font-medium text-t1">{p.name}</td>
                      <td className="px-4 py-3.5 text-right text-t2">
                        {p.quantityTonnes != null
                          ? <span className="font-semibold text-t1">{p.quantityTonnes.toLocaleString()} <span className="text-t3 font-normal text-xs">t</span></span>
                          : <span className="text-t3">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-t2 whitespace-nowrap">
                        {p.endDate ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarBlank size={12} className="text-t3" />
                            {fmtDate(p.endDate)}
                          </span>
                        ) : <span className="text-t3">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center text-[10px] font-bold border rounded-full px-2 py-0.5 uppercase tracking-wider ${STATUS_STYLES[p.status] ?? 'text-t3 border-border'}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
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
        title={modalMode === 'new' ? 'Create New Project' : 'Edit Project'}
        summaryContent={modalSummary}
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
