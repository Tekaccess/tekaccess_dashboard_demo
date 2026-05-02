import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, FileText, CheckCircle, Warning,
  PencilSimple, Eye, Spinner, UploadSimple, FilePdf,
  FileDoc, FileXls, Link as LinkIcon, X, Trash, ArrowSquareOut,
} from '@phosphor-icons/react';
import {
  apiGetContractsSummary, apiListContracts, apiCreateContract, apiUpdateContract,
  apiUploadContractDocument, apiDeleteContract,
  OperationsContract,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

const CONTRACT_COLS: ColDef[] = [
  { key: 'contractRef', label: 'Contract ID' },
  { key: 'title',       label: 'Name' },
  { key: 'contractType', label: 'Type' },
  { key: 'document',    label: 'Document' },
  { key: 'status',      label: 'Status' },
  { key: 'createdAt',   label: 'Created' },
];

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
// All contract types live in one list. The same page shows everything
// regardless of which dashboard mounted it (operations / procurement / sales)
// — the multi-URL mount only exists so the active department doesn't switch
// when you click Contracts from a non-Operations sidebar.
const CONTRACT_TYPES = ['client', 'supplier', 'transporter', 'employee', 'driver'] as const;
type ContractType = typeof CONTRACT_TYPES[number];

const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/webp',
];

type ModalMode = 'new' | 'edit' | 'view' | null;
// Document attachment is one-or-the-other: a single contract has either an
// uploaded file (Cloudinary, with documentPublicId) OR an external link
// (Google Doc / Drive / SharePoint, with documentUrl + null publicId).
type DocMode = 'none' | 'upload' | 'link';

interface DraftContract {
  contractRef: string;
  title: string;
  contractType: ContractType;
}

