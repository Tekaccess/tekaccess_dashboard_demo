import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, DownloadSimple, Funnel, ListDashes, ChartBar,
  Eye, PencilSimple, Spinner, Truck, CheckCircle, Warning, X, CaretDown, Trash,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { apiListTrucks, apiCreateTruck, apiUpdateTruck, apiDeleteTruck, Truck as TruckType } from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';

type ViewMode = 'table' | 'bar' | 'pie';
type ActiveTab = 'All' | 'Operating' | 'Idle' | 'In Maintenance';

const STATUS_STYLES: Record<string, string> = {
  operating: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  idle: 'bg-surface text-t3 border-border',
  maintenance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  decommissioned: 'bg-red-500/10 text-red-500 border-red-500/20',
};
const STATUS_DOT: Record<string, string> = {
  operating: 'bg-emerald-500',
  idle: 'bg-t3',
  maintenance: 'bg-amber-500',
  decommissioned: 'bg-red-500',
};
const STATUS_LABEL: Record<string, string> = {
  operating: 'Operating',
  idle: 'Idle',
  maintenance: 'In Maintenance',
  decommissioned: 'Decommissioned',
};

const CHART_COLORS = ['#4285f4', '#93bbfa', '#bfd0fc', '#d5e4ff', '#e8f0ff'];

const FLEET_TYPES = ['tipper', 'sideboarded', 'flatbed'];

interface DraftTruck {
  plateNumber: string;
  make: string;
  model: string;
  year: string;
  fleetType: string;
  status: TruckType['status'];
  assignedDriverName: string;
  currentOdometer: string;
  lastServiceDate: string;
  nextServiceDueKm: string;
  insuranceExpiry: string;
  notes: string;
}

function emptyDraft(): DraftTruck {
  return {
    plateNumber: '', make: '', model: '', year: '', fleetType: 'tipper',
    status: 'idle', assignedDriverName: '', currentOdometer: '',
    lastServiceDate: '', nextServiceDueKm: '', insuranceExpiry: '', notes: '',
  };
}

type ModalState =
  | { mode: 'new'; draft: DraftTruck }
  | { mode: 'view' | 'edit'; truck: TruckType; draft?: DraftTruck }
  | null;

const FLEET_COLS: ColDef[] = [
  { key: 'plate',    label: 'Plate',       defaultVisible: true },
  { key: 'makeModel', label: 'Make / Model', defaultVisible: true },
  { key: 'year',     label: 'Year',        defaultVisible: true },
  { key: 'fleetType', label: 'Fleet Type', defaultVisible: true },
  { key: 'status',   label: 'Status',      defaultVisible: true },
  { key: 'driver',   label: 'Driver',      defaultVisible: true },
  { key: 'odometer', label: 'Odometer',    defaultVisible: true },
  { key: 'actions',  label: 'Actions',     defaultVisible: true },
];

