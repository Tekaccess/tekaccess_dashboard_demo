import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Download, Filter, MoreHorizontal,
  LayoutList, BarChart2, MapPin, Package, Eye,
  ChevronDown, Truck, Clock, CheckCircle2, AlertTriangle, XCircle, Shield
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { shipments, shipmentStatusSummary, Shipment, ShipmentStatus } from '../data/procurement';

type ViewMode = 'table' | 'timeline' | 'bar' | 'pie';
type ActiveTab = 'Incoming Shipments' | 'In Transit' | 'Delayed';

const STATUS_CONFIG: Record<ShipmentStatus, { style: string; dot: string; icon: React.ElementType }> = {
  'In Transit': { style: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: Truck },
  'Delivered': { style: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', icon: CheckCircle2 },
  'Delayed': { style: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  'Customs Hold': { style: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: Shield },
  'Cancelled': { style: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400', icon: XCircle },
};

const TAB_FILTER: Record<ActiveTab, ShipmentStatus[] | null> = {
  'Incoming Shipments': null,
  'In Transit': ['In Transit', 'Customs Hold'],
  'Delayed': ['Delayed'],
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6b7280'];

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Incoming Shipments');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Shipment | null>(null);

  const tabs: ActiveTab[] = ['Incoming Shipments', 'In Transit', 'Delayed'];

  const filtered = useMemo(() => {
    const statusFilter = TAB_FILTER[activeTab];
    return shipments.filter(s => {
      const matchesTab = statusFilter ? statusFilter.includes(s.status) : true;
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        s.shipmentNumber.toLowerCase().includes(q) ||
        s.supplier.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.trackingId.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  const summary = useMemo(() => ({
    total: shipments.length,
    inTransit: shipments.filter(s => s.status === 'In Transit').length,
    delayed: shipments.filter(s => s.status === 'Delayed').length,
    delivered: shipments.filter(s => s.status === 'Delivered').length,
  }), []);

  // Carrier breakdown for bar chart
  const carrierData = useMemo(() => {
    const map: Record<string, number> = {};
    shipments.forEach(s => { map[s.carrier] = (map[s.carrier] || 0) + 1; });
    return Object.entries(map).map(([carrier, count]) => ({ carrier, count }));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track incoming and outgoing shipments in real-time</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm font-medium hover:bg-[#1e40af] transition-colors">
          <Plus className="w-4 h-4" /> New Shipment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: summary.total, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In Transit', value: summary.inTransit, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Delayed', value: summary.delayed, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Delivered', value: summary.delivered, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
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
              placeholder="Search by supplier, tracking ID, origin..."
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

          {/* View mode toggle */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden ml-auto">
            {([
              { mode: 'table', icon: LayoutList, label: 'Table' },
              { mode: 'timeline', icon: Clock, label: 'Timeline' },
              { mode: 'bar', icon: BarChart2, label: 'Carriers' },
              { mode: 'pie', icon: Package, label: 'Status' },
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

        {/* ── TABLE VIEW ───────────────────────────── */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Shipment #', 'PO Reference', 'Supplier', 'Route', 'Carrier', 'Status', 'Dispatch Date', 'Est. Arrival', 'Packages', 'Weight', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-gray-400 text-sm">
                      No shipments found
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => {
                    const cfg = STATUS_CONFIG[s.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(s)}>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-[#1e3a8a]">{s.shipmentNumber}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.trackingId}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{s.poReference}</td>
                        <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{s.supplier}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{s.origin}</span>
                            <span>→</span>
                            <span className="text-gray-700">{s.destination}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{s.carrier}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.style}`}>
                            <StatusIcon className="w-3 h-3" />
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{s.dispatchDate}</td>
                        <td className="px-4 py-3.5">
                          <p className={`text-sm font-medium ${s.status === 'Delayed' ? 'text-amber-600' : 'text-gray-700'}`}>
                            {s.actualArrival ?? s.estimatedArrival}
                          </p>
                          {s.actualArrival && <p className="text-xs text-green-600">Arrived ✓</p>}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700">{s.packages}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-700">{s.weightKg} kg</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end">
                            <button onClick={e => { e.stopPropagation(); setSelected(s); }} className="p-1.5 text-gray-400 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TIMELINE VIEW ──────────────────────────── */}
        {viewMode === 'timeline' && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Shipment Timeline</h3>
            {filtered.map(s => {
              const cfg = STATUS_CONFIG[s.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={s.id} className="flex gap-4 items-start group cursor-pointer" onClick={() => setSelected(s)}>
                  <div className={`mt-1 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.status === 'Delivered' ? 'bg-green-100' : s.status === 'Delayed' ? 'bg-amber-100' : s.status === 'Customs Hold' ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <StatusIcon className={`w-4 h-4 ${s.status === 'Delivered' ? 'text-green-600' : s.status === 'Delayed' ? 'text-amber-600' : s.status === 'Customs Hold' ? 'text-red-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 bg-gray-50 group-hover:bg-blue-50 border border-gray-200 group-hover:border-blue-200 rounded-lg p-4 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.shipmentNumber} — {s.supplier}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.origin} → {s.destination} • {s.carrier}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.style}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex gap-6 mt-3 text-xs text-gray-500">
                      <span>📦 {s.packages} packages | {s.weightKg} kg</span>
                      <span>🚀 Dispatched: {s.dispatchDate}</span>
                      <span>🎯 {s.actualArrival ? `Arrived: ${s.actualArrival}` : `Expected: ${s.estimatedArrival}`}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BAR CHART VIEW ─────────────────────────── */}
        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Shipments by Carrier</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={carrierData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="carrier" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Shipments" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── PIE VIEW ───────────────────────────────── */}
        {viewMode === 'pie' && (
          <div className="p-6 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 self-start">Shipment Status Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={shipmentStatusSummary} cx="50%" cy="50%" outerRadius={110}
                    dataKey="count" nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {shipmentStatusSummary.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {shipmentStatusSummary.map((item, idx) => {
                  const cfg = STATUS_CONFIG[item.status as ShipmentStatus];
                  const Icon = cfg.icon;
                  return (
                    <div key={item.status} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: PIE_COLORS[idx] + '20' }}>
                        <Icon className="w-4 h-4" style={{ color: PIE_COLORS[idx] }} />
                      </div>
                      <span className="text-sm text-gray-700 flex-1">{item.status}</span>
                      <span className="text-lg font-bold text-gray-900">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
                  <h2 className="text-lg font-bold text-gray-900">{selected.shipmentNumber}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Tracking: {selected.trackingId}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[selected.status].style}`}>
                  {selected.status}
                </span>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'PO Reference', value: selected.poReference },
                { label: 'Supplier', value: selected.supplier },
                { label: 'Origin', value: selected.origin },
                { label: 'Destination', value: selected.destination },
                { label: 'Carrier', value: selected.carrier },
                { label: 'Dispatch Date', value: selected.dispatchDate },
                { label: 'Est. Arrival', value: selected.estimatedArrival },
                { label: 'Actual Arrival', value: selected.actualArrival ?? '—' },
                { label: 'Packages', value: selected.packages },
                { label: 'Weight', value: `${selected.weightKg} kg` },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setSelected(null)} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-50">
                Close
              </button>
              <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm hover:bg-[#1e40af]">
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
