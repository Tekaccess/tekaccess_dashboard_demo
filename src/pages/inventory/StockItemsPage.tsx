import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  MagnifyingGlass, Eye, PencilSimple, Trash, Spinner,
  CheckCircle, Timer, Warning, CurrencyCircleDollar, Cube,
  Package, CalendarDots, Columns, Receipt,
} from '@phosphor-icons/react';
import {
  apiListStockRecords, apiUpdateStockRecord,
  apiDeleteStockRecord, apiGetStockRecordsSummary,
  apiListProducts, apiListWarehouses,
  StockRecord, Product, Warehouse,
} from '../../lib/api';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';
import DocumentSidePanel from '../../components/DocumentSidePanel';

const STATUS_STYLES: Record<string, string> = {
  Complete: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Pending:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Complete: <CheckCircle size={10} weight="fill" />,
  Pending:  <Timer size={10} weight="fill" />,
};

const ALL_COLS = [
  { key: 'product',       label: 'Product' },
  { key: 'warehouse',     label: 'Warehouse' },
  { key: 'on_hand',       label: 'On Hand' },
  { key: 'demand',        label: 'Demand' },
  { key: 'stock_deficit', label: 'Stock Deficit' },
  { key: 'total_value',   label: 'Total Value' },
  { key: 'cash_deficit',  label: 'Cash Deficit' },
  { key: 'status',        label: 'Status' },
  { key: 'deadline',      label: 'Deadline' },
] as const;

type ColKey = typeof ALL_COLS[number]['key'];

type ModalMode = 'edit' | 'view' | null;

interface Draft {
  item_code: string;
  product_id: string;
  warehouse_id: string;
  on_hand: number;
  demand: number;
  paid_amount: number;
  status: 'Complete' | 'Pending';
  deadline: string;
  supporting_doc: string;
}

function emptyDraft(): Draft {
  return {
    item_code: '', product_id: '', warehouse_id: '',
    on_hand: 0, demand: 0, paid_amount: 0,
    status: 'Pending', deadline: '', supporting_doc: '',
  };
}

