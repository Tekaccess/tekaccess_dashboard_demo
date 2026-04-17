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
import DocumentSidePanel from '../components/DocumentSidePanel';

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

      {/* ── Standardized Side Panel ─────────────────────────────────────────── */}
      <DocumentSidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Part Specification"
        currentIndex={selected ? filtered.findIndex(p => p.id === selected.id) + 1 : undefined}
        totalItems={filtered.length}
        onPrev={() => {
          const idx = filtered.findIndex(p => p.id === selected?.id);
          if (idx > 0) setSelected(filtered[idx - 1]);
        }}
        onNext={() => {
          const idx = filtered.findIndex(p => p.id === selected?.id);
          if (idx < filtered.length - 1) setSelected(filtered[idx + 1]);
        }}
        footerInfo={`Technical sheet last verified on ${selected?.lastRestocked}`}
        formContent={
          selected && (
            <div className="space-y-6 text-gray-900">
               <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Inventory Adjustment</label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Current Stock Quantity</label>
                    <div className="flex items-center gap-3">
                      <input type="number" defaultValue={selected.stockQuantity} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]" />
                      <span className="text-xs text-gray-400 font-medium">Units</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Minimum Level</label>
                      <input type="number" defaultValue={selected.minStock} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1e3a8a]" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Maximum Level</label>
                      <input type="number" defaultValue={selected.maxStock} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1e3a8a]" />
                    </div>
                  </div>
                </div>
              </div>

               <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Sourcing & Value</label>
                <div className="space-y-3">
                   <div className="relative">
                    <label className="block text-[10px] text-gray-500 mb-1">Preferred Supplier</label>
                    <select defaultValue={selected.supplier} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs appearance-none outline-none focus:ring-2 focus:ring-[#1e3a8a]/10">
                      <option>{selected.supplier}</option>
                      <option>Alternative Supplier A</option>
                      <option>Alternative Supplier B</option>
                    </select>
                    <ChevronDown className="absolute right-3 bottom-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Unit Price (RWF)</label>
                    <input type="number" defaultValue={selected.unitPrice} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#1e3a8a]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Warehouse Placement</label>
                <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><Package className="w-4 h-4 text-[#1e3a8a]" /></div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Storage Location</p>
                    <input type="text" defaultValue={selected.location} className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                 <button className="w-full py-2.5 bg-[#1e3a8a] text-white rounded-lg text-sm font-semibold hover:bg-[#1e40af] shadow-lg shadow-[#1e3a8a]/20 transition-all active:scale-[0.98]">
                  Update Inventory Record
                </button>
              </div>
            </div>
          )
        }
        previewContent={
          selected && (
            <div className="relative font-sans text-gray-900">
               {/* Header Header */}
               <div className="flex justify-between items-start mb-12 border-b-2 border-gray-900 pb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-2xl font-black text-[#1e3a8a]">TEK</span>
                       <span className="text-2xl font-light text-gray-900">PARTS</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Maintenance & Technical Services</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Stock Category</p>
                    <p className="text-sm font-black text-gray-900">{selected.category.toUpperCase()}</p>
                  </div>
               </div>

               {/* Main Title Section */}
               <div className="mb-12">
                   <div className="flex items-baseline gap-4 mb-4">
                      <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase">{selected.name}</h1>
                      <span className="text-lg font-mono text-gray-400">/ {selected.partNumber}</span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${STOCK_LEVEL_CONFIG[selected.stockLevel].style}`}>
                         Stock level: {selected.stockLevel}
                      </span>
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-gray-100 text-gray-500 bg-gray-50">
                         Condition: {selected.condition}
                      </span>
                   </div>
               </div>

               {/* Description Box */}
               <div className="mb-12 p-8 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Technical Description:</label>
                  <p className="text-lg font-medium leading-relaxed text-gray-800">
                    {selected.description}. Optimized for high-durability environments and industrial usage.
                  </p>
               </div>

               {/* Technical Specs Grid */}
               <div className="grid grid-cols-2 gap-16 mb-12 px-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6 border-l-4 border-[#1e3a8a] pl-3">Inventory Dynamics</label>
                    <div className="space-y-6">
                       <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                          <span className="text-xs font-bold text-gray-500">Current Balance</span>
                          <span className="text-xl font-black text-gray-900">{selected.stockQuantity} Units</span>
                       </div>
                       <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                          <span className="text-xs font-bold text-gray-500">Unit Acquisition Cost</span>
                          <span className="text-sm font-bold text-gray-900">{formatRWF(selected.unitPrice)}</span>
                       </div>
                       <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                          <span className="text-xs font-bold text-gray-500">Total Asset Value</span>
                          <span className="text-sm font-bold text-[#1e3a8a]">{formatRWF(selected.unitPrice * selected.stockQuantity)}</span>
                       </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6 border-l-4 border-gray-900 pl-3">Sourcing Profile</label>
                    <div className="space-y-6">
                       <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                          <span className="text-xs font-bold text-gray-500">Primary Supplier</span>
                          <span className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{selected.supplier}</span>
                       </div>
                       <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                          <span className="text-xs font-bold text-gray-500">Shelving Zone</span>
                          <span className="text-sm font-bold text-gray-900">{selected.location}</span>
                       </div>
                       <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                          <span className="text-xs font-bold text-gray-500">Safety Stock Min.</span>
                          <span className="text-sm font-bold text-red-500">{selected.minStock} Units</span>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Compatibility Checklist */}
               <div className="mb-12">
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6 border-l-4 border-amber-500 pl-3">Equipment Compatibility Matrix</label>
                  <div className="grid grid-cols-2 gap-4">
                     {selected.compatible.map((item, i) => (
                       <div key={i} className="flex items-center gap-3 p-3 bg-amber-50/30 rounded-lg border border-amber-100/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold text-amber-900 uppercase tracking-tight">{item}</span>
                       </div>
                     ))}
                  </div>
               </div>

               {/* Footer / Auth */}
               <div className="mt-20 flex justify-between items-end py-8 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4 text-gray-300" />
                     <span className="text-[10px] text-gray-400 font-medium">Auto-generated technical manifest ID TP-{Math.floor(Math.random()*9000)+1000}</span>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Technical Approval</p>
                     <div className="h-0.5 w-32 bg-gray-900 ml-auto" />
                  </div>
               </div>
            </div>
          )
        }
      />
    </div>
  );
}
