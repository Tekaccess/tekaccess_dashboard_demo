import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, FileText, CheckCircle, Warning,
  PencilSimple, Eye, Spinner, UploadSimple, FilePdf,
  FileDoc, FileXls, Link, X,
} from '@phosphor-icons/react';
import {
  apiGetContractsSummary, apiListContracts, apiCreateContract, apiUpdateContract,
  apiUploadContractDocument,
  OperationsContract,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';

const STATUS_STYLES: Record<string, string> = {
  draft:                'bg-surface text-t3 border-border',
  active:               'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  partially_delivered:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed:            'bg-purple-500/10 text-purple-400 border-purple-500/20',
  closed:               'bg-surface text-t3 border-border',
  disputed:             'bg-rose-500/10 text-rose-400 border-rose-500/20',
  cancelled:            'bg-rose-500/10 text-rose-400 border-rose-500/20',
};
const STATUS_DOT: Record<string, string> = {
  draft: 'bg-t3', active: 'bg-emerald-400', partially_delivered: 'bg-blue-400',
  completed: 'bg-purple-400', closed: 'bg-t3', disputed: 'bg-rose-400', cancelled: 'bg-rose-400',
};

const CONTRACT_STATUSES = ['draft', 'active', 'partially_delivered', 'completed', 'closed', 'disputed', 'cancelled'];
const CONTRACT_TYPES = ['client', 'employee', 'driver'] as const;
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp',
];

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftContract {
  contractRef: string;
  title: string;
  contractType: 'employee' | 'driver' | 'client';
}

