import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, DownloadSimple, Funnel, CaretDown,
  Eye, PencilSimple, Warning, CheckCircle, Package,
  Cube, CurrencyCircleDollar, X, Spinner, ArrowsCounterClockwise, Trash,
} from '@phosphor-icons/react';
import {
  apiListStockItems, apiGetInventorySummary, apiCreateStockItem, apiUpdateStockItem,
  apiDeleteStockItem, apiListWarehouses, apiCreateMovement, apiListTaxRates,
  StockItem, Warehouse, TaxRate,
} from '../../lib/api';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';
import DocumentSidePanel from '../../components/DocumentSidePanel';

const CATEGORY_STYLES: Record<string, string> = {
  raw_material:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  finished_goods: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  packaging:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  fuel:           'bg-amber-500/10 text-amber-500 border-amber-500/20',
  consumable:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  other:          'bg-surface text-t3 border-border',
};

const CATEGORIES = ['raw_material', 'finished_goods', 'packaging', 'fuel', 'consumable', 'other'];
const STOCK_UNITS = ['tons', 'kg', 'litres', 'units', 'boxes', 'cubic_metres'];

function formatVal(n: number, currency = 'RWF') {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ${currency}`;
  return `${n.toLocaleString()} ${currency}`;
}

type ModalMode = 'new' | 'edit' | 'view' | 'movement' | null;

interface DraftItem {
  itemCode: string; name: string; description: string; category: string;
  warehouseId: string; stockUnit: string; onHandQty: number; weightedAvgCost: number;
  currency: string; minimumDaysCover: number; reorderQty: number;
  taxRateId: string | null; taxRateName: string | null; taxRatePercentage: number;
}

function emptyDraft(): DraftItem {
  return { itemCode: '', name: '', description: '', category: 'raw_material', warehouseId: '', stockUnit: 'tons', onHandQty: 0, weightedAvgCost: 0, currency: 'RWF', minimumDaysCover: 14, reorderQty: 100, taxRateId: null, taxRateName: null, taxRatePercentage: 0 };
}

interface MovementDraft {
  movementType: string; qty: number; unitCost: number; sourceRef: string; reason: string; notes: string; countedQty: number;
}

export default function StockItemsPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [summary, setSummary] = useState({ totalItems: 0, totalValue: 0, lowStockItems: 0, warehouseCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft());
  const [movementDraft, setMovementDraft] = useState<MovementDraft>({ movementType: 'INBOUND', qty: 1, unitCost: 0, sourceRef: '', reason: '', notes: '', countedQty: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (warehouseFilter) params.warehouseId = warehouseFilter;
    const [itemsRes, summaryRes, whRes, taxRes] = await Promise.all([
      apiListStockItems(params),
      apiGetInventorySummary(),
      apiListWarehouses(),
      apiListTaxRates('purchase'),
    ]);
    if (itemsRes.success) setItems(itemsRes.data.items);
    if (summaryRes.success) setSummary(summaryRes.data.summary);
    if (whRes.success) setWarehouses(whRes.data.warehouses);
    if (taxRes.success) setTaxRates(taxRes.data.taxRates);
    setLoading(false);
  }, [search, categoryFilter, warehouseFilter]);

  useEffect(() => { load(); }, [load]);

  const warehouseOptions = useMemo<SearchSelectOption[]>(() =>
    warehouses.map(w => ({ value: w._id, label: w.name, sublabel: w.warehouseCode })), [warehouses]);

  function openNew() { setDraft(emptyDraft()); setError(null); setSelectedItem(null); setModalMode('new'); }
  function openEdit(item: StockItem) { setDraft({ itemCode: item.itemCode, name: item.name, description: item.description || '', category: item.category, warehouseId: typeof item.warehouseId === 'string' ? item.warehouseId : (item as any).warehouseId?._id || '', stockUnit: item.stockUnit, onHandQty: item.onHandQty, weightedAvgCost: item.weightedAvgCost, currency: item.currency, minimumDaysCover: (item as any).minimumDaysCover || 14, reorderQty: (item as any).reorderQty || 100, taxRateId: item.taxRateId || null, taxRateName: item.taxRateName || null, taxRatePercentage: item.taxRatePercentage || 0 }); setSelectedItem(item); setError(null); setModalMode('edit'); }
  function openView(item: StockItem) { setSelectedItem(item); setModalMode('view'); }
  function openMovement(item: StockItem) { setSelectedItem(item); setMovementDraft({ movementType: 'INBOUND', qty: 1, unitCost: item.weightedAvgCost, sourceRef: '', reason: '', notes: '', countedQty: item.onHandQty }); setError(null); setModalMode('movement'); }

  async function handleDelete(id: string) {
    await apiDeleteStockItem(id);
    setDeleteConfirm(null);
    setModalMode(null);
    load();
  }

  async function handleSaveItem() {
    if (!draft.itemCode.trim() || !draft.name.trim() || !draft.warehouseId) { setError('Item code, name and warehouse are required.'); return; }
    setSaving(true); setError(null);
    let res;
    if (modalMode === 'edit' && selectedItem) {
      res = await apiUpdateStockItem(selectedItem._id, draft as any);
    } else {
      res = await apiCreateStockItem(draft as any);
    }
    setSaving(false);
    if (!res.success) { setError(res.message || 'Failed to save.'); return; }
    await load(); setModalMode(null);
  }

  async function handleSaveMovement() {
    if (!selectedItem) return;
    if (!movementDraft.qty) { setError('Quantity is required.'); return; }
    if (['ADJUSTMENT', 'STOCK_COUNT'].includes(movementDraft.movementType) && !movementDraft.reason.trim()) { setError('Reason is required for this movement type.'); return; }
    setSaving(true); setError(null);
    const payload: any = { movementType: movementDraft.movementType, stockItemId: selectedItem._id, qty: Number(movementDraft.qty), unitCost: Number(movementDraft.unitCost), sourceRef: movementDraft.sourceRef || 'Manual', reason: movementDraft.reason || undefined, notes: movementDraft.notes || undefined };
    if (movementDraft.movementType === 'STOCK_COUNT') payload.countedQty = Number(movementDraft.countedQty);
    const res = await apiCreateMovement(payload);
    setSaving(false);
    if (!res.success) { setError(res.message || 'Failed to record movement.'); return; }
    await load(); setModalMode(null);
  }

  const inp = "w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";

  const formContent = modalMode === 'new' || modalMode === 'edit' ? (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Item Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-[10px] text-t3 mb-1">Item Code *</label><input value={draft.itemCode} onChange={e => setDraft(d => ({ ...d, itemCode: e.target.value.toUpperCase() }))} placeholder="MAT-XXX-001" className={inp} /></div>
          <div><label className="block text-[10px] text-t3 mb-1">Category *</label>
            <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div><label className="block text-[10px] text-t3 mb-1">Name *</label><input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Product name" className={inp} /></div>
        <div><label className="block text-[10px] text-t3 mb-1">Description</label><textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} rows={2} className={`${inp} resize-none`} /></div>
        <SearchSelect label="Warehouse *" options={warehouseOptions} value={draft.warehouseId || null} onChange={val => setDraft(d => ({ ...d, warehouseId: val || '' }))} placeholder="Select warehouse..." clearable={false} />
      </section>
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Stock & Pricing</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-[10px] text-t3 mb-1">Opening Qty</label><input type="number" min="0" value={draft.onHandQty} onChange={e => setDraft(d => ({ ...d, onHandQty: Number(e.target.value) }))} className={inp} /></div>
          <div><label className="block text-[10px] text-t3 mb-1">Unit</label>
            <select value={draft.stockUnit} onChange={e => setDraft(d => ({ ...d, stockUnit: e.target.value }))} className={inp}>
              {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-[10px] text-t3 mb-1">Unit Cost</label><input type="number" min="0" value={draft.weightedAvgCost} onChange={e => setDraft(d => ({ ...d, weightedAvgCost: Number(e.target.value) }))} className={inp} /></div>
          <div><label className="block text-[10px] text-t3 mb-1">Currency</label>
            <select value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))} className={inp}>
              {['RWF','USD','EUR','KES','UGX','TZS','BIF'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Tax Rate</label>
          <select
            className={inp}
            value={draft.taxRateId || ''}
            onChange={e => {
              const tr = taxRates.find(t => t._id === e.target.value);
              setDraft(d => ({ ...d, taxRateId: tr?._id || null, taxRateName: tr?.name || null, taxRatePercentage: tr?.percentage || 0 }));
            }}
          >
            <option value="">No Tax (0%)</option>
            {taxRates.map(t => <option key={t._id} value={t._id}>{t.name} ({t.percentage}%)</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-[10px] text-t3 mb-1">Min. Days Cover</label><input type="number" min="0" value={draft.minimumDaysCover} onChange={e => setDraft(d => ({ ...d, minimumDaysCover: Number(e.target.value) }))} className={inp} /></div>
          <div><label className="block text-[10px] text-t3 mb-1">Reorder Qty</label><input type="number" min="0" value={draft.reorderQty} onChange={e => setDraft(d => ({ ...d, reorderQty: Number(e.target.value) }))} className={inp} /></div>
        </div>
      </section>
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      <button onClick={handleSaveItem} disabled={saving} className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner size={14} className="animate-spin" />}
        {saving ? 'Saving...' : modalMode === 'edit' ? 'Update Item' : 'Add Stock Item'}
      </button>
    </div>
  ) : modalMode === 'view' && selectedItem ? (
    <div className="space-y-5 pb-10">
      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Item Details</p>
        {[['Code', selectedItem.itemCode], ['Name', selectedItem.name], ['Category', selectedItem.category.replace('_', ' ')], ['Warehouse', selectedItem.warehouseName], ['Unit', selectedItem.stockUnit]].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm"><span className="text-t3">{l}</span><span className="font-medium text-t1">{v}</span></div>
        ))}
      </section>
      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Quantities</p>
        {[['On Hand', `${selectedItem.onHandQty} ${selectedItem.stockUnit}`], ['Reserved', `${(selectedItem as any).reservedQty || 0} ${selectedItem.stockUnit}`], ['Available', `${selectedItem.availableQty} ${selectedItem.stockUnit}`]].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm"><span className="text-t3">{l}</span><span className="font-semibold text-t1">{v}</span></div>
        ))}
      </section>
      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Valuation</p>
        {[['Unit Cost', `${selectedItem.weightedAvgCost.toLocaleString()} ${selectedItem.currency}`], ['Total Value', formatVal(selectedItem.onHandQty * selectedItem.weightedAvgCost, selectedItem.currency)]].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm"><span className="text-t3">{l}</span><span className="font-bold text-accent">{v}</span></div>
        ))}
      </section>
      <div className="flex gap-2 pt-2">
        <button onClick={() => openEdit(selectedItem)} className="flex-1 py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">Edit</button>
        <button onClick={() => openMovement(selectedItem)} className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-all">Record Movement</button>
      </div>
      <div className="pt-1">
        {deleteConfirm === selectedItem._id ? (
          <div className="flex gap-2">
            <button onClick={() => handleDelete(selectedItem._id)} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-all">Confirm Delete</button>
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-border text-t2 rounded-xl text-sm font-bold hover:bg-surface transition-all">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirm(selectedItem._id)} className="w-full py-2.5 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2">
            <Trash size={14} /> Delete Item
          </button>
        )}
      </div>
    </div>
  ) : modalMode === 'movement' && selectedItem ? (
    <div className="space-y-5 pb-10">
      <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl text-sm">
        <p className="font-bold text-t1">{selectedItem.name}</p>
        <p className="text-t3 text-xs">{selectedItem.itemCode} · {selectedItem.warehouseName}</p>
        <p className="text-t3 text-xs mt-1">On Hand: <span className="font-semibold text-t1">{selectedItem.onHandQty} {selectedItem.stockUnit}</span></p>
      </div>
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Movement Details</p>
        <div><label className="block text-[10px] text-t3 mb-1">Type *</label>
          <select value={movementDraft.movementType} onChange={e => setMovementDraft(d => ({ ...d, movementType: e.target.value }))} className={inp}>
            <option value="INBOUND">Inbound (receive stock)</option>
            <option value="OUTBOUND">Outbound (dispatch stock)</option>
            <option value="ADJUSTMENT">Adjustment (manual correction)</option>
            <option value="STOCK_COUNT">Stock Count (physical count)</option>
            <option value="RETURN">Return (goods returned)</option>
          </select>
        </div>
        {movementDraft.movementType === 'STOCK_COUNT' ? (
          <div><label className="block text-[10px] text-t3 mb-1">Counted Quantity *</label><input type="number" min="0" value={movementDraft.countedQty} onChange={e => setMovementDraft(d => ({ ...d, countedQty: Number(e.target.value), qty: Number(e.target.value) - selectedItem.onHandQty }))} className={inp} /><p className="text-xs text-t3 mt-1">Variance: {movementDraft.countedQty - selectedItem.onHandQty >= 0 ? '+' : ''}{movementDraft.countedQty - selectedItem.onHandQty} {selectedItem.stockUnit}</p></div>
        ) : (
          <div><label className="block text-[10px] text-t3 mb-1">Quantity *{movementDraft.movementType === 'ADJUSTMENT' ? ' (negative = reduce)' : ''}</label><input type="number" value={movementDraft.qty} onChange={e => setMovementDraft(d => ({ ...d, qty: Number(e.target.value) }))} className={inp} /></div>
        )}
        <div><label className="block text-[10px] text-t3 mb-1">Unit Cost</label><input type="number" min="0" value={movementDraft.unitCost} onChange={e => setMovementDraft(d => ({ ...d, unitCost: Number(e.target.value) }))} className={inp} /></div>
        <div><label className="block text-[10px] text-t3 mb-1">Reference / Source</label><input value={movementDraft.sourceRef} onChange={e => setMovementDraft(d => ({ ...d, sourceRef: e.target.value }))} placeholder="PO-2025-001, Delivery #..." className={inp} /></div>
        {['ADJUSTMENT', 'STOCK_COUNT'].includes(movementDraft.movementType) && (
          <div><label className="block text-[10px] text-t3 mb-1">Reason *</label><input value={movementDraft.reason} onChange={e => setMovementDraft(d => ({ ...d, reason: e.target.value }))} placeholder="Reason for adjustment..." className={inp} /></div>
        )}
        <div><label className="block text-[10px] text-t3 mb-1">Notes</label><textarea value={movementDraft.notes} onChange={e => setMovementDraft(d => ({ ...d, notes: e.target.value }))} rows={2} className={`${inp} resize-none`} /></div>
      </section>
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      <button onClick={handleSaveMovement} disabled={saving} className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner size={14} className="animate-spin" />}{saving ? 'Recording...' : 'Record Movement'}
      </button>
    </div>
  ) : null;

  const previewContent = selectedItem || modalMode === 'new' ? (
    <div className="font-sans text-[#1a1a1a] space-y-6">
      <div className="flex justify-between items-start">
        <div><img src="/logo.jpg" alt="TEKACCESS" className="w-36 h-auto" /></div>
        <div className="text-right text-[11px] text-gray-500"><p className="font-bold text-gray-800">INVENTORY RECORD</p><p>{new Date().toLocaleDateString()}</p></div>
      </div>
      {selectedItem ? (
        <>
          <div>
            <h2 className="text-xl font-bold text-[#4285f4]">{selectedItem.name}</h2>
            <p className="text-sm text-gray-500">{selectedItem.itemCode} · {selectedItem.category.replace('_', ' ')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-5 text-[12px]">
            {[['Warehouse', selectedItem.warehouseName], ['Stock Unit', selectedItem.stockUnit], ['On Hand', `${selectedItem.onHandQty} ${selectedItem.stockUnit}`], ['Available', `${selectedItem.availableQty} ${selectedItem.stockUnit}`], ['Unit Cost', `${selectedItem.weightedAvgCost.toLocaleString()} ${selectedItem.currency}`], ['Total Value', formatVal(selectedItem.onHandQty * selectedItem.weightedAvgCost, selectedItem.currency)]].map(([l, v]) => (
              <div key={l}><p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{l}</p><p className="font-bold text-gray-800">{v}</p></div>
            ))}
          </div>
          {(selectedItem as any).stockOutAlert && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">⚠ Stock out alert — below minimum cover</div>}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <Package size={60} weight="duotone" />
          <p className="text-sm mt-3">New stock item preview</p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Stock Items</h1>
          <p className="text-sm text-t3 mt-0.5">Manage inventory stock levels and valuation</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus size={15} weight="bold" /> Add Stock Item
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: summary.totalItems, Icon: Cube, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'Total Value', value: formatVal(summary.totalValue), Icon: CurrencyCircleDollar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Low Stock Alerts', value: summary.lowStockItems, Icon: Warning, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Warehouses', value: summary.warehouseCount, Icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${c.bg}`}><c.Icon size={18} weight="duotone" className={c.color} /></div>
            <div><p className="text-xs text-t3 font-medium uppercase tracking-wide">{c.label}</p><p className="text-xl font-bold text-t1 mt-0.5">{c.value}</p></div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors">
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
        </div>

        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} defer>
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                {['Item Code', 'Name', 'Category', 'Warehouse', 'On Hand', 'Available', 'Unit Cost', 'Total Value', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border-s">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center text-sm text-t3">
                  <div className="flex flex-col items-center gap-3"><Cube size={40} weight="duotone" className="text-t3/40" /><p>No stock items found.</p><button onClick={openNew} className="text-accent font-semibold hover:underline">Add first item</button></div>
                </td></tr>
              ) : items.map(item => (
                <tr key={item._id} className="hover:bg-surface cursor-pointer transition-colors" onClick={() => openView(item)}>
                  <td className="px-4 py-3 text-sm font-semibold text-accent">{item.itemCode}</td>
                  <td className="px-4 py-3 text-sm font-medium text-t1 max-w-[160px] truncate">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CATEGORY_STYLES[item.category] || CATEGORY_STYLES.other}`}>{item.category.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-t2">{item.warehouseName}</td>
                  <td className="px-4 py-3 text-sm font-medium text-t1">{item.onHandQty.toLocaleString()} <span className="text-t3 text-xs">{item.stockUnit}</span></td>
                  <td className="px-4 py-3 text-sm text-t2">{item.availableQty.toLocaleString()} <span className="text-t3 text-xs">{item.stockUnit}</span></td>
                  <td className="px-4 py-3 text-sm text-t2">{item.weightedAvgCost.toLocaleString()} <span className="text-t3 text-xs">{item.currency}</span></td>
                  <td className="px-4 py-3 text-sm font-bold text-t1 whitespace-nowrap">{formatVal(item.onHandQty * item.weightedAvgCost, item.currency)}</td>
                  <td className="px-4 py-3">
                    {(item as any).stockOutAlert ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><Warning size={10} weight="fill" /> Low</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle size={10} weight="fill" /> OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); openView(item); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                      <button onClick={e => { e.stopPropagation(); openMovement(item); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors" title="Record movement"><ArrowsCounterClockwise size={14} weight="duotone" /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(item); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                      {deleteConfirm === item._id ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleDelete(item._id); }} className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">Yes</button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} className="text-[10px] px-2 py-1 border border-border rounded-lg text-t3 hover:bg-surface transition-colors">No</button>
                        </>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setDeleteConfirm(item._id); }} className="p-1.5 text-t3 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash size={14} weight="duotone" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 0 && <div className="px-4 py-3 border-t border-border text-xs text-t3">{items.length} items</div>}
        </OverlayScrollbarsComponent>
      </div>

      <DocumentSidePanel
        isOpen={modalMode !== null}
        onClose={() => { setModalMode(null); setSelectedItem(null); setError(null); }}
        title={modalMode === 'new' ? 'Add Stock Item' : modalMode === 'movement' ? `Record Movement — ${selectedItem?.name}` : modalMode === 'edit' ? `Edit — ${selectedItem?.name}` : selectedItem?.name || ''}
        footerInfo={selectedItem ? `${selectedItem.itemCode} · ${selectedItem.warehouseName}` : 'New item'}
        formContent={formContent}
        previewContent={previewContent}
      />
    </div>
  );
}
