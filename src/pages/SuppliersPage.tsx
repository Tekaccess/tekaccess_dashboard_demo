import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Download, Filter, MoreHorizontal,
  LayoutList, BarChart2, TrendingUp, ChevronDown,
  Star, Eye, MapPin, Phone, Mail, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { suppliers, supplierPerformance, Supplier, SupplierStatus } from '../data/procurement';

type ViewMode = 'table' | 'cards' | 'bar' | 'radar';
type ActiveTab = 'All Suppliers' | 'Performance & Ranking' | 'Payment Status';

const STATUS_STYLES: Record<SupplierStatus, string> = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  Inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  'On Hold': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Blacklisted: 'bg-red-50 text-red-700 border-red-200',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  );
}

function formatRWF(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M RWF`;
  return `${(value / 1_000).toFixed(0)}K RWF`;
}

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('All Suppliers');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const tabs: ActiveTab[] = ['All Suppliers', 'Performance & Ranking', 'Payment Status'];

  const filteredSuppliers = useMemo(() => suppliers.filter(s => {
    const matchesSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      s.country.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }), [search]);

  const summaryStats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'Active').length,
    avgRating: (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1),
    totalSpend: suppliers.reduce((sum, s) => sum + s.totalSpend, 0),
  }), []);

  // Payment status grouping
  const paymentStats = useMemo(() => [
    { terms: 'Net 7', count: suppliers.filter(s => s.paymentTerms === 'Net 7').length, color: '#22c55e' },
    { terms: 'Net 15', count: suppliers.filter(s => s.paymentTerms === 'Net 15').length, color: '#3b82f6' },
    { terms: 'Net 30', count: suppliers.filter(s => s.paymentTerms === 'Net 30').length, color: '#1e3a8a' },
    { terms: 'Net 45', count: suppliers.filter(s => s.paymentTerms === 'Net 45').length, color: '#f59e0b' },
    { terms: 'Net 60', count: suppliers.filter(s => s.paymentTerms === 'Net 60').length, color: '#ef4444' },
    { terms: 'Prepayment', count: suppliers.filter(s => s.paymentTerms === 'Prepayment').length, color: '#6b7280' },
  ], []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage supplier relationships and performance</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm font-medium hover:bg-[#1e40af] transition-colors">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: summaryStats.total, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Suppliers', value: summaryStats.active, icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg. Rating', value: `${summaryStats.avgRating}/5`, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Spend', value: formatRWF(summaryStats.totalSpend), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
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
              placeholder="Search suppliers..."
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
              { mode: 'cards', icon: Award, label: 'Cards' },
              { mode: 'bar', icon: BarChart2, label: 'Performance' },
              { mode: 'radar', icon: TrendingUp, label: 'Radar' },
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

        {/* ── TABLE VIEW ─────────────────────────────────────── */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Supplier Name', 'Contact', 'Country', 'Category', 'Rating', 'On-Time %', 'Total Orders', 'Total Spend', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-gray-400 text-sm">
                      No suppliers found
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedSupplier(s)}>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.paymentTerms}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-700">{s.contactPerson}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600">{s.city}, {s.country}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{s.category}</td>
                      <td className="px-4 py-3.5"><StarRating rating={s.rating} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[60px] bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${s.onTimeDelivery >= 90 ? 'bg-green-500' : s.onTimeDelivery >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${s.onTimeDelivery}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{s.onTimeDelivery}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-gray-800">{s.totalOrders}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-gray-900">{formatRWF(s.totalSpend)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status]}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelectedSupplier(s); }} className="p-1.5 text-gray-400 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-colors">
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
            {filteredSuppliers.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                <span>Showing {filteredSuppliers.length} suppliers</span>
              </div>
            )}
          </div>
        )}

        {/* ── CARDS VIEW ─────────────────────────────────────── */}
        {viewMode === 'cards' && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map(s => (
              <div key={s.id} onClick={() => setSelectedSupplier(s)}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center font-bold text-[#1e3a8a] text-lg">
                    {s.name.charAt(0)}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-[#1e3a8a] transition-colors leading-tight">{s.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.category}</p>
                <div className="mt-3 flex items-center gap-2">
                  <StarRating rating={s.rating} />
                  <span className="text-xs text-gray-400">({s.totalOrders} orders)</span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{s.city}, {s.country}</div>
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{s.phone}</div>
                  <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{s.email}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs">
                  <div>
                    <p className="text-gray-400">On-time</p>
                    <p className={`font-bold ${s.onTimeDelivery >= 90 ? 'text-green-600' : s.onTimeDelivery >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{s.onTimeDelivery}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Spend</p>
                    <p className="font-bold text-gray-800">{formatRWF(s.totalSpend)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Terms</p>
                    <p className="font-bold text-gray-800">{s.paymentTerms}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BAR PERFORMANCE VIEW ───────────────────────────── */}
        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Supplier Performance Overview</h3>
            <p className="text-xs text-gray-400 mb-6">On-time delivery, quality, and cost scores (%)</p>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={supplierPerformance} layout="vertical" margin={{ top: 0, right: 30, left: 130, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} width={130} />
                <Tooltip formatter={(v: number) => [`${v}%`]} />
                <Legend />
                <Bar dataKey="onTime" name="On-Time Delivery" fill="#1e3a8a" radius={[0, 4, 4, 0]} />
                <Bar dataKey="quality" name="Quality Score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="cost" name="Cost Competitiveness" fill="#93c5fd" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── RADAR VIEW ─────────────────────────────────────── */}
        {viewMode === 'radar' && (
          <div className="p-6 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 self-start">Top Supplier Scorecard</h3>
            <p className="text-xs text-gray-400 mb-6 self-start">Multi-dimensional performance comparison</p>
            <ResponsiveContainer width="100%" height={380}>
              <RadarChart data={supplierPerformance.slice(0, 3)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="On-Time" dataKey="onTime" stroke="#1e3a8a" fill="#1e3a8a" fillOpacity={0.2} />
                <Radar name="Quality" dataKey="quality" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Radar name="Cost" dataKey="cost" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSupplier(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center font-bold text-[#1e3a8a] text-2xl">
                    {selectedSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedSupplier.name}</h2>
                    <StarRating rating={selectedSupplier.rating} />
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[selectedSupplier.status]}`}>
                  {selectedSupplier.status}
                </span>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Contact Person', value: selectedSupplier.contactPerson },
                { label: 'Email', value: selectedSupplier.email },
                { label: 'Phone', value: selectedSupplier.phone },
                { label: 'Location', value: `${selectedSupplier.city}, ${selectedSupplier.country}` },
                { label: 'Category', value: selectedSupplier.category },
                { label: 'Payment Terms', value: selectedSupplier.paymentTerms },
                { label: 'Total Orders', value: selectedSupplier.totalOrders },
                { label: 'Total Spend', value: formatRWF(selectedSupplier.totalSpend) },
                { label: 'On-Time Delivery', value: `${selectedSupplier.onTimeDelivery}%` },
                { label: 'Last Order', value: selectedSupplier.lastOrderDate },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setSelectedSupplier(null)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-50">
                Close
              </button>
              <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm hover:bg-[#1e40af]">
                Edit Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