function genRef() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CON-${ymd}-${rand}`;
}
function emptyDraft(): DraftContract {
  return { contractRef: genRef(), title: '', contractType: 'client' };
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function docIcon(name: string | null) {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FilePdf size={16} className="text-red-400" />;
  if (ext === 'doc' || ext === 'docx') return <FileDoc size={16} className="text-blue-400" />;
  if (ext === 'xls' || ext === 'xlsx') return <FileXls size={16} className="text-emerald-400" />;
  return <FileText size={16} className="text-t3" />;
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
const lbl = 'block text-[10px] text-t3 mb-1';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<OperationsContract[]>([]);
  const [summary, setSummary] = useState({ active: 0, draft: 0, completed: 0, disputed: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OperationsContract | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftContract>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '50' };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.contractType = typeFilter;
    const [cRes, sRes] = await Promise.all([
      apiListContracts({ ...params, isTemplate: 'false' }),
      apiGetContractsSummary(),
    ]);
    if (cRes.success) { setContracts(cRes.data.contracts); setTotal(cRes.data.pagination.total); }
    if (sRes.success) setSummary(sRes.data.summary);
    setLoading(false);
  }, [search, statusFilter, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setDraft(emptyDraft());
    setSelected(null);
    setError(null);
    setDocFile(null);
    setDocError(null);
    setModalMode('new');
  }
  function openEdit(c: OperationsContract) {
    setDraft({ contractRef: c.contractRef, title: c.title, contractType: c.contractType || 'client' });
    setSelected(c);
    setError(null);
    setDocFile(null);
    setDocError(null);
    setModalMode('edit');
  }

  function handleDocPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_DOC_TYPES.includes(file.type)) { setDocError('Only PDF, Word, Excel, or image files are accepted'); return; }
    if (file.size > 20 * 1024 * 1024) { setDocError('File must be under 20 MB'); return; }
    setDocFile(file);
    setDocError(null);
  }

  async function handleSave() {
    if (!draft.title.trim()) { setError('Contract name is required.'); return; }
    setSaving(true); setError(null);

    const res = modalMode === 'new'
      ? await apiCreateContract({ contractRef: draft.contractRef, title: draft.title, contractType: draft.contractType } as any)
      : await apiUpdateContract(selected!._id, { title: draft.title, contractType: draft.contractType });

    if (!res.success) { setSaving(false); setError((res as any).message || 'Save failed.'); return; }

    const contractId = res.data.contract._id;
    if (docFile) {
      setDocUploading(true);
      const docRes = await apiUploadContractDocument(contractId, docFile);
      setDocUploading(false);
      if (!docRes.success) setDocError((docRes as any).message || 'Contract saved but document upload failed.');
    }

    setSaving(false);
    setModalMode(null);
    load();
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  const formContent = (
    <div className="space-y-5 pb-6">
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}

      {/* Contract ID — read-only */}
      <div>
        <label className={lbl}>Contract ID (auto-generated)</label>
        <div className="flex items-center gap-2 px-3 py-2 bg-surface/50 border border-border rounded-lg">
          <span className="font-mono text-sm font-bold text-accent tracking-wider">{draft.contractRef}</span>
          <span className="text-[10px] text-t3 ml-auto">Read-only</span>
        </div>
      </div>

      {/* Type */}
      <div>
        <label className={lbl}>Contract Type *</label>
        <select className={inp} value={draft.contractType} onChange={e => setDraft(d => ({ ...d, contractType: e.target.value as any }))}>
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {/* Name */}
      <div>
        <label className={lbl}>Contract Name *</label>
        <input className={inp} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Supply Agreement — Q1 2025" />
      </div>

      {/* Document */}
      <div>
        <label className={lbl}>Contract Document</label>
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleDocPick} />

        {modalMode === 'edit' && selected?.documentUrl && !docFile && (
          <div className="flex items-center gap-3 p-3 mb-2 bg-surface border border-border rounded-xl">
            <div className="flex-shrink-0">{docIcon(selected.documentName)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-t1 truncate">{selected.documentName || 'Attached document'}</p>
              <p className="text-[10px] text-t3">Currently attached</p>
            </div>
            <a href={selected.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1">
              <Link size={12} /> View
            </a>
          </div>
        )}

        {docFile ? (
          <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
            <div className="flex-shrink-0">{docIcon(docFile.name)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-t1 truncate">{docFile.name}</p>
              <p className="text-[10px] text-t3">{(docFile.size / 1024).toFixed(0)} KB — will upload on save</p>
            </div>
            <button onClick={() => { setDocFile(null); if (docInputRef.current) docInputRef.current.value = ''; }} className="text-t3 hover:text-red-400 transition-colors"><X size={14} weight="bold" /></button>
          </div>
        ) : (
          <button onClick={() => docInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-border hover:border-accent/50 rounded-xl text-t3 hover:text-accent transition-all group">
            <UploadSimple size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Click to attach document</span>
            <span className="text-[10px]">PDF, Word, Excel, or image — max 20 MB</span>
          </button>
        )}

        {docError && <p className="text-xs text-red-400 mt-1">{docError}</p>}
      </div>
    </div>
  );

  // ── View sidebar ──────────────────────────────────────────────────────────────
  const viewSidebar = selected ? (
    <div className="space-y-5 text-sm">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Quick Status</p>
        <select className={inp} value={selected.status}
          onChange={async e => { await apiUpdateContract(selected._id, { status: e.target.value }); load(); }}>
          {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {selected.documentUrl && (
        <div className="space-y-1">
          <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Document</p>
          <a href={selected.documentUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-card/50 border border-border rounded-xl hover:border-accent/40 transition-colors group">
            <div className="flex-shrink-0">{docIcon(selected.documentName)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-t1 truncate group-hover:text-accent transition-colors">{selected.documentName || 'View Document'}</p>
              <p className="text-[10px] text-t3">Click to open</p>
            </div>
            <Link size={13} className="text-t3 group-hover:text-accent transition-colors" />
          </a>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Edit Contract
        </button>
      </div>
    </div>
  ) : null;

  // ── View body ─────────────────────────────────────────────────────────────────
  const viewBody = selected ? (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[selected.status] ?? STATUS_STYLES.draft}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] ?? STATUS_DOT.draft}`} />
          {selected.status.replace(/_/g, ' ')}
        </span>
      </div>

      {([
        ['Contract ID', selected.contractRef],
        ['Type', selected.contractType],
        ['Name', selected.title],
        ['Created', fmtDate(selected.createdAt)],
      ] as [string, string][]).map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm border-b border-border pb-3 last:border-0 last:pb-0">
          <span className="text-t3">{k}</span>
          <span className="font-medium text-t1 text-right max-w-[60%] font-mono text-xs">{v}</span>
        </div>
      ))}

      {selected.documentUrl && (
        <a href={selected.documentUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-accent/40 transition-colors group">
          <div className="flex-shrink-0">{docIcon(selected.documentName)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-t1 truncate group-hover:text-accent transition-colors">
              {selected.documentName || 'Contract Document'}
            </p>
          </div>
          <Link size={13} className="text-t3 group-hover:text-accent" />
        </a>
      )}

      <button onClick={() => openEdit(selected)}
        className="w-full py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">
        Edit Contract
      </button>
    </div>
  ) : null;

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Contracts</h1>
          <p className="text-sm text-t3 mt-0.5">{total} contracts total</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> New Contract
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active', value: summary.active, Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Draft', value: summary.draft, Icon: FileText, color: 'text-t3', bg: 'bg-surface' },
          { label: 'Completed', value: summary.completed, Icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Disputed', value: summary.disputed, Icon: Warning, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${card.bg}`}><card.Icon size={18} weight="duotone" className={card.color} /></div>
            <div>
              <p className="text-xs text-t3 font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search ref or name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors">
            <option value="">All Types</option>
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors">
            <option value="">All Statuses</option>
            {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                {['Contract ID', 'Name', 'Type', 'Document', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border-s">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-t3 text-sm">
                  <div className="flex flex-col items-center gap-3">
                    <FileText size={40} weight="duotone" className="text-t3/40" />
                    <p>No contracts found.</p>
                    <button onClick={openNew} className="text-accent font-semibold hover:underline">Create first contract</button>
                  </div>
                </td></tr>
              ) : contracts.map(c => (
                <tr key={c._id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => { setSelected(c); setModalMode('view'); }}>
                  <td className="px-4 py-3.5 text-sm font-mono font-semibold text-accent">{c.contractRef}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-t1 max-w-[200px] truncate">{c.title}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-medium text-t2 capitalize">{c.contractType}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.documentUrl
                      ? <a href={c.documentUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-accent hover:text-accent-h">{docIcon(c.documentName)}</a>
                      : <span className="text-border"><FileText size={16} /></span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] ?? STATUS_DOT.draft}`} />
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-t2 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); setSelected(c); setModalMode('view'); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </OverlayScrollbarsComponent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-t3">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-surface disabled:opacity-40">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-surface disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <ModernModal
        isOpen={modalMode !== null}
        onClose={() => { setModalMode(null); setSelected(null); setError(null); setDocFile(null); setDocError(null); }}
        title={modalMode === 'new' ? 'New Contract' : modalMode === 'edit' ? `Edit — ${selected?.contractRef}` : selected?.title ?? ''}
        summaryContent={modalMode === 'view' ? viewSidebar : undefined}
        actions={modalMode !== 'view' ? (
          <button onClick={handleSave} disabled={saving || docUploading}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center gap-2">
            {(saving || docUploading) && <Spinner size={14} className="animate-spin" />}
            {docUploading ? 'Uploading…' : saving ? 'Saving…' : modalMode === 'new' ? 'Create Contract' : 'Save Changes'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewBody : formContent}
      </ModernModal>
    </div>
  );
}
