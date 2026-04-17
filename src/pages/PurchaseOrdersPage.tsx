import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Download, Filter, MoreHorizontal,
  LayoutList, BarChart2, TrendingUp, ChevronDown,
  CheckCircle2, Clock, AlertCircle, FileText, Eye, Edit
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import {
  purchaseOrders, poMonthlyVolume, poCategoryBreakdown,
  PurchaseOrder, PurchaseOrderStatus
} from '../data/procurement';
import DocumentSidePanel from '../components/DocumentSidePanel';

type ViewMode = 'table' | 'bar' | 'trend' | 'pie';
type ActiveTab = 'All' | 'Active' | 'Pending / Draft' | 'Overdue' | 'Order History';

const STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Draft: 'bg-gray-100 text-gray-600 border-gray-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_DOT: Record<PurchaseOrderStatus, string> = {
  Active: 'bg-green-500',
  Pending: 'bg-yellow-500',
  Draft: 'bg-gray-400',
  Overdue: 'bg-red-500',
  Completed: 'bg-blue-500',
};

const TAB_STATUS_MAP: Record<ActiveTab, PurchaseOrderStatus[] | null> = {
  'All': null,
  'Active': ['Active'],
  'Pending / Draft': ['Pending', 'Draft'],
  'Overdue': ['Overdue'],
  'Order History': ['Completed'],
};

const CHART_COLORS = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

function formatRWF(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M RWF`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K RWF`;
  return `${value} RWF`;
}

