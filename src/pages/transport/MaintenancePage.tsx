import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, DownloadSimple, ListDashes, ChartBar,
  Eye, PencilSimple, Spinner, Warning, CheckCircle, X, Wrench,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import {
  apiListMaintenanceRecords, apiCreateMaintenanceRecord, apiUpdateMaintenanceRecord, MaintenanceRecord,
} from '../../lib/api';
import ModernModal from '../../components/ui/ModernModal';

type ViewMode = 'table' | 'bar' | 'pie';
type ActiveTab = 'All' | 'Open Records' | 'Scheduled Services' | 'Maintenance History';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-500/10 text-red-500 border-red-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-surface text-t3 border-border',
};
const STATUS_DOT: Record<string, string> = {
  open: 'bg-red-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-t3',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const TYPE_LABEL: Record<string, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  inspection: 'Inspection',
  emergency: 'Emergency',
};
const TYPE_STYLES: Record<string, string> = {
  preventive: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  corrective: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  inspection: 'bg-surface text-t3 border-border',
  emergency: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const CHART_COLORS = ['#4285f4', '#93bbfa', '#bfd0fc', '#d5e4ff', '#e8f0ff'];

const TAB_STATUS: Record<ActiveTab, MaintenanceRecord['status'][] | null> = {
  All: null,
  'Open Records': ['open', 'in_progress'],
  'Scheduled Services': ['open'],
  'Maintenance History': ['completed', 'cancelled'],
};

interface DraftRecord {
  plateNumber: string;
  maintenanceType: MaintenanceRecord['maintenanceType'];
  description: string;
  status: MaintenanceRecord['status'];
  scheduledDate: string;
  completedDate: string;
  estimatedCost: string;
  actualCost: string;
  currency: string;
  mechanicName: string;
  workshopName: string;
  partsUsed: string;
  notes: string;
}

function emptyDraft(): DraftRecord {
  return {
    plateNumber: '', maintenanceType: 'preventive', description: '', status: 'open',
    scheduledDate: '', completedDate: '', estimatedCost: '', actualCost: '',
    currency: 'RWF', mechanicName: '', workshopName: '', partsUsed: '', notes: '',
  };
}

type ModalState =
  | { mode: 'new'; draft: DraftRecord }
  | { mode: 'view' | 'edit'; record: MaintenanceRecord; draft?: DraftRecord }
  | null;

function formatCost(v: number, currency = 'RWF') {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ${currency}`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K ${currency}`;
  return `${v.toLocaleString()} ${currency}`;
}

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const res = await apiListMaintenanceRecords();
    if (res.success) setRecords(res.data.records);
    setLoading(false);
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const filter = TAB_STATUS[activeTab];
    return records.filter(r => {
      const matchesTab = filter ? filter.includes(r.status) : true;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        r.recordRef.toLowerCase().includes(q) ||
        r.plateNumber.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.mechanicName || '').toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [records, activeTab, search]);

  const stats = useMemo(() => ({
    total: records.length,
    open: records.filter(r => r.status === 'open' || r.status === 'in_progress').length,
    completed: records.filter(r => r.status === 'completed').length,
    totalCost: records.filter(r => r.actualCost).reduce((s, r) => s + (r.actualCost || 0), 0),
    currency: records[0]?.currency || 'RWF',
  }), [records]);

  const byStatus = useMemo(() => [
    { label: 'Open', value: records.filter(r => r.status === 'open').length },
    { label: 'In Progress', value: records.filter(r => r.status === 'in_progress').length },
    { label: 'Completed', value: records.filter(r => r.status === 'completed').length },
    { label: 'Cancelled', value: records.filter(r => r.status === 'cancelled').length },
  ], [records]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => { map[r.maintenanceType] = (map[r.maintenanceType] || 0) + 1; });
    return Object.entries(map).map(([label, value]) => ({ label: TYPE_LABEL[label] || label, value }));
  }, [records]);

  const draft = useMemo<DraftRecord | null>(() => {
    if (!modal) return null;
    if (modal.mode === 'new') return modal.draft;
    if (modal.mode === 'edit') return modal.draft || null;
    return null;
  }, [modal]);

  function updateDraft(updates: Partial<DraftRecord>) {
    setModal(prev => {
      if (!prev) return prev;
      if (prev.mode === 'new') return { ...prev, draft: { ...prev.draft, ...updates } };
      if (prev.mode === 'edit') return { ...prev, draft: { ...(prev.draft || emptyDraft()), ...updates } };
      return prev;
    });
  }

  function handleNew() { setSaveError(null); setModal({ mode: 'new', draft: emptyDraft() }); }

  function handleEdit(record: MaintenanceRecord) {
    setSaveError(null);
    setModal({
      mode: 'edit', record, draft: {
        plateNumber: record.plateNumber,
        maintenanceType: record.maintenanceType,
        description: record.description,
        status: record.status,
        scheduledDate: record.scheduledDate ? record.scheduledDate.split('T')[0] : '',
        completedDate: record.completedDate ? record.completedDate.split('T')[0] : '',
        estimatedCost: record.estimatedCost?.toString() || '',
        actualCost: record.actualCost?.toString() || '',
        currency: record.currency,
        mechanicName: record.mechanicName || '',
        workshopName: record.workshopName || '',
        partsUsed: record.partsUsed || '',
        notes: record.notes || '',
      },
    });
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.plateNumber.trim()) { setSaveError('Plate number is required.'); return; }
    if (!draft.description.trim()) { setSaveError('Description is required.'); return; }

    setSaving(true); setSaveError(null);
    const payload = {
      plateNumber: draft.plateNumber.trim().toUpperCase(),
      maintenanceType: draft.maintenanceType,
      description: draft.description.trim(),
      status: draft.status,
      scheduledDate: draft.scheduledDate || null,
      completedDate: draft.completedDate || null,
      estimatedCost: draft.estimatedCost ? parseFloat(draft.estimatedCost) : null,
      actualCost: draft.actualCost ? parseFloat(draft.actualCost) : null,
      currency: draft.currency,
      mechanicName: draft.mechanicName.trim() || null,
      workshopName: draft.workshopName.trim() || null,
      partsUsed: draft.partsUsed.trim() || null,
      notes: draft.notes.trim() || null,
    };

    const res = modal?.mode === 'edit' && (modal as any).record
      ? await apiUpdateMaintenanceRecord((modal as any).record._id, payload)
      : await apiCreateMaintenanceRecord(payload);

    setSaving(false);
    if (!res.success) { setSaveError((res as any).message || 'Failed to save.'); return; }
    await loadRecords();
    setModal(null);
  }

  const chartTooltipStyle = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-1)', borderRadius: '8px' };
  const inputClass = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';
  const labelClass = 'block text-[10px] text-t3 mb-1';

  const formContent = draft && (
    <div className="space-y-5 pb-10">
      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Vehicle</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Plate Number *</label><input className={inputClass} value={draft.plateNumber} onChange={e => updateDraft({ plateNumber: e.target.value })} placeholder="e.g. RAB 123A" /></div>
          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} value={draft.maintenanceType} onChange={e => updateDraft({ maintenanceType: e.target.value as MaintenanceRecord['maintenanceType'] })}>
              <option value="preventive">Preventive</option>
              <option value="corrective">Corrective</option>
              <option value="inspection">Inspection</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>
        <div><label className={labelClass}>Description *</label><textarea rows={2} className={`${inputClass} resize-none`} value={draft.description} onChange={e => updateDraft({ description: e.target.value })} placeholder="Describe the maintenance work..." /></div>
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Scheduling</p>
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={draft.status} onChange={e => updateDraft({ status: e.target.value as MaintenanceRecord['status'] })}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Scheduled Date</label><input className={inputClass} type="date" value={draft.scheduledDate} onChange={e => updateDraft({ scheduledDate: e.target.value })} /></div>
          <div><label className={labelClass}>Completed Date</label><input className={inputClass} type="date" value={draft.completedDate} onChange={e => updateDraft({ completedDate: e.target.value })} /></div>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Cost & Workshop</p>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelClass}>Est. Cost</label><input className={inputClass} type="number" step="any" value={draft.estimatedCost} onChange={e => updateDraft({ estimatedCost: e.target.value })} placeholder="0" /></div>
          <div><label className={labelClass}>Actual Cost</label><input className={inputClass} type="number" step="any" value={draft.actualCost} onChange={e => updateDraft({ actualCost: e.target.value })} placeholder="0" /></div>
          <div>
            <label className={labelClass}>Currency</label>
            <select className={inputClass} value={draft.currency} onChange={e => updateDraft({ currency: e.target.value })}>
              <option value="RWF">RWF</option><option value="USD">USD</option><option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Mechanic</label><input className={inputClass} value={draft.mechanicName} onChange={e => updateDraft({ mechanicName: e.target.value })} placeholder="Mechanic name" /></div>
          <div><label className={labelClass}>Workshop</label><input className={inputClass} value={draft.workshopName} onChange={e => updateDraft({ workshopName: e.target.value })} placeholder="Workshop name" /></div>
        </div>
        <div><label className={labelClass}>Parts Used</label><input className={inputClass} value={draft.partsUsed} onChange={e => updateDraft({ partsUsed: e.target.value })} placeholder="e.g. Oil filter, brake pads..." /></div>
      </section>

      <section>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-2">Notes</p>
        <textarea rows={3} className={`${inputClass} resize-none`} value={draft.notes} onChange={e => updateDraft({ notes: e.target.value })} placeholder="Additional notes..." />
      </section>

      {saveError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{saveError}</div>}
    </div>
  );

  const modalSummary = draft ? (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Job Economics</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-t3 text-[10px] uppercase">Estimated</span>
            <span className="font-bold text-t2">{draft.estimatedCost || '0'} {draft.currency}</span>
          </div>
          <div className="flex justify-between text-base">
             <span className="text-t3 font-bold">Actual</span>
             <span className="text-accent font-black">{draft.actualCost || '0'} {draft.currency}</span>
          </div>
        </div>
      </div>

       <div className="space-y-1">
        <p className="text-[10px] font-black text-t3 uppercase tracking-widest">Phase progress</p>
        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-2">
           <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-t1 uppercase tracking-tight">{STATUS_LABEL[draft.status]}</span>
              <span className="text-[10px] text-t3 font-mono">{(draft.status === 'completed' ? '100%' : draft.status === 'in_progress' ? '50%' : '0%')}</span>
           </div>
           <div className="h-1 bg-surface rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${draft.status === 'completed' ? 'bg-emerald-500 w-full' : draft.status === 'in_progress' ? 'bg-amber-500 w-1/2' : 'bg-red-500 w-[10%]'}`} />
           </div>
        </div>
      </div>
    </div>
  ) : null;

  const viewRecord = modal && modal.mode === 'view' ? (modal as any).record as MaintenanceRecord : null;

  const viewModalSummary = viewRecord ? (
    <div className="space-y-6">
       <div className="bg-card/50 border border-border rounded-xl p-4 space-y-4">
        <div>
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-1">Asset link</p>
          <span className="font-mono font-bold text-accent text-lg">{viewRecord.plateNumber}</span>
          <p className="text-[10px] text-t3 mt-0.5 uppercase tracking-tighter">Reference #{viewRecord.recordRef}</p>
        </div>
        
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] text-t3 uppercase font-black tracking-widest mb-2">Service Identity</p>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg border ${TYPE_STYLES[viewRecord.maintenanceType]}`}>
                <Wrench size={16} weight="duotone" />
             </div>
             <div>
                <p className="text-sm font-bold text-t1">{TYPE_LABEL[viewRecord.maintenanceType]}</p>
                <p className="text-[9px] text-t3 uppercase">Maintenance Category</p>
             </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <button onClick={() => handleEdit(viewRecord)} className="w-full py-2.5 bg-surface border border-border text-t1 rounded-xl text-sm font-bold hover:bg-card transition-all">
          Modify Record
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = viewRecord && (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Maintenance Record</p>
        {[
          ['Record Ref', viewRecord.recordRef],
          ['Truck', viewRecord.plateNumber],
          ['Type', TYPE_LABEL[viewRecord.maintenanceType]],
          ['Description', viewRecord.description],
          ['Status', STATUS_LABEL[viewRecord.status]],
          ['Scheduled', viewRecord.scheduledDate ? new Date(viewRecord.scheduledDate).toLocaleDateString() : '—'],
          ['Completed', viewRecord.completedDate ? new Date(viewRecord.completedDate).toLocaleDateString() : '—'],
          ['Est. Cost', viewRecord.estimatedCost ? formatCost(viewRecord.estimatedCost, viewRecord.currency) : '—'],
          ['Actual Cost', viewRecord.actualCost ? formatCost(viewRecord.actualCost, viewRecord.currency) : '—'],
          ['Mechanic', viewRecord.mechanicName || '—'],
          ['Workshop', viewRecord.workshopName || '—'],
          ['Parts Used', viewRecord.partsUsed || '—'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-t3">{label}</span>
            <span className="font-medium text-t1 text-right max-w-[60%]">{val}</span>
          </div>
        ))}
      </section>
      {viewRecord.notes && (
        <div className="p-3 bg-surface rounded-xl border border-border text-sm text-t2">
          <p className="text-[10px] font-black text-t3 uppercase mb-1">Notes</p>{viewRecord.notes}
        </div>
      )}
      <button onClick={() => handleEdit(viewRecord)} className="w-full py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">Edit Record</button>
    </div>
  );

  const previewData = viewRecord || (draft ? {
    recordRef: '— DRAFT —', plateNumber: draft.plateNumber, maintenanceType: draft.maintenanceType,
    description: draft.description, status: draft.status, scheduledDate: draft.scheduledDate,
    completedDate: draft.completedDate, estimatedCost: parseFloat(draft.estimatedCost) || null,
    actualCost: parseFloat(draft.actualCost) || null, currency: draft.currency,
    mechanicName: draft.mechanicName, workshopName: draft.workshopName,
    partsUsed: draft.partsUsed, notes: draft.notes,
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
      <h1 className="text-2xl font-medium text-[#4285f4] mb-6">Maintenance Record <span className="font-bold text-gray-800">#{(previewData as any).recordRef}</span></h1>
      <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-6 mb-6 text-sm">
        {[
          ['Truck', (previewData as any).plateNumber || '—'],
          ['Type', TYPE_LABEL[(previewData as any).maintenanceType] || '—'],
          ['Status', STATUS_LABEL[(previewData as any).status] || '—'],
          ['Scheduled', (previewData as any).scheduledDate ? new Date((previewData as any).scheduledDate).toLocaleDateString() : '—'],
          ['Completed', (previewData as any).completedDate ? new Date((previewData as any).completedDate).toLocaleDateString() : '—'],
          ['Est. Cost', (previewData as any).estimatedCost ? formatCost((previewData as any).estimatedCost, (previewData as any).currency) : '—'],
          ['Actual Cost', (previewData as any).actualCost ? formatCost((previewData as any).actualCost, (previewData as any).currency) : '—'],
          ['Mechanic', (previewData as any).mechanicName || '—'],
          ['Workshop', (previewData as any).workshopName || '—'],
          ['Parts Used', (previewData as any).partsUsed || '—'],
        ].map(([label, val]) => (
          <div key={label}><p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{label}</p><p className="font-semibold text-gray-800 text-sm">{val}</p></div>
        ))}
      </div>
      <div className="mb-6">
        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Description</p>
        <p className="text-[12px] text-gray-700">{(previewData as any).description}</p>
      </div>
      {(previewData as any).notes && <div className="mb-6"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Notes</p><p className="text-[11px] text-gray-600">{(previewData as any).notes}</p></div>}
      <div className="flex justify-between items-end border-t border-gray-100 pt-6">
        <div className="text-center w-36 border-t border-gray-300 pt-2">
          <p className="text-[9px] font-black uppercase text-gray-400">Authorized Signature</p>
        </div>
        <div className="text-center w-36 border-t border-gray-300 pt-2">
          <p className="text-[9px] font-black uppercase text-gray-400">Transport Manager</p>
        </div>
      </div>
    </div>
  );

  const tabs: ActiveTab[] = ['All', 'Open Records', 'Scheduled Services', 'Maintenance History'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Maintenance</h1>
          <p className="text-sm text-t3 mt-0.5">Track open records, scheduled services and maintenance history</p>
        </div>
        <button onClick={handleNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> New Record
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: stats.total, Icon: Wrench, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'Open / In Progress', value: stats.open, Icon: Warning, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Completed', value: stats.completed, Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total Cost', value: formatCost(stats.totalCost, stats.currency), Icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-500/10' },
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
            <input type="text" placeholder="Search by truck, description, mechanic..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors" />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
            <DownloadSimple size={14} weight="duotone" /> Export
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
            {([
              { mode: 'table', Icon: ListDashes, label: 'Table' },
              { mode: 'bar', Icon: ChartBar, label: 'Status' },
              { mode: 'pie', Icon: ChartBar, label: 'By Type' },
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
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface">
                <tr>
                  {['Ref', 'Truck', 'Type', 'Description', 'Status', 'Scheduled', 'Actual Cost', 'Mechanic', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border-s">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-t3 text-sm">
                    {records.length === 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <Wrench size={40} weight="duotone" className="text-t3/40" />
                        <p>No maintenance records yet.</p>
                        <button onClick={handleNew} className="text-accent font-semibold hover:underline text-sm">Create the first record</button>
                      </div>
                    ) : 'No records match your criteria'}
                  </td></tr>
                ) : filteredRecords.map(record => (
                  <tr key={record._id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setModal({ mode: 'view', record })}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-accent whitespace-nowrap">{record.recordRef}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-t1">{record.plateNumber}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_STYLES[record.maintenanceType]}`}>
                        {TYPE_LABEL[record.maintenanceType]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-t2 max-w-[180px] truncate">{record.description}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[record.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[record.status]}`} />
                        {STATUS_LABEL[record.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-t2 whitespace-nowrap">{record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-t1 whitespace-nowrap">{record.actualCost ? formatCost(record.actualCost, record.currency) : '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-t2">{record.mechanicName || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); setModal({ mode: 'view', record }); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                        <button onClick={e => { e.stopPropagation(); handleEdit(record); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRecords.length > 0 && (
              <div className="px-4 py-3 border-t border-border text-xs text-t3">Showing {filteredRecords.length} of {records.length} records</div>
            )}
          </OverlayScrollbarsComponent>
        )}

        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-4">Records by Status</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byStatus} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="value" name="Records" radius={[4, 4, 0, 0]}>
                  {byStatus.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'pie' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-sm font-semibold text-t2 mb-4">Records by Maintenance Type</h3>
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
                  <span className="text-sm text-t2 flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-t1">{item.value} records</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ModernModal
        isOpen={!!modal}
        onClose={() => { setModal(null); setSaveError(null); }}
        title={modal?.mode === 'new' ? 'New Service Record' : modal?.mode === 'edit' ? `Update Log — ${(modal as any).record?.recordRef}` : `Maintenance Details — ${(modal as any)?.record?.recordRef}`}
        summaryContent={modal?.mode === 'view' ? viewModalSummary : modalSummary}
        actions={modal?.mode !== 'view' ? (
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Spinner size={14} className="animate-spin" />}
            {modal?.mode === 'new' ? 'Create Record' : 'Update Record'}
          </button>
        ) : undefined}
      >
        {modal?.mode === 'view' ? viewContent : formContent}
      </ModernModal>
    </div>
  );
}
