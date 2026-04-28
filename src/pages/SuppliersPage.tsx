import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Handshake, PencilSimple, Eye,
  Spinner, Phone, Envelope, Globe, Warning, Star, Trash,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { apiListSuppliers, apiCreateSupplier, apiUpdateSupplier, apiDeleteSupplier, apiListWarehouses, Supplier, Warehouse } from '../lib/api';
import ModernModal from '../components/ui/ModernModal';
import ColumnSelector, { useColumnVisibility, ColDef } from '../components/ui/ColumnSelector';

const SUPPLIER_STATUSES = ['active', 'on_hold', 'blacklisted', 'inactive'];
const CURRENCIES = ['USD', 'RWF', 'EUR', 'KES', 'UGX', 'TZS'];

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  on_hold:     'bg-amber-500/10 text-amber-500 border-amber-500/20',
  blacklisted: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  inactive:    'bg-surface text-t3 border-border',
};
const STATUS_DOT: Record<string, string> = {
  active:      'bg-emerald-400',
  on_hold:     'bg-amber-500',
  blacklisted: 'bg-rose-400',
  inactive:    'bg-t3',
};

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftSupplier {
  supplierCode: string; name: string;
  contactName: string; contactEmail: string; contactPhone: string;
  address: string; country: string; currency: string;
  creditTermsDays: number; taxId: string; isCritical: boolean; notes: string;
  hasCrusher: boolean | null; extraFeesNote: string;
  defaultWarehouseId: string; defaultWarehouseName: string;
}

