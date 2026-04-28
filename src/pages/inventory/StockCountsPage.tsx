import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Clipboard, MagnifyingGlass, Plus, Spinner,
  ArrowUp, ArrowDown, CheckCircle,
} from '@phosphor-icons/react';
import {
  apiListStockItems, apiListMovements, apiCreateMovement,
  apiListWarehouses,
  StockItem, StockMovement, Warehouse,
} from '../../lib/api';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';
import DocumentSidePanel from '../../components/DocumentSidePanel';
import ColumnSelector, { useColumnVisibility, ColDef } from '../../components/ui/ColumnSelector';

const SC_COLS: ColDef[] = [
  { key: 'item',      label: 'Item',      defaultVisible: true },
  { key: 'warehouse', label: 'Warehouse', defaultVisible: true },
  { key: 'onHand',    label: 'On Hand',   defaultVisible: true },
  { key: 'value',     label: 'Value',     defaultVisible: true },
];

interface CountEntry {
  stockItemId: string;
  itemCode: string;
  itemName: string;
  warehouseId: string;
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
  const { visible: colVis, toggle: colToggle } = useColumnVisibility('stock-counts', SC_COLS);

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
      stockItemId: si._id, itemCode: si.itemCode, itemName: si.name,
      warehouseId: si.warehouseId, warehouseName: si.warehouseName,
      systemQty: si.onHandQty,
      countedQty: '', unit: si.stockUnit, currency: si.currency,
      weightedAvgCost: si.weightedAvgCost,
    }));
    setEntries(initial); setError(null); setSavedCount(0); setPanelOpen(true);
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
        movementType: 'STOCK_COUNT', warehouseId: e.warehouseId,
        qty: variance, unitCost: e.weightedAvgCost,
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

      <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Item</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">System</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Counted</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Variance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const counted = e.countedQty === '' ? null : Number(e.countedQty);
              const variance = counted !== null ? counted - e.systemQty : null;
              return (
                <tr key={e.stockItemId}
                  className={`hover:bg-surface transition-colors ${variance !== null && variance !== 0 ? 'bg-amber-500/5' : ''} ${i < entries.length - 1 ? 'border-b border-border' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-t1">{e.itemName}</p>
                    <p className="text-xs text-t3">{e.itemCode} · {e.warehouseName}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-t2 font-medium">
                    {e.systemQty.toLocaleString()} <span className="text-t3 text-xs">{e.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number" min={0} step={0.001}
                      value={e.countedQty}
                      onChange={ev => updateCounted(e.stockItemId, ev.target.value)}
                      placeholder={String(e.systemQty)}
                      className="w-24 text-right bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-t1 outline-none focus:border-accent transition-colors"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
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

      <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0 gap-3">
        <p className="text-xs text-t3 shrink-0">
          {dirty.length} discrepanc{dirty.length === 1 ? 'y' : 'ies'}
        </p>
        <button onClick={submitCount} disabled={saving || dirty.length === 0}
          className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2">
          {saving && <Spinner className="animate-spin" size={14} />}
          Post {dirty.length} Adjustment{dirty.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Stock Counts</h1>
            <p className="text-sm text-t3 mt-1">Physical count reconciliation — compare system vs actual</p>
          </div>
          <button onClick={startCount} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors disabled:opacity-50">
            <Plus size={16} /> Start Count
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
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
          <ColumnSelector cols={SC_COLS} visible={colVis} onToggle={colToggle} />
        </div>

        {/* Inventory Snapshot */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-t1">Current Inventory Snapshot</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Spinner size={24} className="animate-spin text-accent" />
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {colVis.has('item') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Item</th>}
                    {colVis.has('warehouse') && <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Warehouse</th>}
                    {colVis.has('onHand') && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">On Hand</th>}
                    {colVis.has('value') && <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Value</th>}
                  </tr>
                </thead>
                <tbody>
                  {stockItems.map((si, i) => (
                    <tr key={si._id} className={`hover:bg-surface transition-colors ${i < stockItems.length - 1 ? 'border-b border-border' : ''}`}>
                      {colVis.has('item') && (
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-t1">{si.name}</p>
                          <p className="text-xs text-t3">{si.itemCode}</p>
                        </td>
                      )}
                      {colVis.has('warehouse') && <td className="px-4 py-3.5 text-t2">{si.warehouseName}</td>}
                      {colVis.has('onHand') && (
                        <td className="px-4 py-3.5 text-right font-medium text-t1">
                          {si.onHandQty.toLocaleString()} <span className="text-xs text-t3">{si.stockUnit}</span>
                        </td>
                      )}
                      {colVis.has('value') && (
                        <td className="px-4 py-3.5 text-right text-t2">
                          {(si.onHandQty * si.weightedAvgCost).toLocaleString()} {si.currency}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}
        </div>

        {/* Recent Stock Counts */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-t1">Recent Count Adjustments</p>
          </div>
          {recentCounts.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-t3">
              <Clipboard size={16} className="opacity-40" />
              <p className="text-sm">No stock counts recorded yet.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Item</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Variance</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCounts.map((m, i) => (
                    <tr key={m._id} className={`hover:bg-surface transition-colors ${i < recentCounts.length - 1 ? 'border-b border-border' : ''}`}>
                      <td className="px-4 py-3.5 font-mono text-xs text-t2">{m.movementRef}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-t1 font-medium">{m.itemName}</p>
                        <p className="text-xs text-t3">{m.itemCode}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-medium flex items-center justify-end gap-0.5 ${m.qty >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.qty >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                          {Math.abs(m.qty).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-t2">{m.reason ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">
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
    </>
  );
}
