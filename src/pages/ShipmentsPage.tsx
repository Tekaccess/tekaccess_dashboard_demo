import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Boat, Truck, Airplane, Train,
  PencilSimple, Eye, Spinner, Package, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import {
  apiGetShipmentsSummary, apiListShipments, apiCreateShipment, apiUpdateShipment,
  apiListPurchaseOrders, apiListSuppliers,
  Shipment, PurchaseOrder, Supplier,
} from '../lib/api';
import DocumentSidePanel from '../components/DocumentSidePanel';
import SearchSelect, { SearchSelectOption } from '../components/ui/SearchSelect';

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
  const PAGE_LIMIT = 50;

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

  const inp = 'w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1';
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-4 p-4 pb-10">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}

      <div>
        <label className="block text-xs text-t3 mb-1">Purchase Order *</label>
        <SearchSelect options={poOptions} value={draft.poId || null}
          onChange={v => {
            const o = orders.find(x => x._id === v);
            setDraft(d => ({ ...d, poId: v ?? '', poRef: o?.poRef ?? '', supplierId: typeof o?.supplierId === 'string' ? o.supplierId : (o?.supplierId as any)?._id ?? '', supplierName: o?.supplierName ?? '' }));
          }}
          placeholder="Select PO..." />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Supplier *</label>
        <SearchSelect options={supplierOptions} value={draft.supplierId || null}
          onChange={v => {
            const s = suppliers.find(x => x._id === v);
            setDraft(d => ({ ...d, supplierId: v ?? '', supplierName: s?.name ?? '' }));
          }}
          placeholder="Select supplier..." />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Description *</label>
        <input className={inp} value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
          placeholder="e.g. 20 tons limestone" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-t3 mb-1">Quantity *</label>
          <input type="number" min={0} className={inp} value={draft.quantity}
            onChange={e => setDraft(d => ({ ...d, quantity: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Unit</label>
          <select className={inp} value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}>
            {['tons', 'kg', 'litres', 'units', 'boxes'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Transport Mode</label>
          <select className={inp} value={draft.mode} onChange={e => setDraft(d => ({ ...d, mode: e.target.value }))}>
            {TRANSPORT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Currency</label>
          <select className={inp} value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
            {['USD', 'RWF', 'EUR'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Carrier Name</label>
          <input className={inp} value={draft.carrierName} onChange={e => setDraft(d => ({ ...d, carrierName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Carrier Reference</label>
          <input className={inp} value={draft.carrierRef} onChange={e => setDraft(d => ({ ...d, carrierRef: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Origin Location *</label>
        <input className={inp} value={draft.originLocation}
          onChange={e => setDraft(d => ({ ...d, originLocation: e.target.value }))}
          placeholder="e.g. Dar es Salaam Port" />
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Destination *</label>
        <input className={inp} value={draft.destinationLocation}
          onChange={e => setDraft(d => ({ ...d, destinationLocation: e.target.value }))}
          placeholder="e.g. Kigali Warehouse" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Dispatched At *</label>
          <input type="date" className={inp} value={draft.dispatchedAt}
            onChange={e => setDraft(d => ({ ...d, dispatchedAt: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">ETA *</label>
          <input type="date" className={inp} value={draft.estimatedArrivalDate}
            onChange={e => setDraft(d => ({ ...d, estimatedArrivalDate: e.target.value }))} />
        </div>
      </div>

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
          {modalMode === 'new' ? 'Create Shipment' : 'Save Changes'}
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-t3">{selected.shipmentRef}</p>
          <p className="font-semibold text-t1 mt-0.5">{selected.description}</p>
          <p className="text-sm text-t2 mt-0.5">{selected.supplierName} · PO {selected.poRef}</p>
        </div>
        <span className={`text-xs border rounded px-2 py-0.5 whitespace-nowrap ${STATUS_STYLES[selected.status] ?? ''}`}>
          {selected.status.replace('_', ' ')}
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

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-border rounded hover:bg-surface text-t2">
          <PencilSimple size={14} /> Edit
        </button>
        <div className="flex-1">
          <select className="w-full bg-surface border border-border rounded px-2 py-2 text-sm text-t2"
            value={selected.status}
            onChange={async e => {
              const updates: any = { status: e.target.value };
              if (e.target.value === 'received') updates.actualArrivalDate = new Date().toISOString();
              await apiUpdateShipment(selected._id, updates);
              load(); setModalMode(null);
            }}>
            {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Shipments</h1>
          <p className="text-sm text-t3 mt-0.5">{total.toLocaleString()} shipment records</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Shipment
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 px-6 py-4 shrink-0 sm:grid-cols-5">
        {[
          { label: 'In Transit', value: summary.inTransit, color: 'text-blue-400' },
          { label: 'At Customs', value: summary.atCustoms, color: 'text-amber-500' },
          { label: 'Delayed', value: summary.delayed, color: 'text-rose-400' },
          { label: 'Overdue', value: summary.overdue, color: 'text-rose-500' },
          { label: 'Received', value: summary.received, color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs text-t3">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 border-b border-border shrink-0">
        {TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-t3 hover:text-t1'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search ref, supplier, PO..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex flex-col flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Boat size={40} className="mb-2 opacity-40" /><p>No shipments found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-t3">
                    <th className="text-left py-2 pr-3 font-medium">Ref</th>
                    <th className="text-left py-2 pr-3 font-medium">Supplier</th>
                    <th className="text-left py-2 pr-3 font-medium">Description</th>
                    <th className="text-left py-2 pr-3 font-medium">Mode</th>
                    <th className="text-right py-2 pr-3 font-medium">Qty</th>
                    <th className="text-left py-2 pr-3 font-medium">Origin → Destination</th>
                    <th className="text-left py-2 pr-3 font-medium">ETA</th>
                    <th className="text-left py-2 pr-3 font-medium">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shipments.map(s => {
                    const ModeIcon = MODE_ICONS[s.mode] ?? Package;
                    return (
                      <tr key={s._id} className="hover:bg-surface/50 cursor-pointer"
                        onClick={() => { setSelected(s); setModalMode('view'); }}>
                        <td className="py-3 pr-3 font-mono text-xs text-accent">{s.shipmentRef}</td>
                        <td className="py-3 pr-3 text-t1 font-medium">{s.supplierName}</td>
                        <td className="py-3 pr-3 text-t2 max-w-[140px] truncate">{s.description}</td>
                        <td className="py-3 pr-3">
                          <span className="flex items-center gap-1 text-t2 text-xs">
                            <ModeIcon size={13} className="text-t3" />{s.mode}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-right text-t1">{s.quantity.toLocaleString()} <span className="text-xs text-t3">{s.unit}</span></td>
                        <td className="py-3 pr-3 text-xs text-t2">{s.originLocation} → {s.destinationLocation}</td>
                        <td className="py-3 pr-3 text-xs text-t2 whitespace-nowrap">{fmtDate(s.estimatedArrivalDate)}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
              <span className="text-xs text-t3">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 border border-border rounded hover:bg-surface disabled:opacity-40"><CaretLeft size={14} /></button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 border border-border rounded hover:bg-surface disabled:opacity-40"><CaretRight size={14} /></button>
              </div>
            </div>
          )}
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
      </div>
    </div>
  );
}
