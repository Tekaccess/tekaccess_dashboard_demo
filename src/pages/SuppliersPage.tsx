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
import DocumentSidePanel from '../components/DocumentSidePanel';

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

      {/* ── Standardized Side Panel ─────────────────────────────────────────── */}
      <DocumentSidePanel
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title="Supplier Profile"
        currentIndex={selectedSupplier ? filteredSuppliers.findIndex(s => s.id === selectedSupplier.id) + 1 : undefined}
        totalItems={filteredSuppliers.length}
        onPrev={() => {
          const idx = filteredSuppliers.findIndex(s => s.id === selectedSupplier?.id);
          if (idx > 0) setSelectedSupplier(filteredSuppliers[idx - 1]);
        }}
        onNext={() => {
          const idx = filteredSuppliers.findIndex(s => s.id === selectedSupplier?.id);
          if (idx < filteredSuppliers.length - 1) setSelectedSupplier(filteredSuppliers[idx + 1]);
        }}
        footerInfo={`Supplier since 2024 • Last order on ${selectedSupplier?.lastOrderDate}`}
        formContent={
          selectedSupplier && (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Company Name</label>
                <input 
                  type="text" 
                  defaultValue={selectedSupplier.name}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Primary Contact</label>
                <div className="space-y-3">
                  <input type="text" placeholder="Contact Person" defaultValue={selectedSupplier.contactPerson} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]" />
                  <input type="email" placeholder="Email Address" defaultValue={selectedSupplier.email} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]" />
                  <input type="tel" placeholder="Phone Number" defaultValue={selectedSupplier.phone} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Contract Details</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Payment Terms</label>
                    <div className="relative">
                      <select defaultValue={selectedSupplier.paymentTerms} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs appearance-none outline-none focus:border-[#1e3a8a]">
                        <option>Net 7</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                        <option>Net 45</option>
                        <option>Prepayment</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Status</label>
                    <div className="relative">
                      <select defaultValue={selectedSupplier.status} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs appearance-none outline-none focus:border-[#1e3a8a]">
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>On Hold</option>
                        <option>Blacklisted</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <button className="w-full py-2.5 bg-[#1e3a8a] text-white rounded-lg text-sm font-semibold hover:bg-[#1e40af] shadow-lg shadow-[#1e3a8a]/20 transition-all active:scale-[0.98]">
                  Save Changes
                </button>
              </div>
            </div>
          )
        }
        previewContent={
          selectedSupplier && (
            <div className="relative font-sans text-gray-900">
              {/* Header */}
              <div className="flex justify-between items-start mb-16 pb-8 border-b border-gray-100">
                <div className="flex gap-6">
                  <div className="w-20 h-20 bg-[#1e3a8a] rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-[#1e3a8a]/20 shrink-0">
                    {selectedSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{selectedSupplier.name}</h1>
                    <div className="flex items-center gap-3">
                      <StarRating rating={selectedSupplier.rating} />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 py-1 bg-gray-100 rounded-md">ID: {selectedSupplier.id.padStart(4, '0')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border-2 ${
                    selectedSupplier.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 
                    selectedSupplier.status === 'On Hold' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {selectedSupplier.status}
                  </div>
                </div>
              </div>

              {/* Grid Data */}
              <div className="grid grid-cols-2 gap-x-16 gap-y-12 mb-16">
                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Location Portfolio</label>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg"><MapPin className="w-4 h-4 text-[#1e3a8a]" /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{selectedSupplier.city}, {selectedSupplier.country}</p>
                      <p className="text-xs text-gray-500">Corporate HQ & Regional Hub</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Financial Overview</label>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-black">Total Spend</p>
                      <p className="text-lg font-black text-[#1e3a8a]">{formatRWF(selectedSupplier.totalSpend)}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-black">Orders</p>
                      <p className="text-lg font-black text-gray-900">{selectedSupplier.totalOrders}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Performance Metrics</label>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700">On-Time Delivery</span>
                        <span className="text-xs font-black text-[#1e3a8a]">{selectedSupplier.onTimeDelivery}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1e3a8a] rounded-full transition-all duration-1000" style={{ width: `${selectedSupplier.onTimeDelivery}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700">Service level (SL)</span>
                        <span className="text-xs font-black text-blue-500">92%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: '92%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">Supply Chain Category</label>
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl flex items-center gap-4">
                    <div className="p-2 bg-amber-50 rounded-lg"><Award className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{selectedSupplier.category}</p>
                      <p className="text-xs text-gray-500 underline underline-offset-4 decoration-amber-200">Critical Supplier Tier 1</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Timeline Placeholder */}
              <div>
                <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6">Recent Logistics Pipeline</label>
                <div className="space-y-4">
                  {[
                    { label: 'Bulk Raw Materials Shipment', date: 'Apr 12, 2026', status: 'In Transit', id: 'SHP-9902' },
                    { label: 'Inventory Restock Phase 1', date: 'Mar 28, 2026', status: 'Delivered', id: 'SHP-8211' },
                    { label: 'Q1 Performance Review Meeting', date: 'Mar 15, 2026', status: 'Completed', id: 'EVT-0192' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all cursor-default group">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-[#1e3a8a]" />
                        <div>
                          <p className="text-sm font-bold text-gray-800 group-hover:text-[#1e3a8a] transition-colors">{item.label}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black">{item.id} • {item.date}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase py-1 px-3 bg-white border border-gray-100 rounded-md text-gray-500">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-16 pt-8 border-t border-gray-100 text-[10px] text-gray-400 text-center italic">
                This profile is verified and managed by TEKACCESS Procurement Division.
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
