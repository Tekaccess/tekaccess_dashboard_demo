import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Truck, Plus, Spinner, MagnifyingGlass, CaretLeft, CaretRight,
  ArrowRight, XCircle, CheckCircle, Clock, Package, Warning,
} from '@phosphor-icons/react';
import {
  apiListAllocations, apiGetAllocationsSummary, apiCreateAllocation,
  apiAdvanceAllocationStage, apiCancelAllocation, apiListTrucks,
  apiListSuppliers, apiListWarehouses, apiListPurchaseOrders,
  TruckAllocation, AllocationsSummary, AllocationStage, TruckType,
} from '../../lib/api';
import { TIPPER_STAGE_CONFIGS, FLATBED_STAGE_CONFIGS } from '../../data/truckMovements';
import DocumentSidePanel from '../../components/DocumentSidePanel';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';

const STATUS_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

const TYPE_TABS = [
  { id: '', label: 'All trucks' },
  { id: 'tipper', label: 'Tippers' },
  { id: 'flatbed', label: 'Flatbeds' },
];

const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  [...TIPPER_STAGE_CONFIGS, ...FLATBED_STAGE_CONFIGS].map(c => [c.id, c.label])
);

const STAGE_TONE: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

const STAGE_COLOR_MAP: Record<string, string> = Object.fromEntries(
  [...TIPPER_STAGE_CONFIGS, ...FLATBED_STAGE_CONFIGS].map(c => [c.id, c.color])
);

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

const inp =
  'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

