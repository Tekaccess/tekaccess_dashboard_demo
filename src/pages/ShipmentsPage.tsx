import React, { useState, useMemo } from 'react';
import {
  Plus, MagnifyingGlass, DownloadSimple, Funnel, DotsThree,
  ListDashes, ChartBar, MapPin, Package, Eye,
  CaretDown, Truck, Clock, CheckCircle, Warning, XCircle, Shield
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { shipments, shipmentStatusSummary, Shipment, ShipmentStatus } from '../data/procurement';
import DocumentSidePanel from '../components/DocumentSidePanel';

type ViewMode = 'table' | 'timeline' | 'bar' | 'pie';
type ActiveTab = 'Incoming Shipments' | 'In Transit' | 'Delayed';

const STATUS_CONFIG: Record<ShipmentStatus, { style: string; dot: string; icon: React.ElementType }> = {
  'In Transit': { style: 'bg-[var(--accent-glow)] text-accent border-blue-200', dot: 'bg-[var(--accent-glow)]0', icon: Truck },
  'Delivered': { style: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', icon: CheckCircle },
  'Delayed': { style: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  'Customs Hold': { style: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: Shield },
  'Cancelled': { style: 'bg-surface text-t2 border-[var(--border)]', dot: 'bg-gray-400', icon: XCircle },
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
  const [search, setMagnifyingGlass] = useState('');
  const [selected, setSelected] = useState<Shipment | null>(null);

  const tabs: ActiveTab[] = ['Incoming Shipments', 'In Transit', 'Delayed'];

  const filtered = useMemo(() => {
    const statusFunnel = TAB_FILTER[activeTab];
    return shipments.filter(s => {
      const matchesTab = statusFunnel ? statusFunnel.includes(s.status) : true;
      const q = search.toLowerCase();
      const matchesMagnifyingGlass = !search ||
        s.shipmentNumber.toLowerCase().includes(q) ||
        s.supplier.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.trackingId.toLowerCase().includes(q);
      return matchesTab && matchesMagnifyingGlass;
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
          <h1 className="text-2xl font-bold text-t1">Shipments</h1>
          <p className="text-sm text-t2 mt-0.5">Track incoming and outgoing shipments in real-time</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-h transition-colors">
          <Plus className="w-4 h-4" /> New Shipment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: summary.total, icon: Package, color: 'text-accent', bg: 'bg-[var(--accent-glow)]' },
          { label: 'In Transit', value: summary.inTransit, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Delayed', value: summary.delayed, icon: Warning, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Delivered', value: summary.delivered, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-[var(--border)] p-4 flex items-center gap-4">
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
      <div className="bg-card rounded-xl border border-[var(--border)]">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4">
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
              placeholder="MagnifyingGlass by supplier, tracking ID, origin..."
              value={search}
              onChange={e => setMagnifyingGlass(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-xl text-sm outline-none focus:border-accent focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-xl text-sm text-t2 hover:bg-surface">
            <Funnel className="w-4 h-4" /> Funnel <CaretDown className="w-3.5 h-3.5" />
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-xl text-sm text-t2 hover:bg-surface">
            <DownloadSimple className="w-4 h-4" /> Export
          </button>

          {/* View mode toggle */}
          <div className="flex border border-[var(--border)] rounded-xl overflow-hidden ml-auto">
            {([
              { mode: 'table', icon: ListDashes, label: 'Table' },
              { mode: 'timeline', icon: Clock, label: 'Timeline' },
              { mode: 'bar', icon: ChartBar, label: 'Carriers' },
              { mode: 'pie', icon: Package, label: 'Status' },
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

        {/* ── TABLE VIEW ───────────────────────────── */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-s)]">
              <thead className="bg-surface">
                <tr>
                  {['Shipment #', 'PO Reference', 'Supplier', 'Route', 'Carrier', 'Status', 'Dispatch Date', 'Est. Arrival', 'Packages', 'Weight', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-[var(--border-s)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-t3 text-sm">
                      No shipments found
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => {
                    const cfg = STATUS_CONFIG[s.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={s.id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setSelected(s)}>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-accent">{s.shipmentNumber}</p>
                          <p className="text-xs text-t3 mt-0.5">{s.trackingId}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-t2">{s.poReference}</td>
                        <td className="px-4 py-3.5 text-sm font-medium text-t1">{s.supplier}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-t2">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{s.origin}</span>
                            <span>→</span>
                            <span className="text-t2">{s.destination}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-t2">{s.carrier}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.style}`}>
                            <StatusIcon className="w-3 h-3" />
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-t2">{s.dispatchDate}</td>
                        <td className="px-4 py-3.5">
                          <p className={`text-sm font-medium ${s.status === 'Delayed' ? 'text-amber-600' : 'text-t2'}`}>
                            {s.actualArrival ?? s.estimatedArrival}
                          </p>
                          {s.actualArrival && <p className="text-xs text-green-600">Arrived ✓</p>}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-t2">{s.packages}</td>
                        <td className="px-4 py-3.5 text-sm text-t2">{s.weightKg} kg</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end">
                            <button onClick={e => { e.stopPropagation(); setSelected(s); }} className="p-1.5 text-t3 hover:text-accent hover:bg-[var(--accent-glow)] rounded transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={e => e.stopPropagation()} className="p-1.5 text-t3 hover:text-t2 hover:bg-surface rounded transition-colors">
                              <DotsThree className="w-4 h-4" />
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
            <h3 className="text-sm font-semibold text-t2 mb-4">Shipment Timeline</h3>
            {filtered.map(s => {
              const cfg = STATUS_CONFIG[s.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={s.id} className="flex gap-4 items-start group cursor-pointer" onClick={() => setSelected(s)}>
                  <div className={`mt-1 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.status === 'Delivered' ? 'bg-green-100' : s.status === 'Delayed' ? 'bg-amber-100' : s.status === 'Customs Hold' ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <StatusIcon className={`w-4 h-4 ${s.status === 'Delivered' ? 'text-green-600' : s.status === 'Delayed' ? 'text-amber-600' : s.status === 'Customs Hold' ? 'text-red-600' : 'text-accent'}`} />
                  </div>
                  <div className="flex-1 bg-surface group-hover:bg-[var(--accent-glow)] border border-[var(--border)] group-hover:border-blue-200 rounded-xl p-4 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-t1">{s.shipmentNumber} — {s.supplier}</p>
                        <p className="text-xs text-t2 mt-0.5">{s.origin} → {s.destination} • {s.carrier}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.style}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex gap-6 mt-3 text-xs text-t2">
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
            <h3 className="text-sm font-semibold text-t2 mb-4">Shipments by Carrier</h3>
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
            <h3 className="text-sm font-semibold text-t2 mb-4 self-start">Shipment Status Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={shipmentStatusSummary} cx="50%" cy="50%" outerRadius={110}
                    dataKey="count" nameKey="status"
                    label={false}
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
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: PIE_COLORS[idx] + '20' }}>
                        <Icon className="w-4 h-4" style={{ color: PIE_COLORS[idx] }} />
                      </div>
                      <span className="text-sm text-t2 flex-1">{item.status}</span>
                      <span className="text-lg font-bold text-t1">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Standardized Side Panel ─────────────────────────────────────────── */}
      <DocumentSidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Shipment Lifecycle"
        currentIndex={selected ? filtered.findIndex(s => s.id === selected.id) + 1 : undefined}
        totalItems={filtered.length}
        onPrev={() => {
          const idx = filtered.findIndex(s => s.id === selected?.id);
          if (idx > 0) setSelected(filtered[idx - 1]);
        }}
        onNext={() => {
          const idx = filtered.findIndex(s => s.id === selected?.id);
          if (idx < filtered.length - 1) setSelected(filtered[idx + 1]);
        }}
        footerInfo={`System generated on ${new Date().toLocaleDateString()}`}
        formContent={
          selected && (
            <div className="space-y-6 text-t1">
              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Carrier Logistics</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-[var(--border-s)]">
                    <Truck className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-xs font-bold">{selected.carrier}</p>
                      <p className="text-[10px] text-t3">Primary Carrier assigned</p>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] text-t2 mb-1">Current Status</label>
                    <select defaultValue={selected.status} className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-xl text-sm appearance-none outline-none focus:ring-2 focus:ring-[#1e3a8a]/10">
                      <option>In Transit</option>
                      <option>Delivered</option>
                      <option>Delayed</option>
                      <option>Customs Hold</option>
                      <option>Cancelled</option>
                    </select>
                    <CaretDown className="absolute right-3 bottom-2.5 w-4 h-4 text-t3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Shipment Parameters</label>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-[10px] text-t2 mb-1">Weight (kg)</label>
                    <input type="number" defaultValue={selected.weightKg} className="w-full px-3 py-1.5 border border-[var(--border)] rounded-xl text-xs outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-t2 mb-1">Packages</label>
                    <input type="number" defaultValue={selected.packages} className="w-full px-3 py-1.5 border border-[var(--border)] rounded-xl text-xs outline-none focus:border-accent" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-t3 uppercase tracking-widest mb-3">Routing</label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 text-t3 mt-1" />
                    <div className="flex-1">
                      <p className="text-[10px] text-t3 uppercase font-black">Origin</p>
                      <input type="text" defaultValue={selected.origin} className="w-full mt-1 border-b border-[var(--border-s)] py-1 text-sm outline-none focus:border-accent" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Shield className="w-4 h-4 text-t3 mt-1" />
                    <div className="flex-1">
                      <p className="text-[10px] text-t3 uppercase font-black">Destination</p>
                      <input type="text" defaultValue={selected.destination} className="w-full mt-1 border-b border-[var(--border-s)] py-1 text-sm outline-none focus:border-accent" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                 <button className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-h shadow-lg shadow-[#1e3a8a]/20 transition-all active:scale-[0.98]">
                  Save Manifest Update
                </button>
              </div>
            </div>
          )
        }
        previewContent={
          selected && (
            <div className="relative font-sans text-t1 overflow-hidden">
               {/* Watermark */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] opacity-[0.03] pointer-events-none select-none">
                  <span className="text-9xl font-black">{selected.status.toUpperCase()}</span>
               </div>

               {/* Header Section */}
               <div className="flex justify-between items-start mb-16">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-10 h-10 bg-accent flex items-center justify-center rounded-xl shadow-lg shadow-[#1e3a8a]/20">
                          <Truck className="w-6 h-6 text-white" />
                       </div>
                       <span className="text-2xl font-black tracking-tighter text-accent">TEKLOGISTICS</span>
                    </div>
                    <p className="text-[10px] text-t3 font-bold uppercase tracking-widest">Global Logistics & Supply Chain Unit</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-t3 font-black uppercase mb-1">Shipment ID</p>
                    <p className="text-xl font-black text-t1 tracking-tight">{selected.shipmentNumber}</p>
                    <p className="text-[10px] font-bold text-accent bg-[var(--accent-glow)] px-2 py-0.5 rounded-full inline-block mt-2">{selected.trackingId}</p>
                  </div>
               </div>

               {/* Shipment Route Diagram */}
               <div className="mb-16 bg-surface/50 rounded-2xl p-8 border border-[var(--border-s)] relative overflow-hidden">
                  <div className="flex justify-between relative z-10">
                    <div className="text-center w-1/3">
                       <p className="text-[10px] font-black text-t3 uppercase mb-2">Origin Point</p>
                       <p className="font-bold text-sm text-t1">{selected.origin}</p>
                       <p className="text-[10px] text-t2 mt-1">{selected.dispatchDate}</p>
                    </div>
                    <div className="flex-1 px-4 relative flex items-center justify-center">
                       <div className="w-full h-0.5 bg-dashed border-t-2 border-dashed border-gray-300" />
                       <Truck className={`mx-2 w-5 h-5 ${selected.status === 'Delayed' ? 'text-amber-500' : 'text-accent'}`} />
                       <div className="w-full h-0.5 bg-dashed border-t-2 border-dashed border-gray-300" />
                    </div>
                    <div className="text-center w-1/3">
                       <p className="text-[10px] font-black text-t3 uppercase mb-2">Destination</p>
                       <p className="font-bold text-sm text-t1">{selected.destination}</p>
                       <p className="text-[10px] text-t2 mt-1">{selected.actualArrival ?? selected.estimatedArrival}</p>
                    </div>
                  </div>
               </div>

               {/* Meta Data Grid */}
               <div className="grid grid-cols-3 gap-12 mb-16">
                  <div>
                    <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-3">Carrier Partner</label>
                    <p className="text-sm font-bold text-t1">{selected.carrier}</p>
                    <p className="text-xs text-t2 mt-1">Tier 1 Logistics Affiliate</p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-3">Commercial Ref.</label>
                    <p className="text-sm font-bold text-accent underline underline-offset-4 decoration-blue-100">{selected.poReference}</p>
                    <p className="text-xs text-t2 mt-1">Authorized Purchase Order</p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-3">Manifest Status</label>
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${selected.status === 'Delivered' ? 'bg-green-500' : selected.status === 'Delayed' ? 'bg-amber-500' : 'bg-[var(--accent-glow)]0'}`} />
                       <p className="text-sm font-black text-t1">{selected.status}</p>
                    </div>
                  </div>
               </div>

               {/* Itemized Manifest Table */}
               <div className="mb-12">
                  <label className="block text-[10px] text-t3 font-black uppercase tracking-widest mb-4 italic px-2">Logistics Summary:</label>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900 text-white rounded-xl">
                        <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest rounded-l-lg">Description</th>
                        <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest">Type</th>
                        <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest">Packages</th>
                        <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest rounded-r-lg">Gross Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-s)] font-medium">
                      <tr className="text-sm">
                        <td className="py-6 px-4">Commercial Cargo Component X-Serie</td>
                        <td className="py-6 px-4 text-center text-t3">Regular</td>
                        <td className="py-6 px-4 text-center">{selected.packages} units</td>
                        <td className="py-6 px-4 text-right font-black">{selected.weightKg.toLocaleString()} KG</td>
                      </tr>
                      <tr className="text-sm opacity-20"><td className="py-4 px-4 h-12"></td><td colSpan={3}></td></tr>
                    </tbody>
                  </table>
               </div>

               {/* Footer Disclaimer */}
               <div className="mt-20 border-t-4 border-double border-[var(--border-s)] pt-8 flex justify-between items-end">
                  <div className="w-1/2">
                    <p className="text-[10px] font-black text-t3 uppercase mb-2 underline">Global Terms of carriage:</p>
                    <p className="text-[9px] text-t3 leading-normal italic pr-8">
                       This electronic bill of lading is for tracking purposes only and does not constitute a legal document of title. Goods are shipped under TEKACCESS standard logistics and liability terms.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-t3 uppercase mb-4">Auth. Manifest Release</p>
                    <div className="h-10 w-32 border-b-2 border-gray-300 ml-auto flex items-end justify-center">
                       <span className="font-serif italic text-t3 text-sm">Tek_Official_Release</span>
                    </div>
                  </div>
               </div>
            </div>
          )
        }
      />
    </div>
  );
}