export default function FleetPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<TruckType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('fleet', FLEET_COLS);

  const loadTrucks = useCallback(async () => {
    setLoading(true);
    const res = await apiListTrucks();
    if (res.success) setTrucks(res.data.trucks);
    setLoading(false);
  }, []);

  useEffect(() => { loadTrucks(); }, [loadTrucks]);

  const TAB_MAP: Record<ActiveTab, TruckType['status'][] | null> = {
    All: null,
    Operating: ['operating'],
    Idle: ['idle'],
    'In Maintenance': ['maintenance'],
  };

  const filteredTrucks = useMemo(() => {
    const filter = TAB_MAP[activeTab];
    return trucks.filter(t => {
      const matchesTab = filter ? filter.includes(t.status) : true;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        t.plateNumber.toLowerCase().includes(q) ||
        `${t.make} ${t.model}`.toLowerCase().includes(q) ||
        (t.assignedDriverName || '').toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [trucks, activeTab, search]);

  const stats = useMemo(() => ({
    total: trucks.length,
    operating: trucks.filter(t => t.status === 'operating').length,
    idle: trucks.filter(t => t.status === 'idle').length,
    maintenance: trucks.filter(t => t.status === 'maintenance').length,
  }), [trucks]);

  const chartData = useMemo(() => [
    { label: 'Operating', value: stats.operating },
    { label: 'Idle', value: stats.idle },
    { label: 'Maintenance', value: stats.maintenance },
  ], [stats]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    trucks.forEach(t => { map[t.fleetType] = (map[t.fleetType] || 0) + 1; });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [trucks]);

  const draft = useMemo<DraftTruck | null>(() => {
    if (!modal) return null;
    if (modal.mode === 'new') return modal.draft;
    if (modal.mode === 'edit') return modal.draft || null;
    return null;
  }, [modal]);

  function updateDraft(updates: Partial<DraftTruck>) {
    setModal(prev => {
      if (!prev) return prev;
      if (prev.mode === 'new') return { ...prev, draft: { ...prev.draft, ...updates } };
      if (prev.mode === 'edit') return { ...prev, draft: { ...(prev.draft || emptyDraft()), ...updates } };
      return prev;
    });
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await apiDeleteTruck(confirmDelete._id);
    setDeleting(false);
    setConfirmDelete(null);
    loadTrucks();
  }

  function handleNew() { setSaveError(null); setModal({ mode: 'new', draft: emptyDraft() }); }

  function handleEdit(truck: TruckType) {
    setSaveError(null);
    setModal({
      mode: 'edit', truck, draft: {
        plateNumber: truck.plateNumber, make: truck.make, model: truck.model,
        year: truck.year?.toString() || '', fleetType: truck.fleetType,
        status: truck.status, assignedDriverName: truck.assignedDriverName || '',
        currentOdometer: truck.currentOdometer?.toString() || '',
        lastServiceDate: truck.lastServiceDate ? truck.lastServiceDate.split('T')[0] : '',
        nextServiceDueKm: truck.nextServiceDueKm?.toString() || '',
        insuranceExpiry: truck.insuranceExpiry ? truck.insuranceExpiry.split('T')[0] : '',
        notes: truck.notes || '',
      },
    });
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.plateNumber.trim()) { setSaveError('Plate number is required.'); return; }
    if (!draft.make.trim()) { setSaveError('Make is required.'); return; }

    setSaving(true); setSaveError(null);
    const payload = {
      plateNumber: draft.plateNumber.trim().toUpperCase(),
      make: draft.make.trim(),
      model: draft.model.trim(),
      year: draft.year ? parseInt(draft.year) : null,
      fleetType: draft.fleetType,
      status: draft.status,
      assignedDriverName: draft.assignedDriverName.trim() || null,
      currentOdometer: draft.currentOdometer ? parseFloat(draft.currentOdometer) : null,
      lastServiceDate: draft.lastServiceDate || null,
      nextServiceDueKm: draft.nextServiceDueKm ? parseFloat(draft.nextServiceDueKm) : null,
      insuranceExpiry: draft.insuranceExpiry || null,
      notes: draft.notes.trim() || null,
    };

    const res = modal?.mode === 'edit' && (modal as any).truck
      ? await apiUpdateTruck((modal as any).truck._id, payload)
      : await apiCreateTruck(payload);

    setSaving(false);
    if (!res.success) { setSaveError((res as any).message || 'Failed to save.'); return; }
    await loadTrucks();
    setModal(null);
  }

  const chartTooltipStyle = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '8px' };

  const inputClass = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-[10px] text-t3 mb-1';

  const formContent = draft && (
    <div className="space-y-5 pb-10">
      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Truck Information</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Plate Number *</label>
            <input className={inputClass} value={draft.plateNumber} onChange={e => updateDraft({ plateNumber: e.target.value })} placeholder="e.g. RAB 123A" />
          </div>
          <div>
            <label className={labelClass}>Fleet Type</label>
            <select className={inputClass} value={draft.fleetType} onChange={e => updateDraft({ fleetType: e.target.value })}>
              {FLEET_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Make *</label>
            <input className={inputClass} value={draft.make} onChange={e => updateDraft({ make: e.target.value })} placeholder="e.g. Volvo" />
          </div>
          <div>
            <label className={labelClass}>Model</label>
            <input className={inputClass} value={draft.model} onChange={e => updateDraft({ model: e.target.value })} placeholder="e.g. FH16" />
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input className={inputClass} type="number" value={draft.year} onChange={e => updateDraft({ year: e.target.value })} placeholder="2020" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Status & Assignment</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={draft.status} onChange={e => updateDraft({ status: e.target.value as TruckType['status'] })}>
              <option value="operating">Operating</option>
              <option value="idle">Idle</option>
              <option value="maintenance">In Maintenance</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Assigned Driver</label>
            <input className={inputClass} value={draft.assignedDriverName} onChange={e => updateDraft({ assignedDriverName: e.target.value })} placeholder="Driver name" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Current Odometer (km)</label>
          <input className={inputClass} type="number" value={draft.currentOdometer} onChange={e => updateDraft({ currentOdometer: e.target.value })} placeholder="e.g. 120000" />
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Compliance</p>
        <div>
          <label className={labelClass}>Insurance Expiry</label>
          <input className={inputClass} type="date" value={draft.insuranceExpiry} onChange={e => updateDraft({ insuranceExpiry: e.target.value })} />
        </div>
      </section>

      <section>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Notes</p>
        <textarea rows={3} className={`${inputClass} resize-none`} value={draft.notes} onChange={e => updateDraft({ notes: e.target.value })} placeholder="Additional notes..." />
      </section>

      {saveError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{saveError}</div>}

      <button
        onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving && <Spinner size={15} className="animate-spin" />}
        {saving ? 'Saving...' : modal?.mode === 'edit' ? 'Update Truck' : 'Add Truck'}
      </button>
    </div>
  );

  const viewTruck = modal && modal.mode === 'view' ? (modal as any).truck as TruckType : null;
  const viewContent = viewTruck && (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Truck Details</p>
        {[
          ['Plate Number', viewTruck.plateNumber],
          ['Make / Model', `${viewTruck.make} ${viewTruck.model}`.trim() || '—'],
          ['Year', viewTruck.year?.toString() || '—'],
          ['Fleet Type', viewTruck.fleetType],
          ['Status', STATUS_LABEL[viewTruck.status] || viewTruck.status],
          ['Assigned Driver', viewTruck.assignedDriverName || '—'],
          ['Odometer', viewTruck.currentOdometer ? `${viewTruck.currentOdometer.toLocaleString()} km` : '—'],
          ['Last Service', viewTruck.lastServiceDate ? new Date(viewTruck.lastServiceDate).toLocaleDateString() : '—'],
          ['Next Service Due', viewTruck.nextServiceDueKm ? `${viewTruck.nextServiceDueKm.toLocaleString()} km` : '—'],
          ['Insurance Expiry', viewTruck.insuranceExpiry ? new Date(viewTruck.insuranceExpiry).toLocaleDateString() : '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-t3">{label}</span>
            <span className="font-medium text-t1 text-right max-w-[60%] truncate">{val}</span>
          </div>
        ))}
      </section>
      {viewTruck.notes && (
        <div className="p-3 bg-surface rounded-xl border border-border text-sm text-t2">
          <p className="text-[10px] font-black text-t3 uppercase mb-1">Notes</p>
          {viewTruck.notes}
        </div>
      )}
      <button onClick={() => handleEdit(viewTruck)} className="w-full py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">
        Edit Truck
      </button>
    </div>
  );

  const modalSummary = draft ? (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Asset Identity</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Plate</span>
            <span className="font-mono font-bold text-accent">{draft.plateNumber || '—'}</span>
          </div>
          <div className="flex justify-between text-sm text-[10px]">
             <span className="text-t3 uppercase">Fleet Class</span>
             <span className="text-t1 font-bold uppercase tracking-tight">{draft.fleetType}</span>
          </div>
        </div>
      </div>

       <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Maintenance State</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-2 text-center">
           <p className="text-2xl font-black text-t1">{draft.currentOdometer || '0'}<span className="text-xs text-t3 ml-1 font-normal uppercase">KM</span></p>
           <p className="text-[10px] text-t3 uppercase font-bold tracking-tighter">Current Reading</p>
        </div>
      </div>
    </div>
  ) : null;

  const viewModalSummary = viewTruck ? (
    <div className="space-y-6">
       <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-1">Operational status</p>
           <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${STATUS_STYLES[viewTruck.status]}`}>
            {STATUS_LABEL[viewTruck.status]}
          </span>
        </div>
        
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-2">Service Lifecycle</p>
          <div className="space-y-2">
             <div className="flex justify-between items-center text-xs">
                <span className="text-t3 uppercase tracking-tighter">Odometer</span>
                <span className="text-t1 font-bold">{viewTruck.currentOdometer?.toLocaleString()} km</span>
             </div>
             <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-accent w-2/3 rounded-full shadow-[0_0_8px_rgba(66,133,244,0.5)]" />
             </div>
             <div className="flex justify-between items-center text-[10px] text-t3">
                <span>Last Service</span>
                <span>Next Service</span>
             </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <button onClick={() => handleEdit(viewTruck)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Edit Fleet Details
        </button>
      </div>
    </div>
  ) : null;

  const previewContent = (() => {
    const truck = viewTruck || (draft ? { plateNumber: draft.plateNumber || '—', make: draft.make, model: draft.model, year: draft.year, fleetType: draft.fleetType, status: draft.status, assignedDriverName: draft.assignedDriverName, currentOdometer: draft.currentOdometer, lastServiceDate: draft.lastServiceDate, insuranceExpiry: draft.insuranceExpiry, notes: draft.notes } : null);
    if (!truck) return null;
    return (
      <div className="font-sans text-[#1a1a1a] w-full">
        <div className="flex justify-between items-start mb-6">
          <div className="w-40"><img src="/logo.jpg" alt="TEKACCESS" className="w-full h-auto mb-1" /></div>
          <div className="text-right text-[11px] leading-tight text-gray-600">
            <p className="font-bold text-gray-800 uppercase tracking-wider">TEKACCESS</p>
            <p>13 KG 599 St, Gishushu</p><p>Kigali, Rwanda</p>
          </div>
        </div>
        <p className="text-[11px] font-bold text-[#4285f4] mb-8 italic">Built on trust. Delivered with Excellence</p>
        <h1 className="text-2xl font-medium text-[#4285f4] mb-6">Fleet Record — <span className="font-bold text-gray-800">{(truck as any).plateNumber}</span></h1>
        <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6 mb-6 text-sm">
          {[
            ['Make / Model', `${(truck as any).make} ${(truck as any).model}`.trim() || '—'],
            ['Fleet Type', (truck as any).fleetType],
            ['Year', (truck as any).year || '—'],
            ['Status', STATUS_LABEL[(truck as any).status] || (truck as any).status],
            ['Assigned Driver', (truck as any).assignedDriverName || '—'],
            ['Odometer', (truck as any).currentOdometer ? `${Number((truck as any).currentOdometer).toLocaleString()} km` : '—'],
            ['Last Service', (truck as any).lastServiceDate ? new Date((truck as any).lastServiceDate).toLocaleDateString() : '—'],
            ['Insurance Expiry', (truck as any).insuranceExpiry ? new Date((truck as any).insuranceExpiry).toLocaleDateString() : '—'],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{label}</p>
              <p className="font-semibold text-gray-800">{val}</p>
            </div>
          ))}
        </div>
        {(truck as any).notes && (
          <div className="mb-6"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Notes</p><p className="text-[11px] text-gray-600">{(truck as any).notes}</p></div>
        )}
        <div className="text-[10px] text-gray-400 space-y-1 border-t border-gray-100 pt-6">
          <p className="font-black uppercase mb-1">Fleet Policy</p>
          <p>• All vehicles must have valid insurance and roadworthiness certification.</p>
          <p>• Scheduled maintenance must be performed as specified.</p>
          <p>• Any incident or breakdown must be reported immediately to the transport manager.</p>
        </div>
      </div>
    );
  })();

  const tabs: ActiveTab[] = ['All', 'Operating', 'Idle', 'In Maintenance'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Fleet</h1>
          <p className="text-sm text-t3 mt-0.5">Manage all trucks and vehicles in the fleet</p>
        </div>
        <button onClick={handleNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> Add Truck
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trucks', value: stats.total, Icon: Truck, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'Operating', value: stats.operating, Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Idle', value: stats.idle, Icon: Truck, color: 'text-t3', bg: 'bg-surface' },
          { label: 'In Maintenance', value: stats.maintenance, Icon: Warning, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${card.bg}`}><card.Icon size={18} weight="duotone" className={card.color} /></div>
            <div>
              <p className="text-xs text-t3 font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border px-4">
          <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-3.5 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-t3 hover:text-t2 hover:border-border'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search by plate, make, driver..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors" />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
            <DownloadSimple size={14} weight="duotone" /> Export
          </button>
          <ColumnSelector cols={FLEET_COLS} visible={colVis} onToggle={colToggle} />
          <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
            {([
              { mode: 'table', Icon: ListDashes, label: 'Table' },
              { mode: 'bar', Icon: ChartBar, label: 'Status' },
              { mode: 'pie', Icon: ChartBar, label: 'By Type' },
            ] as { mode: ViewMode; Icon: any; label: string }[]).map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)} title={v.label}
                className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === v.mode ? 'bg-accent text-white' : 'bg-card text-t3 hover:bg-surface hover:text-t2'}`}>
                <v.Icon size={15} weight={viewMode === v.mode ? 'fill' : 'regular'} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'table' && (
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface">
                <tr>
                  {colVis.has('plate') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Plate</th>}
                  {colVis.has('makeModel') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Make / Model</th>}
                  {colVis.has('year') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Year</th>}
                  {colVis.has('fleetType') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Fleet Type</th>}
                  {colVis.has('status') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>}
                  {colVis.has('driver') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Driver</th>}
                  {colVis.has('odometer') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Odometer</th>}
                  {colVis.has('actions') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border-s">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
                ) : filteredTrucks.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-t3 text-sm">
                    {trucks.length === 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <Truck size={40} weight="duotone" className="text-t3/40" />
                        <p>No trucks added yet.</p>
                        <button onClick={handleNew} className="text-accent font-semibold hover:underline text-sm">Add your first truck</button>
                      </div>
                    ) : 'No trucks match your criteria'}
                  </td></tr>
                ) : filteredTrucks.map(truck => (
                  <tr key={truck._id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setModal({ mode: 'view', truck })}>
                    {colVis.has('plate') && <td className="px-4 py-3.5 text-sm font-semibold text-accent whitespace-nowrap">{truck.plateNumber}</td>}
                    {colVis.has('makeModel') && <td className="px-4 py-3.5 text-sm font-medium text-t1">{`${truck.make} ${truck.model}`.trim() || '—'}</td>}
                    {colVis.has('year') && <td className="px-4 py-3.5 text-sm text-t2">{truck.year || '—'}</td>}
                    {colVis.has('fleetType') && <td className="px-4 py-3.5 text-sm text-t2 capitalize">{truck.fleetType}</td>}
                    {colVis.has('status') && (
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[truck.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[truck.status]}`} />
                          {STATUS_LABEL[truck.status]}
                        </span>
                      </td>
                    )}
                    {colVis.has('driver') && <td className="px-4 py-3.5 text-sm text-t2">{truck.assignedDriverName || '—'}</td>}
                    {colVis.has('odometer') && <td className="px-4 py-3.5 text-sm text-t2">{truck.currentOdometer ? `${truck.currentOdometer.toLocaleString()} km` : '—'}</td>}
                    {colVis.has('actions') && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => { e.stopPropagation(); setModal({ mode: 'view', truck }); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors" title="View"><Eye size={14} weight="duotone" /></button>
                          <button onClick={e => { e.stopPropagation(); handleEdit(truck); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors" title="Edit"><PencilSimple size={14} weight="duotone" /></button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete(truck); }} className="p-1.5 text-t3 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="Delete"><Trash size={14} weight="duotone" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTrucks.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-t3">
                <span>Showing {filteredTrucks.length} of {trucks.length} trucks</span>
              </div>
            )}
          </OverlayScrollbarsComponent>
        )}

        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-4">Fleet Status Distribution</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="value" name="Trucks" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'pie' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-sm font-semibold text-t2 mb-4">Fleet by Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={false} labelLine={false}>
                    {byType.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {byType.map((item, idx) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx] }} />
                  <span className="text-sm text-t2 flex-1 capitalize">{item.label}</span>
                  <span className="text-sm font-semibold text-t1">{item.value} trucks</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-xs mx-4 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash size={20} weight="duotone" className="text-rose-500" />
            </div>
            <h2 className="text-base font-bold text-t1 mb-1">Delete Truck?</h2>
            <p className="text-xs text-t3 mb-5">
              <span className="font-semibold text-t2">{confirmDelete.plateNumber}</span> will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button disabled={deleting} onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button disabled={deleting} onClick={handleDelete}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deleting ? <><Spinner size={14} className="animate-spin" /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModernModal
        isOpen={!!modal}
        onClose={() => { setModal(null); setSaveError(null); }}
        title={modal?.mode === 'new' ? 'Register New Truck' : modal?.mode === 'edit' ? `Update Asset — ${(modal as any).truck?.plateNumber}` : `Vehicle Specs — ${(modal as any)?.truck?.plateNumber}`}
        summaryContent={modal?.mode === 'view' ? viewModalSummary : modalSummary}
        actions={modal?.mode !== 'view' ? (
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />}
            {modal?.mode === 'new' ? 'Add Truck' : 'Update Truck'}
          </button>
        ) : undefined}
      >
        {modal?.mode === 'view' ? viewContent : formContent}
      </ModernModal>
    </div>
  );
}
