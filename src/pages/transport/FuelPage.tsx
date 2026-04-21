import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, DownloadSimple, ListDashes, ChartBar, TrendUp,
  Eye, PencilSimple, Spinner, Warning, CheckCircle, X,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts';
import { apiListFuelLogs, apiCreateFuelLog, apiUpdateFuelLog, FuelLog } from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';

type ViewMode = 'table' | 'bar' | 'trend';
type ActiveTab = 'All' | 'Fuel Logs' | 'Anomaly Flags';

const CHART_COLORS = ['#4285f4', '#93bbfa', '#bfd0fc', '#d5e4ff'];

interface DraftFuelLog {
  plateNumber: string;
  driverName: string;
  logDate: string;
  litresFilled: string;
  costPerLitre: string;
  currency: string;
  odometerReading: string;
  fuelStation: string;
  isAnomalyFlag: boolean;
  anomalyReason: string;
  notes: string;
}

function emptyDraft(): DraftFuelLog {
  return {
    plateNumber: '', driverName: '', logDate: new Date().toISOString().split('T')[0],
    litresFilled: '', costPerLitre: '', currency: 'RWF', odometerReading: '',
    fuelStation: '', isAnomalyFlag: false, anomalyReason: '', notes: '',
  };
}

type ModalState =
  | { mode: 'new'; draft: DraftFuelLog }
  | { mode: 'view' | 'edit'; log: FuelLog; draft?: DraftFuelLog }
  | null;

