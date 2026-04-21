import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, ArrowDown, ArrowUp, ArrowsLeftRight,
  ArrowsCounterClockwise, Clipboard, X, Spinner, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import {
  apiListMovements, apiCreateMovement, apiCreateTransfer,
  apiListStockItems, apiListWarehouses,
  StockMovement, StockItem, Warehouse,
} from '../../lib/api';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';
import DocumentSidePanel from '../../components/DocumentSidePanel';

const MOVEMENT_TABS = [
  { id: '', label: 'All' },
  { id: 'INBOUND', label: 'Inbound' },
  { id: 'OUTBOUND', label: 'Outbound' },
  { id: 'TRANSFER_IN,TRANSFER_OUT', label: 'Transfers' },
  { id: 'ADJUSTMENT', label: 'Adjustments' },
  { id: 'RETURN', label: 'Returns' },
];

const TYPE_META: Record<string, { label: string; style: string; Icon: React.ComponentType<any> }> = {
  INBOUND:      { label: 'Inbound',    style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: ArrowDown },
  OUTBOUND:     { label: 'Outbound',   style: 'bg-rose-500/10 text-rose-400 border-rose-500/20',          Icon: ArrowUp },
  TRANSFER_OUT: { label: 'Transfer Out', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20',        Icon: ArrowsLeftRight },
  TRANSFER_IN:  { label: 'Transfer In',  style: 'bg-teal-500/10 text-teal-400 border-teal-500/20',        Icon: ArrowsLeftRight },
  ADJUSTMENT:   { label: 'Adjustment', style: 'bg-amber-500/10 text-amber-500 border-amber-500/20',       Icon: ArrowsCounterClockwise },
  STOCK_COUNT:  { label: 'Stock Count', style: 'bg-purple-500/10 text-purple-400 border-purple-500/20',   Icon: Clipboard },
  RETURN:       { label: 'Return',     style: 'bg-orange-500/10 text-orange-400 border-orange-500/20',    Icon: ArrowDown },
};

const DIRECT_TYPES = ['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'RETURN'];

interface NewMovementDraft {
  mode: 'direct' | 'transfer';
  movementType: string;
  stockItemId: string;
  qty: number;
  unitCost: number;
  sourceRef: string;
  reason: string;
  notes: string;
  destinationWarehouseId: string;
}

function emptyDraft(): NewMovementDraft {
  return {
    mode: 'direct', movementType: 'INBOUND', stockItemId: '',
    qty: 1, unitCost: 0, sourceRef: '', reason: '', notes: '',
    destinationWarehouseId: '',
  };
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 50;
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<NewMovementDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(PAGE_LIMIT) };
    if (search) params.search = search;
    if (activeTab) params.movementType = activeTab;
    const [movRes, siRes, whRes] = await Promise.all([
      apiListMovements(params),
      apiListStockItems({ limit: '200' }),
      apiListWarehouses(),
    ]);
    if (movRes.success) { setMovements(movRes.data.movements); setTotal(movRes.data.pagination.total); }
    if (siRes.success) setStockItems(siRes.data.items);
    if (whRes.success) setWarehouses(whRes.data.warehouses);
    setLoading(false);
  }, [search, activeTab, page]);

  useEffect(() => { load(); }, [load]);

  function updateDraft(patch: Partial<NewMovementDraft>) {
    setDraft(d => ({ ...d, ...patch }));
  }

  const stockOptions: SearchSelectOption[] = stockItems.map(si => ({
    value: si._id,
    label: si.name,
    sublabel: si.itemCode,
    meta: si.warehouseName,
  }));

  const selectedStock = stockItems.find(s => s._id === draft.stockItemId);

  const destWhOptions: SearchSelectOption[] = warehouses
    .filter(w => w._id !== (selectedStock as any)?.warehouseId)
    .map(w => ({ value: w._id, label: w.name, sublabel: w.warehouseCode }));

  async function handleSave() {
    if (!draft.stockItemId || draft.qty <= 0) {
      setError('Stock item and quantity are required.');
      return;
    }
    setSaving(true); setError(null);
    let res: any;
    if (draft.mode === 'transfer') {
      if (!draft.destinationWarehouseId) { setError('Destination warehouse is required.'); setSaving(false); return; }
      res = await apiCreateTransfer({
        stockItemId: draft.stockItemId,
        qty: draft.qty,
        destinationWarehouseId: draft.destinationWarehouseId,
        notes: draft.notes || undefined,
      });
    } else {
      res = await apiCreateMovement({
        movementType: draft.movementType,
        stockItemId: draft.stockItemId,
        qty: draft.qty,
        unitCost: draft.unitCost || undefined,
        sourceRef: draft.sourceRef || 'Manual entry',
        reason: draft.reason || undefined,
        notes: draft.notes || undefined,
      });
    }
    setSaving(false);
    if (!res.success) { setError((res as any).message || 'Movement failed.'); return; }
    setPanelOpen(false);
    setDraft(emptyDraft());
    load();
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const formContent = (
    <div className="space-y-4 p-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button onClick={() => updateDraft({ mode: 'direct' })}
          className={`flex-1 py-2 text-sm rounded border ${draft.mode === 'direct' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-t2 hover:text-t1'}`}>
          Direct Movement
        </button>
        <button onClick={() => updateDraft({ mode: 'transfer' })}
          className={`flex-1 py-2 text-sm rounded border ${draft.mode === 'transfer' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-t2 hover:text-t1'}`}>
          Transfer
        </button>
      </div>

      {draft.mode === 'direct' && (
        <div>
          <label className="block text-xs text-t3 mb-1">Movement Type</label>
          <select className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.movementType} onChange={e => updateDraft({ movementType: e.target.value })}>
            {DIRECT_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-t3 mb-1">Stock Item *</label>
        <SearchSelect
          options={stockOptions}
          value={draft.stockItemId}
          onChange={v => {
            const si = stockItems.find(s => s._id === v);
            updateDraft({ stockItemId: v ?? '', unitCost: si?.weightedAvgCost ?? 0 });
          }}
          placeholder="Search stock items..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-t3 mb-1">Quantity *</label>
          <input type="number" min={0.001} step={0.001}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.qty} onChange={e => updateDraft({ qty: Number(e.target.value) })} />
        </div>
        {draft.mode === 'direct' && (
          <div>
            <label className="block text-xs text-t3 mb-1">Unit Cost</label>
            <input type="number" min={0}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
              value={draft.unitCost} onChange={e => updateDraft({ unitCost: Number(e.target.value) })} />
          </div>
        )}
      </div>

      {draft.mode === 'transfer' && (
        <div>
          <label className="block text-xs text-t3 mb-1">Destination Warehouse *</label>
          <SearchSelect
            options={destWhOptions}
            value={draft.destinationWarehouseId}
            onChange={v => updateDraft({ destinationWarehouseId: v ?? '' })}
            placeholder="Select destination..."
          />
        </div>
      )}

      {draft.mode === 'direct' && (
        <div>
          <label className="block text-xs text-t3 mb-1">Source / Reference</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.sourceRef} onChange={e => updateDraft({ sourceRef: e.target.value })}
            placeholder="e.g. PO-0042" />
        </div>
      )}

      {draft.mode === 'direct' && ['OUTBOUND', 'ADJUSTMENT', 'RETURN'].includes(draft.movementType) && (
        <div>
          <label className="block text-xs text-t3 mb-1">Reason</label>
          <input className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1"
            value={draft.reason} onChange={e => updateDraft({ reason: e.target.value })}
            placeholder="e.g. Issued to site, Damaged, etc." />
        </div>
      )}

      <div>
        <label className="block text-xs text-t3 mb-1">Notes</label>
        <textarea rows={2} className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-t1 resize-none"
          value={draft.notes} onChange={e => updateDraft({ notes: e.target.value })} />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button onClick={() => setPanelOpen(false)}
          className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          Post Movement
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Stock Movements</h1>
          <p className="text-sm text-t3 mt-0.5">Immutable movement ledger — {total.toLocaleString()} records</p>
        </div>
        <button onClick={() => { setDraft(emptyDraft()); setError(null); setPanelOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80">
          <Plus size={16} /> New Movement
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-border shrink-0 overflow-x-auto">
        {MOVEMENT_TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-t3 hover:text-t1'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Search ref, item, source..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span className="text-sm text-t3">{total} movements</span>
      </div>

      {/* Table + Panel */}
      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-4">
        <div className="flex flex-col flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <ArrowsCounterClockwise size={40} className="mb-2 opacity-40" />
              <p>No movements found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-t3">
                    <th className="text-left py-2 pr-3 font-medium">Ref</th>
                    <th className="text-left py-2 pr-3 font-medium">Type</th>
                    <th className="text-left py-2 pr-3 font-medium">Item</th>
                    <th className="text-left py-2 pr-3 font-medium">Warehouse</th>
                    <th className="text-right py-2 pr-3 font-medium">Qty</th>
                    <th className="text-right py-2 pr-3 font-medium">Before → After</th>
                    <th className="text-right py-2 pr-3 font-medium">Unit Cost</th>
                    <th className="text-left py-2 pr-3 font-medium">Source</th>
                    <th className="text-left py-2 font-medium">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map(m => {
                    const meta = TYPE_META[m.movementType] ?? { label: m.movementType, style: 'bg-surface text-t3 border-border', Icon: ArrowsCounterClockwise };
                    const MIcon = meta.Icon;
                    return (
                      <tr key={m._id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 pr-3 font-mono text-xs text-t2">{m.movementRef}</td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 ${meta.style}`}>
                            <MIcon size={10} /> {meta.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <p className="text-t1 font-medium">{m.itemName}</p>
                          <p className="text-xs text-t3">{m.itemCode}</p>
                        </td>
                        <td className="py-3 pr-3 text-t2">{m.warehouseName}</td>
                        <td className="py-3 pr-3 text-right font-medium text-t1">
                          {m.qty > 0 ? '+' : ''}{m.qty.toLocaleString()}
                        </td>
                        <td className="py-3 pr-3 text-right text-xs text-t3">
                          {m.qtyBefore.toLocaleString()} → {m.qtyAfter.toLocaleString()}
                        </td>
                        <td className="py-3 pr-3 text-right text-t2">
                          {m.unitCost > 0 ? m.unitCost.toLocaleString() : '—'}
                        </td>
                        <td className="py-3 pr-3 text-t2 text-xs">{m.sourceRef}</td>
                        <td className="py-3 text-xs text-t3 whitespace-nowrap">
                          <p>{new Date(m.postedAt).toLocaleDateString()}</p>
                          {m.postedBy && <p>{m.postedBy.fullName}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
              <span className="text-xs text-t3">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 border border-border rounded hover:bg-surface disabled:opacity-40">
                  <CaretLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 border border-border rounded hover:bg-surface disabled:opacity-40">
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {panelOpen && (
          <DocumentSidePanel
            isOpen={true}
            onClose={() => setPanelOpen(false)}
            title="New Movement"
            formContent={formContent}
            previewContent={null}
          />
        )}
      </div>
    </div>
  );
}
