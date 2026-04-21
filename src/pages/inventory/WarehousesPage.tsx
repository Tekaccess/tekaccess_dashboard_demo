import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Warehouse as WarehouseIcon, MapPin,
  PencilSimple, Eye, CheckCircle, Warning, Spinner, Gauge,
} from '@phosphor-icons/react';
import {
  apiListWarehouses, apiCreateWarehouse, apiUpdateWarehouse, apiGetInventorySummary,
  Warehouse,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';

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

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

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

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(w: Warehouse) {
    setDraft({
      warehouseCode: w.warehouseCode, name: w.name, warehouseType: w.warehouseType,
      address: w.address || '', region: w.region || '', country: w.country,
      capacityUnit: w.capacityUnit, totalCapacity: w.totalCapacity,
      managerName: w.managerName || '', managerContact: w.managerContact || '',
    });
    setSelected(w); setError(null); setModalMode('edit');
  }

  function openView(w: Warehouse) { setSelected(w); setModalMode('view'); }

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
             <span className="text-xl font-bold text-t1">{usedPct.toFixed(1)}%</span>
             <span className="text-xs text-t3">Occupied</span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
             <div className={`h-full rounded-full transition-all ${usedPct > 80 ? 'bg-rose-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
          </div>
          <p className="text-xs text-t3 mt-2">
            {selected.liveCapacity?.occupiedCapacity.toLocaleString()} / {selected.totalCapacity.toLocaleString()} {selected.capacityUnit}
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

      {selected.liveCapacity && (
        <div>
          <p className="text-xs text-t3 mb-2">Capacity Usage</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
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
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit
        </button>
      </div>
    </div>
  ) : null;

  const kpiCards = [
    { label: 'Total Warehouses', value: summary.warehouseCount, Icon: WarehouseIcon, bg: 'bg-blue-500/10', color: 'text-blue-400' },
    { label: 'Stock Items', value: summary.totalItems, Icon: CheckCircle, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
    { label: 'Total Value', value: `${(summary.totalValue / 1_000_000).toFixed(1)}M`, Icon: Gauge, bg: 'bg-accent-glow', color: 'text-accent' },
    { label: 'Low Stock Alerts', value: summary.lowStockItems, Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-400' },
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
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
              placeholder="Search warehouses..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
            <option value="">All Types</option>
            {WAREHOUSE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
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
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/30">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Usage</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">Manager</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {warehouses.map(w => {
                    const pct = w.liveCapacity?.usedPct ?? 0;
                    return (
                      <tr key={w._id} className="hover:bg-surface/50 cursor-pointer transition-colors" onClick={() => openView(w)}>
                        <td className="px-4 py-3.5 font-mono text-xs text-accent">{w.warehouseCode}</td>
                        <td className="px-4 py-3.5 font-medium text-t1">{w.name}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2 py-0.5 uppercase tracking-wider ${TYPE_STYLES[w.warehouseType] ?? 'bg-surface text-t3 border-border'}`}>
                            {TYPE_LABELS[w.warehouseType] ?? w.warehouseType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                             <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                               <div className={`h-full rounded-full ${pct > 80 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                             </div>
                             <span className="text-[11px] font-bold text-t2">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-t2 text-xs">
                          {w.managerName || '—'}
                          {w.managerContact && <p className="text-t3">{w.managerContact}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex justify-end gap-2 text-t3">
                            <button onClick={e => { e.stopPropagation(); openEdit(w); }} className="hover:text-t1 p-1"><PencilSimple size={14} /></button>
                            <button onClick={e => { e.stopPropagation(); openView(w); }} className="hover:text-t1 p-1"><Eye size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
