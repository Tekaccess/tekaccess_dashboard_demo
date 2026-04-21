import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Warehouse as WarehouseIcon, MapPin,
  PencilSimple, Eye, CheckCircle, X, Spinner, Gauge,
} from '@phosphor-icons/react';
import {
  apiListWarehouses, apiCreateWarehouse, apiUpdateWarehouse, apiGetInventorySummary,
  Warehouse,
} from '../../lib/api';
import DocumentSidePanel from '../../components/DocumentSidePanel';

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
  address: string; region: string; country: string;
  capacityUnit: string; totalCapacity: number;
  managerName: string; managerContact: string;
}

function emptyDraft(): DraftWarehouse {
  return {
    warehouseCode: '', name: '', warehouseType: 'commercial',
    address: '', region: '', country: 'Rwanda',
    capacityUnit: 'tons', totalCapacity: 0,
    managerName: '', managerContact: '',
  };
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [summary, setSummary] = useState({ totalItems: 0, totalValue: 0, warehouseCount: 0, lowStockItems: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Warehouse | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftWarehouse>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function updateDraft(patch: Partial<DraftWarehouse>) {
    setDraft(d => ({ ...d, ...patch }));
  }

  function openNew() {
    setDraft(emptyDraft());
    setSelected(null);
    setError(null);
    setModalMode('new');
  }

  function openEdit(w: Warehouse) {
    setDraft({
      warehouseCode: w.warehouseCode,
      name: w.name,
      warehouseType: w.warehouseType,
      address: w.address || '',
      region: w.region || '',
      country: w.country,
      capacityUnit: w.capacityUnit,
      totalCapacity: w.totalCapacity,
      managerName: w.managerName || '',
      managerContact: w.managerContact || '',
    });
    setSelected(w);
    setError(null);
    setModalMode('edit');
  }

  function openView(w: Warehouse) {
    setSelected(w);
    setModalMode('view');
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
    setModalMode(null);
    load();
  }

  const panelTitle = modalMode === 'new' ? 'New Warehouse'
    : modalMode === 'edit' ? 'Edit Warehouse'
    : selected?.name ?? '';

  const usedPct = selected?.liveCapacity?.usedPct ?? 0;

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-4 p-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Warehouse Code *</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.warehouseCode} onChange={e => updateDraft({ warehouseCode: e.target.value.toUpperCase() })}
            placeholder="e.g. WH-KGL-01" disabled={modalMode === 'edit'} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Type *</label>
          <select className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.warehouseType} onChange={e => updateDraft({ warehouseType: e.target.value })}>
            {WAREHOUSE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Name *</label>
        <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
          value={draft.name} onChange={e => updateDraft({ name: e.target.value })}
          placeholder="e.g. Kigali Main Warehouse" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Total Capacity</label>
          <input type="number" min={0} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.totalCapacity} onChange={e => updateDraft({ totalCapacity: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Capacity Unit</label>
          <select className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.capacityUnit} onChange={e => updateDraft({ capacityUnit: e.target.value })}>
            {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1">Address</label>
        <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
          value={draft.address} onChange={e => updateDraft({ address: e.target.value })} placeholder="Street / area" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Region / City</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.region} onChange={e => updateDraft({ region: e.target.value })} placeholder="Kigali" />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Country</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.country} onChange={e => updateDraft({ country: e.target.value })} placeholder="Rwanda" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Manager Name</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.managerName} onChange={e => updateDraft({ managerName: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Manager Contact</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.managerContact} onChange={e => updateDraft({ managerContact: e.target.value })} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={() => setModalMode(null)}
          className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          {modalMode === 'new' ? 'Create Warehouse' : 'Save Changes'}
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-t3 mb-1">{selected.warehouseCode}</p>
          <h3 className="text-lg font-semibold text-t1">{selected.name}</h3>
          <span className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 mt-1 ${TYPE_STYLES[selected.warehouseType] ?? 'bg-surface text-t3 border-border'}`}>
            {TYPE_LABELS[selected.warehouseType] ?? selected.warehouseType}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded border ${selected.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-surface text-t3 border-border'}`}>
          {selected.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {selected.liveCapacity && (
        <div>
          <p className="text-xs text-t3 mb-2">Capacity Usage</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${usedPct > 80 ? 'bg-rose-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(usedPct, 100)}%` }} />
            </div>
            <span className="text-sm font-medium text-t1 w-12 text-right">{usedPct.toFixed(1)}%</span>
          </div>
          <p className="text-xs text-t3 mt-1">
            {selected.liveCapacity.occupiedCapacity.toLocaleString()} / {selected.totalCapacity.toLocaleString()} {selected.capacityUnit}
          </p>
          {selected.liveCapacity.nearCapacityAlert && (
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <Gauge size={12} /> Near capacity threshold
            </p>
          )}
        </div>
      )}

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

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-sm border border-border rounded hover:bg-surface text-t2">
          <PencilSimple size={14} /> Edit
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Warehouses</h1>
          <p className="text-sm text-t3 mt-0.5">Manage storage locations and capacity</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Warehouse
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 px-6 py-4 shrink-0 sm:grid-cols-4">
        {[
          { label: 'Total Warehouses', value: summary.warehouseCount, Icon: WarehouseIcon, color: 'text-blue-400' },
          { label: 'Stock Items', value: summary.totalItems, Icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Total Value', value: `${(summary.totalValue / 1_000_000).toFixed(1)}M RWF`, Icon: Gauge, color: 'text-accent' },
          { label: 'Low Stock Alerts', value: summary.lowStockItems, Icon: X, color: 'text-rose-400' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
            <Icon size={24} className={color} />
            <div>
              <p className="text-xs text-t3">{label}</p>
              <p className="text-lg font-semibold text-t1">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 pb-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search warehouses..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-t1">
          <option value="">All Types</option>
          {WAREHOUSE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex-1 min-w-0">
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
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="h-full">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {warehouses.map(w => {
                  const pct = w.liveCapacity?.usedPct ?? 0;
                  return (
                    <div key={w._id}
                      className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-accent/40 cursor-pointer transition-colors"
                      onClick={() => openView(w)}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-t3">{w.warehouseCode}</p>
                          <p className="font-medium text-t1 text-sm mt-0.5">{w.name}</p>
                        </div>
                        <span className={`text-xs border rounded px-2 py-0.5 ${TYPE_STYLES[w.warehouseType] ?? 'bg-surface text-t3 border-border'}`}>
                          {TYPE_LABELS[w.warehouseType] ?? w.warehouseType}
                        </span>
                      </div>

                      {w.liveCapacity ? (
                        <div>
                          <div className="flex justify-between text-xs text-t3 mb-1">
                            <span>Capacity</span>
                            <span>{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct > 80 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <p className="text-xs text-t3 mt-1">
                            {w.liveCapacity.occupiedCapacity.toLocaleString()} / {w.totalCapacity.toLocaleString()} {w.capacityUnit}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-t3">
                          Capacity: {w.totalCapacity.toLocaleString()} {w.capacityUnit}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-t3">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {[w.region, w.country].filter(Boolean).join(', ')}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); openEdit(w); }}
                            className="p-1 hover:text-t1 rounded" title="Edit">
                            <PencilSimple size={14} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); openView(w); }}
                            className="p-1 hover:text-t1 rounded" title="View">
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </OverlayScrollbarsComponent>
          )}
        </div>

        {modalMode && (
          <DocumentSidePanel
            isOpen={true}
            onClose={() => setModalMode(null)}
            title={panelTitle}
            previewContent={viewContent}
            formContent={formContent}
          />
        )}
      </div>
    </div>
  );
}