function emptyDraft(): DraftSupplier {
  return {
    supplierCode: '', name: '',
    contactName: '', contactEmail: '', contactPhone: '',
    address: '', country: 'Rwanda', currency: 'USD',
    creditTermsDays: 30, taxId: '', isCritical: false, notes: '',
    hasCrusher: null, extraFeesNote: '',
    defaultWarehouseId: '', defaultWarehouseName: '',
  };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

const SUPPLIER_COLS: ColDef[] = [
  { key: 'code',      label: 'Code',      defaultVisible: true },
  { key: 'name',      label: 'Name',      defaultVisible: true },
  { key: 'warehouse', label: 'Warehouse', defaultVisible: true },
  { key: 'contact',   label: 'Contact',   defaultVisible: true },
  { key: 'country',   label: 'Country',   defaultVisible: true },
  { key: 'currency',  label: 'Currency',  defaultVisible: false },
  { key: 'crusher',   label: 'Crusher',   defaultVisible: true },
  { key: 'status',    label: 'Status',    defaultVisible: true },
  { key: 'actions',   label: 'Actions',   defaultVisible: true },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftSupplier>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('suppliers', SUPPLIER_COLS);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiListSuppliers(search || undefined, statusFilter || 'all');
    if (res.success) setSuppliers(res.data.suppliers);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiListWarehouses().then(r => r.success && setWarehouses(r.data.warehouses));
  }, []);

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(s: Supplier) {
    setDraft({
      supplierCode: s.supplierCode, name: s.name,
      contactName: s.contactName || '', contactEmail: s.contactEmail || '',
      contactPhone: s.contactPhone || '', address: (s as any).address || '',
      country: s.country, currency: s.currency, creditTermsDays: s.creditTermsDays,
      taxId: (s as any).taxId || '', isCritical: s.isCritical || false, notes: (s as any).notes || '',
      hasCrusher: s.hasCrusher ?? null,
      extraFeesNote: s.extraFeesNote || '',
      defaultWarehouseId: s.defaultWarehouseId || '',
      defaultWarehouseName: s.defaultWarehouseName || '',
    });
    setSelected(s); setError(null); setModalMode('edit');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDeleteSupplier(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSave() {
    if (!draft.name) {
      setError('Name is required.'); return;
    }
    setSaving(true); setError(null);
    const payload = {
      ...draft,
      defaultWarehouseId: draft.defaultWarehouseId || null,
      defaultWarehouseName: draft.defaultWarehouseName || null,
    };
    const res = modalMode === 'new'
      ? await apiCreateSupplier(payload as any)
      : await apiUpdateSupplier(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const activeCount = suppliers.filter(s => s.status === 'active').length;
  const onHoldCount = suppliers.filter(s => s.status === 'on_hold').length;
  const blacklistedCount = suppliers.filter(s => s.status === 'blacklisted').length;
  const criticalCount = suppliers.filter(s => s.isCritical).length;
  const noCrusherCount = suppliers.filter(s => s.hasCrusher === false).length;

  const modalSummary = (
    <div className="space-y-4">
      <div className="aspect-video bg-gradient-to-br from-accent/20 to-surface rounded-xl flex items-center justify-center p-6 border border-border">
        {draft.name ? (
          <div className="text-center">
            {draft.defaultWarehouseName && (
              <span className="inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 font-medium mb-3 bg-accent/10 text-accent border-accent/20">
                {draft.defaultWarehouseName}
              </span>
            )}
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3 text-accent border border-accent/20 shadow-lg shadow-accent/10">
              <Handshake size={32} weight="duotone" />
            </div>
            <p className="font-semibold text-t1 text-sm truncate max-w-[200px]">{draft.name}</p>
            {draft.supplierCode && <p className="text-xs text-t3 font-mono mt-1">{draft.supplierCode}</p>}
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-3 text-t3 border border-border border-dashed">
              <Handshake size={32} />
            </div>
            <p className="text-sm text-t3 font-medium">New Supplier Profile</p>
            <p className="text-xs text-t4 mt-1">Fill in details</p>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm">
          <Globe size={16} className="text-t3 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-t3">Location</p>
            <p className="text-t1 font-medium truncate">{draft.country || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <MagnifyingGlass size={16} className="text-t3 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-t3">Tax ID</p>
            <p className="text-t1 font-medium truncate">{draft.taxId || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <p className="text-xs text-t3 mb-2">Terms</p>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold text-t1">{draft.creditTermsDays}</p>
          <p className="text-sm text-t3 mb-0.5">days</p>
        </div>
        <p className="text-xs text-t3 mt-1">Currency: {draft.currency}</p>
      </div>
    </div>
  );

  const viewModalSummary = selected ? (
    <div className="space-y-4">
      <div className="aspect-video bg-gradient-to-br from-accent/20 to-surface rounded-xl flex flex-col items-center justify-center p-6 border border-border text-center">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3 text-accent border border-accent/20 shadow-lg shadow-accent/10">
          <Handshake size={32} weight="duotone" />
        </div>
        <p className="font-semibold text-t1 text-sm truncate max-w-[200px] mb-1">{selected.name}</p>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[selected.status] ?? ''}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] ?? 'bg-t3'}`} />
          {selected.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="text-xs text-t3">Code</span>
          <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-md">{selected.supplierCode}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="text-xs text-t3">Credit</span>
          <span className="text-xs font-medium text-t1">{selected.creditTermsDays} days</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-t3">Currency</span>
          <span className="text-xs font-medium text-t1">{selected.currency}</span>
        </div>
      </div>

      {(selected as any).isCritical && (
        <div className="bg-accent-glow rounded-xl border border-accent/20 p-4 shadow-sm flex items-start gap-3">
          <Star size={18} weight="fill" className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-accent">Critical Supplier</p>
            <p className="text-xs text-accent/80 mt-0.5">High priority relationship</p>
          </div>
        </div>
      )}
    </div>
  ) : null;

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Supplier Details</p>
        <div className="space-y-3">
          {modalMode === 'edit' && draft.supplierCode && (
            <div>
              <label className="block text-xs text-t3 mb-1.5">Supplier Code</label>
              <p className="font-mono text-sm text-accent bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
                {draft.supplierCode}
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs text-t3 mb-1.5">Name *</label>
            <input className={inp} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Company name" />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Currency</label>
            <select className={inp} value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Default Warehouse</p>
        <select className={inp} value={draft.defaultWarehouseId}
          onChange={e => {
            const id = e.target.value;
            const wh = warehouses.find(w => w._id === id);
            setDraft(d => ({ ...d, defaultWarehouseId: id, defaultWarehouseName: wh?.name || '' }));
          }}>
          <option value="">— Select warehouse —</option>
          {warehouses.map(w => (
            <option key={w._id} value={w._id}>{w.name} ({w.warehouseCode})</option>
          ))}
        </select>
        <p className="text-[11px] text-t3 mt-1.5">When this supplier is chosen on a purchase order, this warehouse is auto-filled as the destination.</p>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Contact</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Contact Name</label>
              <input className={inp} value={draft.contactName} onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Contact Phone</label>
              <input className={inp} value={draft.contactPhone} onChange={e => setDraft(d => ({ ...d, contactPhone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Contact Email</label>
            <input type="email" className={inp} value={draft.contactEmail} onChange={e => setDraft(d => ({ ...d, contactEmail: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Commercial</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Country</label>
              <input className={inp} value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Credit Terms (days)</label>
              <input type="number" min={0} className={inp} value={draft.creditTermsDays}
                onChange={e => setDraft(d => ({ ...d, creditTermsDays: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Tax ID / VAT Number</label>
            <input className={inp} value={draft.taxId} onChange={e => setDraft(d => ({ ...d, taxId: e.target.value }))} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={draft.isCritical} onChange={e => setDraft(d => ({ ...d, isCritical: e.target.checked }))} />
            <span className="text-sm text-t2">Mark as critical supplier</span>
          </label>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Site Processing</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Crusher capability</label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: true, label: 'Has crusher' },
                { v: false, label: 'We pay crushing' },
                { v: null, label: 'Unspecified' },
              ].map(opt => (
                <button key={String(opt.v)} type="button"
                  onClick={() => setDraft(d => ({ ...d, hasCrusher: opt.v as boolean | null }))}
                  className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                    draft.hasCrusher === opt.v ? 'border-accent bg-accent/10 text-accent' : 'border-border text-t3 hover:text-t1'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Extra fees we pay for this supplier (visible to finance)</label>
            <textarea rows={2} className={`${inp} resize-none`} value={draft.extraFeesNote}
              placeholder="e.g. We pay crushing @ 500/t · Loading fee 200 per truck"
              onChange={e => setDraft(d => ({ ...d, extraFeesNote: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1.5">Notes</label>
        <textarea rows={2} className={`${inp} resize-none`} value={draft.notes}
          onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner className="animate-spin" size={14} />}
        {modalMode === 'new' ? 'Create Supplier' : 'Save Changes'}
      </button>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-t3 font-mono">{selected.supplierCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          {selected.defaultWarehouseName && (
            <span className="inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 font-medium mt-1 bg-accent/10 text-accent border-accent/20">
              {selected.defaultWarehouseName}
            </span>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium ${STATUS_STYLES[selected.status] ?? ''}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] ?? 'bg-t3'}`} />
          {selected.status.replace(/_/g, ' ')}
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

      {selected.hasCrusher === false && (
        <div className="bg-orange-500/5 rounded-xl border border-orange-500/20 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <Warning size={14} weight="fill" className="text-orange-400 shrink-0" />
            <p className="text-xs font-semibold text-orange-400">We pay crushing for this supplier</p>
          </div>
          {selected.extraFeesNote && (
            <p className="text-xs text-t2 whitespace-pre-line pl-6">{selected.extraFeesNote}</p>
          )}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit Supplier
        </button>
        <div>
          <label className="block text-xs text-t3 mb-1.5">Update Status</label>
          <select className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t2 outline-none focus:border-accent transition-colors"
            value={selected.status}
            onChange={async e => { await apiUpdateSupplier(selected._id, { status: e.target.value } as any); load(); }}>
            {SUPPLIER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Suppliers</h1>
            <p className="text-sm text-t3 mt-1">{suppliers.length} suppliers</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Supplier
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Active', value: activeCount, Icon: Handshake, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
            { label: 'On Hold', value: onHoldCount, Icon: Warning, bg: 'bg-amber-500/10', color: 'text-amber-500' },
            { label: 'Blacklisted', value: blacklistedCount, Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-400' },
            { label: 'Critical', value: criticalCount, Icon: Star, bg: 'bg-accent-glow', color: 'text-accent' },
            { label: 'We Crush For', value: noCrusherCount, Icon: Warning, bg: 'bg-orange-500/10', color: 'text-orange-400' },
          ].map(({ label, value, Icon, bg, color }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
                <Icon size={18} weight="duotone" className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-t3">{label}</p>
                <p className="text-xl font-bold text-t1">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-card rounded-xl border border-border">
          {/* Filters */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
                placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
              <option value="all">All Statuses</option>
              {SUPPLIER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <ColumnSelector cols={SUPPLIER_COLS} visible={colVis} onToggle={colToggle} />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Handshake size={40} className="mb-2 opacity-40" /><p>No suppliers found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {colVis.has('code') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Code</th>}
                    {colVis.has('name') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Name</th>}
                    {colVis.has('warehouse') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Warehouse</th>}
                    {colVis.has('contact') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Contact</th>}
                    {colVis.has('country') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Country</th>}
                    {colVis.has('currency') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Currency</th>}
                    {colVis.has('crusher') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Crusher</th>}
                    {colVis.has('status') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>}
                    {colVis.has('actions') && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s, i) => (
                    <tr key={s._id}
                      className={`hover:bg-surface transition-colors cursor-pointer ${i < suppliers.length - 1 ? 'border-b border-border' : ''}`}
                      onClick={() => { setSelected(s); setModalMode('view'); }}>
                      {colVis.has('code') && <td className="px-4 py-3.5 font-mono text-xs text-accent">{s.supplierCode}</td>}
                      {colVis.has('name') && <td className="px-4 py-3.5 font-medium text-t1">{s.name}</td>}
                      {colVis.has('warehouse') && (
                        <td className="px-4 py-3.5 text-t2 text-xs">
                          {s.defaultWarehouseName || <span className="text-t3">—</span>}
                        </td>
                      )}
                      {colVis.has('contact') && (
                        <td className="px-4 py-3.5 text-t2 text-xs">
                          <p>{s.contactName || '—'}</p>
                          {s.contactPhone && <p className="text-t3">{s.contactPhone}</p>}
                        </td>
                      )}
                      {colVis.has('country') && <td className="px-4 py-3.5 text-t2">{s.country}</td>}
                      {colVis.has('currency') && <td className="px-4 py-3.5 text-t2">{s.currency}</td>}
                      {colVis.has('crusher') && (
                        <td className="px-4 py-3.5">
                          {s.hasCrusher === false ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 font-medium bg-orange-500/10 text-orange-400 border-orange-500/20 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                We pay crushing
                              </span>
                              {s.extraFeesNote && (
                                <span className="text-[10px] text-t3 truncate max-w-[180px]" title={s.extraFeesNote}>{s.extraFeesNote}</span>
                              )}
                            </div>
                          ) : s.hasCrusher === true ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-t3">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Has crusher
                            </span>
                          ) : (
                            <span className="text-t3 text-xs">—</span>
                          )}
                        </td>
                      )}
                      {colVis.has('status') && (
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status] ?? ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s.status] ?? 'bg-t3'}`} />
                            {s.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      )}
                      {colVis.has('actions') && (
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); setSelected(s); setModalMode('view'); }}
                              className="p-1 hover:text-t1 text-t3"><Eye size={14} /></button>
                            <button onClick={e => { e.stopPropagation(); openEdit(s); }}
                              className="p-1 hover:text-t1 text-t3"><PencilSimple size={14} /></button>
                            <button onClick={e => { e.stopPropagation(); setDeleteTarget(s); }}
                              className="p-1 hover:text-red-500 text-t3"><Trash size={14} /></button>
                          </div>
                        </td>
                      )}
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
        title={modalMode === 'new' ? 'Initialize Supplier' : modalMode === 'edit' ? 'Update Supplier' : selected?.name ?? ''}
        summaryContent={modalMode === 'view' ? viewModalSummary : modalSummary}
        actions={modalMode !== 'view' ? (
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Create Supplier' : 'Save Changes'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewContent : formContent}
      </ModernModal>

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div key="del-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <motion.div key="del-dlg" initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash size={22} weight="duotone" className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Delete supplier?</h2>
                <p className="text-xs text-t3 mb-5">
                  <span className="font-semibold text-t2">{deleteTarget.name}</span> will be permanently removed.
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={handleDelete} disabled={isDeleting}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {isDeleting ? <><Spinner size={16} className="animate-spin" /> Deleting…</> : 'Delete'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                    className="w-full py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
