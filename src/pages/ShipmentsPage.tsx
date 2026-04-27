import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Boat, Truck, Airplane, Train,
  PencilSimple, Eye, Spinner, Package, Warning, CheckCircle,
  CaretLeft, CaretRight, Trash,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  apiGetShipmentsSummary, apiListShipments, apiCreateShipment, apiUpdateShipment, apiDeleteShipment,
  apiListPurchaseOrders, apiListSuppliers,
  Shipment, PurchaseOrder, Supplier,
} from '../lib/api';
import DocumentSidePanel from '../components/DocumentSidePanel';
import SearchSelect, { SearchSelectOption } from '../components/ui/SearchSelect';
import ColumnSelector, { useColumnVisibility, ColDef } from '../components/ui/ColumnSelector';

const SHIPMENT_STATUSES = ['in_transit', 'at_customs', 'out_for_delivery', 'received', 'delayed', 'lost', 'cancelled'];
const TRANSPORT_MODES = ['road', 'sea', 'air', 'rail', 'multimodal'];

const STATUS_STYLES: Record<string, string> = {
  in_transit:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  at_customs:       'bg-amber-500/10 text-amber-500 border-amber-500/20',
  out_for_delivery: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  received:         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  delayed:          'bg-rose-500/10 text-rose-400 border-rose-500/20',
  lost:             'bg-rose-500/10 text-rose-400 border-rose-500/20',
  cancelled:        'bg-surface text-t3 border-border',
};
const STATUS_DOT: Record<string, string> = {
  in_transit:       'bg-blue-400',
  at_customs:       'bg-amber-500',
  out_for_delivery: 'bg-teal-400',
  received:         'bg-emerald-400',
  delayed:          'bg-rose-400',
  lost:             'bg-rose-400',
  cancelled:        'bg-t3',
};

const MODE_ICONS: Record<string, React.ComponentType<any>> = {
  road: Truck, sea: Boat, air: Airplane, rail: Train, multimodal: Package,
};

const TABS = [
  { id: '', label: 'All' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'at_customs', label: 'At Customs' },
  { id: 'delayed', label: 'Delayed' },
  { id: 'received', label: 'Received' },
];

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftShipment {
  poId: string; poRef: string; supplierId: string; supplierName: string;
  description: string; quantity: number; unit: string;
  estimatedValue: number; currency: string;
  mode: string; carrierName: string; carrierRef: string;
  originLocation: string; destinationLocation: string;
  dispatchedAt: string; estimatedArrivalDate: string; notes: string;
}

