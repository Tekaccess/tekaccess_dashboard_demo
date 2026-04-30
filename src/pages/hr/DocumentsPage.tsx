import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spinner, Plus, Trash, FileText, MagnifyingGlass, X, ArrowUpRight } from '@phosphor-icons/react';
import {
  apiListHrDocuments, apiCreateHrDocument, apiDeleteHrDocument,
  apiListEmployees,
  HrDocument, HrDocumentCategory, Employee,
} from '../../lib/api';

const CATEGORIES: { value: HrDocumentCategory; label: string }[] = [
  { value: 'contract',           label: 'Contract' },
  { value: 'id_document',        label: 'ID Document' },
  { value: 'certification',      label: 'Certification' },
  { value: 'policy',             label: 'Company Policy' },
  { value: 'performance_review', label: 'Performance Review' },
  { value: 'payslip',            label: 'Payslip' },
  { value: 'other',              label: 'Other' },
];

const CATEGORY_STYLES: Record<string, string> = {
  contract:           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  id_document:        'bg-blue-500/10 text-blue-400 border-blue-500/20',
  certification:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  policy:             'bg-amber-500/10 text-amber-500 border-amber-500/20',
  performance_review: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  payslip:            'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  other:              'bg-surface text-t3 border-border',
};

export default function HrDocumentsPage() {
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<HrDocument | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiListHrDocuments(),
      apiListEmployees(),
    ]).then(([dRes, eRes]) => {
      if (dRes.success) setDocuments(dRes.data.documents);
      if (eRes.success) setEmployees(eRes.data.employees);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (filterCat && d.category !== filterCat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.title.toLowerCase().includes(q) && !(d.employeeName || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [documents, search, filterCat]);

  async function handleDelete() {
    if (!confirmDelete) return;
    await apiDeleteHrDocument(confirmDelete._id);
    setConfirmDelete(null);
    load();
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">HR Documents</h1>
          <p className="text-sm text-t3 mt-1">Contracts, IDs, certifications, policies and more</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold inline-flex items-center gap-2 hover:bg-accent-h transition-colors"
        >
          <Plus size={14} weight="bold" /> Upload
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent"
            placeholder="Search title or employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 outline-none focus:border-accent"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 flex flex-col items-center gap-3 text-center">
          <FileText size={32} weight="duotone" className="text-t3 opacity-40" />
          <p className="text-sm text-t3">{documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your filters.'}</p>
          {documents.length === 0 && (
            <button type="button" onClick={() => setShowUpload(true)} className="text-accent text-sm font-semibold hover:underline">
              Upload your first document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const expired = doc.expiresAt && new Date(doc.expiresAt) < new Date();
            return (
              <div key={doc._id} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 bg-accent-glow rounded-lg shrink-0">
                    <FileText size={16} weight="duotone" className="text-accent" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_STYLES[doc.category] || CATEGORY_STYLES.other}`}>
                    {doc.category.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-t1 line-clamp-2">{doc.title}</p>
                  {doc.employeeName && <p className="text-xs text-t3 mt-1">For: {doc.employeeName}</p>}
                </div>
                <div className="text-[11px] text-t3 space-y-0.5">
                  {doc.fileName && <p className="truncate">📎 {doc.fileName}</p>}
                  {doc.expiresAt && (
                    <p className={expired ? 'text-rose-400 font-semibold' : ''}>
                      {expired ? 'Expired' : 'Expires'} {new Date(doc.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                  <p>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 text-xs font-semibold text-accent bg-accent-glow rounded inline-flex items-center justify-center gap-1 hover:bg-accent/20 transition-colors"
                  >
                    Open <ArrowUpRight size={11} weight="bold" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(doc)}
                    className="px-2 py-1.5 text-xs text-rose-400 bg-rose-500/10 rounded hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash size={12} weight="bold" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && (
        <UploadModal
          employees={employees}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card rounded-2xl border border-border p-5 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-t1">Delete document?</p>
            <p className="text-xs text-t3">"{confirmDelete.title}" — this cannot be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 py-2 text-xs font-bold text-t2 bg-surface rounded-lg">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 py-2 text-xs font-bold text-white bg-rose-500 rounded-lg hover:bg-rose-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadModal({ employees, onClose, onUploaded }: { employees: Employee[]; onClose: () => void; onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HrDocumentCategory>('other');
  const [employeeId, setEmployeeId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim()) return setError('Title is required.');
    if (!file) return setError('Pick a file to upload.');
    setBusy(true);
    const res = await apiCreateHrDocument({
      title: title.trim(),
      category,
      employeeId: employeeId || undefined,
      expiresAt: expiresAt || undefined,
      notes: notes || undefined,
      file,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.message || 'Upload failed.');
      return;
    }
    onUploaded();
  }

  const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-5 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-t1">Upload HR Document</p>
          <button type="button" onClick={onClose} className="p-1 text-t3 hover:text-t1"><X size={16} weight="bold" /></button>
        </div>

        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">{error}</p>}

        <div>
          <label className="block text-xs text-t3 mb-1">Title *</label>
          <input className={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Employment contract — John Doe" />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Category</label>
          <select className={inp} value={category} onChange={e => setCategory(e.target.value as HrDocumentCategory)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Linked employee (optional)</label>
          <select className={inp} value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            <option value="">Not linked to an employee</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.fullName} — {e.role}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Expiry date (optional)</label>
          <input type="date" className={inp} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Notes</label>
          <textarea className={inp} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">File *</label>
          <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full px-3 py-2 bg-surface border border-dashed border-border rounded-lg text-sm text-t2 hover:border-accent transition-colors text-left truncate"
          >
            {file ? file.name : 'Click to choose a file (PDF, image, etc.)'}
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-h transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {busy && <Spinner size={14} className="animate-spin" />}
          {busy ? 'Uploading…' : 'Upload Document'}
        </button>
      </div>
    </div>
  );
}
