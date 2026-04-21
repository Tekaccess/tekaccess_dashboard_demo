import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, DownloadSimple, ListDashes, ChartBar,
  Eye, PencilSimple, Spinner, MapPin, CheckCircle, Warning, X,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import DocumentSidePanel from '../../components/DocumentSidePanel';
import { apiListTrips, apiCreateTrip, apiUpdateTrip, Trip } from '../../lib/api';

type ViewMode = 'table' | 'bar';
type ActiveTab = 'All' | 'Active Trips' | 'Trip History' | 'Schedule';

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  completed: 'bg-surface text-t3 border-border',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};
const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-blue-400',
  in_progress: 'bg-emerald-500',
  completed: 'bg-t3',
  cancelled: 'bg-red-500',
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const CHART_COLORS = ['#4285f4', '#93bbfa', '#bfd0fc', '#d5e4ff'];

interface DraftTrip {
  plateNumber: string;
  driverName: string;
  contractRef: string;
  clientName: string;
  originSite: string;
  destinationSite: string;
  loadDescription: string;
  plannedTons: string;
  actualTons: string;
  status: Trip['status'];
  departureDate: string;
  arrivalDate: string;
  distanceKm: string;
  fuelUsedLitres: string;
  notes: string;
}

function emptyDraft(): DraftTrip {
  return {
    plateNumber: '', driverName: '', contractRef: '', clientName: '',
    originSite: '', destinationSite: '', loadDescription: '',
    plannedTons: '', actualTons: '', status: 'scheduled',
    departureDate: '', arrivalDate: '', distanceKm: '', fuelUsedLitres: '', notes: '',
  };
}

type ModalState =
  | { mode: 'new'; draft: DraftTrip }
  | { mode: 'view' | 'edit'; trip: Trip; draft?: DraftTrip }
  | null;

const TAB_STATUS: Record<ActiveTab, Trip['status'][] | null> = {
  All: null,
  'Active Trips': ['in_progress'],
  'Trip History': ['completed', 'cancelled'],
  Schedule: ['scheduled'],
};