function genRef() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CON-${ymd}-${rand}`;
}
function emptyDraft(defaultType: ContractType): DraftContract {
  return { contractRef: genRef(), title: '', contractType: defaultType };
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function docIcon(name: string | null, isLink: boolean) {
  if (isLink) return <LinkIcon size={16} className="text-blue-400" />;
  const ext = name?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FilePdf size={16} className="text-red-400" />;
  if (ext === 'doc' || ext === 'docx') return <FileDoc size={16} className="text-blue-400" />;
  if (ext === 'xls' || ext === 'xlsx') return <FileXls size={16} className="text-emerald-400" />;
  return <FileText size={16} className="text-t3" />;
}

// Normalize a pasted URL — accept anything starting with http(s). Reject
// "javascript:", file paths, etc. so we never set a hostile href.
function isValidExternalUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
const lbl = 'block text-[10px] text-t3 mb-1 uppercase tracking-widest font-bold';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<OperationsContract[]>([]);
  const [summary, setSummary] = useState({ active: 0, draft: 0, completed: 0, disputed: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<OperationsContract | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftContract>(() => emptyDraft('client'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { visible: colVis, toggle: colToggle } = useColumnVisibility('contracts', CONTRACT_COLS);

  // Document state for the modal — single attachment, one of two modes.
  const [docMode, setDocMode] = useState<DocMode>('none');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLinkUrl, setDocLinkUrl] = useState('');
  const [docLinkName, setDocLinkName] = useState('');
  const [docError, setDocError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Inline delete confirmation. Keeps users out of "did I just delete this?"
  // territory without firing a full modal-on-modal.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  function resetDocState() {
    setDocMode('none');
    setDocFile(null);
    setDocLinkUrl('');
    setDocLinkName('');
    setDocError(null);
    if (docInputRef.current) docInputRef.current.value = '';
  }
  function closeModal() {
    setModalMode(null);
    setSelected(null);
    setError(null);
    setConfirmDelete(false);
    resetDocState();
  }

  function openNew() {
    setDraft(emptyDraft('client'));
    setSelected(null);
    setError(null);
    setConfirmDelete(false);
    resetDocState();
    setModalMode('new');
  }
  function openEdit(c: OperationsContract) {
    setDraft({ contractRef: c.contractRef, title: c.title, contractType: c.contractType || 'client' });
    setSelected(c);
    setError(null);
    setConfirmDelete(false);
    resetDocState();
    setModalMode('edit');
  }

  function handleDocPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      setDocError('Only PDF, Word, Excel, or image files are accepted');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setDocError('File must be under 20 MB');
      return;
    }
    setDocFile(file);
    setDocError(null);
  }

  async function handleSave() {
    if (!draft.title.trim()) { setError('Contract name is required.'); return; }

    // Validate the link before hitting the API — saves a round-trip and
    // catches `javascript:` / file paths.
    if (docMode === 'link' && docLinkUrl.trim() && !isValidExternalUrl(docLinkUrl)) {
      setDocError('Please enter a valid http(s):// URL');
      return;
    }

    setSaving(true); setError(null);

    const res = modalMode === 'new'
      ? await apiCreateContract({ contractRef: draft.contractRef, title: draft.title, contractType: draft.contractType } as any)
      : await apiUpdateContract(selected!._id, { title: draft.title, contractType: draft.contractType });

    if (!res.success) { setSaving(false); setError((res as any).message || 'Save failed.'); return; }

    const contractId = res.data.contract._id;

    // Attach the document — exactly one path, never both.
    if (docMode === 'upload' && docFile) {
      setDocUploading(true);
      const docRes = await apiUploadContractDocument(contractId, docFile);
      setDocUploading(false);
      if (!docRes.success) {
        setDocError((docRes as any).message || 'Contract saved but file upload failed.');
        setSaving(false);
        return;
      }
    } else if (docMode === 'link' && docLinkUrl.trim()) {
      const url = docLinkUrl.trim();
      const name = docLinkName.trim() || (() => {
        try { return new URL(url).hostname; } catch { return 'External document'; }
      })();
      const linkRes = await apiUpdateContract(contractId, {
        documentUrl: url,
        documentName: name,
        documentPublicId: null,
      } as any);
      if (!linkRes.success) {
        setDocError((linkRes as any).message || 'Contract saved but link could not be attached.');
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    const res = await apiDeleteContract(selected._id);
    setDeleting(false);
    if (!res.success) {
      setError((res as any).message || 'Delete failed. Active contracts must be cancelled first.');
      setConfirmDelete(false);
      return;
    }
    closeModal();
    load();
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  const existingDocIsLink = !!(selected?.documentUrl && !selected?.documentPublicId);
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

      {/* Type — all five types available regardless of which dashboard
          mounted this page. One contract list, one set of options. */}
      <div>
        <label className={lbl}>Contract Type</label>
        <div className="flex gap-1.5">
          {CONTRACT_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setDraft(d => ({ ...d, contractType: t }))}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-colors capitalize ${
                draft.contractType === t
                  ? 'bg-accent-glow text-accent border-accent/30'
                  : 'bg-surface text-t2 border-border hover:text-t1 hover:border-accent/20'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className={lbl}>Contract Name *</label>
        <input
          className={inp}
          value={draft.title}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Supply Agreement — Q1 2025"
        />
      </div>

      {/* Document — one attachment, two modes (upload OR link) */}
      <div>
        <label className={lbl}>Contract Document</label>

        {/* Existing document on edit (when no new attachment chosen yet) */}
        {modalMode === 'edit' && selected?.documentUrl && docMode === 'none' && !docFile && (
          <div className="flex items-center gap-3 p-3 mb-2 bg-surface border border-border rounded-xl">
            <div className="flex-shrink-0">{docIcon(selected.documentName, existingDocIsLink)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-t1 truncate">{selected.documentName || 'Attached document'}</p>
              <p className="text-[10px] text-t3">
                Currently attached · {existingDocIsLink ? 'External link' : 'Uploaded file'}
              </p>
            </div>
            <a
              href={selected.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
            >
              <ArrowSquareOut size={12} weight="bold" /> Open
            </a>
            <button
              type="button"
              onClick={() => { setDocMode('upload'); }}
              className="text-[11px] font-medium text-t3 hover:text-t1 underline-offset-2 hover:underline"
            >
              Replace
            </button>
          </div>
        )}

        {/* Mode selector — only shown when there's no current attachment, or
            after the user clicks "Replace". Keeps the modal calm. */}
        {(docMode === 'none' && !(modalMode === 'edit' && selected?.documentUrl)) && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDocMode('upload')}
              className="flex flex-col items-center gap-1.5 py-5 border-2 border-dashed border-border hover:border-accent/50 rounded-xl text-t3 hover:text-accent transition-all group"
            >
              <UploadSimple size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Upload file</span>
              <span className="text-[10px]">PDF / Word / Excel / image</span>
            </button>
            <button
              type="button"
              onClick={() => setDocMode('link')}
              className="flex flex-col items-center gap-1.5 py-5 border-2 border-dashed border-border hover:border-accent/50 rounded-xl text-t3 hover:text-accent transition-all group"
            >
              <LinkIcon size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Paste link</span>
              <span className="text-[10px]">Google Doc / Drive / SharePoint</span>
            </button>
          </div>
        )}

        {/* Upload mode */}
        {docMode === 'upload' && (
          <>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleDocPick}
            />
            {docFile ? (
              <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                <div className="flex-shrink-0">{docIcon(docFile.name, false)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-t1 truncate">{docFile.name}</p>
                  <p className="text-[10px] text-t3">{(docFile.size / 1024).toFixed(0)} KB — will upload on save</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDocFile(null); if (docInputRef.current) docInputRef.current.value = ''; }}
                  className="text-t3 hover:text-red-400 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-border hover:border-accent/50 rounded-xl text-t3 hover:text-accent transition-all group"
              >
                <UploadSimple size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Click to choose a file</span>
                <span className="text-[10px]">PDF, Word, Excel, or image — max 20 MB · one file only</span>
              </button>
            )}
            <button
              type="button"
              onClick={resetDocState}
              className="mt-2 text-[11px] text-t3 hover:text-t1 hover:underline"
            >
              Cancel — pick a different option
            </button>
          </>
        )}

        {/* Link mode */}
        {docMode === 'link' && (
          <div className="space-y-2">
            <input
              type="url"
              className={inp}
              value={docLinkUrl}
              onChange={(e) => { setDocLinkUrl(e.target.value); setDocError(null); }}
              placeholder="https://docs.google.com/document/d/…"
            />
            <input
              type="text"
              className={inp}
              value={docLinkName}
              onChange={(e) => setDocLinkName(e.target.value)}
              placeholder="Display name (optional, e.g. 'Q1 Supply Agreement')"
            />
            <p className="text-[10px] text-t3">
              The link opens in a new tab. We don't fetch or copy the document — viewers must have access at the source.
            </p>
            <button
              type="button"
              onClick={resetDocState}
              className="text-[11px] text-t3 hover:text-t1 hover:underline"
            >
              Cancel — pick a different option
            </button>
          </div>
        )}

        {docError && <p className="text-xs text-red-400 mt-2">{docError}</p>}
      </div>
    </div>
  );

  // ── View sidebar ──────────────────────────────────────────────────────────────
  const viewSidebar = selected ? (
    <div className="space-y-5 text-sm">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Quick Status</p>
        {/* Status quick-edit kept as a single dropdown — 7 options is too many
            for a pill row at this size. */}
        <select
          className={inp}
          value={selected.status}
          onChange={async e => { await apiUpdateContract(selected._id, { status: e.target.value }); load(); }}
        >
          {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {selected.documentUrl && (
        <div className="space-y-1">
          <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Document</p>
          <a
            href={selected.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-card/50 border border-border rounded-xl hover:border-accent/40 transition-colors group"
          >
            <div className="flex-shrink-0">{docIcon(selected.documentName, !selected.documentPublicId)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-t1 truncate group-hover:text-accent transition-colors">
                {selected.documentName || 'View Document'}
              </p>
              <p className="text-[10px] text-t3">
                {selected.documentPublicId ? 'Click to open file' : 'External link · opens in new tab'}
              </p>
            </div>
            <ArrowSquareOut size={13} className="text-t3 group-hover:text-accent transition-colors" weight="bold" />
          </a>
        </div>
      )}

      <div className="pt-2 border-t border-border space-y-2">
        <button
          onClick={() => openEdit(selected)}
          className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-all"
        >
          Edit contract
        </button>

        {/* Delete uses the global ConfirmDialog popup (matches the logout
            confirmation in Header.tsx). Status gate dropped per user
            request — the dialog itself warns when the contract is active. */}
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full py-2.5 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
        >
          <Trash size={14} weight="bold" /> Delete contract
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
        {selected.documentUrl && (
          <Badge variant={selected.documentPublicId ? 'info' : 'accent'}>
            {selected.documentPublicId ? 'File attached' : 'External link'}
          </Badge>
        )}
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
        <a
          href={selected.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-accent/40 transition-colors group"
        >
          <div className="flex-shrink-0">{docIcon(selected.documentName, !selected.documentPublicId)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-t1 truncate group-hover:text-accent transition-colors">
              {selected.documentName || 'Contract Document'}
            </p>
            <p className="text-[10px] text-t3">
              {selected.documentPublicId ? 'Uploaded file' : 'External link'} · click to open
            </p>
          </div>
          <ArrowSquareOut size={13} className="text-t3 group-hover:text-accent" weight="bold" />
        </a>
      )}
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
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors"
        >
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

      {/* Table — matches the Stock page rhythm: single filter row (search +
          two selects + Columns), one card wrapping the table, row-count
          footer. Visual style aligned with `pages/inventory/StockRecordsPage.tsx`. */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input
              type="text"
              placeholder="Search ref or name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors"
          >
            <option value="">All Types</option>
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors"
          >
            <option value="">All Statuses</option>
            {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <ColumnSelector cols={CONTRACT_COLS} visible={colVis} onToggle={colToggle} />
        </div>

        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
          <Table>
            <TableHeader>
              <TableRow>
                {colVis.has('contractRef')  && <TableHead>Contract ID</TableHead>}
                {colVis.has('title')        && <TableHead>Name</TableHead>}
                {colVis.has('contractType') && <TableHead>Type</TableHead>}
                {colVis.has('document')     && <TableHead>Document</TableHead>}
                {colVis.has('status')       && <TableHead>Status</TableHead>}
                {colVis.has('createdAt')    && <TableHead>Created</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={CONTRACT_COLS.length + 1} className="px-4 py-16 text-center">
                    <Spinner size={24} className="animate-spin text-t3 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={CONTRACT_COLS.length + 1} className="px-4 py-16 text-center text-sm text-t3">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={40} weight="duotone" className="text-t3/40" />
                      <p>No contracts found.</p>
                      <button onClick={openNew} className="text-accent font-semibold hover:underline">
                        Create first contract
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : contracts.map(c => (
                <TableRow
                  key={c._id}
                  className="cursor-pointer hover:bg-surface"
                  onClick={() => { setSelected(c); setModalMode('view'); }}
                >
                  {colVis.has('contractRef') && (
                    <TableCell className="font-mono font-semibold text-accent">{c.contractRef}</TableCell>
                  )}
                  {colVis.has('title') && (
                    <TableCell className="font-medium text-t1 max-w-[260px] truncate">{c.title}</TableCell>
                  )}
                  {colVis.has('contractType') && (
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-medium text-t2 capitalize">
                        {c.contractType}
                      </span>
                    </TableCell>
                  )}
                  {colVis.has('document') && (
                    <TableCell>
                      {c.documentUrl ? (
                        <a
                          href={c.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-accent hover:text-accent-h"
                          title={c.documentPublicId ? 'Uploaded file' : 'External link'}
                        >
                          {docIcon(c.documentName, !c.documentPublicId)}
                        </a>
                      ) : (
                        <span className="text-border"><FileText size={16} /></span>
                      )}
                    </TableCell>
                  )}
                  {colVis.has('status') && (
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[c.status] ?? STATUS_STYLES.draft}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] ?? STATUS_DOT.draft}`} />
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                  )}
                  {colVis.has('createdAt') && (
                    <TableCell className="text-t2">{fmtDate(c.createdAt)}</TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(c); setModalMode('view'); }}
                        className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"
                        title="View"
                      ><Eye size={14} weight="duotone" /></button>
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(c); }}
                        className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"
                        title="Edit"
                      ><PencilSimple size={14} weight="duotone" /></button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          // Selecting first lets the global ConfirmDialog use
                          // this row's data for its message.
                          setSelected(c);
                          setConfirmDelete(true);
                        }}
                        className="p-1.5 text-t3 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete"
                      ><Trash size={14} weight="duotone" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!loading && contracts.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-t3">
              <span>{total} {total === 1 ? 'contract' : 'contracts'}{total > contracts.length ? ` · showing ${contracts.length} on this page` : ''}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-t2">Page {page} of {totalPages}</span>
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-border rounded-lg hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-border rounded-lg hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                </div>
              )}
            </div>
          )}
        </OverlayScrollbarsComponent>
      </div>

      <ModernModal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'new' ? 'New Contract' : modalMode === 'edit' ? `Edit — ${selected?.contractRef}` : selected?.title ?? ''}
        summaryContent={modalMode === 'view' ? viewSidebar : undefined}
        actions={modalMode !== 'view' ? (
          <button
            onClick={handleSave}
            disabled={saving || docUploading}
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {(saving || docUploading) && <Spinner size={14} className="animate-spin" />}
            {docUploading ? 'Uploading…' : saving ? 'Saving…' : modalMode === 'new' ? 'Create Contract' : 'Save Changes'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewBody : formContent}
      </ModernModal>

      {/* Global delete-confirm popup. Same look as the logout dialog. */}
      <ConfirmDialog
        open={confirmDelete && !!selected}
        onOpenChange={(v) => { if (!deleting) setConfirmDelete(v); }}
        onConfirm={handleDelete}
        tone="danger"
        icon="trash"
        title="Delete contract?"
        message={
          <span>
            {selected?.contractRef && (
              <span className="block font-mono text-t2 mb-2">{selected.contractRef}</span>
            )}
            {selected && !['draft', 'cancelled'].includes(selected.status) && (
              <span className="block text-amber-500 mb-2">
                This contract is <b>{selected.status.replace(/_/g, ' ')}</b>. Trips and invoices linked to it will keep their reference but become orphans.
              </span>
            )}
            {selected?.documentPublicId
              ? <>The attached file will also be removed from storage.</>
              : selected?.documentUrl
                ? <>The external link will be detached. The source document is unaffected.</>
                : <>This action cannot be undone.</>}
          </span>
        }
        confirmLabel="Delete contract"
        busy={deleting}
      />
    </div>
  );
}
