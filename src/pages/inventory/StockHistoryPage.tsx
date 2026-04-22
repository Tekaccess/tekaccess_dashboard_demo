import React, { useState, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  ClockCounterClockwise, MagnifyingGlass, Spinner, Trash,
  ArrowDown, ArrowUp, ArrowsLeftRight, Package, ArrowClockwise,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  apiListMovements, apiDeleteMovement, apiListWarehouses,
  StockMovement, Warehouse,
} from '../../lib/api';
import SearchSelect, { SearchSelectOption } from '../../components/ui/SearchSelect';

const TYPE_LABELS: Record<string, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
  TRANSFER_OUT: 'Transfer Out',
  TRANSFER_IN: 'Transfer In',
  ADJUSTMENT: 'Adjustment',
  STOCK_COUNT: 'Stock Count',
  RETURN: 'Return',
};

const TYPE_STYLES: Record<string, string> = {
  INBOUND:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OUTBOUND:     'bg-rose-500/10 text-rose-400 border-rose-500/20',
  TRANSFER_OUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  TRANSFER_IN:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ADJUSTMENT:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  STOCK_COUNT:  'bg-teal-500/10 text-teal-400 border-teal-500/20',
  RETURN:       'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  INBOUND:      <ArrowDown size={12} />,
  OUTBOUND:     <ArrowUp size={12} />,
  TRANSFER_OUT: <ArrowsLeftRight size={12} />,
  TRANSFER_IN:  <ArrowsLeftRight size={12} />,
  ADJUSTMENT:   <WarningCircle size={12} />,
  STOCK_COUNT:  <ClockCounterClockwise size={12} />,
  RETURN:       <ArrowClockwise size={12} />,
};

const MOVEMENT_TYPES = ['INBOUND', 'OUTBOUND', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'STOCK_COUNT', 'RETURN'];

export default function StockHistoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: '100' };
    if (search) params.search = search;
    if (typeFilter) params.movementType = typeFilter;
    if (warehouseFilter) params.warehouseId = warehouseFilter;
    const [movRes, whRes] = await Promise.all([
      apiListMovements(params),
      apiListWarehouses(),
    ]);
    if (movRes.success) {
      setMovements(movRes.data.movements);
      setTotal(movRes.data.pagination.total);
    }
    if (whRes.success) setWarehouses(whRes.data.warehouses);
    setLoading(false);
  }, [search, typeFilter, warehouseFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeleting(id);
    await apiDeleteMovement(id);
    setDeleting(null);
    setDeleteConfirm(null);
    load();
  }

  const warehouseOptions: SearchSelectOption[] = warehouses.map(w => ({
    value: w._id, label: w.name, sublabel: w.warehouseCode,
  }));

  function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-t1">Stock History</h1>
          <p className="text-sm text-t3 mt-1">Full audit trail — every stock movement with timestamp</p>
        </div>
        <div className="text-xs text-t3 bg-surface border border-border rounded-lg px-3 py-1.5">
          {total.toLocaleString()} records
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
            placeholder="Search item, ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-t1 outline-none focus:border-accent transition-colors"
        >
          <option value="">All Types</option>
          {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <div className="w-52">
          <SearchSelect
            options={warehouseOptions}
            value={warehouseFilter}
            onChange={v => setWarehouseFilter(v ?? '')}
            placeholder="All warehouses"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size={28} className="animate-spin text-accent" />
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-t3">
            <Package size={40} className="mb-2 opacity-40" />
            <p>No stock movements found.</p>
          </div>
        ) : (
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/30">
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Warehouse</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Qty Change</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Before → After</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">By</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map(m => (
                  <tr key={m._id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-accent whitespace-nowrap">{m.movementRef}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 uppercase tracking-wider ${TYPE_STYLES[m.movementType] ?? 'bg-surface text-t3 border-border'}`}>
                        {TYPE_ICONS[m.movementType]}
                        {TYPE_LABELS[m.movementType] ?? m.movementType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-t1">{m.itemName}</p>
                      <p className="text-xs text-t3">{m.itemCode}</p>
                    </td>
                    <td className="px-4 py-3.5 text-t2 text-xs whitespace-nowrap">{m.warehouseName}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-0.5 font-bold text-sm ${m.qty >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.qty >= 0 ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        {m.qty >= 0 ? '+' : ''}{m.qty.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-t3 whitespace-nowrap font-mono">
                      {m.qtyBefore.toLocaleString()} → {m.qtyAfter.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-t2 max-w-[140px] truncate" title={m.sourceRef ?? ''}>
                      {m.sourceRef ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">
                      {formatDateTime(m.postedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-t3">
                      {m.postedBy?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {deleteConfirm === m._id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDelete(m._id)}
                            disabled={deleting === m._id}
                            className="text-[10px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-60 transition-colors"
                          >
                            {deleting === m._id ? <Spinner size={10} className="animate-spin" /> : 'Yes'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-[10px] px-2 py-1 border border-border rounded-lg text-t3 hover:bg-surface transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(m._id)}
                          className="text-t3 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </OverlayScrollbarsComponent>
        )}
      </div>
    </div>
  );
}