export default function FuelPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const res = await apiListFuelLogs();
    if (res.success) setLogs(res.data.logs);
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesTab = activeTab === 'Anomaly Flags' ? l.isAnomalyFlag : true;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        l.plateNumber.toLowerCase().includes(q) ||
        (l.driverName || '').toLowerCase().includes(q) ||
        (l.fuelStation || '').toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [logs, activeTab, search]);

  const stats = useMemo(() => {
    const totalLitres = logs.reduce((s, l) => s + l.litresFilled, 0);
    const totalCost = logs.reduce((s, l) => s + l.totalCost, 0);
    const anomalies = logs.filter(l => l.isAnomalyFlag).length;
    return { total: logs.length, totalLitres, totalCost, anomalies };
  }, [logs]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; litres: number; cost: number }> = {};
    logs.forEach(l => {
      const d = new Date(l.logDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { month: label, litres: 0, cost: 0 };
      map[key].litres += l.litresFilled;
      map[key].cost += l.totalCost;
    });
    return Object.values(map).slice(-10);
  }, [logs]);

  const draft = useMemo<DraftFuelLog | null>(() => {
    if (!modal) return null;
    if (modal.mode === 'new') return modal.draft;
    if (modal.mode === 'edit') return modal.draft || null;
    return null;
  }, [modal]);

  const totalCostPreview = useMemo(() => {
    if (!draft) return 0;
    return (parseFloat(draft.litresFilled) || 0) * (parseFloat(draft.costPerLitre) || 0);
  }, [draft]);

  function updateDraft(updates: Partial<DraftFuelLog>) {
    setModal(prev => {
      if (!prev) return prev;
      if (prev.mode === 'new') return { ...prev, draft: { ...prev.draft, ...updates } };
      if (prev.mode === 'edit') return { ...prev, draft: { ...(prev.draft || emptyDraft()), ...updates } };
      return prev;
    });
  }

  function handleNew() { setSaveError(null); setModal({ mode: 'new', draft: emptyDraft() }); }

  function handleEdit(log: FuelLog) {
    setSaveError(null);
    setModal({
      mode: 'edit', log, draft: {
        plateNumber: log.plateNumber,
        driverName: log.driverName || '',
        logDate: log.logDate.split('T')[0],
        litresFilled: log.litresFilled.toString(),
        costPerLitre: log.costPerLitre.toString(),
        currency: log.currency,
        odometerReading: log.odometerReading?.toString() || '',
        fuelStation: log.fuelStation || '',
        isAnomalyFlag: log.isAnomalyFlag,
        anomalyReason: log.anomalyReason || '',
        notes: log.notes || '',
      },
    });
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.plateNumber.trim()) { setSaveError('Plate number is required.'); return; }
    if (!draft.litresFilled || parseFloat(draft.litresFilled) <= 0) { setSaveError('Litres must be greater than 0.'); return; }

    setSaving(true); setSaveError(null);
    const litres = parseFloat(draft.litresFilled);
    const costPerL = parseFloat(draft.costPerLitre) || 0;
    const payload = {
      plateNumber: draft.plateNumber.trim().toUpperCase(),
      driverName: draft.driverName.trim() || null,
      logDate: draft.logDate,
      litresFilled: litres,
      costPerLitre: costPerL,
      totalCost: litres * costPerL,
      currency: draft.currency,
      odometerReading: draft.odometerReading ? parseFloat(draft.odometerReading) : null,
      fuelStation: draft.fuelStation.trim() || null,
      isAnomalyFlag: draft.isAnomalyFlag,
      anomalyReason: draft.isAnomalyFlag ? draft.anomalyReason.trim() || null : null,
      notes: draft.notes.trim() || null,
    };

    const res = modal?.mode === 'edit' && (modal as any).log
      ? await apiUpdateFuelLog((modal as any).log._id, payload)
      : await apiCreateFuelLog(payload);

    setSaving(false);
    if (!res.success) { setSaveError((res as any).message || 'Failed to save.'); return; }
    await loadLogs();
    setModal(null);
  }

  const chartTooltipStyle = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '8px' };
  const inputClass = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-[10px] text-t3 mb-1';

  const formContent = draft && (
    <div className="space-y-5 pb-10">
      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Vehicle & Date</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Plate Number *</label><input className={inputClass} value={draft.plateNumber} onChange={e => updateDraft({ plateNumber: e.target.value })} placeholder="e.g. RAB 123A" /></div>
          <div><label className={labelClass}>Log Date</label><input className={inputClass} type="date" value={draft.logDate} onChange={e => updateDraft({ logDate: e.target.value })} /></div>
        </div>
        <div><label className={labelClass}>Driver</label><input className={inputClass} value={draft.driverName} onChange={e => updateDraft({ driverName: e.target.value })} placeholder="Driver name" /></div>
        <div><label className={labelClass}>Fuel Station</label><input className={inputClass} value={draft.fuelStation} onChange={e => updateDraft({ fuelStation: e.target.value })} placeholder="Station name or location" /></div>
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Fuel Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Litres Filled *</label><input className={inputClass} type="number" step="any" min="0" value={draft.litresFilled} onChange={e => updateDraft({ litresFilled: e.target.value })} placeholder="0.00" /></div>
          <div><label className={labelClass}>Cost / Litre</label><input className={inputClass} type="number" step="any" min="0" value={draft.costPerLitre} onChange={e => updateDraft({ costPerLitre: e.target.value })} placeholder="0.00" /></div>
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select className={inputClass} value={draft.currency} onChange={e => updateDraft({ currency: e.target.value })}>
            <option value="RWF">RWF</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        {(parseFloat(draft.litresFilled) > 0 && parseFloat(draft.costPerLitre) > 0) && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex justify-between text-sm">
            <span className="text-t2">Total Cost</span>
            <span className="font-black text-accent">{totalCostPreview.toLocaleString()} {draft.currency}</span>
          </div>
        )}
        <div><label className={labelClass}>Odometer Reading (km)</label><input className={inputClass} type="number" step="any" value={draft.odometerReading} onChange={e => updateDraft({ odometerReading: e.target.value })} placeholder="e.g. 125000" /></div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Anomaly Flag</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => updateDraft({ isAnomalyFlag: !draft.isAnomalyFlag })}
            className={`w-10 h-6 rounded-full transition-colors relative ${draft.isAnomalyFlag ? 'bg-red-500' : 'bg-border'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft.isAnomalyFlag ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-t2">Mark as anomaly / suspicious</span>
        </label>
        {draft.isAnomalyFlag && (
          <div><label className={labelClass}>Anomaly Reason</label><input className={inputClass} value={draft.anomalyReason} onChange={e => updateDraft({ anomalyReason: e.target.value })} placeholder="Describe the anomaly..." /></div>
        )}
      </section>

      <section>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Notes</p>
        <textarea rows={3} className={`${inputClass} resize-none`} value={draft.notes} onChange={e => updateDraft({ notes: e.target.value })} placeholder="Additional notes..." />
      </section>

      {saveError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{saveError}</div>}

      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner size={15} className="animate-spin" />}
        {saving ? 'Saving...' : modal?.mode === 'edit' ? 'Update Log' : 'Save Fuel Log'}
      </button>
    </div>
  );

  const modalSummary = draft ? (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Financial Impact</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3">Rate</span>
            <span className="font-bold text-t1">{draft.costPerLitre || '0'} {draft.currency}/L</span>
          </div>
          <div className="flex justify-between text-base">
             <span className="text-t3 font-bold">Total</span>
             <span className="text-accent font-black">{totalCostPreview.toLocaleString()} {draft.currency}</span>
          </div>
        </div>
      </div>

       <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Efficiency Metrics</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-2 text-center">
           <p className="text-2xl font-black text-t1">{draft.litresFilled || '0'}<span className="text-xs text-t3 ml-1 font-normal uppercase">Liters</span></p>
           <p className="text-[10px] text-t3 uppercase font-bold tracking-tighter">Consumption Logged</p>
        </div>
      </div>
      
      {draft.isAnomalyFlag && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
           <Warning size={18} weight="fill" className="text-red-500 shrink-0 mt-0.5" />
           <div>
              <p className="text-xs font-bold text-red-500 uppercase tracking-tighter">Anomaly Warning</p>
              <p className="text-[11px] text-red-400 mt-1">{draft.anomalyReason || 'No reason provided'}</p>
           </div>
        </div>
      )}
    </div>
  ) : null;

  const viewLog = modal && modal.mode === 'view' ? (modal as any).log as FuelLog : null;

  const viewModalSummary = viewLog ? (
    <div className="space-y-6">
       <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-1">Log Reference</p>
          <span className="font-mono font-bold text-accent text-lg">{viewLog.logRef}</span>
        </div>
        
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-2">Cost Breakdown</p>
          <div className="flex items-center justify-between">
             <div>
                <p className="text-sm font-bold text-t1">{viewLog.totalCost.toLocaleString()} {viewLog.currency}</p>
                <p className="text-[9px] text-t3 uppercase">Total Amount</p>
             </div>
             <div className="text-right">
                <p className="text-sm font-bold text-t1 tracking-tighter">{viewLog.costPerLitre.toLocaleString()} /L</p>
                <p className="text-[9px] text-t3 uppercase">Unit Price</p>
             </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <button onClick={() => handleEdit(viewLog)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Modify Fuel Record
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = viewLog && (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Fuel Log Details</p>
        {viewLog.isAnomalyFlag && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
            <Warning size={14} weight="fill" /> Anomaly Flagged{viewLog.anomalyReason ? `: ${viewLog.anomalyReason}` : ''}
          </div>
        )}
        {[
          ['Log Ref', viewLog.logRef],
          ['Truck', viewLog.plateNumber],
          ['Driver', viewLog.driverName || '—'],
          ['Date', new Date(viewLog.logDate).toLocaleDateString()],
          ['Fuel Station', viewLog.fuelStation || '—'],
          ['Litres Filled', `${viewLog.litresFilled} L`],
          ['Cost / Litre', `${viewLog.costPerLitre.toLocaleString()} ${viewLog.currency}`],
          ['Total Cost', `${viewLog.totalCost.toLocaleString()} ${viewLog.currency}`],
          ['Odometer', viewLog.odometerReading ? `${viewLog.odometerReading.toLocaleString()} km` : '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-t3">{label}</span>
            <span className="font-medium text-t1 text-right max-w-[60%] truncate">{val}</span>
          </div>
        ))}
      </section>
      {viewLog.notes && (
        <div className="p-3 bg-surface rounded-xl border border-border text-sm text-t2">
          <p className="text-[10px] font-black text-t3 uppercase mb-1">Notes</p>{viewLog.notes}
        </div>
      )}
      <button onClick={() => handleEdit(viewLog)} className="w-full py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">Edit Log</button>
    </div>
  );

  const previewData = viewLog || (draft ? {
    logRef: '— DRAFT —', plateNumber: draft.plateNumber, driverName: draft.driverName,
    logDate: draft.logDate, fuelStation: draft.fuelStation, litresFilled: parseFloat(draft.litresFilled) || 0,
    costPerLitre: parseFloat(draft.costPerLitre) || 0, totalCost: totalCostPreview,
    currency: draft.currency, odometerReading: draft.odometerReading,
    isAnomalyFlag: draft.isAnomalyFlag, anomalyReason: draft.anomalyReason, notes: draft.notes,
  } : null);

  const previewContent = previewData && (
    <div className="font-sans text-[#1a1a1a] w-full">
      <div className="flex justify-between items-start mb-6">
        <div className="w-40"><img src="/logo.jpg" alt="TEKACCESS" className="w-full h-auto" /></div>
        <div className="text-right text-[11px] leading-tight text-gray-600">
          <p className="font-bold text-gray-800 uppercase tracking-wider">TEKACCESS</p>
          <p>13 KG 599 St, Gishushu</p><p>Kigali, Rwanda</p>
        </div>
      </div>
      <p className="text-[11px] font-bold text-[#4285f4] mb-8 italic">Built on trust. Delivered with Excellence</p>
      <h1 className="text-2xl font-medium text-[#4285f4] mb-6">Fuel Log <span className="font-bold text-gray-800">#{(previewData as any).logRef}</span></h1>
      {(previewData as any).isAnomalyFlag && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-bold">⚠ ANOMALY FLAGGED{(previewData as any).anomalyReason ? `: ${(previewData as any).anomalyReason}` : ''}</div>
      )}
      <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6 mb-6 text-sm">
        {[
          ['Truck', (previewData as any).plateNumber || '—'],
          ['Driver', (previewData as any).driverName || '—'],
          ['Log Date', (previewData as any).logDate ? new Date((previewData as any).logDate).toLocaleDateString() : '—'],
          ['Fuel Station', (previewData as any).fuelStation || '—'],
          ['Litres Filled', `${Number((previewData as any).litresFilled || 0).toLocaleString()} L`],
          ['Cost / Litre', `${Number((previewData as any).costPerLitre || 0).toLocaleString()} ${(previewData as any).currency}`],
          ['Total Cost', `${Number((previewData as any).totalCost || 0).toLocaleString()} ${(previewData as any).currency}`],
          ['Odometer', (previewData as any).odometerReading ? `${Number((previewData as any).odometerReading).toLocaleString()} km` : '—'],
        ].map(([label, val]) => (
          <div key={label}><p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{label}</p><p className="font-semibold text-gray-800">{val}</p></div>
        ))}
      </div>
      {(previewData as any).notes && <div className="mb-6"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Notes</p><p className="text-[11px] text-gray-600">{(previewData as any).notes}</p></div>}
      <div className="text-[10px] text-gray-400 space-y-1 border-t border-gray-100 pt-6">
        <p className="font-black uppercase mb-1">Fuel Policy</p>
        <p>• All fuel logs must be recorded immediately after fuelling.</p>
        <p>• Receipts must be submitted to the transport manager within 24 hours.</p>
        <p>• Any discrepancies will be flagged and investigated.</p>
      </div>
    </div>
  );

  const tabs: ActiveTab[] = ['All', 'Fuel Logs', 'Anomaly Flags'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Fuel</h1>
          <p className="text-sm text-t3 mt-0.5">Track fuel consumption, costs and anomaly flags</p>
        </div>
        <button onClick={handleNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> Log Fuel
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: stats.total, Icon: CheckCircle, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'Total Litres', value: `${stats.totalLitres.toLocaleString()} L`, Icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Fuel Cost', value: stats.totalCost >= 1_000_000 ? `${(stats.totalCost / 1_000_000).toFixed(1)}M` : `${(stats.totalCost / 1_000).toFixed(0)}K`, Icon: TrendUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Anomaly Flags', value: stats.anomalies, Icon: Warning, color: 'text-red-500', bg: 'bg-red-500/10' },
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
                {tab} {tab === 'Anomaly Flags' && stats.anomalies > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-500 rounded-full font-bold">{stats.anomalies}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search by plate, driver, station..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors" />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
            <DownloadSimple size={14} weight="duotone" /> Export
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
            {([
              { mode: 'table', Icon: ListDashes, label: 'Table' },
              { mode: 'bar', Icon: ChartBar, label: 'Bar' },
              { mode: 'trend', Icon: TrendUp, label: 'Trend' },
            ] as { mode: ViewMode; Icon: any; label: string }[]).map(v => (
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
                  {['Ref', 'Truck', 'Driver', 'Date', 'Litres', 'Cost/L', 'Total Cost', 'Odometer', 'Station', 'Flag', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border-s">
                {loading ? (
                  <tr><td colSpan={11} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={11} className="px-4 py-16 text-center text-t3 text-sm">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <Warning size={40} weight="duotone" className="text-t3/40" />
                        <p>No fuel logs yet.</p>
                        <button onClick={handleNew} className="text-accent font-semibold hover:underline text-sm">Log your first fill-up</button>
                      </div>
                    ) : 'No logs match your criteria'}
                  </td></tr>
                ) : filteredLogs.map(log => (
                  <tr key={log._id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setModal({ mode: 'view', log })}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-accent whitespace-nowrap">{log.logRef}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-t1">{log.plateNumber}</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{log.driverName || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-t2 whitespace-nowrap">{new Date(log.logDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{log.litresFilled} L</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{log.costPerLitre.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-t1 whitespace-nowrap">{log.totalCost.toLocaleString()} {log.currency}</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{log.odometerReading ? `${log.odometerReading.toLocaleString()} km` : '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-t2 max-w-[100px] truncate">{log.fuelStation || '—'}</td>
                    <td className="px-4 py-3.5">
                      {log.isAnomalyFlag ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                          <Warning size={11} weight="fill" /> Flagged
                        </span>
                      ) : <span className="text-t3 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); setModal({ mode: 'view', log }); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                        <button onClick={e => { e.stopPropagation(); handleEdit(log); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length > 0 && (
              <div className="px-4 py-3 border-t border-border text-xs text-t3">Showing {filteredLogs.length} of {logs.length} logs</div>
            )}
          </OverlayScrollbarsComponent>
        )}

        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-4">Monthly Fuel Consumption (Litres)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="litres" name="Litres" fill="#4285f4" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'trend' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-4">Monthly Fuel Cost Trend</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [`${Number(v).toLocaleString()}`, 'Cost']} />
                <Line type="monotone" dataKey="cost" name="Cost" stroke="#4285f4" strokeWidth={2.5} dot={{ fill: '#4285f4', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <ModernModal
        isOpen={!!modal}
        onClose={() => { setModal(null); setSaveError(null); }}
        title={modal?.mode === 'new' ? 'Log Refuelling' : modal?.mode === 'edit' ? `Modify Fuel — ${(modal as any).log?.logRef}` : `Fuel Stats — ${(modal as any)?.log?.logRef}`}
        summaryContent={modal?.mode === 'view' ? viewModalSummary : modalSummary}
        actions={modal?.mode !== 'view' ? (
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />}
            {modal?.mode === 'new' ? 'Record Log' : 'Update Log'}
          </button>
        ) : undefined}
      >
        {modal?.mode === 'view' ? viewContent : formContent}
      </ModernModal>
    </div>
  );
}
