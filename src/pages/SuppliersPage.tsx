import React, { useState, useMemo } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, DownloadSimple, Funnel, DotsThree,
  ListDashes, ChartBar, TrendUp, CaretDown,
  Star, Eye, MapPin, Phone, Envelope, Trophy
} from '@phosphor-icons/react';
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
  Inactive: 'bg-surface text-t2 border-border',
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
  const [search, setMagnifyingGlass] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const tabs: ActiveTab[] = ['All Suppliers', 'Performance & Ranking', 'Payment Status'];

  const filteredSuppliers = useMemo(() => suppliers.filter(s => {
    const matchesMagnifyingGlass = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      s.country.toLowerCase().includes(search.toLowerCase());
    return matchesMagnifyingGlass;
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
          <h1 className="text-2xl font-bold text-t1">Suppliers</h1>
          <p className="text-sm text-t2 mt-0.5">Manage supplier relationships and performance</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: summaryStats.total, icon: Trophy, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'Active Suppliers', value: summaryStats.active, icon: Trophy, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg. Rating', value: `${summaryStats.avgRating}/5`, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Spend', value: formatRWF(summaryStats.totalSpend), icon: TrendUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-t2 font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div className="bg-card rounded-xl border border-border">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-border px-4">
          <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-3.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-accent text-accent'
                    : 'border-transparent text-t2 hover:text-t2'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Funnel row */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t3" />
            <input
              type="text"
              placeholder="MagnifyingGlass suppliers..."
              value={search}
              onChange={e => setMagnifyingGlass(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm outline-none focus:border-accent focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-t2 hover:bg-surface">
            <Funnel className="w-4 h-4" /> Funnel <CaretDown className="w-3.5 h-3.5" />
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-t2 hover:bg-surface">
            <DownloadSimple className="w-4 h-4" /> Export
          </button>

          {/* View toggle */}
          <div className="flex border border-border rounded-xl overflow-hidden ml-auto">
            {([
              { mode: 'table', icon: ListDashes, label: 'Table' },
              { mode: 'cards', icon: Trophy, label: 'Cards' },
              { mode: 'bar', icon: ChartBar, label: 'Performance' },
              { mode: 'radar', icon: TrendUp, label: 'Radar' },
            ] as { mode: ViewMode; icon: React.ElementType; label: string }[]).map(v => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                title={v.label}
                className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  viewMode === v.mode
                    ? 'bg-accent text-white'
                    : 'bg-card text-t2 hover:bg-surface'
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
          <OverlayScrollbarsComponent
            options={{ scrollbars: { autoHide: 'scroll' } }}
            defer
          >
            <table className="min-w-full divide-y divide-border-s">
              <thead className="bg-surface">
                <tr>
                  {['Supplier Name', 'Contact', 'Country', 'Category', 'Rating', 'On-Time %', 'Total Orders', 'Total Spend', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border-s">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-t3 text-sm">
                      No suppliers found
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setSelectedSupplier(s)}>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-semibold text-t1">{s.name}</p>
                          <p className="text-xs text-t3 mt-0.5">{s.paymentTerms}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-t2">{s.contactPerson}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-t3" />
                          <span className="text-sm text-t2">{s.city}, {s.country}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-t2">{s.category}</td>
                      <td className="px-4 py-3.5"><StarRating rating={s.rating} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[60px] bg-surface rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${s.onTimeDelivery >= 90 ? 'bg-green-500' : s.onTimeDelivery >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${s.onTimeDelivery}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-t2">{s.onTimeDelivery}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-t1">{s.totalOrders}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-t1">{formatRWF(s.totalSpend)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status]}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => { e.stopPropagation(); setSelectedSupplier(s); }} className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={e => e.stopPropagation()} className="p-1.5 text-t3 hover:text-t2 hover:bg-surface rounded transition-colors">
                            <DotsThree className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredSuppliers.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-s text-xs text-t2">
                <span>Showing {filteredSuppliers.length} suppliers</span>
              </div>
            )}
          </OverlayScrollbarsComponent>
        )}

        {/* ── CARDS VIEW ─────────────────────────────────────── */}
        {viewMode === 'cards' && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map(s => (
              <div key={s.id} onClick={() => setSelectedSupplier(s)}
                className="border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center font-bold text-accent text-lg">
                    {s.name.charAt(0)}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <h3 className="font-semibold text-t1 group-hover:text-accent transition-colors leading-tight">{s.name}</h3>
                <p className="text-xs text-t2 mt-1">{s.category}</p>
                <div className="mt-3 flex items-center gap-2">
                  <StarRating rating={s.rating} />
                  <span className="text-xs text-t3">({s.totalOrders} orders)</span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-t2">
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{s.city}, {s.country}</div>
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{s.phone}</div>
                  <div className="flex items-center gap-1.5"><Envelope className="w-3.5 h-3.5" />{s.email}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-border-s flex justify-between text-xs">
                  <div>
                    <p className="text-t3">On-time</p>
                    <p className={`font-bold ${s.onTimeDelivery >= 90 ? 'text-green-600' : s.onTimeDelivery >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{s.onTimeDelivery}%</p>
                  </div>
                  <div>
                    <p className="text-t3">Total Spend</p>
                    <p className="font-bold text-t1">{formatRWF(s.totalSpend)}</p>
                  </div>
                  <div>
                    <p className="text-t3">Terms</p>
                    <p className="font-bold text-t1">{s.paymentTerms}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BAR PERFORMANCE VIEW ───────────────────────────── */}
        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-1">Supplier Performance Overview</h3>
            <p className="text-xs text-t3 mb-6">On-time delivery, quality, and cost scores (%)</p>
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
            <h3 className="text-sm font-semibold text-t2 mb-1 self-start">Top Supplier Scorecard</h3>
            <p className="text-xs text-t3 mb-6 self-start">Multi-dimensional performance comparison</p>
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
                <label className="block text-[11px] font-bold text-t3 uppercase tracking-wider mb-2">Company Name</label>
                <input 
                  type="text" 
                  defaultValue={selectedSupplier.name}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-accent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-t3 uppercase tracking-wider mb-2">Primary Contact</label>
                <div className="space-y-3">
                  <input type="text" placeholder="Contact Person" defaultValue={selectedSupplier.contactPerson} className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none focus:border-accent" />
                  <input type="email" placeholder="Email Address" defaultValue={selectedSupplier.email} className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none focus:border-accent" />
                  <input type="tel" placeholder="Phone Number" defaultValue={selectedSupplier.phone} className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm outline-none focus:border-accent" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-t3 uppercase tracking-wider mb-2">Contract Details</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-t2 mb-1">Payment Terms</label>
                    <div className="relative">
                      <select defaultValue={selectedSupplier.paymentTerms} className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs appearance-none outline-none focus:border-accent">
                        <option>Net 7</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                        <option>Net 45</option>
                        <option>Prepayment</option>
                      </select>
                      <CaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-t3 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-t2 mb-1">Status</label>
                    <div className="relative">
                      <select defaultValue={selectedSupplier.status} className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs appearance-none outline-none focus:border-accent">
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>On Hold</option>
                        <option>Blacklisted</option>
                      </select>
                      <CaretDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-t3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <button className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-h shadow-lg shadow-[#1e3a8a]/20 transition-all active:scale-[0.98]">
                  Save Changes
                </button>
              </div>
            </div>
          )
        }
        previewContent={
          selectedSupplier && (
            <div className="relative font-sans text-t1">
              {/* Header */}
              <div className="flex justify-between items-start mb-16 pb-8 border-b border-border-s">
                <div className="flex gap-6">
                  <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-[#1e3a8a]/20 shrink-0">
                    {selectedSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-3xl font-black text-t1 tracking-tight mb-2">{selectedSupplier.name}</h1>
                    <div className="flex items-center gap-3">
                      <StarRating rating={selectedSupplier.rating} />
                      <span className="text-xs font-bold text-t3 uppercase tracking-widest px-2 py-1 bg-surface rounded-xl">ID: {selectedSupplier.id.padStart(4, '0')}</span>
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
                  <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-4">Location Portfolio</label>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-accent-glow rounded-xl"><MapPin className="w-4 h-4 text-accent" /></div>
                    <div>
                      <p className="text-sm font-bold text-t1">{selectedSupplier.city}, {selectedSupplier.country}</p>
                      <p className="text-xs text-t2">Corporate HQ & Regional Hub</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-4">Financial Overview</label>
                  <div className="flex items-center justify-between p-4 bg-surface rounded-xl">
                    <div>
                      <p className="text-[10px] text-t3 uppercase font-black">Total Spend</p>
                      <p className="text-lg font-black text-accent">{formatRWF(selectedSupplier.totalSpend)}</p>
                    </div>
                    <div className="w-px h-8 bg-surface-hover" />
                    <div className="text-right">
                      <p className="text-[10px] text-t3 uppercase font-black">Orders</p>
                      <p className="text-lg font-black text-t1">{selectedSupplier.totalOrders}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-4">Performance Metrics</label>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-t2">On-Time Delivery</span>
                        <span className="text-xs font-black text-accent">{selectedSupplier.onTimeDelivery}%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${selectedSupplier.onTimeDelivery}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-t2">Service level (SL)</span>
                        <span className="text-xs font-black text-blue-500">92%</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-accent-glow0 rounded-full transition-all duration-1000" style={{ width: '92%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-4">Supply Chain Category</label>
                  <div className="p-4 border-2 border-dashed border-border rounded-xl flex items-center gap-4">
                    <div className="p-2 bg-amber-50 rounded-xl"><Trophy className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <p className="text-sm font-bold text-t1">{selectedSupplier.category}</p>
                      <p className="text-xs text-t2 underline underline-offset-4 decoration-amber-200">Critical Supplier Tier 1</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pulse Timeline Placeholder */}
              <div>
                <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-6">Recent Logistics Pipeline</label>
                <div className="space-y-4">
                  {[
                    { label: 'Bulk Raw Materials Shipment', date: 'Apr 12, 2026', status: 'In Transit', id: 'SHP-9902' },
                    { label: 'Inventory Restock Phase 1', date: 'Mar 28, 2026', status: 'Delivered', id: 'SHP-8211' },
                    { label: 'Q1 Performance Review Meeting', date: 'Mar 15, 2026', status: 'Completed', id: 'EVT-0192' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-surface rounded-xl border border-transparent hover:border-border-s transition-all cursor-default group">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <div>
                          <p className="text-sm font-bold text-t1 group-hover:text-accent transition-colors">{item.label}</p>
                          <p className="text-[10px] text-t3 uppercase font-black">{item.id} • {item.date}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase py-1 px-3 bg-card border border-border-s rounded-xl text-t2">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-16 pt-8 border-t border-border-s text-[10px] text-t3 text-center italic">
                This profile is verified and managed by TEKACCESS Procurement Division.
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
