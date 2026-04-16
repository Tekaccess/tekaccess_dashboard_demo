import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Download, Filter, MoreHorizontal,
  LayoutList, BarChart2, Eye, ChevronDown,
  AlertTriangle, Package, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { spareParts, partsStockByCategory, SparePart, StockLevel } from '../data/procurement';

type ViewMode = 'table' | 'cards' | 'bar';
type ActiveTab = 'Parts Inventory' | 'Low Stock / Reorder Alerts';

const STOCK_LEVEL_CONFIG: Record<StockLevel, { style: string; bg: string }> = {
  Critical: { style: 'bg-red-50 text-red-700 border-red-200', bg: 'bg-red-500' },
  Low: { style: 'bg-amber-50 text-amber-700 border-amber-200', bg: 'bg-amber-500' },
  Normal: { style: 'bg-green-50 text-green-700 border-green-200', bg: 'bg-green-500' },
  Overstocked: { style: 'bg-blue-50 text-blue-700 border-blue-200', bg: 'bg-blue-500' },
};

function formatRWF(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M RWF`;
  return `${(v / 1_000).toFixed(0)}K RWF`;
}

function StockBar({ part }: { part: SparePart }) {
  const pct = Math.min((part.stockQuantity / part.maxStock) * 100, 100);
  const cfg = STOCK_LEVEL_CONFIG[part.stockLevel];
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${cfg.bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right shrink-0">{part.stockQuantity}</span>
    </div>
  );
}

export default function SparePartsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Parts Inventory');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SparePart | null>(null);

  const tabs: ActiveTab[] = ['Parts Inventory', 'Low Stock / Reorder Alerts'];

  const filtered = useMemo(() => {
    const list = activeTab === 'Low Stock / Reorder Alerts'
      ? spareParts.filter(p => p.stockLevel === 'Critical' || p.stockLevel === 'Low')
      : spareParts;
    const q = search.toLowerCase();
    return list.filter(p =>
      !search ||
      p.name.toLowerCase().includes(q) ||
      p.partNumber.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q)
    );
  }, [activeTab, search]);

  const summary = useMemo(() => ({
    total: spareParts.length,
    critical: spareParts.filter(p => p.stockLevel === 'Critical').length,
    low: spareParts.filter(p => p.stockLevel === 'Low').length,
    totalValue: spareParts.reduce((sum, p) => sum + p.unitPrice * p.stockQuantity, 0),
  }), []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spare Parts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventory and reorder management for all spare parts</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm font-medium hover:bg-[#1e40af] transition-colors">
          <Plus className="w-4 h-4" /> Add Part
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Parts', value: summary.total, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Critical Stock', value: summary.critical, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Low Stock', value: summary.low, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Stock Value', value: formatRWF(summary.totalValue), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Banner */}
      {summary.critical > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{summary.critical} part{summary.critical > 1 ? 's' : ''} reached critical stock levels</strong> — immediate reorder required.
          </p>
          <button className="ml-auto text-xs font-semibold text-red-700 underline hover:no-underline shrink-0">
            View Alerts
          </button>
        </div>
      )}

      {/* Main Panel */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4">
          <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-3.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[#1e3a8a] text-[#1e3a8a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'Low Stock / Reorder Alerts' && (summary.critical + summary.low) > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold">
                    {summary.critical + summary.low}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search parts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50">
            <Filter className="w-4 h-4" /> Filter <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden ml-auto">
            {([
              { mode: 'table', icon: LayoutList, label: 'Table' },
              { mode: 'cards', icon: Package, label: 'Cards' },
              { mode: 'bar', icon: BarChart2, label: 'By Category' },
            ] as { mode: ViewMode; icon: React.ElementType; label: string }[]).map(v => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                title={v.label}
                className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  viewMode === v.mode
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <v.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── TABLE VIEW ─────────────────────────── */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Part #', 'Name', 'Category', 'Supplier', 'Unit Price', 'Stock Level', 'In Stock', 'Min', 'Location', 'Condition', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-gray-400 text-sm">
                      No parts found
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
                      <td className="px-4 py-3.5 text-sm font-mono text-[#1e3a8a] whitespace-nowrap">{p.partNumber}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{p.supplier}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatRWF(p.unitPrice)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STOCK_LEVEL_CONFIG[p.stockLevel].style}`}>
                          {p.stockLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 min-w-[120px]">
                        <StockBar part={p} />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{p.minStock}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{p.location}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{p.condition}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelected(p); }} className="p-1.5 text-gray-400 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── CARDS VIEW ─────────────────────────── */}
        {viewMode === 'cards' && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <div key={p.id} onClick={() => setSelected(p)}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-mono text-[#1e3a8a] font-semibold">{p.partNumber}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STOCK_LEVEL_CONFIG[p.stockLevel].style}`}>
                    {p.stockLevel}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 leading-tight">{p.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{p.category}</p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.description}</p>

                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Stock level</span>
                    <span className={`font-semibold ${p.stockLevel === 'Critical' ? 'text-red-600' : p.stockLevel === 'Low' ? 'text-amber-600' : 'text-green-600'}`}>
                      {p.stockQuantity} / {p.maxStock}
                    </span>
                  </div>
                  <StockBar part={p} />
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs">
                  <div>
                    <p className="text-gray-400">Unit Price</p>
                    <p className="font-bold text-gray-800">{formatRWF(p.unitPrice)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Location</p>
                    <p className="font-bold text-gray-800">{p.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Supplier</p>
                    <p className="font-bold text-gray-800 truncate max-w-[80px]">{p.supplier.split(' ')[0]}</p>
                  </div>
                </div>

                {(p.stockLevel === 'Critical' || p.stockLevel === 'Low') && (
                  <button className="mt-3 w-full py-1.5 bg-[#1e3a8a] text-white text-xs font-medium rounded-lg hover:bg-[#1e40af] transition-colors">
                    Reorder Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── BAR CHART VIEW ─────────────────────── */}
        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Stock by Category</h3>
            <p className="text-xs text-gray-400 mb-6">Parts count and low stock alerts per category</p>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={partsStockByCategory} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-20} textAnchor="end" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'value' ? [`${(value / 1_000_000).toFixed(2)}M RWF`, 'Stock Value'] : [value, name === 'parts' ? 'Total Parts' : 'Low Stock']
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="parts" name="Total Parts" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="lowStock" name="Low Stock" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="value" name="value" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-[#1e3a8a] font-semibold">{selected.partNumber}</p>
                  <h2 className="text-lg font-bold text-gray-900 mt-0.5">{selected.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.description}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STOCK_LEVEL_CONFIG[selected.stockLevel].style}`}>
                  {selected.stockLevel}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Stock Status</h3>
                <div className="flex items-center gap-3 mb-2 text-sm">
                  <span className="text-gray-500">Current:</span>
                  <span className="font-bold text-gray-900">{selected.stockQuantity}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">Min:</span>
                  <span className="font-semibold text-gray-700">{selected.minStock}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">Max:</span>
                  <span className="font-semibold text-gray-700">{selected.maxStock}</span>
                </div>
                <StockBar part={selected} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Category', value: selected.category },
                  { label: 'Supplier', value: selected.supplier },
                  { label: 'Unit Price', value: formatRWF(selected.unitPrice) },
                  { label: 'Condition', value: selected.condition },
                  { label: 'Location', value: selected.location },
                  { label: 'Last Restocked', value: selected.lastRestocked },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{f.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{f.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Compatible With</p>
                <div className="flex flex-wrap gap-2">
                  {selected.compatible.map(v => (
                    <span key={v} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">{v}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setSelected(null)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-50">
                Close
              </button>
              <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm hover:bg-[#1e40af]">
                Reorder Part
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
