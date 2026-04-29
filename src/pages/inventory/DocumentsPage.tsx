import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Trash, Spinner, FileText, Receipt,
  Invoice, Truck, Eye, ArrowUp, Scales,
} from '@phosphor-icons/react';
import {
  apiListInventoryDocs, apiCreateInventoryDoc, apiDeleteInventoryDoc,
  apiListMovements, InventoryDoc, StockMovement,
} from '../../lib/api';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';
import DocumentSidePanel from '../../components/DocumentSidePanel';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';

const DOC_TYPES: InventoryDoc['doc_type'][] = ['Invoice', 'Receipt', 'Waybill', 'Weighbridge', 'Site Photo'];

const DOC_STYLES: Record<string, string> = {
  Invoice:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Receipt:     'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Waybill:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Weighbridge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Site Photo': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

const DOC_ICONS: Record<string, React.ReactNode> = {
  Invoice:      <Invoice size={12} />,
  Receipt:      <Receipt size={12} />,
  Waybill:      <Truck size={12} />,
  Weighbridge:  <Scales size={12} />,
  'Site Photo': <Eye size={12} />,
};

type ModalMode = 'new' | null;

interface Draft {
  movement_id: string;
  doc_type: InventoryDoc['doc_type'];
  image: File | null;
}

function emptyDraft(): Draft {
  return { movement_id: '', doc_type: 'Invoice', image: null };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

const DOC_COLS: ColDef[] = [
  { key: 'type',     label: 'Type',         defaultVisible: true },
  { key: 'movement', label: 'Movement Ref', defaultVisible: true },
  { key: 'path',     label: 'Image',        defaultVisible: true },
  { key: 'uploaded', label: 'Uploaded',     defaultVisible: true },
  { key: 'actions',  label: 'Actions',      defaultVisible: true },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<InventoryDoc[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('inventory-documents', DOC_COLS);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (typeFilter) params.doc_type = typeFilter;
    const [docRes, movRes] = await Promise.all([
      apiListInventoryDocs(params),
      apiListMovements({ limit: '200' }),
    ]);
    if (docRes.success) setDocs(docRes.data.documents ?? []);
    if (movRes.success) setMovements(movRes.data.movements);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const movementOptions: SearchSelectOption[] = movements.map(m => ({
    value: m._id,
    label: m.movementRef,
    sublabel: `${m.itemName} · ${m.movementType}`,
  }));

  async function handleSave() {
    if (!draft.movement_id) { setError('Movement is required.'); return; }
    if (!draft.image) { setError('Please select a file to upload.'); return; }
    setSaving(true); setError(null);
    const res = await apiCreateInventoryDoc({
      movement_id: draft.movement_id,
      doc_type: draft.doc_type,
      image: draft.image,
    });
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Upload failed.'); return; }
    setDraft(emptyDraft());
    if (fileRef.current) fileRef.current.value = '';
    setPanelOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    await apiDeleteInventoryDoc(id);
    setDeleteConfirm(null);
    load();
  }

  const invoiceCount     = docs.filter(d => d.doc_type === 'Invoice').length;
  const receiptCount     = docs.filter(d => d.doc_type === 'Receipt').length;
  const waybillCount     = docs.filter(d => d.doc_type === 'Waybill').length;
  const weighbridgeCount = docs.filter(d => d.doc_type === 'Weighbridge').length;
  const sitePhotoCount   = docs.filter(d => d.doc_type === 'Site Photo').length;

  const formContent = (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Document Details</p>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Document Type *</label>
          <select value={draft.doc_type} onChange={e => setDraft(d => ({ ...d, doc_type: e.target.value as InventoryDoc['doc_type'] }))} className={inp}>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <SearchSelect
          label="Linked Movement *"
          options={movementOptions}
          value={draft.movement_id || null}
          onChange={val => setDraft(d => ({ ...d, movement_id: val || '' }))}
          placeholder="Search movement ref..."
          clearable={false}
        />
        <div>
          <label className="block text-[10px] text-t3 mb-1">File *</label>
          <div
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {draft.image ? (
              <div className="flex items-center justify-center gap-2 text-sm text-t1">
                <FileText size={16} className="text-accent" />
                <span className="font-medium truncate max-w-[180px]">{draft.image.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-t3">
                <ArrowUp size={24} />
                <p className="text-sm">Click to select file</p>
                <p className="text-xs">PDF, JPG, PNG supported</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => setDraft(d => ({ ...d, image: e.target.files?.[0] || null }))}
          />
        </div>
      </section>
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner size={14} className="animate-spin" />}
        {saving ? 'Uploading...' : 'Upload Document'}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Documents</h1>
          <p className="text-sm text-t3 mt-0.5">Transaction proofs linked to stock movements</p>
        </div>
        <button
          onClick={() => { setDraft(emptyDraft()); setError(null); setPanelOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors"
        >
          <Plus size={15} weight="bold" /> Upload Document
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Docs',   value: docs.length,      Icon: FileText, color: 'text-accent',       bg: 'bg-accent-glow' },
          { label: 'Invoices',     value: invoiceCount,     Icon: Invoice,  color: 'text-blue-400',     bg: 'bg-blue-500/10' },
          { label: 'Receipts',     value: receiptCount,     Icon: Receipt,  color: 'text-emerald-500',  bg: 'bg-emerald-500/10' },
          { label: 'Waybills',     value: waybillCount,     Icon: Truck,    color: 'text-purple-400',   bg: 'bg-purple-500/10' },
          { label: 'Weighbridges', value: weighbridgeCount, Icon: Scales,   color: 'text-amber-400',    bg: 'bg-amber-500/10' },
          { label: 'Site Photos',  value: sitePhotoCount,   Icon: Eye,      color: 'text-teal-400',     bg: 'bg-teal-500/10' },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${c.bg}`}><c.Icon size={18} weight="duotone" className={c.color} /></div>
            <div>
              <p className="text-xs text-t3 font-medium uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors">
            <option value="">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ColumnSelector cols={DOC_COLS} visible={colVis} onToggle={colToggle} />
        </div>

        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                {colVis.has('type') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Type</th>}
                {colVis.has('movement') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Movement Ref</th>}
                {colVis.has('path') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Image</th>}
                {colVis.has('uploaded') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Uploaded</th>}
                {colVis.has('actions') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap"></th>}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border-s">
              {loading ? (
                <tr><td colSpan={colVis.size} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={colVis.size} className="px-4 py-16 text-center text-sm text-t3">
                  <div className="flex flex-col items-center gap-3">
                    <FileText size={40} weight="duotone" className="text-t3/40" />
                    <p>No documents uploaded yet.</p>
                    <button onClick={() => { setDraft(emptyDraft()); setError(null); setPanelOpen(true); }} className="text-accent font-semibold hover:underline">Upload first document</button>
                  </div>
                </td></tr>
              ) : docs.map(doc => (
                <tr key={doc._id} className="hover:bg-surface transition-colors">
                  {colVis.has('type') && (
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${DOC_STYLES[doc.doc_type] || 'bg-surface text-t3 border-border'}`}>
                        {DOC_ICONS[doc.doc_type]} {doc.doc_type}
                      </span>
                    </td>
                  )}
                  {colVis.has('movement') && <td className="px-4 py-3 font-mono text-xs text-accent">{doc.movement_ref || doc.movement_id}</td>}
                  {colVis.has('path') && (
                    <td className="px-4 py-3">
                      <a href={doc.image_path} target="_blank" rel="noreferrer" className="inline-block" onClick={e => e.stopPropagation()} title="Open full image">
                        <img
                          src={doc.image_path}
                          alt={doc.doc_type || 'document'}
                          className="w-14 h-14 rounded-lg object-cover border border-border hover:border-accent transition-colors"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.style.display = 'none';
                            const fallback = img.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <span className="hidden items-center gap-1 text-xs text-t2 hover:text-accent transition-colors max-w-[180px] truncate">
                          <Eye size={12} className="flex-shrink-0" />
                          {doc.image_path.split('/').pop() || doc.image_path}
                        </span>
                      </a>
                    </td>
                  )}
                  {colVis.has('uploaded') && (
                    <td className="px-4 py-3 text-xs text-t3">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
                    </td>
                  )}
                  {colVis.has('actions') && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        {deleteConfirm === doc._id ? (
                          <>
                            <button onClick={() => handleDelete(doc._id)} className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="ml-1 text-[10px] px-2 py-1 border border-border rounded-lg text-t3 hover:bg-surface transition-colors">No</button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(doc._id)} className="p-1.5 text-t3 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash size={14} weight="duotone" /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {docs.length > 0 && <div className="px-4 py-3 border-t border-border text-xs text-t3">{docs.length} documents</div>}
        </OverlayScrollbarsComponent>
      </div>

      <DocumentSidePanel
        isOpen={panelOpen}
        onClose={() => { setPanelOpen(false); setError(null); }}
        title="Upload Document"
        footerInfo="Invoice · Receipt · Waybill · Weighbridge"
        formContent={formContent}
        previewContent={null}
      />
    </div>
  );
}
