import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Handshake, PencilSimple, Eye,
  Spinner, Phone, Envelope, Globe,
} from '@phosphor-icons/react';
import { apiListSuppliers, apiCreateSupplier, apiUpdateSupplier, Supplier } from '../lib/api';
import DocumentSidePanel from '../components/DocumentSidePanel';

const SUPPLIER_TYPES = ['raw_material', 'fuel', 'spare_parts', 'transport_contractor', 'service_provider', 'utility', 'other'];
const SUPPLIER_STATUSES = ['active', 'on_hold', 'blacklisted', 'inactive'];
const CURRENCIES = ['USD', 'RWF', 'EUR', 'KES', 'UGX', 'TZS'];

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  on_hold:     'bg-amber-500/10 text-amber-500 border-amber-500/20',
  blacklisted: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  inactive:    'bg-surface text-t3 border-border',
};

const TYPE_STYLES: Record<string, string> = {
  raw_material:         'bg-blue-500/10 text-blue-400 border-blue-500/20',
  fuel:                 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  spare_parts:          'bg-purple-500/10 text-purple-400 border-purple-500/20',
  transport_contractor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  service_provider:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  utility:              'bg-orange-500/10 text-orange-400 border-orange-500/20',
  other:                'bg-surface text-t3 border-border',
};

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftSupplier {
  supplierCode: string; name: string; supplierType: string[];
  contactName: string; contactEmail: string; contactPhone: string;
  address: string; country: string; currency: string;
  creditTermsDays: number; taxId: string; isCritical: boolean; notes: string;
}

