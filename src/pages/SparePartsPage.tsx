import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Gear, Warning, CheckCircle,
  PencilSimple, Eye, Spinner,
} from '@phosphor-icons/react';
import { apiGetSparePartsSummary, apiListSpareParts, apiCreateSparePart, apiUpdateSparePart, SparePart } from '../lib/api';
import DocumentSidePanel from '../components/DocumentSidePanel';

const CATEGORIES = ['engine', 'transmission', 'brakes', 'suspension', 'electrical', 'tyres_wheels', 'body_panel', 'filters', 'belts_hoses', 'fluids_lubricants', 'other'];
const UNITS = ['units', 'litres', 'kg', 'metres', 'boxes'];
const CURRENCIES = ['USD', 'RWF', 'EUR'];

const CAT_STYLES: Record<string, string> = {
  engine:           'bg-rose-500/10 text-rose-400 border-rose-500/20',
  transmission:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  brakes:           'bg-orange-500/10 text-orange-400 border-orange-500/20',
  suspension:       'bg-teal-500/10 text-teal-400 border-teal-500/20',
  electrical:       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  tyres_wheels:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  filters:          'bg-purple-500/10 text-purple-400 border-purple-500/20',
  fluids_lubricants:'bg-amber-500/10 text-amber-500 border-amber-500/20',
  other:            'bg-surface text-t3 border-border',
};

type ModalMode = 'new' | 'edit' | 'view' | null;

interface DraftPart {
  partCode: string; name: string; description: string; category: string;
  unit: string; onHandQty: number; reorderPoint: number; reorderQty: number;
  weightedAvgCost: number; currency: string;
  compatibleTruckModels: string; notes: string;
}