export default function TripsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    const res = await apiListTrips();
    if (res.success) setTrips(res.data.trips);
    setLoading(false);
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const filteredTrips = useMemo(() => {
    const filter = TAB_STATUS[activeTab];
    return trips.filter(t => {
      const matchesTab = filter ? filter.includes(t.status) : true;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        t.tripRef.toLowerCase().includes(q) ||
        t.plateNumber.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        `${t.originSite} ${t.destinationSite}`.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [trips, activeTab, search]);

  const stats = useMemo(() => ({
    total: trips.length,
    active: trips.filter(t => t.status === 'in_progress').length,
    scheduled: trips.filter(t => t.status === 'scheduled').length,
    completed: trips.filter(t => t.status === 'completed').length,
    totalTons: trips.reduce((s, t) => s + (t.actualTons || t.plannedTons || 0), 0),
  }), [trips]);

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    trips.forEach(t => {
      if (!t.departureDate) return;
      const m = new Date(t.departureDate).toLocaleString('default', { month: 'short', year: '2-digit' });
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).slice(-8).map(([month, count]) => ({ month, count }));
  }, [trips]);

  const draft = useMemo<DraftTrip | null>(() => {
    if (!modal) return null;
    if (modal.mode === 'new') return modal.draft;
    if (modal.mode === 'edit') return modal.draft || null;
    return null;
  }, [modal]);

  function updateDraft(updates: Partial<DraftTrip>) {
    setModal(prev => {
      if (!prev) return prev;
      if (prev.mode === 'new') return { ...prev, draft: { ...prev.draft, ...updates } };
      if (prev.mode === 'edit') return { ...prev, draft: { ...(prev.draft || emptyDraft()), ...updates } };
      return prev;
    });
  }

  function handleNew() { setSaveError(null); setModal({ mode: 'new', draft: emptyDraft() }); }

  function handleEdit(trip: Trip) {
    setSaveError(null);
    setModal({
      mode: 'edit', trip, draft: {
        plateNumber: trip.plateNumber,
        driverName: trip.driverName,
        contractRef: trip.contractRef || '',
        clientName: trip.clientName || '',
        originSite: trip.originSite,
        destinationSite: trip.destinationSite,
        loadDescription: trip.loadDescription || '',
        plannedTons: trip.plannedTons?.toString() || '',
        actualTons: trip.actualTons?.toString() || '',
        status: trip.status,
        departureDate: trip.departureDate ? trip.departureDate.split('T')[0] : '',
        arrivalDate: trip.arrivalDate ? trip.arrivalDate.split('T')[0] : '',
        distanceKm: trip.distanceKm?.toString() || '',
        fuelUsedLitres: trip.fuelUsedLitres?.toString() || '',
        notes: trip.notes || '',
      },
    });
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.plateNumber.trim()) { setSaveError('Plate number is required.'); return; }
    if (!draft.originSite.trim() || !draft.destinationSite.trim()) { setSaveError('Origin and destination are required.'); return; }

    setSaving(true); setSaveError(null);
    const payload = {
      plateNumber: draft.plateNumber.trim().toUpperCase(),
      driverName: draft.driverName.trim(),
      contractRef: draft.contractRef.trim() || null,
      clientName: draft.clientName.trim() || null,
      originSite: draft.originSite.trim(),
      destinationSite: draft.destinationSite.trim(),
      loadDescription: draft.loadDescription.trim() || null,
      plannedTons: draft.plannedTons ? parseFloat(draft.plannedTons) : null,
      actualTons: draft.actualTons ? parseFloat(draft.actualTons) : null,
      status: draft.status,
      departureDate: draft.departureDate || null,
      arrivalDate: draft.arrivalDate || null,
      distanceKm: draft.distanceKm ? parseFloat(draft.distanceKm) : null,
      fuelUsedLitres: draft.fuelUsedLitres ? parseFloat(draft.fuelUsedLitres) : null,
      notes: draft.notes.trim() || null,
    };

    const res = modal?.mode === 'edit' && (modal as any).trip
      ? await apiUpdateTrip((modal as any).trip._id, payload)
      : await apiCreateTrip(payload);

    setSaving(false);
    if (!res.success) { setSaveError((res as any).message || 'Failed to save.'); return; }
    await loadTrips();
    setModal(null);
  }

  const chartTooltipStyle = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '8px' };
  const inputClass = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-[10px] text-t3 mb-1';

  const formContent = draft && (
    <div className="space-y-5 pb-10">
      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Vehicle & Driver</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Plate Number *</label><input className={inputClass} value={draft.plateNumber} onChange={e => updateDraft({ plateNumber: e.target.value })} placeholder="e.g. RAB 123A" /></div>
          <div><label className={labelClass}>Driver Name</label><input className={inputClass} value={draft.driverName} onChange={e => updateDraft({ driverName: e.target.value })} placeholder="Driver name" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Contract Ref</label><input className={inputClass} value={draft.contractRef} onChange={e => updateDraft({ contractRef: e.target.value })} placeholder="e.g. CTR-001" /></div>
          <div><label className={labelClass}>Client</label><input className={inputClass} value={draft.clientName} onChange={e => updateDraft({ clientName: e.target.value })} placeholder="Client name" /></div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Route</p>
        <div><label className={labelClass}>Origin Site *</label><input className={inputClass} value={draft.originSite} onChange={e => updateDraft({ originSite: e.target.value })} placeholder="Loading site" /></div>
        <div><label className={labelClass}>Destination Site *</label><input className={inputClass} value={draft.destinationSite} onChange={e => updateDraft({ destinationSite: e.target.value })} placeholder="Offloading site" /></div>
        <div><label className={labelClass}>Load Description</label><input className={inputClass} value={draft.loadDescription} onChange={e => updateDraft({ loadDescription: e.target.value })} placeholder="e.g. Clinker" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Planned Tons</label><input className={inputClass} type="number" step="any" value={draft.plannedTons} onChange={e => updateDraft({ plannedTons: e.target.value })} placeholder="0.00" /></div>
          <div><label className={labelClass}>Actual Tons</label><input className={inputClass} type="number" step="any" value={draft.actualTons} onChange={e => updateDraft({ actualTons: e.target.value })} placeholder="0.00" /></div>
        </div>
        <div><label className={labelClass}>Distance (km)</label><input className={inputClass} type="number" step="any" value={draft.distanceKm} onChange={e => updateDraft({ distanceKm: e.target.value })} placeholder="e.g. 250" /></div>
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Timing & Status</p>
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={draft.status} onChange={e => updateDraft({ status: e.target.value as Trip['status'] })}>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Departure Date</label><input className={inputClass} type="date" value={draft.departureDate} onChange={e => updateDraft({ departureDate: e.target.value })} /></div>
          <div><label className={labelClass}>Arrival Date</label><input className={inputClass} type="date" value={draft.arrivalDate} onChange={e => updateDraft({ arrivalDate: e.target.value })} /></div>
        </div>
        <div><label className={labelClass}>Fuel Used (L)</label><input className={inputClass} type="number" step="any" value={draft.fuelUsedLitres} onChange={e => updateDraft({ fuelUsedLitres: e.target.value })} placeholder="Litres consumed" /></div>
      </section>

      <section>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Notes</p>
        <textarea rows={3} className={`${inputClass} resize-none`} value={draft.notes} onChange={e => updateDraft({ notes: e.target.value })} placeholder="Additional notes..." />
      </section>

      {saveError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{saveError}</div>}

      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner size={15} className="animate-spin" />}
        {saving ? 'Saving...' : modal?.mode === 'edit' ? 'Update Trip' : 'Log Trip'}
      </button>
    </div>
  );

  const viewTrip = modal && modal.mode === 'view' ? (modal as any).trip as Trip : null;
  const viewContent = viewTrip && (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Trip Details</p>
        {[
          ['Trip Ref', viewTrip.tripRef],
          ['Truck', viewTrip.plateNumber],
          ['Driver', viewTrip.driverName],
          ['Route', `${viewTrip.originSite} → ${viewTrip.destinationSite}`],
          ['Client', viewTrip.clientName || '—'],
          ['Contract', viewTrip.contractRef || '—'],
          ['Load', viewTrip.loadDescription || '—'],
          ['Planned Tons', viewTrip.plannedTons ? `${viewTrip.plannedTons} t` : '—'],
          ['Actual Tons', viewTrip.actualTons ? `${viewTrip.actualTons} t` : '—'],
          ['Distance', viewTrip.distanceKm ? `${viewTrip.distanceKm} km` : '—'],
          ['Fuel Used', viewTrip.fuelUsedLitres ? `${viewTrip.fuelUsedLitres} L` : '—'],
          ['Status', STATUS_LABEL[viewTrip.status]],
          ['Departure', viewTrip.departureDate ? new Date(viewTrip.departureDate).toLocaleDateString() : '—'],
          ['Arrival', viewTrip.arrivalDate ? new Date(viewTrip.arrivalDate).toLocaleDateString() : '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-t3">{label}</span>
            <span className="font-medium text-t1 text-right max-w-[60%] truncate">{val}</span>
          </div>
        ))}
      </section>
      {viewTrip.notes && (
        <div className="p-3 bg-surface rounded-xl border border-border text-sm text-t2">
          <p className="text-[10px] font-black text-t3 uppercase mb-1">Notes</p>{viewTrip.notes}
        </div>
      )}
      <button onClick={() => handleEdit(viewTrip)} className="w-full py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">Edit Trip</button>
    </div>
  );

  const previewTrip = viewTrip || (draft ? {
    tripRef: '— DRAFT —', plateNumber: draft.plateNumber || 'N/A', driverName: draft.driverName,
    originSite: draft.originSite, destinationSite: draft.destinationSite, clientName: draft.clientName,
    contractRef: draft.contractRef, loadDescription: draft.loadDescription,
    plannedTons: draft.plannedTons, actualTons: draft.actualTons, distanceKm: draft.distanceKm,
    status: draft.status, departureDate: draft.departureDate, arrivalDate: draft.arrivalDate, notes: draft.notes,
  } : null);

  const previewContent = previewTrip && (
    <div className="font-sans text-[#1a1a1a] w-full">
      <div className="flex justify-between items-start mb-6">
        <div className="w-40"><img src="/logo.jpg" alt="TEKACCESS" className="w-full h-auto" /></div>
        <div className="text-right text-[11px] leading-tight text-gray-600">
          <p className="font-bold text-gray-800 uppercase tracking-wider">TEKACCESS</p>
          <p>13 KG 599 St, Gishushu</p><p>Kigali, Rwanda</p>
        </div>
      </div>
      <p className="text-[11px] font-bold text-[#4285f4] mb-8 italic">Built on trust. Delivered with Excellence</p>
      <h1 className="text-2xl font-medium text-[#4285f4] mb-6">Trip Record <span className="font-bold text-gray-800">#{(previewTrip as any).tripRef}</span></h1>
      <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6 mb-6 text-sm">
        {[
          ['Truck', (previewTrip as any).plateNumber],
          ['Driver', (previewTrip as any).driverName || '—'],
          ['Client', (previewTrip as any).clientName || '—'],
          ['Contract', (previewTrip as any).contractRef || '—'],
          ['Origin', (previewTrip as any).originSite || '—'],
          ['Destination', (previewTrip as any).destinationSite || '—'],
          ['Load', (previewTrip as any).loadDescription || '—'],
          ['Planned Tons', (previewTrip as any).plannedTons ? `${(previewTrip as any).plannedTons} t` : '—'],
          ['Actual Tons', (previewTrip as any).actualTons ? `${(previewTrip as any).actualTons} t` : '—'],
          ['Status', STATUS_LABEL[(previewTrip as any).status] || '—'],
          ['Departure', (previewTrip as any).departureDate ? new Date((previewTrip as any).departureDate).toLocaleDateString() : '—'],
          ['Arrival', (previewTrip as any).arrivalDate ? new Date((previewTrip as any).arrivalDate).toLocaleDateString() : '—'],
        ].map(([label, val]) => (
          <div key={label}><p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{label}</p><p className="font-semibold text-gray-800">{val}</p></div>
        ))}
      </div>
      {(previewTrip as any).notes && <div className="mb-6"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Notes</p><p className="text-[11px] text-gray-600">{(previewTrip as any).notes}</p></div>}
      <div className="text-[10px] text-gray-400 space-y-1 border-t border-gray-100 pt-6">
        <p className="font-black uppercase mb-1">Trip Policy</p>
        <p>• Driver must confirm departure and arrival with the transport manager.</p>
        <p>• Any deviation from planned route must be reported immediately.</p>
      </div>
    </div>
  );

  const tabs: ActiveTab[] = ['All', 'Active Trips', 'Schedule', 'Trip History'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Trips</h1>
          <p className="text-sm text-t3 mt-0.5">Track active trips, history and scheduled routes</p>
        </div>
        <button onClick={handleNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> Log Trip
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trips', value: stats.total, Icon: MapPin, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'In Progress', value: stats.active, Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Scheduled', value: stats.scheduled, Icon: Warning, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Completed', value: stats.completed, Icon: CheckCircle, color: 'text-t3', bg: 'bg-surface' },
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
        <div className="flex items-center border-b border-border px-4">
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
            <input type="text" placeholder="Search trips..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors" />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
            <DownloadSimple size={14} weight="duotone" /> Export
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
            {([{ mode: 'table', Icon: ListDashes, label: 'Table' }, { mode: 'bar', Icon: ChartBar, label: 'Chart' }] as { mode: ViewMode; Icon: any; label: string }[]).map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)}
                className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === v.mode ? 'bg-accent text-white' : 'bg-card text-t3 hover:bg-surface hover:text-t2'}`}>
                <v.Icon size={15} weight={viewMode === v.mode ? 'fill' : 'regular'} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'table' && (
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} defer>
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface">
                <tr>
                  {['Trip Ref', 'Truck', 'Driver', 'Route', 'Client', 'Tons', 'Status', 'Departure', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border-s">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
                ) : filteredTrips.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-t3 text-sm">
                    {trips.length === 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <MapPin size={40} weight="duotone" className="text-t3/40" />
                        <p>No trips logged yet.</p>
                        <button onClick={handleNew} className="text-accent font-semibold hover:underline text-sm">Log your first trip</button>
                      </div>
                    ) : 'No trips match your criteria'}
                  </td></tr>
                ) : filteredTrips.map(trip => (
                  <tr key={trip._id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setModal({ mode: 'view', trip })}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-accent whitespace-nowrap">{trip.tripRef}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-t1">{trip.plateNumber}</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{trip.driverName}</td>
                    <td className="px-4 py-3.5 text-sm text-t2 max-w-[150px] truncate">{trip.originSite} → {trip.destinationSite}</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{trip.clientName || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{trip.actualTons ?? trip.plannedTons ?? '—'} t</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[trip.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[trip.status]}`} />
                        {STATUS_LABEL[trip.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-t2 whitespace-nowrap">{trip.departureDate ? new Date(trip.departureDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); setModal({ mode: 'view', trip }); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                        <button onClick={e => { e.stopPropagation(); handleEdit(trip); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTrips.length > 0 && (
              <div className="px-4 py-3 border-t border-border text-xs text-t3">
                Showing {filteredTrips.length} of {trips.length} trips
              </div>
            )}
          </OverlayScrollbarsComponent>
        )}

        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-4">Monthly Trip Volume</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Trips" fill="#4285f4" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <DocumentSidePanel
        isOpen={!!modal}
        onClose={() => { setModal(null); setSaveError(null); }}
        title={modal?.mode === 'new' ? 'Log Trip' : modal?.mode === 'edit' ? `Edit — ${(modal as any).trip?.tripRef}` : `Trip — ${(modal as any)?.trip?.tripRef}`}
        currentIndex={modal && modal.mode !== 'new' ? filteredTrips.findIndex(t => t._id === (modal as any).trip?._id) + 1 : undefined}
        totalItems={filteredTrips.length}
        onPrev={() => { if (!modal || modal.mode === 'new') return; const idx = filteredTrips.findIndex(t => t._id === (modal as any).trip._id); if (idx > 0) setModal({ mode: 'view', trip: filteredTrips[idx - 1] }); }}
        onNext={() => { if (!modal || modal.mode === 'new') return; const idx = filteredTrips.findIndex(t => t._id === (modal as any).trip._id); if (idx < filteredTrips.length - 1) setModal({ mode: 'view', trip: filteredTrips[idx + 1] }); }}
        footerInfo={modal?.mode === 'new' ? `Draft • ${new Date().toLocaleDateString()}` : `Status: ${STATUS_LABEL[(modal as any)?.trip?.status] || '—'}`}
        formContent={modal?.mode === 'view' ? viewContent : formContent}
        previewContent={previewContent}
      />
    </div>
  );
}
