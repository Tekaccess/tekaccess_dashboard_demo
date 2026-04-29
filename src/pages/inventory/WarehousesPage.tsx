import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Warehouse as WarehouseIcon, MapPin,
  PencilSimple, Eye, CheckCircle, Warning, Spinner, Gauge, Trash,
  ArrowDown, ArrowUp, Truck as TruckIcon, ArrowsLeftRight,
} from '@phosphor-icons/react';
import {
  apiListWarehouses, apiCreateWarehouse, apiUpdateWarehouse, apiDeleteWarehouse,
  apiGetInventorySummary, apiListMovements,
  Warehouse, StockMovement,
  warehouseUsedPct, warehouseAvailable, isNearCapacity,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';

const TYPE_LABELS: Record<string, string> = {
  commercial: 'Commercial',
  workshop_store: 'Workshop / Store',
  fuel_tank: 'Fuel Tank',
  transit: 'Transit',
  bonded: 'Bonded',
};

const TYPE_STYLES: Record<string, string> = {
  commercial:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  workshop_store: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  fuel_tank:      'bg-amber-500/10 text-amber-500 border-amber-500/20',
  transit:        'bg-teal-500/10 text-teal-400 border-teal-500/20',
  bonded:         'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const CAPACITY_UNITS = ['tons', 'cubic_metres', 'pallets', 'litres', 'units'];
const WAREHOUSE_TYPES = ['commercial', 'workshop_store', 'fuel_tank', 'transit', 'bonded'];

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftWarehouse {
  warehouseCode: string; name: string; warehouseType: string;
  siteType: 'standard' | 'crushing_site';
  address: string; region: string; country: string;
  capacityUnit: string; totalCapacity: number;
  managerName: string; managerContact: string;
}

function emptyDraft(): DraftWarehouse {
  return {
    warehouseCode: '', name: '', warehouseType: 'commercial',
    siteType: 'standard',
    address: '', region: '', country: 'Rwanda',
    capacityUnit: 'tons', totalCapacity: 0,
    managerName: '', managerContact: '',
  };
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

const WH_COLS: ColDef[] = [
  { key: 'ref',     label: 'Ref',     defaultVisible: true },
  { key: 'name',    label: 'Name',    defaultVisible: true },
  { key: 'type',    label: 'Type',    defaultVisible: true },
  { key: 'usage',   label: 'Usage',   defaultVisible: true },
  { key: 'manager', label: 'Manager', defaultVisible: true },
  { key: 'actions', label: 'Actions', defaultVisible: true },
];

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [summary, setSummary] = useState({ totalItems: 0, totalValue: 0, warehouseCount: 0, lowStockRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftWarehouse>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [warehouseMovements, setWarehouseMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('warehouses', WH_COLS);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    const [whRes, summaryRes] = await Promise.all([
      apiListWarehouses(params),
      apiGetInventorySummary(),
    ]);
    if (whRes.success) setWarehouses(whRes.data.warehouses);
    if (summaryRes.success) setSummary(summaryRes.data.summary);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  // Keep `selected` in sync with the freshly-loaded warehouses so the modal
  // shows up-to-date currentQty after data reloads.
  useEffect(() => {
    if (!selected) return;
    const fresh = warehouses.find(w => w._id === selected._id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [warehouses]);

  // Load truck activity for the selected warehouse when viewing it.
  useEffect(() => {
    if (modalMode !== 'view' || !selected) {
      setWarehouseMovements([]);
      return;
    }
    setMovementsLoading(true);
    apiListMovements({ warehouseId: selected._id, limit: '50' }).then(r => {
      if (r.success) setWarehouseMovements(r.data.movements);
      setMovementsLoading(false);
    });
  }, [modalMode, selected?._id]);

  function updateDraft(patch: Partial<DraftWarehouse>) {
    setDraft(d => ({ ...d, ...patch }));
  }

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(w: Warehouse) {
    setDraft({
      warehouseCode: w.warehouseCode, name: w.name, warehouseType: w.warehouseType,
      siteType: w.siteType || 'standard',
      address: w.address || '', region: w.region || '', country: w.country,
      capacityUnit: w.capacityUnit, totalCapacity: w.totalCapacity,
      managerName: w.managerName || '', managerContact: w.managerContact || '',
    });
    setSelected(w); setError(null); setModalMode('edit');
  }

  function openView(w: Warehouse) { setSelected(w); setModalMode('view'); }

  async function handleDelete(id: string) {
    await apiDeleteWarehouse(id);
    setDeleteConfirm(null);
    setModalMode(null);
    load();
  }

  async function handleSave() {
    if (!draft.warehouseCode || !draft.name) { setError('Warehouse code and name are required.'); return; }
    setSaving(true); setError(null);
    const payload = { ...draft, totalCapacity: Number(draft.totalCapacity) } as Parameters<typeof apiCreateWarehouse>[0];
    const res = modalMode === 'new'
      ? await apiCreateWarehouse(payload)
      : await apiUpdateWarehouse(selected!._id, payload);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const selectedUsedPct = selected ? warehouseUsedPct(selected) : 0;

  const modalSummary = (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Warehouse Identity</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Code</span>
            <span className="font-mono font-bold text-accent">{draft.warehouseCode || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t3">Type</span>
            <span className="text-t1 font-medium">{TYPE_LABELS[draft.warehouseType] || draft.warehouseType}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Capacity Tracking</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Total Cap.</span>
            <span className="text-t1 font-bold">{draft.totalCapacity || '0'} {draft.capacityUnit}</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
             <div className="h-full bg-accent w-1/4 rounded-full" />
          </div>
          <p className="text-[10px] text-t3 italic text-center">New warehouse initialization...</p>
        </div>
      </div>
    </div>
  );

  const viewModalSummary = selected ? (
    <div className="space-y-6">
       <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-2">Usage Analytics</p>
          <div className="flex items-center justify-between mb-2">
             <span className="text-xl font-bold text-t1">{selectedUsedPct.toFixed(1)}%</span>
             <span className="text-xs text-t3">Occupied</span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
             <div className={`h-full rounded-full transition-all ${selectedUsedPct > 80 ? 'bg-rose-500' : selectedUsedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(selectedUsedPct, 100)}%` }} />
          </div>
          <p className="text-xs text-t3 mt-2">
            {(selected.currentQty ?? 0).toLocaleString()} / {selected.totalCapacity.toLocaleString()} {selected.capacityUnit}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <button onClick={() => openEdit(selected)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Edit Warehouse Details
        </button>
      </div>
    </div>
  ) : null;

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Warehouse Details</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Warehouse Code *</label>
              <input className={inp}
                value={draft.warehouseCode} onChange={e => updateDraft({ warehouseCode: e.target.value.toUpperCase() })}
                placeholder="e.g. WH-KGL-01" disabled={modalMode === 'edit'} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Type *</label>
              <select className={inp}
                value={draft.warehouseType} onChange={e => updateDraft({ warehouseType: e.target.value })}>
                {WAREHOUSE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Name *</label>
            <input className={inp}
              value={draft.name} onChange={e => updateDraft({ name: e.target.value })}
              placeholder="e.g. Kigali Main Warehouse" />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Site Role *</label>
            <select className={inp}
              value={draft.siteType}
              onChange={e => updateDraft({ siteType: e.target.value as 'standard' | 'crushing_site' })}>
              <option value="standard">Standard Warehouse — holds processed / sellable stock</option>
              <option value="crushing_site">Crushing Site — holds raw / uncrushed material to be processed</option>
            </select>
            <p className="text-[10px] text-t3 mt-1 leading-relaxed">
              Crushing Sites receive uncrushed material from suppliers. Once processed, transfer the stock to a Standard Warehouse.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Total Capacity</label>
              <input type="number" min={0} className={inp}
                value={draft.totalCapacity} onChange={e => updateDraft({ totalCapacity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Capacity Unit</label>
              <select className={inp}
                value={draft.capacityUnit} onChange={e => updateDraft({ capacityUnit: e.target.value })}>
                {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Location</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Address</label>
            <input className={inp}
              value={draft.address} onChange={e => updateDraft({ address: e.target.value })} placeholder="Street / area" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Region / City</label>
              <input className={inp}
                value={draft.region} onChange={e => updateDraft({ region: e.target.value })} placeholder="Kigali" />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Country</label>
              <input className={inp}
                value={draft.country} onChange={e => updateDraft({ country: e.target.value })} placeholder="Rwanda" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Manager</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-t3 mb-1.5">Manager Name</label>
            <input className={inp}
              value={draft.managerName} onChange={e => updateDraft({ managerName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Manager Contact</label>
            <input className={inp}
              value={draft.managerContact} onChange={e => updateDraft({ managerContact: e.target.value })} />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner className="animate-spin" size={14} />}
        {modalMode === 'new' ? 'Create Warehouse' : 'Save Changes'}
      </button>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-t3 mb-1">{selected.warehouseCode}</p>
          <h3 className="text-lg font-semibold text-t1">{selected.name}</h3>
          <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium mt-1 ${TYPE_STYLES[selected.warehouseType] ?? 'bg-surface text-t3 border-border'}`}>
            {TYPE_LABELS[selected.warehouseType] ?? selected.warehouseType}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
          {selected.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div>
        <p className="text-xs text-t3 mb-2">Capacity Usage</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${selectedUsedPct > 80 ? 'bg-rose-500' : selectedUsedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(selectedUsedPct, 100)}%` }} />
          </div>
          <span className="text-sm font-medium text-t1 w-12 text-right">{selectedUsedPct.toFixed(1)}%</span>
        </div>
        <p className="text-xs text-t3 mt-1">
          {(selected.currentQty ?? 0).toLocaleString()} / {selected.totalCapacity.toLocaleString()} {selected.capacityUnit}
          <span className="text-t3"> · {warehouseAvailable(selected).toLocaleString()} {selected.capacityUnit} free</span>
        </p>
        {isNearCapacity(selected) && (
          <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
            <Gauge size={12} /> Near capacity threshold ({selected.alertThresholdPct ?? 90}%)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Type', TYPE_LABELS[selected.warehouseType]],
          ['Country', selected.country],
          ['Region', selected.region || '—'],
          ['Manager', selected.managerName || '—'],
          ['Contact', selected.managerContact || '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className="text-t1 font-medium">{v}</p>
          </div>
        ))}
      </div>

      {selected.address && (
        <div className="flex items-start gap-2 text-sm text-t2">
          <MapPin size={14} className="text-t3 mt-0.5 shrink-0" />
          <span>{selected.address}</span>
        </div>
      )}

      {/* Truck Activity — chronological inbound/outbound movements at this warehouse */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-t3 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <TruckIcon size={12} weight="duotone" /> Truck Activity
          </p>
          <span className="text-[10px] text-t3">
            {warehouseMovements.length > 0 ? `${warehouseMovements.length} recent` : ''}
          </span>
        </div>
        {movementsLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size={18} className="animate-spin text-accent" />
          </div>
        ) : warehouseMovements.length === 0 ? (
          <p className="text-xs text-t3 italic py-2">No movements recorded yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {warehouseMovements.map(m => {
              const isInbound = m.movementType === 'INBOUND' || m.movementType === 'TRANSFER_IN' || m.movementType === 'RETURN';
              const isOutbound = m.movementType === 'OUTBOUND' || m.movementType === 'TRANSFER_OUT';
              const Icon = isInbound ? ArrowDown : isOutbound ? ArrowUp : ArrowsLeftRight;
              const tone = isInbound
                ? 'bg-emerald-500/10 text-emerald-400'
                : isOutbound
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-blue-500/10 text-blue-400';
              return (
                <div key={m._id} className="flex items-center gap-3 p-2.5 bg-surface/50 hover:bg-surface rounded-lg transition-colors">
                  <div className={`p-1.5 rounded-md shrink-0 ${tone}`}>
                    <Icon size={12} weight="bold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-t1">
                        {m.truckPlate || <span className="text-t3 italic font-sans">No truck</span>}
                      </span>
                      {m.driverName && <span className="text-t3 truncate">· {m.driverName}</span>}
                    </div>
                    <p className="text-[11px] text-t3 truncate mt-0.5">
                      <span className={isInbound ? 'text-emerald-400' : isOutbound ? 'text-rose-400' : 'text-t2'}>
                        {m.qty > 0 ? '+' : ''}{m.qty.toLocaleString()} {m.stockUnit || ''}
                      </span>
                      {m.supplierName && ` · from ${m.supplierName}`}
                      {m.linkedPoRef && ` · ${m.linkedPoRef}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-t3 shrink-0 text-right">
                    {m.movementDate ? new Date(m.movementDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit
        </button>
        {deleteConfirm === selected._id ? (
          <div className="flex gap-1">
            <button onClick={() => handleDelete(selected._id)}
              className="flex items-center gap-1 px-3 py-2.5 text-xs bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors">
              Confirm
            </button>
            <button onClick={() => setDeleteConfirm(null)}
              className="px-3 py-2.5 text-xs border border-border rounded-xl text-t2 hover:bg-surface transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(selected._id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm border border-rose-500/30 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors">
            <Trash size={14} /> Delete
          </button>
        )}
      </div>
    </div>
  ) : null;

  const kpiCards = [
    { label: 'Total Warehouses', value: summary.warehouseCount, Icon: WarehouseIcon, bg: 'bg-blue-500/10', color: 'text-blue-400' },
    { label: 'Stock Items', value: summary.totalItems, Icon: CheckCircle, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
    { label: 'Total Value', value: `${(summary.totalValue / 1_000_000).toFixed(1)}M`, Icon: Gauge, bg: 'bg-accent-glow', color: 'text-accent' },
    { label: 'Low Stock Alerts', value: summary.lowStockRecords, Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-400' },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Warehouses</h1>
            <p className="text-sm text-t3 mt-1">Manage storage locations and capacity</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Warehouse
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiCards.map(({ label, value, Icon, bg, color }) => (
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

        {/* Search + Filter */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t3 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search warehouses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-9 min-w-44 focus:ring-0 focus:border-border">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {WAREHOUSE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <ColumnSelector cols={WH_COLS} visible={colVis} onToggle={colToggle} />
            </div>
          </div>
        </div>

        {/* Warehouses Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : warehouses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <WarehouseIcon size={40} className="mb-2 opacity-40" />
              <p>No warehouses found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {colVis.has('ref')     && <TableHead>Ref</TableHead>}
                    {colVis.has('name')    && <TableHead>Name</TableHead>}
                    {colVis.has('type')    && <TableHead>Type</TableHead>}
                    {colVis.has('usage')   && <TableHead>Usage</TableHead>}
                    {colVis.has('manager') && <TableHead>Manager</TableHead>}
                    {colVis.has('actions') && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.map(w => {
                    const pct = warehouseUsedPct(w);
                    return (
                      <TableRow
                        key={w._id}
                        onClick={() => openView(w)}
                        className="cursor-pointer"
                      >
                        {colVis.has('ref') && (
                          <TableCell className="font-mono text-xs text-accent">{w.warehouseCode}</TableCell>
                        )}
                        {colVis.has('name') && (
                          <TableCell className="font-medium text-t1">{w.name}</TableCell>
                        )}
                        {colVis.has('type') && (
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2 py-0.5 uppercase tracking-wider ${TYPE_STYLES[w.warehouseType] ?? 'bg-surface text-t3 border-border'}`}>
                              {TYPE_LABELS[w.warehouseType] ?? w.warehouseType}
                            </span>
                          </TableCell>
                        )}
                        {colVis.has('usage') && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct > 80 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-t2">{pct.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        )}
                        {colVis.has('manager') && (
                          <TableCell className="text-t2 text-xs">
                            {w.managerName || '—'}
                            {w.managerContact && <p className="text-t3">{w.managerContact}</p>}
                          </TableCell>
                        )}
                        {colVis.has('actions') && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 text-t3" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openEdit(w)} className="hover:text-t1 p-1"><PencilSimple size={14} /></button>
                              <button onClick={() => openView(w)} className="hover:text-t1 p-1"><Eye size={14} /></button>
                              {deleteConfirm === w._id ? (
                                <>
                                  <button onClick={() => handleDelete(w._id)} className="text-rose-400 hover:text-rose-300 p-1 text-xs font-bold">Yes</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="hover:text-t1 p-1 text-xs">No</button>
                                </>
                              ) : (
                                <button onClick={() => setDeleteConfirm(w._id)} className="hover:text-rose-400 p-1"><Trash size={14} /></button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </OverlayScrollbarsComponent>
          )}
        </div>
      </div>

      <ModernModal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'new' ? 'Initialize Warehouse' : modalMode === 'edit' ? 'Update Warehouse' : selected?.name ?? ''}
        summaryContent={modalMode === 'view' ? viewModalSummary : modalSummary}
        actions={modalMode !== 'view' ? (
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={14} className="animate-spin" />}
            {modalMode === 'new' ? 'Create Warehouse' : 'Save Changes'}
          </button>
        ) : undefined}
      >
        {modalMode === 'view' ? viewContent : formContent}
      </ModernModal>
    </>
  );
}
