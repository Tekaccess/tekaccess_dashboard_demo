import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, BriefcaseMetal, PencilSimple,
  Spinner, Trash, CalendarBlank, Package, Truck, Timer,
} from '@phosphor-icons/react';
import { apiListProjects, apiCreateProject, apiUpdateProject, apiDeleteProject, Project } from '../lib/api';
import ModernModal from '../components/ui/ModernModal';
import ColumnSelector, { useColumnVisibility, ColDef } from '../components/ui/ColumnSelector';
import { Input } from '../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { TableSkeleton } from '../components/ui/Skeleton';

type ModalMode = 'new' | 'edit' | null;

interface DraftProject {
  name: string;
  quantityTonnes: string;
  deliveredTonnes: string;
  endDate: string;
  status: 'active' | 'completed';
}

function emptyDraft(): DraftProject {
  return { name: '', quantityTonnes: '', deliveredTonnes: '', endDate: '', status: 'active' };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
const inpReadonly = 'w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-sm text-t3 outline-none cursor-not-allowed';

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  on_hold:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
  cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const PROJ_COLS: ColDef[] = [
  { key: 'code',          label: 'ID',                  defaultVisible: true },
  { key: 'name',          label: 'Name',                defaultVisible: true },
  { key: 'demand',        label: 'Demand (Tonnes)',      defaultVisible: true },
  { key: 'delivered',     label: 'Delivered (Tonnes)',   defaultVisible: true },
  { key: 'enrouting',     label: 'Enrouting (Tonnes)',   defaultVisible: true },
  { key: 'remaining',     label: 'Remaining (Tonnes)',   defaultVisible: true },
  { key: 'deadline',      label: 'Deadline',             defaultVisible: true },
  { key: 'remainingDays', label: 'Remaining Days',       defaultVisible: true },
  { key: 'status',        label: 'Status',               defaultVisible: true },
  { key: 'actions',       label: 'Actions',              defaultVisible: true },
];

function remainingDays(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

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
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('projects', PROJ_COLS);

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
      deliveredTonnes: p.deliveredTonnes != null ? String(p.deliveredTonnes) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      status: p.status === 'completed' ? 'completed' : 'active',
    });
    setSelected(p);
    setError(null);
    setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.name.trim()) { setError('Project name is required.'); return; }
    setSaving(true); setError(null);
    const payload: Partial<Project> = {
      name: draft.name.trim(),
      status: draft.status,
      quantityTonnes: draft.quantityTonnes !== '' ? Number(draft.quantityTonnes) : null,
      deliveredTonnes: draft.deliveredTonnes !== '' ? Number(draft.deliveredTonnes) : null,
      endDate: draft.endDate || null,
    };
    const res = modalMode === 'new'
      ? await apiCreateProject(payload)
      : await apiUpdateProject(selected!._id, payload);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null);
    loadProjects();
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      const res = await apiDeleteProject(id);
      if (!res.success) return;
      loadProjects();
    } catch {
      // network/parse error — button will re-enable
    } finally {
      setSaving(false);
      setConfirmDeleteId(null);
    }
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
          <label className="block text-xs text-t3 mb-1.5">Demand (Tonnes)</label>
          <input type="number" min={0} step="any" className={inp}
            value={draft.quantityTonnes}
            onChange={e => setDraft(d => ({ ...d, quantityTonnes: e.target.value }))}
            placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1.5">Delivered (Tonnes)</label>
          <input type="number" min={0} step="any" className={inp}
            value={draft.deliveredTonnes}
            onChange={e => setDraft(d => ({ ...d, deliveredTonnes: e.target.value }))}
            placeholder="e.g. 2500" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1.5">Timeline (deadline)</label>
        <input type="date" className={inp}
          value={draft.endDate}
          onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-3">Status</label>
        <div className="flex gap-3">
          {(['active', 'completed'] as const).map(s => (
            <label key={s}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors text-sm font-medium ${
                draft.status === s ? STATUS_STYLES[s] : 'border-border hover:bg-surface text-t3'
              }`}>
              <input type="radio" name="status" value={s}
                checked={draft.status === s}
                onChange={() => setDraft(d => ({ ...d, status: s }))}
                className="sr-only" />
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
            <span className="text-t3">Demand</span>
            <span className="text-t1 font-bold">
              {draft.quantityTonnes !== '' ? `${Number(draft.quantityTonnes).toLocaleString()} Tonnes` : '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Delivered</span>
            <span className="text-t1 font-bold">
              {draft.deliveredTonnes !== '' ? `${Number(draft.deliveredTonnes).toLocaleString()} Tonnes` : '—'}
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
        {/* Header */}
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
            { label: 'Total',        value: projects.length, bg: 'bg-blue-500/10',    color: 'text-blue-400',    Icon: BriefcaseMetal },
            { label: 'Active',       value: activeCount,     bg: 'bg-emerald-500/10', color: 'text-emerald-400', Icon: BriefcaseMetal },
            { label: 'Completed',    value: completedCount,  bg: 'bg-accent-glow',    color: 'text-accent',      Icon: BriefcaseMetal },
            {
              label: 'Total Demand',
              value: `${projects.reduce((s, p) => s + (p.quantityTonnes ?? 0), 0).toLocaleString()} T`,
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

        {/* Table card */}
        <div className="bg-card rounded-xl border border-border">
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9" />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <div className="ml-auto">
              <ColumnSelector cols={PROJ_COLS} visible={colVis} onToggle={colToggle} />
            </div>
          </div>

          {/* Table */}
          {!loading && projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <BriefcaseMetal size={40} className="mb-2 opacity-40" />
              <p>No projects found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {colVis.has('code')          && <TableHead>ID</TableHead>}
                    {colVis.has('name')          && <TableHead>Name</TableHead>}
                    {colVis.has('demand')        && <TableHead className="text-right">Demand (Tonnes)</TableHead>}
                    {colVis.has('delivered')     && <TableHead className="text-right">Delivered (Tonnes)</TableHead>}
                    {colVis.has('enrouting')     && <TableHead className="text-right">Enrouting (Tonnes)</TableHead>}
                    {colVis.has('remaining')     && <TableHead className="text-right">Remaining (Tonnes)</TableHead>}
                    {colVis.has('deadline')      && <TableHead>Deadline</TableHead>}
                    {colVis.has('remainingDays') && <TableHead className="text-right">Remaining Days</TableHead>}
                    {colVis.has('status')        && <TableHead>Status</TableHead>}
                    {colVis.has('actions')       && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableSkeleton rows={6} columns={PROJ_COLS.filter(c => colVis.has(c.key)).length} />
                  )}
                  {!loading && projects.map(p => (
                    <TableRow key={p._id} className="hover:bg-surface/50 transition-colors">
                      {colVis.has('code') && (
                        <TableCell className="font-mono text-xs text-accent">{p.projectCode}</TableCell>
                      )}
                      {colVis.has('name') && (
                        <TableCell className="font-medium text-t1">{p.name}</TableCell>
                      )}
                      {colVis.has('demand') && (
                        <TableCell className="text-right">
                          {p.quantityTonnes != null
                            ? <span className="font-semibold text-t1">{p.quantityTonnes.toLocaleString()} <span className="text-t3 font-normal text-xs">Tonnes</span></span>
                            : <span className="text-t3">—</span>}
                        </TableCell>
                      )}
                      {colVis.has('delivered') && (
                        <TableCell className="text-right">
                          {p.deliveredTonnes != null
                            ? <span className="font-semibold text-emerald-400">{p.deliveredTonnes.toLocaleString()} <span className="text-t3 font-normal text-xs">Tonnes</span></span>
                            : <span className="text-t3">—</span>}
                        </TableCell>
                      )}
                      {colVis.has('enrouting') && (
                        <TableCell className="text-right">
                          {(p.enroutingTonnes ?? 0) > 0
                            ? <span className="inline-flex items-center gap-1 font-semibold text-sky-400">
                                <Truck size={12} />
                                {(p.enroutingTonnes!).toLocaleString()} <span className="text-t3 font-normal text-xs">Tonnes</span>
                              </span>
                            : <span className="text-t3">—</span>}
                        </TableCell>
                      )}
                      {colVis.has('remaining') && (
                        <TableCell className="text-right">
                          <span className="text-t3">—</span>
                        </TableCell>
                      )}
                      {colVis.has('deadline') && (
                        <TableCell className="text-t2 whitespace-nowrap">
                          {p.endDate
                            ? <span className="inline-flex items-center gap-1.5">{fmtDate(p.endDate)}</span>
                            : <span className="text-t3">—</span>}
                        </TableCell>
                      )}
                      {colVis.has('remainingDays') && (() => {
                        const days = remainingDays(p.endDate);
                        const urgent = days !== null && days <= 7;
                        const overdue = days !== null && days < 0;
                        return (
                          <TableCell className="text-right">
                            {days === null
                              ? <span className="text-t3">—</span>
                              : <span className={`inline-flex items-center gap-1 font-semibold text-sm ${overdue ? 'text-rose-400' : urgent ? 'text-amber-400' : 'text-t1'}`}>
                                  {overdue ? `${Math.abs(days)}days overdue` : `${days}days`}
                                </span>}
                          </TableCell>
                        );
                      })()}
                      {colVis.has('status') && (
                        <TableCell>
                          <span className={`inline-flex items-center text-[10px] font-bold border rounded-full px-2 py-0.5 uppercase tracking-wider ${STATUS_STYLES[p.status] ?? 'text-t3 border-border'}`}>
                            {p.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                      )}
                      {colVis.has('actions') && (
                        <TableCell className="text-right">
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
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
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
