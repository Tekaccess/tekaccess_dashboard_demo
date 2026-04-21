import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Clipboard, MagnifyingGlass, Plus, Spinner,
  ArrowUp, ArrowDown, CheckCircle, X,
} from '@phosphor-icons/react';
import {
  apiListStockItems, apiListMovements, apiCreateMovement,
  apiListWarehouses,
  StockItem, StockMovement, Warehouse,
} from '../../lib/api';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';
import DocumentSidePanel from '../../components/DocumentSidePanel';

interface CountEntry {
  stockItemId: string;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  systemQty: number;
  countedQty: number | '';
  unit: string;
  currency: string;
  weightedAvgCost: number;
}

export default function StockCountsPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [recentCounts, setRecentCounts] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: '200' };
    if (search) params.search = search;
    if (warehouseFilter) params.warehouseId = warehouseFilter;
    const [siRes, whRes, movRes] = await Promise.all([
      apiListStockItems(params),
      apiListWarehouses(),
      apiListMovements({ movementType: 'STOCK_COUNT', limit: '20' }),
    ]);
    if (siRes.success) setStockItems(siRes.data.items);
    if (whRes.success) setWarehouses(whRes.data.warehouses);
    if (movRes.success) setRecentCounts(movRes.data.movements);
    setLoading(false);
  }, [search, warehouseFilter]);

  useEffect(() => { load(); }, [load]);

  function startCount() {
    const initial: CountEntry[] = stockItems.map(si => ({
      stockItemId: si._id,
      itemCode: si.itemCode,
      itemName: si.name,
      warehouseName: si.warehouseName,
      systemQty: si.onHandQty,
      countedQty: '',
      unit: si.stockUnit,
      currency: si.currency,
      weightedAvgCost: si.weightedAvgCost,
    }));
    setEntries(initial);
    setError(null);
    setSavedCount(0);
    setPanelOpen(true);
  }

  function updateCounted(stockItemId: string, val: string) {
    setEntries(prev => prev.map(e => e.stockItemId === stockItemId ? { ...e, countedQty: val === '' ? '' : Number(val) } : e));
  }

  const dirty = entries.filter(e => e.countedQty !== '' && Number(e.countedQty) !== e.systemQty);

  async function submitCount() {
    if (dirty.length === 0) { setError('No discrepancies to post.'); return; }
    setSaving(true); setError(null);
    let ok = 0;
    for (const e of dirty) {
      const counted = Number(e.countedQty);
      const variance = counted - e.systemQty;
      const res = await apiCreateMovement({
        movementType: 'STOCK_COUNT',
        stockItemId: e.stockItemId,
        qty: variance,
        unitCost: e.weightedAvgCost,
        sourceRef: 'Physical Count',
        reason: `Count: ${counted} (system: ${e.systemQty})`,
        countedQty: counted,
      });
      if (res.success) ok++;
    }
    setSaving(false);
    setSavedCount(ok);
    if (ok === dirty.length) {
      setTimeout(() => { setPanelOpen(false); load(); }, 1200);
    } else {
      setError(`${ok} of ${dirty.length} adjustments posted. Some failed.`);
    }
  }

  const warehouseOptions: SearchSelectOption[] = warehouses.map(w => ({
    value: w._id, label: w.name, sublabel: w.warehouseCode,
  }));

  const formContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm text-t2">Enter physical counts below. Only items with discrepancies will be posted.</p>
      </div>

      {error && <p className="text-red-400 text-sm px-4 pt-2">{error}</p>}
      {savedCount > 0 && !error && (
        <p className="text-emerald-400 text-sm px-4 pt-2 flex items-center gap-1">
          <CheckCircle size={14} /> {savedCount} adjustments posted successfully.
        </p>
      )}

      <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-2 z-10">
            <tr className="border-b border-border text-t3">
              <th className="text-left py-2 px-3 font-medium">Item</th>
              <th className="text-right py-2 px-3 font-medium">System</th>
              <th className="text-right py-2 px-3 font-medium">Counted</th>
              <th className="text-right py-2 px-3 font-medium">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map(e => {
              const counted = e.countedQty === '' ? null : Number(e.countedQty);
              const variance = counted !== null ? counted - e.systemQty : null;
              return (
                <tr key={e.stockItemId} className={`hover:bg-surface/50 ${variance !== null && variance !== 0 ? 'bg-amber-500/5' : ''}`}>
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-t1">{e.itemName}</p>
                    <p className="text-xs text-t3">{e.itemCode} · {e.warehouseName}</p>
                  </td>
                  <td className="py-2.5 px-3 text-right text-t2 font-medium">
                    {e.systemQty.toLocaleString()} <span className="text-t3 text-xs">{e.unit}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.001}
                      value={e.countedQty}
                      onChange={ev => updateCounted(e.stockItemId, ev.target.value)}
                      placeholder={String(e.systemQty)}
                      className="w-24 text-right bg-surface border border-border rounded px-2 py-1 text-sm text-t1 focus:border-accent outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {variance !== null && variance !== 0 ? (
                      <span className={`flex items-center justify-end gap-0.5 font-medium ${variance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {variance > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(variance).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-t3">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </OverlayScrollbarsComponent>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
        <p className="text-xs text-t3">
          {dirty.length} discrepanc{dirty.length === 1 ? 'y' : 'ies'} detected
        </p>
        <div className="flex gap-2">
          <button onClick={() => setPanelOpen(false)}
            className="px-4 py-2 text-sm text-t2 hover:text-t1 border border-border rounded">Cancel</button>
          <button onClick={submitCount} disabled={saving || dirty.length === 0}
            className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 flex items-center gap-2 disabled:opacity-50">
            {saving && <Spinner className="animate-spin" size={14} />}
            Post {dirty.length} Adjustment{dirty.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-t1">Stock Counts</h1>
          <p className="text-sm text-t3 mt-0.5">Physical count reconciliation — compare system vs actual</p>
        </div>
        <button onClick={startCount} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent/80 disabled:opacity-50">
          <Plus size={16} /> Start Count
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded text-sm text-t1 placeholder:text-t3"
            placeholder="Filter items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-56">
          <SearchSelect
            options={warehouseOptions}
            value={warehouseFilter}
            onChange={v => setWarehouseFilter(v ?? '')}
            placeholder="All warehouses"
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-6 gap-6">
        {/* Left: current inventory snapshot */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-t1 mb-2">Current Inventory Snapshot</p>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner size={24} className="animate-spin text-accent" />
              </div>
            ) : (
              <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="max-h-80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-t3">
                      <th className="text-left py-2 pr-3 font-medium">Item</th>
                      <th className="text-left py-2 pr-3 font-medium">Warehouse</th>
                      <th className="text-right py-2 pr-3 font-medium">On Hand</th>
                      <th className="text-right py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stockItems.map(si => (
                      <tr key={si._id} className="hover:bg-surface/50">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-t1">{si.name}</p>
                          <p className="text-xs text-t3">{si.itemCode}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-t2">{si.warehouseName}</td>
                        <td className="py-2.5 pr-3 text-right font-medium text-t1">
                          {si.onHandQty.toLocaleString()} <span className="text-xs text-t3">{si.stockUnit}</span>
                        </td>
                        <td className="py-2.5 text-right text-t2">
                          {(si.onHandQty * si.weightedAvgCost).toLocaleString()} {si.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OverlayScrollbarsComponent>
            )}
          </div>

          {/* Recent stock counts */}
          <div>
            <p className="text-sm font-medium text-t1 mb-2">Recent Count Adjustments</p>
            {recentCounts.length === 0 ? (
              <p className="text-sm text-t3">No stock counts recorded yet.</p>
            ) : (
              <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'scroll' } }} className="max-h-60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-t3">
                      <th className="text-left py-2 pr-3 font-medium">Ref</th>
                      <th className="text-left py-2 pr-3 font-medium">Item</th>
                      <th className="text-right py-2 pr-3 font-medium">Variance</th>
                      <th className="text-left py-2 pr-3 font-medium">Reason</th>
                      <th className="text-left py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentCounts.map(m => (
                      <tr key={m._id} className="hover:bg-surface/50">
                        <td className="py-2.5 pr-3 font-mono text-xs text-t2">{m.movementRef}</td>
                        <td className="py-2.5 pr-3">
                          <p className="text-t1">{m.itemName}</p>
                          <p className="text-xs text-t3">{m.itemCode}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className={`font-medium flex items-center justify-end gap-0.5 ${m.qty >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {m.qty >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                            {Math.abs(m.qty).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-t2">{m.reason ?? '—'}</td>
                        <td className="py-2.5 text-xs text-t3 whitespace-nowrap">
                          {new Date(m.postedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OverlayScrollbarsComponent>
            )}
          </div>
        </div>

        {panelOpen && (
          <DocumentSidePanel
            isOpen={true}
            onClose={() => setPanelOpen(false)}
            title="Physical Stock Count"
            formContent={formContent}
            previewContent={null}
          />
        )}
      </div>
    </div>
  );
}