function emptyDraft(): DraftShipment {
  return {
    poId: '', poRef: '', supplierId: '', supplierName: '',
    description: '', quantity: 0, unit: 'tons',
    estimatedValue: 0, currency: 'USD',
    mode: 'road', carrierName: '', carrierRef: '',
    originLocation: '', destinationLocation: '',
    dispatchedAt: new Date().toISOString().slice(0, 10),
    estimatedArrivalDate: '', notes: '',
  };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

const SHIP_COLS: ColDef[] = [
  { key: 'ref',         label: 'Ref',         defaultVisible: true },
  { key: 'supplier',    label: 'Supplier',    defaultVisible: true },
  { key: 'description', label: 'Description', defaultVisible: true },
  { key: 'mode',        label: 'Mode',        defaultVisible: true },
  { key: 'qty',         label: 'Qty',         defaultVisible: true },
  { key: 'route',       label: 'Route',       defaultVisible: true },
  { key: 'eta',         label: 'ETA',         defaultVisible: true },
  { key: 'status',      label: 'Status',      defaultVisible: true },
  { key: 'actions',     label: 'Actions',     defaultVisible: true },
];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [summary, setSummary] = useState({ inTransit: 0, atCustoms: 0, received: 0, delayed: 0, overdue: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftShipment>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const PAGE_LIMIT = 50;
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('shipments', SHIP_COLS);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_LIMIT) };
    if (search) params.search = search;
    if (activeTab) params.status = activeTab;
    const [sRes, sumRes, supRes, poRes] = await Promise.all([
      apiListShipments(params),
      apiGetShipmentsSummary(),
      apiListSuppliers(undefined, 'active'),
      apiListPurchaseOrders({ status: 'sent_to_supplier', limit: '200' }),
    ]);
    if (sRes.success) { setShipments(sRes.data.shipments); setTotal(sRes.data.pagination.total); }
    if (sumRes.success) setSummary(sumRes.data.summary);
    if (supRes.success) setSuppliers(supRes.data.suppliers);
    if (poRes.success) setOrders(poRes.data.orders);
    setLoading(false);
  }, [search, activeTab, page]);

  useEffect(() => { load(); }, [load]);

  const supplierOptions: SearchSelectOption[] = suppliers.map(s => ({
    value: s._id, label: s.name, sublabel: s.supplierCode,
  }));

  const poOptions: SearchSelectOption[] = orders.map(o => ({
    value: o._id, label: o.poRef, sublabel: o.supplierName, meta: o.currency,
  }));

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(s: Shipment) {
    setDraft({
      poId: s.poId, poRef: s.poRef, supplierId: s.supplierId, supplierName: s.supplierName,
      description: s.description, quantity: s.quantity, unit: s.unit,
      estimatedValue: s.estimatedValue || 0, currency: s.currency,
      mode: s.mode, carrierName: s.carrierName || '', carrierRef: s.carrierRef || '',
      originLocation: s.originLocation, destinationLocation: s.destinationLocation,
      dispatchedAt: s.dispatchedAt.slice(0, 10),
      estimatedArrivalDate: s.estimatedArrivalDate.slice(0, 10), notes: s.notes || '',
    });
    setSelected(s); setError(null); setModalMode('edit');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDeleteShipment(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSave() {
    if (!draft.poId || !draft.description || !draft.quantity || !draft.originLocation || !draft.destinationLocation || !draft.estimatedArrivalDate) {
      setError('PO, description, quantity, locations and ETA are required.'); return;
    }
    setSaving(true); setError(null);
    const payload = { ...draft, quantity: Number(draft.quantity), estimatedValue: draft.estimatedValue || undefined };
    const res = modalMode === 'new'
      ? await apiCreateShipment(payload as any)
      : await apiUpdateShipment(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Linked Records</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Purchase Order *</label>
            <SearchSelect options={poOptions} value={draft.poId || null}
              onChange={v => {
                const o = orders.find(x => x._id === v);
                setDraft(d => ({ ...d, poId: v ?? '', poRef: o?.poRef ?? '', supplierId: typeof o?.supplierId === 'string' ? o.supplierId : (o?.supplierId as any)?._id ?? '', supplierName: o?.supplierName ?? '' }));
              }}
              placeholder="Select PO..." />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Supplier *</label>
            <SearchSelect options={supplierOptions} value={draft.supplierId || null}
              onChange={v => {
                const s = suppliers.find(x => x._id === v);
                setDraft(d => ({ ...d, supplierId: v ?? '', supplierName: s?.name ?? '' }));
              }}
              placeholder="Select supplier..." />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Cargo Details</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Description *</label>
            <input className={inp} value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="e.g. 20 tons limestone" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-t3 mb-1.5">Quantity *</label>
              <input type="number" min={0} className={inp} value={draft.quantity}
                onChange={e => setDraft(d => ({ ...d, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Unit</label>
              <select className={inp} value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}>
                {['tons', 'kg', 'litres', 'units', 'boxes'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Estimated Value</label>
              <input type="number" min={0} className={inp} value={draft.estimatedValue}
                onChange={e => setDraft(d => ({ ...d, estimatedValue: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Currency</label>
              <select className={inp} value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
                {['USD', 'RWF', 'EUR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Transport &amp; Carrier</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Transport Mode</label>
              <select className={inp} value={draft.mode} onChange={e => setDraft(d => ({ ...d, mode: e.target.value }))}>
                {TRANSPORT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Carrier Name</label>
              <input className={inp} value={draft.carrierName} onChange={e => setDraft(d => ({ ...d, carrierName: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Carrier Reference (e.g. AWB, BL)</label>
            <input className={inp} value={draft.carrierRef} onChange={e => setDraft(d => ({ ...d, carrierRef: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Route &amp; Dates</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Origin Location *</label>
            <input className={inp} value={draft.originLocation}
              onChange={e => setDraft(d => ({ ...d, originLocation: e.target.value }))}
              placeholder="e.g. Dar es Salaam Port" />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Destination *</label>
            <input className={inp} value={draft.destinationLocation}
              onChange={e => setDraft(d => ({ ...d, destinationLocation: e.target.value }))}
              placeholder="e.g. Kigali Warehouse" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Dispatched At *</label>
              <input type="date" className={inp} value={draft.dispatchedAt}
                onChange={e => setDraft(d => ({ ...d, dispatchedAt: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">ETA *</label>
              <input type="date" className={inp} value={draft.estimatedArrivalDate}
                onChange={e => setDraft(d => ({ ...d, estimatedArrivalDate: e.target.value }))} />
            </div>
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
        {modalMode === 'new' ? 'Create Shipment' : 'Save Changes'}
      </button>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-t3">{selected.shipmentRef}</p>
          <p className="font-semibold text-t1 mt-0.5">{selected.description}</p>
          <p className="text-sm text-t2 mt-0.5">{selected.supplierName} · PO {selected.poRef}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${STATUS_STYLES[selected.status] ?? ''}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] ?? 'bg-t3'}`} />
          {selected.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Quantity', `${selected.quantity.toLocaleString()} ${selected.unit}`],
          ['Mode', selected.mode],
          ['Carrier', selected.carrierName || '—'],
          ['Carrier Ref', selected.carrierRef || '—'],
          ['Origin', selected.originLocation],
          ['Destination', selected.destinationLocation],
          ['Dispatched', fmtDate(selected.dispatchedAt)],
          ['ETA', fmtDate(selected.estimatedArrivalDate)],
          ['Arrived', fmtDate(selected.actualArrivalDate)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className="font-medium text-t1">{v}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit Shipment
        </button>
        <div>
          <label className="block text-xs text-t3 mb-1.5">Update Status</label>
          <select className={`w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t2 outline-none focus:border-accent transition-colors`}
            value={selected.status}
            onChange={async e => {
              const updates: any = { status: e.target.value };
              if (e.target.value === 'received') updates.actualArrivalDate = new Date().toISOString();
              await apiUpdateShipment(selected._id, updates);
              load(); setModalMode(null);
            }}>
            {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  const kpiCards = [
    { label: 'In Transit', value: summary.inTransit, Icon: Boat, bg: 'bg-blue-500/10', color: 'text-blue-400' },
    { label: 'At Customs', value: summary.atCustoms, Icon: Package, bg: 'bg-amber-500/10', color: 'text-amber-500' },
    { label: 'Delayed', value: summary.delayed, Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-400' },
    { label: 'Overdue', value: summary.overdue, Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-500' },
    { label: 'Received', value: summary.received, Icon: CheckCircle, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Shipments</h1>
            <p className="text-sm text-t3 mt-1">{total.toLocaleString()} shipment records</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Shipment
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {kpiCards.map(({ label, value, Icon, bg, color }) => (
            <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
                <Icon size={16} weight="duotone" className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-t3 truncate">{label}</p>
                <p className="text-xl font-bold text-t1">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-card rounded-xl border border-border">
          {/* Tabs */}
          <div className="flex gap-1 px-4 border-b border-border">
            {TABS.map(tab => (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={`px-4 py-3 text-sm border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent font-semibold' : 'border-transparent text-t3 hover:text-t1'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
                placeholder="Search ref, supplier, PO..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <ColumnSelector cols={SHIP_COLS} visible={colVis} onToggle={colToggle} />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Boat size={40} className="mb-2 opacity-40" /><p>No shipments found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {colVis.has('ref') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>}
                    {colVis.has('supplier') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Supplier</th>}
                    {colVis.has('description') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Description</th>}
                    {colVis.has('mode') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Mode</th>}
                    {colVis.has('qty') && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Qty</th>}
                    {colVis.has('route') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Route</th>}
                    {colVis.has('eta') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">ETA</th>}
                    {colVis.has('status') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>}
                    {colVis.has('actions') && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s, i) => {
                    const ModeIcon = MODE_ICONS[s.mode] ?? Package;
                    return (
                      <tr key={s._id}
                        className={`hover:bg-surface transition-colors cursor-pointer ${i < shipments.length - 1 ? 'border-b border-border' : ''}`}
                        onClick={() => { setSelected(s); setModalMode('view'); }}>
                        {colVis.has('ref') && <td className="px-4 py-3.5 font-mono text-xs text-accent">{s.shipmentRef}</td>}
                        {colVis.has('supplier') && <td className="px-4 py-3.5 text-t1 font-medium">{s.supplierName}</td>}
                        {colVis.has('description') && <td className="px-4 py-3.5 text-t2 max-w-[140px] truncate">{s.description}</td>}
                        {colVis.has('mode') && (
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1 text-t2 text-xs">
                              <ModeIcon size={13} className="text-t3" />{s.mode}
                            </span>
                          </td>
                        )}
                        {colVis.has('qty') && <td className="px-4 py-3.5 text-right text-t1">{s.quantity.toLocaleString()} <span className="text-xs text-t3">{s.unit}</span></td>}
                        {colVis.has('route') && <td className="px-4 py-3.5 text-xs text-t2">{s.originLocation} → {s.destinationLocation}</td>}
                        {colVis.has('eta') && <td className="px-4 py-3.5 text-xs text-t2 whitespace-nowrap">{fmtDate(s.estimatedArrivalDate)}</td>}
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
                    );
                  })}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-t3">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors"><CaretLeft size={14} /></button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors"><CaretRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalMode && (
        <DocumentSidePanel
          isOpen={true}
          onClose={() => setModalMode(null)}
          title={modalMode === 'new' ? 'New Shipment' : modalMode === 'edit' ? 'Edit Shipment' : selected?.shipmentRef ?? ''}
          formContent={formContent}
          previewContent={viewContent}
        />
      )}

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
                <h2 className="text-base font-bold text-t1 mb-1">Delete shipment?</h2>
                <p className="text-xs text-t3 mb-5">
                  <span className="font-semibold text-t2">{deleteTarget.shipmentRef}</span> will be permanently removed.
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