type ModalData = { order: PurchaseOrder; mode: 'view' | 'edit' } | null;

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalData>(null);

  const tabs: ActiveTab[] = ['All', 'Active', 'Pending / Draft', 'Overdue', 'Order History'];

  const filteredOrders = useMemo(() => {
    const statusFilter = TAB_STATUS_MAP[activeTab];
    return purchaseOrders.filter(o => {
      const matchesTab = statusFilter ? statusFilter.includes(o.status) : true;
      const matchesSearch = !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.supplier.toLowerCase().includes(search.toLowerCase()) ||
        o.category.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  // Summary cards
  const summaryStats = useMemo(() => ({
    total: purchaseOrders.length,
    active: purchaseOrders.filter(o => o.status === 'Active').length,
    overdue: purchaseOrders.filter(o => o.status === 'Overdue').length,
    totalSpend: purchaseOrders.reduce((sum, o) => sum + o.totalAmount, 0),
  }), []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all procurement orders</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm font-medium hover:bg-[#1e40af] transition-colors">
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: summaryStats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Orders', value: summaryStats.active, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Overdue', value: summaryStats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
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

      {/* Toolbar: Tabs + View Toggle + Search + Actions */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tabs row */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4">
          <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-3.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[#1e3a8a] text-[#1e3a8a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <button className="ml-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a8a] text-white text-xs font-medium rounded-md hover:bg-[#1e40af] transition-colors shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </button>
        </div>

        {/* Filter / Search / View Toggle row */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" /> Filter <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>

          {/* View mode toggle */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden ml-auto">
            {([
              { mode: 'table', icon: LayoutList, label: 'Table' },
              { mode: 'bar', icon: BarChart2, label: 'Bar Chart' },
              { mode: 'trend', icon: TrendingUp, label: 'Trend' },
              { mode: 'pie', icon: BarChart2, label: 'Pie' },
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

        {/* ── TABLE VIEW ─────────────────────────────────────────────── */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Order #', 'Supplier', 'Category', 'Items', 'Total Amount', 'Status', 'Expected Date', 'Approved By', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-gray-400 text-sm">
                      No orders match your criteria
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setModal({ order, mode: 'view' })}
                    >
                      <td className="px-4 py-3.5 text-sm font-semibold text-[#1e3a8a]">{order.orderNumber}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{order.supplier}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{order.category}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-900 font-medium">{order.items}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-gray-900">{formatRWF(order.totalAmount)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[order.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{order.expectedDate}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{order.approvedBy}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setModal({ order, mode: 'view' }); }}
                            className="p-1.5 text-gray-400 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setModal({ order, mode: 'edit' }); }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="More"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredOrders.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                <span>Showing {filteredOrders.length} of {purchaseOrders.length} orders</span>
                <div className="flex gap-1">
                  <button className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50">Previous</button>
                  <button className="px-2.5 py-1 bg-[#1e3a8a] text-white rounded">1</button>
                  <button className="px-2.5 py-1 border border-gray-200 rounded hover:bg-gray-50">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BAR CHART VIEW ─────────────────────────────────────────── */}
        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Order Volume & Spend</h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={poMonthlyVolume} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'amount' ? [`${(value / 1_000_000).toFixed(1)}M RWF`, 'Spend'] : [value, 'Orders']
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="amount" name="amount" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── TREND LINE VIEW ────────────────────────────────────────── */}
        {viewMode === 'trend' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Procurement Spend Trend (RWF)</h3>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={poMonthlyVolume} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => [`${(v / 1_000_000).toFixed(1)}M RWF`, 'Spend']} />
                <Line
                  type="monotone" dataKey="amount" stroke="#1e3a8a" strokeWidth={2.5}
                  dot={{ fill: '#1e3a8a', r: 5 }} activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── PIE / CATEGORY VIEW ────────────────────────────────────── */}
        {viewMode === 'pie' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Breakdown by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={poCategoryBreakdown} cx="50%" cy="50%" outerRadius={110}
                    dataKey="value" label={({ category, value }) => `${category} ${value}%`}
                    labelLine={false}
                  >
                    {poCategoryBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {poCategoryBreakdown.map((item, idx) => (
                <div key={item.category} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx] }} />
                  <span className="text-sm text-gray-700 flex-1">{item.category}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 mx-2">
                    <div className="h-2 rounded-full" style={{ width: `${item.value}%`, backgroundColor: CHART_COLORS[idx] }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 w-8 text-right">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Standardized Side Panel ─────────────────────────────────────────── */}
      <DocumentSidePanel
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'view' ? 'Purchase Order Detail' : 'Edit Order'}
        currentIndex={modal ? filteredOrders.findIndex(o => o.id === modal.order.id) + 1 : undefined}
        totalItems={filteredOrders.length}
        onPrev={() => {
          const idx = filteredOrders.findIndex(o => o.id === modal?.order.id);
          if (idx > 0) setModal({ order: filteredOrders[idx - 1], mode: modal?.mode || 'view' });
        }}
        onNext={() => {
          const idx = filteredOrders.findIndex(o => o.id === modal?.order.id);
          if (idx < filteredOrders.length - 1) setModal({ order: filteredOrders[idx + 1], mode: modal?.mode || 'view' });
        }}
        footerInfo={`System record ID: PO-${modal?.order.id.slice(0, 8).toUpperCase()}`}
        formContent={
          modal && (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Order Particulars</label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">PO Number</label>
                    <input 
                      type="text" 
                      defaultValue={modal.order.orderNumber} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a] transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Associated Supplier</label>
                    <div className="relative">
                      <select 
                        defaultValue={modal.order.supplier}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:border-[#1e3a8a] outline-none"
                      >
                        <option>{modal.order.supplier}</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Logistics & Delivery</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Fulfillment Date</label>
                    <input type="date" defaultValue={modal.order.expectedDate} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none" />
                  </div>
                   <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Destination Warehouse</label>
                    <input type="text" defaultValue="Kigali Central Hub" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button className="w-full py-3 bg-[#1e3a8a] text-white rounded-xl text-sm font-bold shadow-xl shadow-[#1e3a8a]/20 hover:bg-[#1e40af] transition-all">
                  Commit Documentation Changes
                </button>
              </div>
            </div>
          )
        }
        previewContent={
          modal && (
            <div className="relative w-full h-full bg-gray-200/50 rounded-sm overflow-hidden flex flex-col">
               {/* PDF Overlay Interaction Layer */}
               <div className="bg-[#2a2a2e] text-white px-4 py-2.5 flex justify-between items-center shrink-0 shadow-lg">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="bg-red-500 p-1 rounded">
                       <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold tracking-wide uppercase">Original Purchase Order Document</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded">PDF Mode</span>
                    <button className="p-1 hover:bg-white/10 rounded transition-colors"><Download className="w-4 h-4 text-blue-400" /></button>
                  </div>
               </div>

               {/* Document Canvas */}
               <div className="relative flex-1 overflow-auto p-12 flex justify-center bg-gray-600/20 backdrop-blur-md">
                  <div className="relative w-full max-w-[800px] h-[1050px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                     {/* The Actual PDF File */}
                     <iframe 
                        src={`/documents/Purchase Order.pdf#toolbar=0&navpanes=0&scrollbar=0`}
                        className="w-full h-full border-none pointer-events-none"
                        title="Embedded PO PDF"
                     />

                     {/* ── REACTIVE DATA TOP-LAYER ───────────────────────────── */}
                     {/* We position these fields to align with your PDF boxes */}
                     <div className="absolute inset-0 pointer-events-none select-none">
                        <div className="absolute top-[18.2%] left-[64%] text-[14px] font-black text-gray-900">
                           {modal.order.orderNumber}
                        </div>
                        <div className="absolute top-[21.8%] left-[64%] text-[12px] font-bold text-gray-700">
                           {modal.order.createdDate}
                        </div>
                        <div className="absolute top-[17.5%] left-[10.5%]">
                           <p className="text-[14px] font-black text-[#1e3a8a] uppercase">{modal.order.supplier}</p>
                           <p className="text-[9px] font-bold text-gray-400 mt-0.5 tracking-widest">VERIFIED SUPPLIER GATEWAY</p>
                        </div>
                        
                        {/* Table Mockup Overlay */}
                        <div className="absolute top-[35.5%] left-[10.5%] w-[79%]">
                           <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                              <span className="text-[11px] font-black text-gray-800 uppercase">{modal.order.category} Industrial Supply Batch</span>
                              <span className="text-[11px] font-bold text-gray-900">{formatRWF(modal.order.totalAmount)}</span>
                           </div>
                        </div>

                        {/* Grand Total Placement */}
                        <div className="absolute bottom-[20%] right-[10.5%] text-right">
                           <div className="px-6 py-4 bg-gray-900 text-white rounded-lg shadow-xl">
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-gray-400">Net Payable Amount</p>
                              <p className="text-2xl font-black">{formatRWF(modal.order.totalAmount)}</p>
                           </div>
                        </div>
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
