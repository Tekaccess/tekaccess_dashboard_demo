import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Download, Filter, MoreHorizontal,
  LayoutList, BarChart2, TrendingUp, ChevronDown,
  CheckCircle2, Clock, AlertCircle, FileText, Eye, Edit, X
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

type ModalData = { order: PurchaseOrder; mode: 'view' | 'edit' | 'new' } | null;

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(purchaseOrders);
  const [activeTab, setActiveTab] = useState<ActiveTab>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalData>(null);

  const tabs: ActiveTab[] = ['All', 'Active', 'Pending / Draft', 'Overdue', 'Order History'];

  const filteredOrders = useMemo(() => {
    const statusFilter = TAB_STATUS_MAP[activeTab];
    return orders.filter(o => {
      const matchesTab = statusFilter ? statusFilter.includes(o.status) : true;
      const matchesSearch = !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.supplier.toLowerCase().includes(search.toLowerCase()) ||
        o.category.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, search]);

  const handleNewOrder = () => {
    const newPO: any = {
      id: crypto.randomUUID(),
      orderNumber: `PO-${Math.floor(10000 + Math.random() * 90000)}`,
      supplier: '',
      date: new Date().toLocaleDateString(),
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      totalAmount: 0,
      status: 'Draft',
      items: 1,
      category: 'General',
      createdDate: new Date().toLocaleDateString(),
      approvedBy: 'Thierry',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
      shippingAddress: 'Kigali Central Hub, Sector Gishushu'
    };
    setModal({ order: newPO, mode: 'new' });
  };

  const updateDraft = (updates: any) => {
    if (!modal) return;
    const updatedOrder = { ...modal.order, ...updates };

    if (updates.lineItems) {
      updatedOrder.totalAmount = updates.lineItems.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0);
      updatedOrder.items = updates.lineItems.length;
    }

    setModal({ ...modal, order: updatedOrder });
  };

  const handleSaveOrder = () => {
    if (!modal) return;
    if (modal.mode === 'new') {
      setOrders([modal.order, ...orders]);
    } else {
      setOrders(orders.map(o => o.id === modal.order.id ? modal.order : o));
    }
    setModal(null);
  };

  // Summary cards
  const summaryStats = useMemo(() => ({
    total: orders.length,
    active: orders.filter(o => o.status === 'Active').length,
    overdue: orders.filter(o => o.status === 'Overdue').length,
    totalSpend: orders.reduce((sum, o) => sum + o.totalAmount, 0),
  }), [orders]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all procurement orders</p>
        </div>
        <button
          onClick={handleNewOrder}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-md text-sm font-medium hover:bg-[#1e40af] transition-colors"
        >
          <Plus className="w-4 h-4" /> Initialize PO
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
                className={`whitespace-nowrap py-3.5 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                    ? 'border-[#1e3a8a] text-[#1e3a8a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab}
              </button>
            ))}
          </nav>
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
                className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === v.mode
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
        title={modal?.mode === 'new' ? 'Initialize New Purchase Order' : 'Purchase Order Management'}
        currentIndex={modal && modal.mode !== 'new' ? filteredOrders.findIndex(o => o.id === modal.order.id) + 1 : undefined}
        totalItems={filteredOrders.length}
        footerInfo={`System Draft Mode • ${new Date().toLocaleDateString()}`}
        formContent={
          modal && (
            <div className="space-y-8 pb-10">
              {/* Basic Info */}
              <div className="space-y-4">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">General Information</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">PO Reference</label>
                    <input type="text" value={modal.order.orderNumber} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Target Supplier</label>
                    <input
                      type="text"
                      value={modal.order.supplier}
                      onChange={(e) => updateDraft({ supplier: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#1e3a8a]"
                      placeholder="Company Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Shipping Destination</label>
                  <textarea
                    value={(modal.order as any).shippingAddress}
                    onChange={(e) => updateDraft({ shippingAddress: e.target.value } as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Dynamic Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Line Items</label>
                  <button
                    onClick={() => {
                      const items = (modal.order as any).lineItems || [{ description: modal.order.category, quantity: modal.order.items, unitPrice: modal.order.totalAmount / modal.order.items }];
                      updateDraft({ lineItems: [...items, { description: '', quantity: 1, unitPrice: 0 }] } as any);
                    }}
                    className="text-[10px] font-bold text-[#1e3a8a] hover:underline"
                  >
                    + Add Product
                  </button>
                </div>

                <div className="space-y-3">
                  {((modal.order as any).lineItems || [{ description: modal.order.category, quantity: modal.order.items, unitPrice: modal.order.totalAmount / modal.order.items }]).map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Item #{idx + 1}</span>
                        <button
                          onClick={() => {
                            const items = ((modal.order as any).lineItems || []).filter((_: any, i: number) => i !== idx);
                            updateDraft({ lineItems: items } as any);
                          }}
                          className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                      </div>
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const items = [...((modal.order as any).lineItems || [{ description: modal.order.category, quantity: modal.order.items, unitPrice: modal.order.totalAmount / modal.order.items }])];
                          items[idx].description = e.target.value;
                          updateDraft({ lineItems: items } as any);
                        }}
                        className="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm outline-none"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const items = [...((modal.order as any).lineItems || [{ description: modal.order.category, quantity: modal.order.items, unitPrice: modal.order.totalAmount / modal.order.items }])];
                            items[idx].quantity = Number(e.target.value);
                            updateDraft({ lineItems: items } as any);
                          }}
                          className="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const items = [...((modal.order as any).lineItems || [{ description: modal.order.category, quantity: modal.order.items, unitPrice: modal.order.totalAmount / modal.order.items }])];
                            items[idx].unitPrice = Number(e.target.value);
                            updateDraft({ lineItems: items } as any);
                          }}
                          className="w-full bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button
                  onClick={handleSaveOrder}
                  className="w-full py-3 bg-[#1e3a8a] text-white rounded-xl text-sm font-bold shadow-xl shadow-[#1e3a8a]/20 hover:bg-[#1e40af] transition-all"
                >
                  {modal.mode === 'new' ? 'Submit Final Purchase Order' : 'Update Record'}
                </button>
              </div>
            </div>
          )
        }
        previewContent={
          modal && (
            <div className="w-full h-full bg-white flex flex-col font-sans p-12 text-[#1a1a1a] shadow-sm relative group">
              {/* ── ACTION OVERLAY ────────────────────────────────────────── */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 no-print">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-900 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl">
                  Print Order
                </button>
              </div>

              {/* ── HEADER ────────────────────────────────────────────────── */}
              <div className="flex justify-between items-start mb-2">
                <div className="w-48">
                  <img src="/logo.jpg" alt="TEKACCESS" className="w-full h-auto mb-2" />
                </div>
                <div className="text-right text-[11px] leading-tight text-gray-600 font-medium">
                  <p className="font-bold text-gray-800 uppercase tracking-wider">TEKACCESS</p>
                  <p>13 KG 599 St, Gishushu</p>
                  <p>Kigali Rwanda</p>
                </div>
              </div>

              <p className="text-[12px] font-bold text-[#A32424] mb-12 italic">Built on trust. Delivered with Excellence</p>

              {/* ── ADDRESSES ─────────────────────────────────────────────── */}
              <div className="flex justify-between items-start mb-10">
                <div className="text-[12px] max-w-[40%]">
                  <p className="font-bold text-gray-800 uppercase tracking-tighter mb-1">Shipping address</p>
                  <p className="text-gray-600 leading-relaxed">{(modal.order as any).shippingAddress || "N/A"}</p>
                </div>
                <div className="text-right text-[12px] font-bold text-gray-800">
                  <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Supplier Entity</p>
                  <p className="text-lg uppercase tracking-tight">{modal.order.supplier || "DRAFT MODE..."}</p>
                </div>
              </div>

              {/* ── TITLE ─────────────────────────────────────────────────── */}
              <h1 className="text-[26px] font-medium text-[#A32424] mb-8">
                Purchase Order <span className="font-semibold text-gray-800">#{modal.order.orderNumber}</span>
              </h1>

              {/* ── META INFO BAR ─────────────────────────────────────────── */}
              <div className="flex justify-between items-start mb-8 text-[12px] border-y border-gray-100 py-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Authorized Buyer</p>
                  <p className="text-sm font-bold text-gray-800">{modal.order.approvedBy || "Procurement Admin"}</p>
                </div>
                <div className="w-40">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Issue Date</p>
                  <p className="text-sm font-bold text-gray-800">{modal.order.createdDate}</p>
                </div>
                <div className="w-40 text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Exp. Delivery</p>
                  <p className="text-sm font-bold text-gray-800">{modal.order.expectedDate}</p>
                </div>
              </div>

              {/* ── ITEMS TABLE ───────────────────────────────────────────── */}
              <div className="mb-8 border border-gray-800 rounded-sm">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-50/30">
                      <th className="py-2.5 px-4 text-left font-black uppercase tracking-wider border-r border-gray-800 w-1/2">Description</th>
                      <th className="py-2.5 px-4 text-center font-black uppercase tracking-wider border-r border-gray-800">Qty</th>
                      <th className="py-2.5 px-4 text-right font-black uppercase tracking-wider border-r border-gray-800">Unit Price</th>
                      <th className="py-2.5 px-4 text-right font-black uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((modal.order as any).lineItems || [{ description: modal.order.category, quantity: modal.order.items, unitPrice: modal.order.totalAmount / modal.order.items }]).length > 0 ? (
                      ((modal.order as any).lineItems || [{ description: modal.order.category, quantity: modal.order.items, unitPrice: modal.order.totalAmount / modal.order.items }]).map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="py-4 px-4 border-r border-gray-800 font-bold">{item.description || "N/A"}</td>
                          <td className="py-4 px-4 text-center font-medium border-r border-gray-800">{item.quantity}</td>
                          <td className="py-4 px-4 text-right font-medium border-r border-gray-800">{item.unitPrice.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right font-bold">{(item.quantity * item.unitPrice).toLocaleString()} RWF</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-gray-300">
                        <td className="py-12 px-4 text-center text-gray-300 italic uppercase font-black" colSpan={4}>No line items specified</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Total Bar */}
                <div className="flex justify-end items-stretch border-t border-gray-800 bg-[#851C1C] text-white">
                  <div className="py-3 px-8 font-black uppercase border-r border-white/20 tracking-widest">Grand Total Amount</div>
                  <div className="py-3 px-12 font-black text-right min-w-[200px] text-lg tracking-tighter">{modal.order.totalAmount.toLocaleString()} RWF</div>
                </div>
              </div>

              {/* ── FOOTER SECTIONS ───────────────────────────────────────── */}
              <div className="mb-auto">
                <p className="text-[11px] font-black text-gray-400 uppercase mb-2">Conditions of Purchase:</p>
                <ul className="text-[10px] text-gray-500 space-y-1 list-disc pl-4">
                  <li>This order is subject to standard procurement terms of Tekaccess Ltd.</li>
                  <li>Delivery must be made to the shipping address specified above.</li>
                  <li>Invoice must include this PO number for successful processing.</li>
                </ul>
              </div>

              {/* Official Seal / Signature Placeholder */}
              <div className="mt-12 flex justify-between items-end border-t border-gray-100 pt-8">
                <div className="text-center w-40 border-t border-gray-200 pt-2">
                  <p className="text-[9px] font-black uppercase text-gray-400">Authorized Signature</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-full border-4 border-double border-gray-100">
                  <CheckCircle2 className="w-10 h-10 text-green-100" />
                </div>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