function formatVal(n: number, currency = 'RWF') {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ${currency}`;
  return `${n.toLocaleString()} ${currency}`;
}

const inp = 'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

const DEFICIT_STEPS: Record<'stock' | 'cash', string[]> = {
  stock: [
    'Raise a Purchase Order for the missing units via Procurement.',
    'Check if surplus stock can be transferred from another warehouse.',
    'Notify the Procurement team to source the goods urgently.',
  ],
  cash: [
    'Submit a payment request to the Finance team for the outstanding amount.',
    'Update the Paid Amount on this record once payment is confirmed.',
    'Attach a supporting invoice or receipt as proof of payment.',
  ],
};

function DeficitTooltip({ type, children }: { type: 'stock' | 'cash'; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const steps = DEFICIT_STEPS[type];
  const title = type === 'stock' ? 'Stock Deficit' : 'Cash Deficit';

  function handleMouseEnter() {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setVisible(true);
  }

  return (
    <div ref={anchorRef} className="inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && createPortal(
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, calc(-100% - 10px))', zIndex: 9999 }}
          className="w-64 pointer-events-none"
        >
          <div className="bg-card border border-rose-500/30 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-3 py-2 bg-rose-500/10 border-b border-rose-500/20">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                {title} · How to resolve
              </p>
            </div>
            <ol className="px-3 py-2.5 space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-t2 leading-snug">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-rose-500/15 text-rose-400 text-[9px] font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="w-0 h-0 mx-auto border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-rose-500/30" />
        </div>,
        document.body
      )}
    </div>
  );
}

export default function StockItemsPage() {
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [summary, setSummary] = useState({ totalItems: 0, totalValue: 0, cashDeficit: 0, pendingItems: 0, warehouseCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    () => Object.fromEntries(ALL_COLS.map(c => [c.key, true])) as Record<ColKey, boolean>
  );
  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<StockRecord | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (warehouseFilter) params.warehouse_id = warehouseFilter;
    const [recRes, sumRes, prodRes, whRes] = await Promise.all([
      apiListStockRecords(params),
      apiGetStockRecordsSummary(),
      apiListProducts(),
      apiListWarehouses(),
    ]);
    if (recRes.success) setRecords(recRes.data.records);
    if (sumRes.success) setSummary(sumRes.data.summary);
    if (prodRes.success) setProducts(prodRes.data.products);
    if (whRes.success) setWarehouses(whRes.data.warehouses);
    setLoading(false);
  }, [search, warehouseFilter]);

  useEffect(() => { load(); }, [load]);

  const productOptions = useMemo<SearchSelectOption[]>(() =>
    products.map(p => ({ value: p._id, label: p.name })), [products]);

  const warehouseOptions = useMemo<SearchSelectOption[]>(() =>
    warehouses.map(w => ({ value: w._id, label: w.name, sublabel: w.warehouseCode })), [warehouses]);

  const selectedProduct = useMemo(() => products.find(p => p._id === draft.product_id), [products, draft.product_id]);

  const computedStockDeficit = Math.max(0, draft.demand - draft.on_hand);
  const computedTotalValue = draft.demand * (selectedProduct?.cost_per_unit ?? 0);
  const computedCashDeficit = Math.max(0, computedTotalValue - draft.paid_amount);

  function openEdit(r: StockRecord) {
    setDraft({
      item_code: r.item_code, product_id: r.product_id, warehouse_id: r.warehouse_id,
      on_hand: r.on_hand, demand: r.demand, paid_amount: r.paid_amount,
      status: r.status, deadline: r.deadline ? r.deadline.slice(0, 10) : '',
      supporting_doc: r.supporting_doc || '',
    });
    setSelected(r); setError(null); setModalMode('edit');
  }
  function openView(r: StockRecord) { setSelected(r); setModalMode('view'); }

  async function handleDelete(id: string) {
    await apiDeleteStockRecord(id);
    setDeleteConfirm(null);
    setModalMode(null);
    load();
  }

  async function handleSave() {
    if (!draft.item_code.trim()) { setError('Item code is required.'); return; }
    if (!draft.product_id) { setError('Product is required.'); return; }
    if (!draft.warehouse_id) { setError('Warehouse is required.'); return; }
    setSaving(true); setError(null);
    const payload = {
      ...draft,
      deadline: draft.deadline || null,
      supporting_doc: draft.supporting_doc || null,
    };
    if (!selected) return;
    const res = await apiUpdateStockRecord(selected._id, payload);
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Failed to save.'); return; }
    await load(); setModalMode(null);
  }

  const formContent = modalMode === 'view' && selected ? (
    <div className="space-y-5 pb-10">
      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Stock Record</p>
        {([
          ['Item Code', selected.item_code],
          ['Product', selected.product_name],
          ['Warehouse', selected.warehouse_name],
          ['Status', selected.status],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-t3">{l}</span>
            {l === 'Status' ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[v]}`}>
                {STATUS_ICONS[v]} {v}
              </span>
            ) : <span className="font-medium text-t1">{v}</span>}
          </div>
        ))}
        {selected.source_po_ref && (
          <div className="flex justify-between text-sm">
            <span className="text-t3">Source PO</span>
            <span className="inline-flex items-center gap-1 font-medium text-accent">
              <Receipt size={12} weight="duotone" />
              {selected.source_po_ref}
            </span>
          </div>
        )}
        {selected.deadline && (
          <div className="flex justify-between text-sm">
            <span className="text-t3">Deadline</span>
            <span className="font-medium text-t1">{new Date(selected.deadline).toLocaleDateString()}</span>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Quantities</p>
        {([
          ['On Hand', `${selected.on_hand.toLocaleString()} units`],
          ['Demand', `${selected.demand.toLocaleString()} units`],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-t3">{l}</span>
            <span className="font-semibold text-t1">{v}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm">
          <span className="text-t3">Stock Deficit</span>
          {selected.stock_deficit > 0 ? (
            <DeficitTooltip type="stock">
              <span className="font-semibold text-rose-400 underline decoration-dotted underline-offset-2 cursor-help">
                {selected.stock_deficit.toLocaleString()} units
              </span>
            </DeficitTooltip>
          ) : (
            <span className="font-semibold text-t1">0 units</span>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Financials</p>
        {([
          ['Unit Cost', `${selected.cost_per_unit.toLocaleString()} ${selected.currency}`],
          ['Total Value', formatVal(selected.total_value, selected.currency)],
          ['Paid Amount', formatVal(selected.paid_amount, selected.currency)],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-t3">{l}</span>
            <span className="font-bold text-accent">{v}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm">
          <span className="text-t3">Cash Deficit</span>
          {selected.cash_deficit > 0 ? (
            <DeficitTooltip type="cash">
              <span className="font-bold text-rose-400 underline decoration-dotted underline-offset-2 cursor-help">
                {formatVal(selected.cash_deficit, selected.currency)}
              </span>
            </DeficitTooltip>
          ) : (
            <span className="font-bold text-accent">{formatVal(selected.cash_deficit, selected.currency)}</span>
          )}
        </div>
      </section>

      {selected.supporting_doc && (
        <section className="space-y-1">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Supporting Doc</p>
          <p className="text-sm text-accent truncate">{selected.supporting_doc}</p>
        </section>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={() => openEdit(selected)} className="flex-1 py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all">Edit</button>
      </div>
      {deleteConfirm === selected._id ? (
        <div className="flex gap-2">
          <button onClick={() => handleDelete(selected._id)} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-all">Confirm Delete</button>
          <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-border text-t2 rounded-xl text-sm font-bold hover:bg-surface transition-all">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setDeleteConfirm(selected._id)} className="w-full py-2.5 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2">
          <Trash size={14} /> Delete Record
        </button>
      )}
    </div>
  ) : (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Item Details</p>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Item Code *</label>
          <input value={draft.item_code} onChange={e => setDraft(d => ({ ...d, item_code: e.target.value.toUpperCase() }))} placeholder="STK-XXX-001" className={inp} />
        </div>
        <SearchSelect label="Product *" options={productOptions} value={draft.product_id || null} onChange={val => setDraft(d => ({ ...d, product_id: val || '' }))} placeholder="Select product..." clearable={false} />
        <SearchSelect label="Warehouse *" options={warehouseOptions} value={draft.warehouse_id || null} onChange={val => setDraft(d => ({ ...d, warehouse_id: val || '' }))} placeholder="Select warehouse..." clearable={false} />
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Quantities</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">On Hand</label>
            <input type="number" min="0" value={draft.on_hand} onChange={e => setDraft(d => ({ ...d, on_hand: Number(e.target.value) }))} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Demand</label>
            <input type="number" min="0" value={draft.demand} onChange={e => setDraft(d => ({ ...d, demand: Number(e.target.value) }))} className={inp} />
          </div>
        </div>
        {(draft.on_hand > 0 || draft.demand > 0) && (
          <div className="p-3 bg-surface rounded-lg border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-t3">Stock Deficit</span>
              <span className={`font-bold ${computedStockDeficit > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{computedStockDeficit.toLocaleString()}</span>
            </div>
            {selectedProduct && (
              <>
                <div className="flex justify-between">
                  <span className="text-t3">Total Value</span>
                  <span className="font-bold text-accent">{formatVal(computedTotalValue, selectedProduct.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-t3">Cash Deficit</span>
                  <span className={`font-bold ${computedCashDeficit > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatVal(computedCashDeficit, selectedProduct.currency)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Financial &amp; Status</p>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Paid Amount</label>
          <input type="number" min="0" value={draft.paid_amount} onChange={e => setDraft(d => ({ ...d, paid_amount: Number(e.target.value) }))} className={inp} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">Status</label>
            <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value as 'Complete' | 'Pending' }))} className={inp}>
              <option value="Pending">Pending</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Deadline</label>
            <input type="date" value={draft.deadline} onChange={e => setDraft(d => ({ ...d, deadline: e.target.value }))} className={inp} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Supporting Doc (ref / path)</label>
          <input value={draft.supporting_doc} onChange={e => setDraft(d => ({ ...d, supporting_doc: e.target.value }))} placeholder="DOC-2025-001 or file path" className={inp} />
        </div>
      </section>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {saving && <Spinner size={14} className="animate-spin" />}
        {saving ? 'Saving...' : 'Update Record'}
      </button>
    </div>
  );

  const previewContent = selected ? (
    <div className="font-sans text-[#1a1a1a] space-y-6">
      <div className="flex justify-between items-start">
        <img src="/logo.jpg" alt="TEKACCESS" className="w-36 h-auto" />
        <div className="text-right text-[11px] text-gray-500">
          <p className="font-bold text-gray-800">STOCK RECORD</p>
          <p>{new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#4285f4]">{selected.product_name}</h2>
        <p className="text-sm text-gray-500">{selected.item_code} · {selected.warehouse_name}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-5 text-[12px]">
        {([
          ['On Hand', `${selected.on_hand.toLocaleString()}`],
          ['Demand', `${selected.demand.toLocaleString()}`],
          ['Stock Deficit', `${selected.stock_deficit.toLocaleString()}`],
          ['Total Value', formatVal(selected.total_value, selected.currency)],
          ['Paid Amount', formatVal(selected.paid_amount, selected.currency)],
          ['Cash Deficit', formatVal(selected.cash_deficit, selected.currency)],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l}>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">{l}</p>
            <p className="font-bold text-gray-800">{v}</p>
          </div>
        ))}
      </div>
      <div className={`p-3 rounded-xl text-sm font-medium ${selected.status === 'Complete' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
        Status: {selected.status}
        {selected.deadline && ` · Deadline: ${new Date(selected.deadline).toLocaleDateString()}`}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
      <Package size={60} weight="duotone" />
      <p className="text-sm mt-3">Select a stock record to preview</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-t1">Stock</h1>
        <p className="text-sm text-t3 mt-0.5">Monitor inventory levels, demand gaps, and cash deficits</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: summary.totalItems, Icon: Cube, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'Total Value', value: formatVal(summary.totalValue), Icon: CurrencyCircleDollar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Cash Deficit', value: formatVal(summary.cashDeficit), Icon: Warning, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Pending Items', value: summary.pendingItems, Icon: Timer, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${c.bg}`}><c.Icon size={18} weight="duotone" className={c.color} /></div>
            <div>
              <p className="text-xs text-t3 font-medium uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input type="text" placeholder="Search item code, product..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent transition-colors" />
          </div>
          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm bg-surface text-t2 outline-none focus:border-accent transition-colors">
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
          </select>
          <div className="relative" ref={colsBtnRef}>
            <button
              onClick={() => setColsOpen(o => !o)}
              className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${colsOpen ? 'border-accent text-accent bg-accent/5' : 'border-border text-t2 bg-surface hover:border-accent hover:text-accent'}`}
            >
              <Columns size={14} weight="duotone" />
              Columns
              {ALL_COLS.some(c => !visibleCols[c.key]) && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                  {ALL_COLS.filter(c => !visibleCols[c.key]).length}
                </span>
              )}
            </button>
            {colsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setColsOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border border-border rounded-xl shadow-xl p-2 w-44">
                  <p className="px-2 pt-1 pb-2 text-[10px] font-black text-t3 uppercase tracking-widest">Show / Hide</p>
                  {ALL_COLS.map(col => (
                    <label key={col.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col.key]}
                        onChange={() => setVisibleCols(v => ({ ...v, [col.key]: !v[col.key] }))}
                        className="rounded accent-[var(--color-accent)]"
                      />
                      <span className="text-sm text-t2">{col.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Item Code</th>
                {visibleCols.product       && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Product</th>}
                {visibleCols.warehouse     && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Warehouse</th>}
                {visibleCols.on_hand       && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">On Hand</th>}
                {visibleCols.demand        && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Demand</th>}
                {visibleCols.stock_deficit && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Stock Deficit</th>}
                {visibleCols.total_value   && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Total Value</th>}
                {visibleCols.cash_deficit  && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Cash Deficit</th>}
                {visibleCols.status        && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Status</th>}
                {visibleCols.deadline      && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Deadline</th>}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border-s">
              {loading ? (
                <tr><td colSpan={ALL_COLS.filter(c => visibleCols[c.key]).length + 2} className="px-4 py-16 text-center"><Spinner size={24} className="animate-spin text-t3 mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={ALL_COLS.filter(c => visibleCols[c.key]).length + 2} className="px-4 py-16 text-center text-sm text-t3">
                  <div className="flex flex-col items-center gap-3">
                    <Cube size={40} weight="duotone" className="text-t3/40" />
                    <p>No stock records found. Create a Purchase Order in Procurement to generate records automatically.</p>
                  </div>
                </td></tr>
              ) : records.map(r => (
                <tr key={r._id} className="hover:bg-surface cursor-pointer transition-colors" onClick={() => openView(r)}>
                  <td className="px-4 py-3 text-sm font-semibold text-accent whitespace-nowrap">{r.item_code}</td>
                  {visibleCols.product && (
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-t1">{r.product_name}</p>
                    </td>
                  )}
                  {visibleCols.warehouse && <td className="px-4 py-3 text-sm text-t2 whitespace-nowrap">{r.warehouse_name}</td>}
                  {visibleCols.on_hand && <td className="px-4 py-3 text-sm font-medium text-t1 whitespace-nowrap">{r.on_hand.toLocaleString()}</td>}
                  {visibleCols.demand && <td className="px-4 py-3 text-sm text-t2 whitespace-nowrap">{r.demand.toLocaleString()}</td>}
                  {visibleCols.stock_deficit && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.stock_deficit > 0 ? (
                        <DeficitTooltip type="stock">
                          <span className="text-sm font-bold text-rose-400 underline decoration-dotted underline-offset-2 cursor-help">
                            -{r.stock_deficit.toLocaleString()}
                          </span>
                        </DeficitTooltip>
                      ) : (
                        <span className="text-sm font-bold text-emerald-400">0</span>
                      )}
                    </td>
                  )}
                  {visibleCols.total_value && <td className="px-4 py-3 text-sm font-bold text-t1 whitespace-nowrap">{formatVal(r.total_value, r.currency)}</td>}
                  {visibleCols.cash_deficit && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.cash_deficit > 0 ? (
                        <DeficitTooltip type="cash">
                          <span className="text-sm font-bold text-rose-400 underline decoration-dotted underline-offset-2 cursor-help">
                            {formatVal(r.cash_deficit, r.currency)}
                          </span>
                        </DeficitTooltip>
                      ) : (
                        <span className="text-sm font-bold text-emerald-400">—</span>
                      )}
                    </td>
                  )}
                  {visibleCols.status && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[r.status] || ''}`}>
                        {STATUS_ICONS[r.status]} {r.status}
                      </span>
                    </td>
                  )}
                  {visibleCols.deadline && (
                    <td className="px-4 py-3 text-xs text-t3 whitespace-nowrap">
                      {r.deadline ? (
                        <span className="flex items-center gap-1"><CalendarDots size={11} />{new Date(r.deadline).toLocaleDateString()}</span>
                      ) : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); openView(r); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"><Eye size={14} weight="duotone" /></button>
                      <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"><PencilSimple size={14} weight="duotone" /></button>
                      {deleteConfirm === r._id ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleDelete(r._id); }} className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">Yes</button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }} className="text-[10px] px-2 py-1 border border-border rounded-lg text-t3 hover:bg-surface transition-colors">No</button>
                        </>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setDeleteConfirm(r._id); }} className="p-1.5 text-t3 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash size={14} weight="duotone" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length > 0 && <div className="px-4 py-3 border-t border-border text-xs text-t3">{records.length} records</div>}
        </OverlayScrollbarsComponent>
      </div>

      <DocumentSidePanel
        isOpen={modalMode !== null}
        onClose={() => { setModalMode(null); setSelected(null); setError(null); }}
        title={modalMode === 'edit' ? `Edit — ${selected?.item_code}` : selected?.item_code || ''}
        footerInfo={selected ? `${selected.product_name} · ${selected.warehouse_name}` : ''}
        formContent={formContent}
        previewContent={previewContent}
      />
    </div>
  );
}