function StageBadge({ stage }: { stage: AllocationStage }) {
  const color = STAGE_COLOR_MAP[stage] || 'blue';
  const tone = STAGE_TONE[color];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tone}`}>
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState<TruckAllocation[]>([]);
  const [summary, setSummary] = useState<AllocationsSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('active');
  const [typeTab, setTypeTab] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 50;

  const [selected, setSelected] = useState<TruckAllocation | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'create' | 'advance' | null>(null);

  // Advance form state
  const [advanceWeight, setAdvanceWeight] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advanceWeighbridgeUrl, setAdvanceWeighbridgeUrl] = useState('');

  // Create form state — selectors are pre-loaded; field values derive from picks
  const [trucks, setTrucks] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({
    truckId: '',
    trailerNumber: '',
    truckType: '' as '' | TruckType,
    driverName: '',
    driverContact: '',
    transporterName: '',
    supplierId: '',
    supplierName: '',
    productName: '',
    quantity: '',
    purchaseOrderId: '',
    purchaseOrderRef: '',
    warehouseId: '',
    warehouseName: '',
  });
  // Track which fields were auto-filled so we can display a subtle hint to the user.
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_LIMIT), status: statusTab };
    if (typeTab) params.truckType = typeTab;
    const [listRes, sumRes] = await Promise.all([
      apiListAllocations(params),
      apiGetAllocationsSummary(),
    ]);
    if (listRes.success) {
      let items = listRes.data.allocations;
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(a =>
          a.allocationRef.toLowerCase().includes(q) ||
          a.plateNumber.toLowerCase().includes(q) ||
          a.driverName.toLowerCase().includes(q) ||
          a.supplierName.toLowerCase().includes(q) ||
          (a.purchaseOrderRef || '').toLowerCase().includes(q)
        );
      }
      setAllocations(items);
      setTotal(listRes.data.pagination.total);
    }
    if (sumRes.success) setSummary(sumRes.data.summary);
    setLoading(false);
  }, [statusTab, typeTab, page, search]);

  useEffect(() => { load(); }, [load]);

  async function openCreate() {
    setCreateForm({
      truckId: '', trailerNumber: '', truckType: '',
      driverName: '', driverContact: '', transporterName: '',
      supplierId: '', supplierName: '', productName: '', quantity: '',
      purchaseOrderId: '', purchaseOrderRef: '', warehouseId: '', warehouseName: '',
    });
    setAutoFilled(new Set());
    setActionError(null);
    setPanelMode('create');
    setSelected(null);
    // Lazy-load selectors only on first open
    if (trucks.length === 0) {
      const [tRes, sRes, wRes, poRes] = await Promise.all([
        apiListTrucks({ limit: '200' }),
        apiListSuppliers(),
        apiListWarehouses({ limit: '200' }),
        apiListPurchaseOrders({ limit: '100', status: 'approved' }),
      ]);
      if (tRes.success) setTrucks(tRes.data.trucks);
      if (sRes.success) setSuppliers(sRes.data.suppliers);
      if (wRes.success) setWarehouses(wRes.data.warehouses || []);
      if (poRes.success) setPurchaseOrders(poRes.data.orders || []);
    }
  }

  function openView(a: TruckAllocation) {
    setSelected(a);
    setActionError(null);
    setPanelMode('view');
  }

  function openAdvance(a: TruckAllocation) {
    setSelected(a);
    setAdvanceWeight('');
    setAdvanceNotes('');
    setAdvanceWeighbridgeUrl('');
    setActionError(null);
    setPanelMode('advance');
  }

  // ── Auto-fill handlers ──────────────────────────────────────────────────
  // Selecting any of these entities pulls related info forward so the user
  // never re-types details that already exist in another module.

  function pickTruck(truckId: string) {
    const t = trucks.find(x => x._id === truckId);
    if (!t) return;
    // fleetType in the API is 'tipper' | 'sideboarded' | 'flatbed';
    // allocations only support tipper/flatbed, so we collapse 'sideboarded' → 'flatbed'.
    const ft = (t.fleetType === 'tipper') ? 'tipper' : 'flatbed';
    // Owned trucks default to the company's own fleet identity.
    const transporter = t.ownershipType === 'owned' ? 'TEKACCESS LTD' : '';

    const filled = new Set(autoFilled);
    if (t.assignedDriverName) filled.add('driverName');
    filled.add('truckType');
    if (transporter) filled.add('transporterName');

    setCreateForm(f => ({
      ...f,
      truckId,
      truckType: ft as TruckType,
      driverName: t.assignedDriverName || f.driverName,
      // Owned trucks → use company name; otherwise leave whatever the user already typed.
      transporterName: transporter || f.transporterName,
    }));
    setAutoFilled(filled);
  }

  function pickSupplier(supplierId: string) {
    const s = suppliers.find(x => x._id === supplierId);
    if (!s) return;
    setCreateForm(f => ({
      ...f,
      supplierId,
      supplierName: s.name || '',
      // If the picked PO no longer matches the new supplier, clear it.
      ...(f.purchaseOrderId && purchaseOrders.find(p => p._id === f.purchaseOrderId)?.supplierId !== supplierId
        ? { purchaseOrderId: '', purchaseOrderRef: '' }
        : {}),
    }));
    setAutoFilled(prev => { const n = new Set(prev); n.add('supplierName'); return n; });
  }

  function pickPO(poId: string) {
    const po = purchaseOrders.find(x => x._id === poId);
    if (!po) return;
    // Pull EVERYTHING the PO knows: supplier, product, qty, destination warehouse.
    const firstLine = po.lineItems?.[0];
    const productName = firstLine?.productName || firstLine?.description || '';
    const remainingQty = (po.totalOrderedQty || 0) - (po.totalReceivedQty || 0);

    const filled = new Set(autoFilled);
    if (po.supplierName) { filled.add('supplierName'); filled.add('supplierId'); }
    if (productName) filled.add('productName');
    if (remainingQty > 0) filled.add('quantity');
    if (po.destinationWarehouseName) { filled.add('warehouseName'); filled.add('warehouseId'); }

    setCreateForm(f => ({
      ...f,
      purchaseOrderId: poId,
      purchaseOrderRef: po.poRef || '',
      // Only override fields that are empty OR were previously auto-filled,
      // so the user's manual edits are respected.
      supplierId: po.supplierId || f.supplierId,
      supplierName: po.supplierName || f.supplierName,
      productName: f.productName && !autoFilled.has('productName') ? f.productName : (productName || f.productName),
      quantity: f.quantity && !autoFilled.has('quantity') ? f.quantity : (remainingQty > 0 ? String(remainingQty) : f.quantity),
      warehouseId: po.destinationWarehouseId || f.warehouseId,
      warehouseName: po.destinationWarehouseName || f.warehouseName,
    }));
    setAutoFilled(filled);
  }

  function pickWarehouse(warehouseId: string) {
    const w = warehouses.find(x => x._id === warehouseId);
    if (!w) return;
    setCreateForm(f => ({ ...f, warehouseId, warehouseName: w.name || '' }));
    setAutoFilled(prev => { const n = new Set(prev); n.add('warehouseName'); return n; });
  }

  // POs filtered by supplier (when picked) so the PO list narrows automatically.
  const filteredPOs = createForm.supplierId
    ? purchaseOrders.filter(p => p.supplierId === createForm.supplierId)
    : purchaseOrders;

  async function handleCreate() {
    const t = trucks.find(x => x._id === createForm.truckId);
    if (!t) { setActionError('Pick a truck'); return; }
    if (!createForm.truckType) { setActionError('Truck type is required'); return; }
    if (!createForm.driverName) { setActionError('Driver name is required'); return; }
    if (!createForm.supplierName) { setActionError('Pick a supplier'); return; }
    if (!createForm.productName) { setActionError('Product is required'); return; }
    if (!createForm.warehouseName) { setActionError('Pick a destination warehouse'); return; }
    if (!createForm.quantity || Number(createForm.quantity) <= 0) {
      setActionError('Quantity must be positive'); return;
    }
    setSubmitting(true); setActionError(null);
    const res = await apiCreateAllocation({
      truckId: createForm.truckId,
      plateNumber: t.plateNumber,
      trailerNumber: createForm.trailerNumber || undefined,
      truckType: createForm.truckType as TruckType,
      driverName: createForm.driverName,
      driverContact: createForm.driverContact || undefined,
      transporterName: createForm.transporterName || undefined,
      supplierId: createForm.supplierId || undefined,
      supplierName: createForm.supplierName,
      productName: createForm.productName,
      quantity: Number(createForm.quantity),
      purchaseOrderId: createForm.purchaseOrderId || undefined,
      purchaseOrderRef: createForm.purchaseOrderRef || undefined,
      warehouseId: createForm.warehouseId || undefined,
      warehouseName: createForm.warehouseName,
    });
    setSubmitting(false);
    if (!res.success) { setActionError((res as any).message || 'Failed'); return; }
    setPanelMode(null);
    load();
  }

  async function handleAdvance() {
    if (!selected) return;
    setSubmitting(true); setActionError(null);
    const res = await apiAdvanceAllocationStage(selected._id, {
      netWeight: advanceWeight ? Number(advanceWeight) : undefined,
      weighbridgeUrl: advanceWeighbridgeUrl || undefined,
      notes: advanceNotes || undefined,
    });
    setSubmitting(false);
    if (!res.success) { setActionError((res as any).message || 'Failed'); return; }
    setSelected(res.data.allocation);
    setPanelMode('view');
    load();
  }

  async function handleCancel() {
    if (!selected) return;
    const reason = prompt(`Cancel allocation ${selected.allocationRef}? Reason:`);
    if (reason == null) return;
    setSubmitting(true);
    const res = await apiCancelAllocation(selected._id, reason);
    setSubmitting(false);
    if (res.success) {
      setPanelMode(null);
      setSelected(null);
      load();
    }
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ── Side panel content ──────────────────────────────────────────────────
  const formContent = useMemo(() => {
    if (panelMode === 'create') {
      const isAuto = (k: string) => autoFilled.has(k);
      const FieldLabel = ({ children, autoKey, required }: { children: React.ReactNode; autoKey?: string; required?: boolean }) => (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[10px] text-t3">{children}{required && <span className="text-rose-400 ml-0.5">*</span>}</label>
          {autoKey && isAuto(autoKey) && (
            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">auto-filled</span>
          )}
        </div>
      );

      return (
        <div className="space-y-4 pb-10">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">New Allocation</p>
          <p className="text-[11px] text-t3 -mt-2">
            Pick the truck and a PO; we'll pre-fill the rest from those records. Adjust anything that doesn't match.
          </p>

          {/* Step 1 — Truck (drives driver/type/transporter) */}
          <div className="bg-surface/40 border border-border rounded-xl p-3 space-y-3">
            <p className="text-[10px] font-bold text-t3 uppercase tracking-widest">1 · Truck & Driver</p>

            <div>
              <FieldLabel required>Truck</FieldLabel>
              <Select value={createForm.truckId} onValueChange={pickTruck}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select a truck from fleet" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.plateNumber} · {t.fleetType || 'tipper'} · {t.ownershipType || 'owned'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel autoKey="truckType" required>Type</FieldLabel>
                <Select
                  value={createForm.truckType || ''}
                  onValueChange={(v) => {
                    setCreateForm(f => ({ ...f, truckType: v as TruckType }));
                    setAutoFilled(prev => { const n = new Set(prev); n.delete('truckType'); return n; });
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tipper">Tipper</SelectItem>
                    <SelectItem value="flatbed">Flatbed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Trailer #</FieldLabel>
                <Input value={createForm.trailerNumber}
                  onChange={e => setCreateForm(f => ({ ...f, trailerNumber: e.target.value }))}
                  placeholder="optional" />
              </div>
            </div>

            <div>
              <FieldLabel autoKey="driverName" required>Driver name</FieldLabel>
              <Input value={createForm.driverName}
                onChange={e => {
                  setCreateForm(f => ({ ...f, driverName: e.target.value }));
                  setAutoFilled(prev => { const n = new Set(prev); n.delete('driverName'); return n; });
                }}
                placeholder="Driver assigned to this haul" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Driver contact</FieldLabel>
                <Input value={createForm.driverContact}
                  onChange={e => setCreateForm(f => ({ ...f, driverContact: e.target.value }))}
                  placeholder="+250…" />
              </div>
              <div>
                <FieldLabel autoKey="transporterName">Transporter</FieldLabel>
                <Input value={createForm.transporterName}
                  onChange={e => {
                    setCreateForm(f => ({ ...f, transporterName: e.target.value }));
                    setAutoFilled(prev => { const n = new Set(prev); n.delete('transporterName'); return n; });
                  }}
                  placeholder="if outsourced" />
              </div>
            </div>
          </div>

          {/* Step 2 — Supplier + PO (drives product, qty, destination) */}
          <div className="bg-surface/40 border border-border rounded-xl p-3 space-y-3">
            <p className="text-[10px] font-bold text-t3 uppercase tracking-widest">2 · Supplier & Purchase Order</p>

            <div>
              <FieldLabel required>Supplier</FieldLabel>
              <Select value={createForm.supplierId} onValueChange={pickSupplier}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>Purchase Order</FieldLabel>
              <Select value={createForm.purchaseOrderId} onValueChange={pickPO}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder={createForm.supplierId ? `Select PO from ${createForm.supplierName}` : 'Select PO (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPOs.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-t3">No matching POs.</div>
                  ) : filteredPOs.map(p => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.poRef} · {p.supplierName} · {(p.totalOrderedQty || 0)}t
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-t3 mt-1">Picking a PO auto-fills product, quantity, and destination warehouse.</p>
            </div>
          </div>

          {/* Step 3 — Material + destination */}
          <div className="bg-surface/40 border border-border rounded-xl p-3 space-y-3">
            <p className="text-[10px] font-bold text-t3 uppercase tracking-widest">3 · Material & Destination</p>

            <div>
              <FieldLabel autoKey="productName" required>Product</FieldLabel>
              <Input value={createForm.productName}
                onChange={e => {
                  setCreateForm(f => ({ ...f, productName: e.target.value }));
                  setAutoFilled(prev => { const n = new Set(prev); n.delete('productName'); return n; });
                }}
                placeholder="e.g. Raw Stone, Bagged Gypsum" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel autoKey="quantity" required>Quantity (tons)</FieldLabel>
                <Input type="number" min="0" step="0.01" value={createForm.quantity}
                  onChange={e => {
                    setCreateForm(f => ({ ...f, quantity: e.target.value }));
                    setAutoFilled(prev => { const n = new Set(prev); n.delete('quantity'); return n; });
                  }}
                  placeholder="0" />
              </div>
              <div>
                <FieldLabel autoKey="warehouseName" required>Destination warehouse</FieldLabel>
                <Select value={createForm.warehouseId} onValueChange={pickWarehouse}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {actionError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">{actionError}</div>
          )}
          <button onClick={handleCreate} disabled={submitting}
            className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
            {submitting ? <Spinner size={13} className="animate-spin" /> : <Plus size={14} weight="bold" />}
            Create allocation
          </button>
        </div>
      );
    }

    if (panelMode === 'advance' && selected) {
      const flow = selected.truckType === 'tipper' ? TIPPER_STAGE_CONFIGS : FLATBED_STAGE_CONFIGS;
      const idx = flow.findIndex(c => c.id === selected.currentStage);
      const next = flow[idx + 1];
      const isLoading = ['loading_mine', 'loading_bagged', 'loading_crushed', 'loading'].includes(selected.currentStage);
      return (
        <div className="space-y-4 pb-10">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Advance allocation</p>
          <div className="bg-surface border border-border rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-t3">Allocation</span>
              <span className="font-mono text-accent">{selected.allocationRef}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-t3">Truck</span>
              <span className="font-bold text-t1">{selected.plateNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-t3">Current stage</span>
              <StageBadge stage={selected.currentStage} />
            </div>
            <div className="flex items-center justify-center my-2 text-t3">
              <ArrowRight size={20} weight="bold" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-t3">Next stage</span>
              {next ? <StageBadge stage={next.id as AllocationStage} /> : <span className="text-t3">— end —</span>}
            </div>
          </div>
          {isLoading && (
            <>
              <div>
                <label className="block text-[10px] text-t3 mb-1">Weighbridge net weight (tons)</label>
                <Input type="number" min="0" step="0.01" value={advanceWeight}
                  onChange={e => setAdvanceWeight(e.target.value)} placeholder="e.g. 28" />
                <p className="text-[10px] text-t3 mt-1">Captured on the loading-stage exit. Triggers a stock movement.</p>
              </div>
              <div>
                <label className="block text-[10px] text-t3 mb-1">Weighbridge ticket URL</label>
                <Input value={advanceWeighbridgeUrl}
                  onChange={e => setAdvanceWeighbridgeUrl(e.target.value)}
                  placeholder="https://… (photo or PDF)" />
              </div>
            </>
          )}
          <div>
            <label className="block text-[10px] text-t3 mb-1">Notes</label>
            <textarea rows={2} className={`${inp} resize-none`} value={advanceNotes}
              onChange={e => setAdvanceNotes(e.target.value)} />
          </div>
          {actionError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">{actionError}</div>
          )}
          <button onClick={handleAdvance} disabled={submitting || !next}
            className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
            {submitting ? <Spinner size={13} className="animate-spin" /> : <ArrowRight size={14} weight="bold" />}
            Advance to {next ? next.shortLabel : 'end'}
          </button>
        </div>
      );
    }

    if (panelMode === 'view' && selected) {
      return (
        <div className="space-y-4 pb-10">
          <section className="space-y-2">
            <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Details</p>
            {([
              ['Ref', selected.allocationRef],
              ['Truck', `${selected.plateNumber}${selected.trailerNumber ? ` · ${selected.trailerNumber}` : ''}`],
              ['Type', selected.truckType],
              ['Driver', selected.driverName],
              ['Transporter', selected.transporterName || '—'],
              ['Supplier', selected.supplierName],
              ['Product', selected.productName],
              ['Quantity', `${selected.quantity} t`],
              ['Warehouse', selected.warehouseName],
              ['PO', selected.purchaseOrderRef || '—'],
              ['Allocated', fmtDate(selected.allocatedAt)],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-t3">{l}</span>
                <span className="font-medium text-t1">{v}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-t3">Stage</span>
              <StageBadge stage={selected.currentStage} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-t3">Status</span>
              <span className={`text-xs font-bold ${selected.status === 'active' ? 'text-emerald-400' : selected.status === 'cancelled' ? 'text-rose-400' : 'text-t3'}`}>
                {selected.status}
              </span>
            </div>
            {selected.tripRef && (
              <div className="flex justify-between text-sm">
                <span className="text-t3">Trip</span>
                <span className="font-mono text-xs text-accent">{selected.tripRef}</span>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Stage history</p>
            <div className="space-y-1.5">
              {selected.history.map((h, i) => (
                <div key={i} className="p-2.5 bg-surface border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <StageBadge stage={h.stage} />
                    <span className="text-[10px] text-t3">{fmtDate(h.enteredAt)}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-t3 flex flex-wrap gap-x-3">
                    {h.netWeight != null && <span>weight: <b className="text-t1">{h.netWeight} t</b></span>}
                    {h.fromLocation && <span>from: {h.fromLocation}</span>}
                    {h.toLocation && <span>to: {h.toLocation}</span>}
                    {h.postedByName && <span>by: {h.postedByName}</span>}
                  </div>
                  {h.notes && <p className="text-[11px] text-t2 mt-1">{h.notes}</p>}
                </div>
              ))}
            </div>
          </section>

          {selected.status === 'active' && (
            <section className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <button onClick={() => openAdvance(selected)}
                className="flex-1 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1">
                <ArrowRight size={12} weight="bold" /> Advance stage
              </button>
              <button onClick={handleCancel} disabled={submitting}
                className="flex-1 py-2 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1">
                <XCircle size={12} weight="bold" /> Cancel
              </button>
            </section>
          )}
        </div>
      );
    }
    return null;
  }, [panelMode, selected, createForm, trucks, suppliers, warehouses, purchaseOrders,
      advanceWeight, advanceNotes, advanceWeighbridgeUrl, submitting, actionError]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Truck Allocations</h1>
          <p className="text-sm text-t3 mt-0.5">Transport assigns trucks to suppliers and walks them through the loading workflow.</p>
        </div>
        <button onClick={openCreate}
          className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2">
          <Plus size={14} weight="bold" /> New allocation
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active tippers', value: summary.activeByType.tipper?.count || 0,
              extra: `${(summary.activeByType.tipper?.tons || 0).toLocaleString()} t`,
              Icon: Truck, color: 'text-accent', bg: 'bg-accent/10' },
            { label: 'Active flatbeds', value: summary.activeByType.flatbed?.count || 0,
              extra: `${(summary.activeByType.flatbed?.tons || 0).toLocaleString()} t`,
              Icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Completed today', value: summary.completedToday,
              extra: '', Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Cancelled today', value: summary.cancelledToday,
              extra: '', Icon: Warning, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          ].map(c => (
            <div key={c.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${c.bg}`}><c.Icon size={18} weight="duotone" className={c.color} /></div>
              <div>
                <p className="text-xs text-t3 font-medium uppercase tracking-wide">{c.label}</p>
                <p className="text-xl font-bold text-t1 mt-0.5">{c.value}</p>
                {c.extra && <p className="text-[10px] text-t3">{c.extra}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border">
        <div className="flex gap-1 px-4 border-b border-border overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button key={tab.id}
              onClick={() => { setStatusTab(tab.id); setPage(1); }}
              className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${statusTab === tab.id ? 'border-accent text-accent font-semibold' : 'border-transparent text-t3 hover:text-t1'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
          <div className="flex gap-1">
            {TYPE_TABS.map(tab => (
              <button key={tab.id}
                onClick={() => setTypeTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeTab === tab.id ? 'bg-accent text-white' : 'bg-surface text-t2 hover:text-t1'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              placeholder="Search ref, plate, driver, supplier, PO…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
        ) : allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-t3 gap-3">
            <Package size={40} weight="duotone" className="opacity-40" />
            <p>No allocations found.</p>
          </div>
        ) : (
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Truck</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Tons</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocations.map(a => (
                  <tr key={a._id} className="hover:bg-surface cursor-pointer transition-colors" onClick={() => openView(a)}>
                    <td className="px-4 py-3.5 font-mono text-xs text-accent font-semibold whitespace-nowrap">{a.allocationRef}</td>
                    <td className="px-4 py-3.5 text-t1 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Truck size={12} className={a.truckType === 'tipper' ? 'text-accent' : 'text-purple-400'} weight="duotone" />
                        {a.plateNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-t2 whitespace-nowrap">{a.driverName}</td>
                    <td className="px-4 py-3.5 text-t2 whitespace-nowrap">{a.supplierName}</td>
                    <td className="px-4 py-3.5 text-t2 whitespace-nowrap">{a.productName}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-t1 whitespace-nowrap">{a.quantity}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><StageBadge stage={a.currentStage} /></td>
                    <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">
                      <Clock size={11} weight="duotone" className="inline mr-1" />
                      {new Date(a.allocatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </OverlayScrollbarsComponent>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-t3">Page {page} of {totalPages} · {total.toLocaleString()} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors">
                <CaretLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors">
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <DocumentSidePanel
        isOpen={panelMode !== null}
        onClose={() => { setPanelMode(null); setSelected(null); setActionError(null); }}
        title={
          panelMode === 'create' ? 'New allocation' :
          panelMode === 'advance' ? `Advance · ${selected?.allocationRef}` :
          selected?.allocationRef || 'Allocation'
        }
        footerInfo={selected ? `${selected.plateNumber} · ${selected.supplierName}` : ''}
        formContent={formContent}
        previewContent={null}
      />
    </div>
  );
}
