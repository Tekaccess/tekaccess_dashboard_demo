import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, Gear, Warning, CheckCircle,
  PencilSimple, Eye, Spinner, CurrencyDollar, Trash,
} from '@phosphor-icons/react';
import { apiGetSparePartsSummary, apiListSpareParts, apiCreateSparePart, apiUpdateSparePart, apiDeleteSparePart, SparePart } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import DocumentSidePanel from '../components/DocumentSidePanel';
import ColumnSelector, { useColumnVisibility, ColDef } from '../components/ui/ColumnSelector';

const CATEGORIES = ['engine', 'transmission', 'brakes', 'suspension', 'electrical', 'tyres_wheels', 'body_panel', 'filters', 'belts_hoses', 'fluids_lubricants', 'other'];
const UNITS = ['units', 'litres', 'kg', 'metres', 'boxes'];
const CURRENCIES = ['USD', 'RWF', 'EUR'];

const CAT_STYLES: Record<string, string> = {
  engine:            'bg-rose-500/10 text-rose-400 border-rose-500/20',
  transmission:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  brakes:            'bg-orange-500/10 text-orange-400 border-orange-500/20',
  suspension:        'bg-teal-500/10 text-teal-400 border-teal-500/20',
  electrical:        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  tyres_wheels:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  filters:           'bg-purple-500/10 text-purple-400 border-purple-500/20',
  fluids_lubricants: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  other:             'bg-surface text-t3 border-border',
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

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors';

const SP_COLS: ColDef[] = [
  { key: 'code',     label: 'Code',          defaultVisible: true },
  { key: 'name',     label: 'Name',          defaultVisible: true },
  { key: 'category', label: 'Category',      defaultVisible: true },
  { key: 'onHand',   label: 'On Hand',       defaultVisible: true },
  { key: 'reorder',  label: 'Reorder Point', defaultVisible: false },
  { key: 'cost',     label: 'Unit Cost',     defaultVisible: false },
  { key: 'value',    label: 'Total Value',   defaultVisible: true },
  { key: 'status',   label: 'Status',        defaultVisible: true },
  { key: 'actions',  label: 'Actions',       defaultVisible: true },
];

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
  const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('spare-parts', SP_COLS);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDeleteSparePart(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } finally {
      setIsDeleting(false);
    }
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

  const formContent = modalMode !== 'view' ? (
    <div className="space-y-5">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Part Details</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Part Code *</label>
              <input className={inp} value={draft.partCode}
                onChange={e => setDraft(d => ({ ...d, partCode: e.target.value.toUpperCase() }))}
                placeholder="SPR-ENG-001" disabled={modalMode === 'edit'} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Category</label>
              <select className={inp} value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Name *</label>
            <input className={inp} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Part name" />
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Description</label>
            <textarea rows={2} className={`${inp} resize-none`} value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Stock &amp; Pricing</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">Unit</label>
              <select className={inp} value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Currency</label>
              <select className={inp} value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-t3 mb-1.5">On Hand Qty</label>
              <input type="number" min={0} className={inp} value={draft.onHandQty}
                onChange={e => setDraft(d => ({ ...d, onHandQty: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Reorder Point</label>
              <input type="number" min={0} className={inp} value={draft.reorderPoint}
                onChange={e => setDraft(d => ({ ...d, reorderPoint: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-t3 mb-1.5">Reorder Qty</label>
              <input type="number" min={0} className={inp} value={draft.reorderQty}
                onChange={e => setDraft(d => ({ ...d, reorderQty: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-t3 mb-1.5">Unit Cost</label>
            <input type="number" min={0} className={inp} value={draft.weightedAvgCost}
              onChange={e => setDraft(d => ({ ...d, weightedAvgCost: Number(e.target.value) }))} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-t3 mb-1.5">Compatible Truck Models (comma-separated)</label>
        <input className={inp} value={draft.compatibleTruckModels}
          onChange={e => setDraft(d => ({ ...d, compatibleTruckModels: e.target.value }))}
          placeholder="e.g. Volvo FH16, Mercedes Actros" />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner className="animate-spin" size={14} />}
        {modalMode === 'new' ? 'Create Part' : 'Save Changes'}
      </button>
    </div>
  ) : null;

  const viewContent = modalMode === 'view' && selected ? (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-t3">{selected.partCode}</p>
          <h3 className="text-base font-semibold text-t1 mt-0.5">{selected.name}</h3>
          <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium mt-1 ${CAT_STYLES[selected.category] ?? ''}`}>
            {selected.category.replace(/_/g, ' ')}
          </span>
        </div>
        {selected.belowReorderPoint ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 border border-rose-500/20 bg-rose-500/10 rounded-full px-2.5 py-0.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Low Stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-0.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OK
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
          <p className="text-xs text-t3 mb-1.5">Compatible Models</p>
          <div className="flex flex-wrap gap-1">
            {selected.compatibleTruckModels.map(m => (
              <span key={m} className="text-xs bg-surface border border-border rounded-lg px-2 py-0.5 text-t2">{m}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-border">
        <button onClick={() => openEdit(selected)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm border border-border rounded-xl hover:bg-surface text-t2 transition-colors">
          <PencilSimple size={14} /> Edit Part
        </button>
      </div>
    </div>
  ) : null;

  const kpiCards = [
    { label: 'Total Parts', value: summary.totalParts, Icon: Gear, bg: 'bg-accent-glow', color: 'text-accent' },
    { label: 'Total Value', value: `${(summary.totalValue / 1000).toFixed(0)}K`, Icon: CurrencyDollar, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
    { label: 'Low Stock', value: summary.lowStock, Icon: Warning, bg: 'bg-rose-500/10', color: 'text-rose-400' },
    { label: 'Categories', value: summary.categories.length, Icon: CheckCircle, bg: 'bg-purple-500/10', color: 'text-purple-400' },
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Spare Parts</h1>
            <p className="text-sm text-t3 mt-1">{total} parts · {summary.lowStock} low stock alerts</p>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
            <Plus size={16} /> New Part
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

        {/* Table Card */}
        <div className="bg-card rounded-xl border border-border">
          {/* Filters */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
              <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
                placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-t2 cursor-pointer">
              <input type="checkbox" checked={alertOnly} onChange={e => setAlertOnly(e.target.checked)} />
              Low stock only
            </label>
            <div className="ml-auto">
              <ColumnSelector cols={SP_COLS} visible={colVis} onToggle={colToggle} />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size={28} className="animate-spin text-accent" /></div>
          ) : parts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <Gear size={40} className="mb-2 opacity-40" /><p>No spare parts found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {colVis.has('code') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Code</th>}
                    {colVis.has('name') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Name</th>}
                    {colVis.has('category') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Category</th>}
                    {colVis.has('onHand') && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">On Hand</th>}
                    {colVis.has('reorder') && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Reorder Point</th>}
                    {colVis.has('cost') && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Unit Cost</th>}
                    {colVis.has('value') && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Total Value</th>}
                    {colVis.has('status') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>}
                    {colVis.has('actions') && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => (
                    <tr key={p._id}
                      className={`hover:bg-surface transition-colors cursor-pointer ${i < parts.length - 1 ? 'border-b border-border' : ''}`}
                      onClick={() => { setSelected(p); setModalMode('view'); }}>
                      {colVis.has('code') && <td className="px-4 py-3.5 font-mono text-xs text-accent">{p.partCode}</td>}
                      {colVis.has('name') && <td className="px-4 py-3.5 font-medium text-t1">{p.name}</td>}
                      {colVis.has('category') && (
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 font-medium ${CAT_STYLES[p.category] ?? ''}`}>
                            {p.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                      )}
                      {colVis.has('onHand') && <td className="px-4 py-3.5 text-right text-t1 font-medium">{p.onHandQty.toLocaleString()} <span className="text-xs text-t3">{p.unit}</span></td>}
                      {colVis.has('reorder') && <td className="px-4 py-3.5 text-right text-t2">{p.reorderPoint.toLocaleString()} <span className="text-xs text-t3">{p.unit}</span></td>}
                      {colVis.has('cost') && <td className="px-4 py-3.5 text-right text-t2">{p.weightedAvgCost.toLocaleString()} <span className="text-xs text-t3">{p.currency}</span></td>}
                      {colVis.has('value') && <td className="px-4 py-3.5 text-right font-bold text-t1">{p.totalStockValue.toLocaleString()}</td>}
                      {colVis.has('status') && (
                        <td className="px-4 py-3.5">
                          {p.belowReorderPoint ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 border border-rose-500/20 bg-rose-500/10 rounded-full px-2.5 py-0.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded-full px-2.5 py-0.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OK
                            </span>
                          )}
                        </td>
                      )}
                      {colVis.has('actions') && (
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); setSelected(p); setModalMode('view'); }}
                              className="p-1 hover:text-t1 text-t3"><Eye size={14} /></button>
                            <button onClick={e => { e.stopPropagation(); openEdit(p); }}
                              className="p-1 hover:text-t1 text-t3"><PencilSimple size={14} /></button>
                            <button onClick={e => { e.stopPropagation(); setDeleteTarget(p); }}
                              className="p-1 hover:text-red-500 text-t3"><Trash size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}
        </div>
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

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div key="del-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <motion.div key="del-dlg" initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash size={22} weight="duotone" className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Delete spare part?</h2>
                <p className="text-xs text-t3 mb-5">
                  <span className="font-semibold text-t2">{deleteTarget.name}</span> will be permanently removed.
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={handleDelete} disabled={isDeleting}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-75 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {isDeleting ? <><Spinner size={16} className="animate-spin" /> Deleting…</> : 'Delete'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                    className="w-full py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