function emptyDraft(): DraftSupplier {
  return {
    supplierCode: '', name: '', supplierType: ['raw_material'],
    contactName: '', contactEmail: '', contactPhone: '',
    address: '', country: 'Rwanda', currency: 'USD',
    creditTermsDays: 30, taxId: '', isCritical: false, notes: '',
  };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftSupplier>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiListSuppliers(search || undefined, statusFilter || 'all');
    if (res.success) {
      setSuppliers(typeFilter ? res.data.suppliers.filter(s => s.supplierType.includes(typeFilter)) : res.data.suppliers);
    }
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  function toggleType(t: string) {
    setDraft(d => {
      const types = d.supplierType.includes(t) ? d.supplierType.filter(x => x !== t) : [...d.supplierType, t];
      return { ...d, supplierType: types.length === 0 ? [t] : types };
    });
  }

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(s: Supplier) {
    setDraft({
      supplierCode: s.supplierCode, name: s.name, supplierType: [...s.supplierType],
      contactName: s.contactName || '', contactEmail: s.contactEmail || '',
      contactPhone: s.contactPhone || '', address: (s as any).address || '',
      country: s.country, currency: s.currency, creditTermsDays: s.creditTermsDays,
      taxId: (s as any).taxId || '', isCritical: (s as any).isCritical || false, notes: (s as any).notes || '',
    });
    setSelected(s); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.supplierCode || !draft.name || draft.supplierType.length === 0) {
      setError('Code, name and at least one type are required.'); return;
    }
    setSaving(true); setError(null);
    const res = modalMode === 'new'
      ? await apiCreateSupplier(draft as any)
      : await apiUpdateSupplier(selected!._id, draft as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const inp = 'w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1';

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-4 p-4 pb-10">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Supplier Code *</label>
          <input className={inp} value={draft.supplierCode}
            onChange={e => setDraft(d => ({ ...d, supplierCode: e.target.value.toUpperCase() }))}
            placeholder="SUP-001" disabled={modalMode === 'edit'} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Currency</label>
          <select className={inp} value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-t3 mb-1">Name *</label>
        <input className={inp} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Company name" />
      </div>
      <div>
        <label className="block text-xs text-t3 mb-2">Supplier Type * (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {SUPPLIER_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleType(t)}
              className={`px-3 py-1.5 text-xs border rounded transition-colors ${draft.supplierType.includes(t) ? 'border-accent bg-accent/10 text-accent' : 'border-border text-t3 hover:text-t1'}`}>
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Contact Name</label>
          <input className={inp} value={draft.contactName} onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Contact Phone</label>
          <input className={inp} value={draft.contactPhone} onChange={e => setDraft(d => ({ ...d, contactPhone: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-t3 mb-1">Contact Email</label>
        <input type="email" className={inp} value={draft.contactEmail} onChange={e => setDraft(d => ({ ...d, contactEmail: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Country</label>
          <input className={inp} value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Credit Terms (days)</label>
          <input type="number" min={0} className={inp} value={draft.creditTermsDays}
            onChange={e => setDraft(d => ({ ...d, creditTermsDays: Number(e.target.value) }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-t3 mb-1">Tax ID / VAT Number</label>
        <input className={inp} value={draft.taxId} onChange={e => setDraft(d => ({ ...d, taxId: e.target.value }))} />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={draft.isCritical} onChange={e => setDraft(d => ({ ...d, isCritical: e.target.checked }))} />
        <span className="text-sm text-t2">Mark as critical supplier</span>
      </label>
      <div>
        <label className="block text-xs text-t3 mb-1">Notes</label>
        <textarea rows={2} className={`${inp} resize-none`} value={draft.notes}
          onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          {modalMode === 'new' ? 'Create Supplier' : 'Save Changes'}
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.supplierCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {selected.supplierType.map(t => (
              <span key={t} className={`text-xs border rounded px-2 py-0.5 ${TYPE_STYLES[t] ?? ''}`}>{t.replace('_', ' ')}</span>
            ))}
          </div>
        </div>
        <span className={`text-xs border rounded px-2 py-0.5 ${STATUS_STYLES[selected.status] ?? ''}`}>
          {selected.status.replace('_', ' ')}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        {selected.contactName && <p className="text-t2 flex items-center gap-2"><Handshake size={13} className="text-t3 shrink-0" />{selected.contactName}</p>}
        {selected.contactPhone && <p className="text-t2 flex items-center gap-2"><Phone size={13} className="text-t3 shrink-0" />{selected.contactPhone}</p>}
        {selected.contactEmail && <p className="text-t2 flex items-center gap-2"><Envelope size={13} className="text-t3 shrink-0" />{selected.contactEmail}</p>}
        {selected.country && <p className="text-t2 flex items-center gap-2"><Globe size={13} className="text-t3 shrink-0" />{selected.country}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-t3">Currency</p><p className="font-medium text-t1">{selected.currency}</p></div>
        <div><p className="text-xs text-t3">Credit Terms</p><p className="font-medium text-t1">{selected.creditTermsDays} days</p></div>
      </div>
      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-border rounded hover:bg-surface text-t2">
          <PencilSimple size={14} /> Edit
        </button>
        <div className="flex-1">
          <select className="w-full bg-surface border border-border rounded px-2 py-2 text-sm text-t2"
            value={selected.status}
            onChange={async e => { await apiUpdateSupplier(selected._id, { status: e.target.value } as any); load(); }}>
            {SUPPLIER_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Suppliers</h1>
          <p className="text-sm text-t3 mt-0.5">{suppliers.length} suppliers</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Supplier
        </button>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-t1">
          <option value="all">All Statuses</option>
          {SUPPLIER_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-t1">
          <option value="">All Types</option>
          {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Handshake size={40} className="mb-2 opacity-40" /><p>No suppliers found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="h-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-t3">
                    {['Code', 'Name', 'Type', 'Contact', 'Country', 'Currency', 'Status', ''].map(h => (
                      <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suppliers.map(s => (
                    <tr key={s._id} className="hover:bg-surface/50 cursor-pointer"
                      onClick={() => { setSelected(s); setModalMode('view'); }}>
                      <td className="py-3 pr-3 font-mono text-xs text-accent">{s.supplierCode}</td>
                      <td className="py-3 pr-3 font-medium text-t1">{s.name}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {s.supplierType.slice(0, 2).map(t => (
                            <span key={t} className={`text-xs border rounded px-1.5 py-0.5 ${TYPE_STYLES[t] ?? ''}`}>{t.replace('_', ' ')}</span>
                          ))}
                          {s.supplierType.length > 2 && <span className="text-xs text-t3">+{s.supplierType.length - 2}</span>}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-t2 text-xs">
                        <p>{s.contactName || '—'}</p>
                        {s.contactPhone && <p className="text-t3">{s.contactPhone}</p>}
                      </td>
                      <td className="py-3 pr-3 text-t2">{s.country}</td>
                      <td className="py-3 pr-3 text-t2">{s.currency}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs border rounded px-2 py-0.5 ${STATUS_STYLES[s.status] ?? ''}`}>
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelected(s); setModalMode('view'); }}
                            className="p-1 hover:text-t1 text-t3"><Eye size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); openEdit(s); }}
                            className="p-1 hover:text-t1 text-t3"><PencilSimple size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}
        </div>

        {modalMode && (
          <DocumentSidePanel
            isOpen={true}
            onClose={() => setModalMode(null)}
            title={modalMode === 'new' ? 'New Supplier' : modalMode === 'edit' ? 'Edit Supplier' : selected?.name ?? ''}
            formContent={formContent}
            previewContent={viewContent}
          />
        )}
      </div>
    </div>
  );
}