function emptyDraft(): DraftPart {
  return {
    partCode: '', name: '', description: '', category: 'engine',
    unit: 'units', onHandQty: 0, reorderPoint: 5, reorderQty: 10,
    weightedAvgCost: 0, currency: 'USD',
    compatibleTruckModels: '', notes: '',
  };
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [summary, setSummary] = useState({ totalParts: 0, totalValue: 0, lowStock: 0, categories: [] as any[] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [alertOnly, setAlertOnly] = useState(false);
  const [selected, setSelected] = useState<SparePart | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftPart>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: '200' };
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (alertOnly) params.alertOnly = 'true';
    const [pRes, sRes] = await Promise.all([
      apiListSpareParts(params),
      apiGetSparePartsSummary(),
    ]);
    if (pRes.success) { setParts(pRes.data.parts); setTotal(pRes.data.pagination.total); }
    if (sRes.success) setSummary(sRes.data.summary);
    setLoading(false);
  }, [search, categoryFilter, alertOnly]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setDraft(emptyDraft()); setSelected(null); setError(null); setModalMode('new'); }

  function openEdit(p: SparePart) {
    setDraft({
      partCode: p.partCode, name: p.name, description: p.description || '',
      category: p.category, unit: p.unit, onHandQty: p.onHandQty,
      reorderPoint: p.reorderPoint, reorderQty: p.reorderQty,
      weightedAvgCost: p.weightedAvgCost, currency: p.currency,
      compatibleTruckModels: (p.compatibleTruckModels || []).join(', '), notes: '',
    });
    setSelected(p); setError(null); setModalMode('edit');
  }

  async function handleSave() {
    if (!draft.partCode || !draft.name) { setError('Part code and name are required.'); return; }
    setSaving(true); setError(null);
    const payload = {
      ...draft,
      onHandQty: Number(draft.onHandQty),
      reorderPoint: Number(draft.reorderPoint),
      reorderQty: Number(draft.reorderQty),
      weightedAvgCost: Number(draft.weightedAvgCost),
      compatibleTruckModels: draft.compatibleTruckModels
        ? draft.compatibleTruckModels.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };
    const res = modalMode === 'new'
      ? await apiCreateSparePart(payload as any)
      : await apiUpdateSparePart(selected!._id, payload as any);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Save failed.'); return; }
    setModalMode(null); load();
  }

  const inp = 'w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1';

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-4 p-4 pb-10">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Part Code *</label>
          <input className={inp} value={draft.partCode}
            onChange={e => setDraft(d => ({ ...d, partCode: e.target.value.toUpperCase() }))}
            placeholder="SPR-ENG-001" disabled={modalMode === 'edit'} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Category</label>
          <select className={inp} value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-t3 mb-1">Name *</label>
        <input className={inp} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Part name" />
      </div>
      <div>
        <label className="block text-xs text-t3 mb-1">Description</label>
        <textarea rows={2} className={`${inp} resize-none`} value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Unit</label>
          <select className={inp} value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Currency</label>
          <select className={inp} value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">On Hand Qty</label>
          <input type="number" min={0} className={inp} value={draft.onHandQty}
            onChange={e => setDraft(d => ({ ...d, onHandQty: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Reorder Point</label>
          <input type="number" min={0} className={inp} value={draft.reorderPoint}
            onChange={e => setDraft(d => ({ ...d, reorderPoint: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="block text-xs text-t3 mb-1">Reorder Qty</label>
          <input type="number" min={0} className={inp} value={draft.reorderQty}
            onChange={e => setDraft(d => ({ ...d, reorderQty: Number(e.target.value) }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-t3 mb-1">Unit Cost</label>
        <input type="number" min={0} className={inp} value={draft.weightedAvgCost}
          onChange={e => setDraft(d => ({ ...d, weightedAvgCost: Number(e.target.value) }))} />
      </div>
      <div>
        <label className="block text-xs text-t3 mb-1">Compatible Truck Models (comma-separated)</label>
        <input className={inp} value={draft.compatibleTruckModels}
          onChange={e => setDraft(d => ({ ...d, compatibleTruckModels: e.target.value }))}
          placeholder="e.g. Volvo FH16, Mercedes Actros" />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          {modalMode === 'new' ? 'Create Part' : 'Save Changes'}
        </button>
      </div>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-t3">{selected.partCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          <span className={`inline-block text-xs border rounded px-2 py-0.5 mt-1 ${CAT_STYLES[selected.category] ?? ''}`}>
            {selected.category.replace('_', ' ')}
          </span>
        </div>
        {selected.belowReorderPoint ? (
          <span className="flex items-center gap-1 text-xs text-rose-400 border border-rose-500/20 bg-rose-500/10 rounded px-2 py-0.5">
            <Warning size={11} /> Low Stock
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded px-2 py-0.5">
            <CheckCircle size={11} /> OK
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['On Hand', `${selected.onHandQty.toLocaleString()} ${selected.unit}`],
          ['Available', `${selected.availableQty.toLocaleString()} ${selected.unit}`],
          ['Reorder Point', `${selected.reorderPoint.toLocaleString()} ${selected.unit}`],
          ['Reorder Qty', `${selected.reorderQty.toLocaleString()} ${selected.unit}`],
          ['Unit Cost', `${selected.weightedAvgCost.toLocaleString()} ${selected.currency}`],
          ['Total Value', `${selected.totalStockValue.toLocaleString()} ${selected.currency}`],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-t3">{k}</p>
            <p className="font-medium text-t1">{v}</p>
          </div>
        ))}
      </div>

      {selected.compatibleTruckModels.length > 0 && (
        <div>
          <p className="text-xs text-t3 mb-1">Compatible Models</p>
          <div className="flex flex-wrap gap-1">
            {selected.compatibleTruckModels.map(m => (
              <span key={m} className="text-xs bg-surface border border-border rounded px-2 py-0.5 text-t2">{m}</span>
            ))}
          </div>
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Spare Parts</h1>
          <p className="text-sm text-t3 mt-0.5">{total} parts · {summary.lowStock} low stock alerts</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Part
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 px-6 py-4 shrink-0 sm:grid-cols-4">
        {[
          { label: 'Total Parts', value: summary.totalParts, color: 'text-accent' },
          { label: 'Total Value', value: `${(summary.totalValue / 1000).toFixed(0)}K ${parts[0]?.currency ?? 'USD'}`, color: 'text-emerald-400' },
          { label: 'Low Stock', value: summary.lowStock, color: 'text-rose-400' },
          { label: 'Categories', value: summary.categories.length, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs text-t3">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-6 pb-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-2 text-sm text-t1">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-t2 cursor-pointer">
          <input type="checkbox" checked={alertOnly} onChange={e => setAlertOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
          ) : parts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Gear size={40} className="mb-2 opacity-40" /><p>No spare parts found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="h-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-t3">
                    {['Code', 'Name', 'Category', 'On Hand', 'Reorder Point', 'Unit Cost', 'Total Value', 'Status', ''].map(h => (
                      <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parts.map(p => (
                    <tr key={p._id} className="hover:bg-surface/50 cursor-pointer"
                      onClick={() => { setSelected(p); setModalMode('view'); }}>
                      <td className="py-3 pr-3 font-mono text-xs text-accent">{p.partCode}</td>
                      <td className="py-3 pr-3 font-medium text-t1">{p.name}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs border rounded px-1.5 py-0.5 ${CAT_STYLES[p.category] ?? ''}`}>
                          {p.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-t1 font-medium">{p.onHandQty.toLocaleString()} <span className="text-xs text-t3">{p.unit}</span></td>
                      <td className="py-3 pr-3 text-t2">{p.reorderPoint.toLocaleString()} {p.unit}</td>
                      <td className="py-3 pr-3 text-t2">{p.weightedAvgCost.toLocaleString()} <span className="text-xs text-t3">{p.currency}</span></td>
                      <td className="py-3 pr-3 font-bold text-t1">{p.totalStockValue.toLocaleString()}</td>
                      <td className="py-3 pr-3">
                        {p.belowReorderPoint ? (
                          <span className="flex items-center gap-1 text-xs text-rose-400 border border-rose-500/20 bg-rose-500/10 rounded px-2 py-0.5">
                            <Warning size={10} /> Low
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded px-2 py-0.5">
                            <CheckCircle size={10} /> OK
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelected(p); setModalMode('view'); }}
                            className="p-1 hover:text-t1 text-t3"><Eye size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                            className="p-1 hover:text-t1 text-t3"><PencilSimple size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}
        </div>

        {modalMode && (
          <DocumentSidePanel
            isOpen={true}
            onClose={() => setModalMode(null)}
            title={modalMode === 'new' ? 'New Spare Part' : modalMode === 'edit' ? 'Edit Part' : selected?.name ?? ''}
            formContent={formContent}
            previewContent={viewContent}
          />
        )}
      </div>
    </div>
  );
}
