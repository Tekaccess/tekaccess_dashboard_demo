import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import {
  Plus, MagnifyingGlass, DownloadSimple, Funnel,
  ListDashes, ChartBar, TrendUp, CaretDown,
  CheckCircle, Warning, FileText, Eye, PencilSimple, X,
  Spinner, Package, UserPlus, Trash,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddClient from '../components/QuickAddClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import DocumentSidePanel from '../components/DocumentSidePanel';
import DatePicker from '../components/ui/DatePicker';
import SearchSelect, { SearchSelectOption } from '../components/ui/SearchSelect';
import {
  apiListSuppliers, apiListContractsForPO, apiListCurrencies,
  apiListProjects, apiListClients, apiListStockItems,
  apiListPurchaseOrders, apiCreatePurchaseOrder, apiUpdatePurchaseOrder, apiDeletePurchaseOrder,
  apiListProducts, apiListWarehouses,
  Supplier, Contract, Currency, Project, Client, StockItem, PurchaseOrder, POLineItem,
  Product, Warehouse,
} from '../lib/api';

type ViewMode = 'table' | 'bar' | 'trend' | 'pie';
type ActiveTab = 'All' | 'Active' | 'Pending / Draft' | 'Overdue' | 'Order History';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-surface text-t3 border-border',
  approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sent_to_supplier: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  partially_received: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  fully_received: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  closed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-t3',
  approved: 'bg-blue-400',
  sent_to_supplier: 'bg-amber-500',
  partially_received: 'bg-orange-500',
  fully_received: 'bg-emerald-500',
  closed: 'bg-blue-400',
  cancelled: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  sent_to_supplier: 'Sent to Supplier',
  partially_received: 'Partially Received',
  fully_received: 'Fully Received',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const TAB_STATUS_MAP: Record<ActiveTab, string[] | null> = {
  'All': null,
  'Active': ['approved', 'sent_to_supplier'],
  'Pending / Draft': ['draft'],
  'Overdue': ['sent_to_supplier', 'partially_received'],
  'Order History': ['fully_received', 'closed', 'cancelled'],
};

const CHART_COLORS = ['#4285f4', '#93bbfa', '#bfd0fc', '#d5e4ff', '#e8f0ff'];

const UNIT_OPTIONS: SearchSelectOption[] = [
  { value: 'grams', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'tons', label: 'Tons (t)' },
  { value: 'litres', label: 'Litres (L)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'units', label: 'Units' },
  { value: 'boxes', label: 'Boxes' },
];

function formatCurrency(value: number, code = 'RWF'): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${code}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ${code}`;
  return `${value.toLocaleString()} ${code}`;
}

// ─── Empty Line Item ──────────────────────────────────────────────────────────

function emptyLineItem(): DraftLineItem {
  return {
    _key: crypto.randomUUID(),
    stockItemId: null,
    productId: null,
    productName: null,
    description: '',
    analyticProjectId: null,
    analyticProjectName: null,
    unit: 'kg',
    orderedQty: 1,
    unitPrice: 0,
    taxRateId: null,
    taxRateName: null,
    taxRatePercentage: 0,
  };
}

interface DraftLineItem {
  _key: string;
  stockItemId: string | null;
  itemCode?: string | null;
  productId?: string | null;
  productName?: string | null;
  description: string;
  analyticProjectId: string | null;
  analyticProjectName: string | null;
  unit: string;
  orderedQty: number;
  unitPrice: number;
  taxRateId: string | null;
  taxRateName: string | null;
  taxRatePercentage: number;
}

interface DraftPO {
  supplierId: string;
  supplierName: string;
  vendorReference: string;
  contractId: string;
  contractRef: string;
  contractTitle: string;
  currency: string;
  orderDeadline: Date | null;
  expectedDeliveryDate: Date | null;
  deliverToClientId: string;
  deliverToClientName: string;
  procurementType: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  lineItems: DraftLineItem[];
  notes: string;
  // Weighbridge / Supporting Doc fields
  grossWeight?: number;
  tareWeight?: number;
  deductionWeight?: number;
  netWeight?: number;
  truckPlate?: string;
  driverName?: string;
  pickupCode?: string;
}

function emptyDraft(): DraftPO {
  return {
    supplierId: '',
    supplierName: '',
    vendorReference: '',
    contractId: '',
    contractRef: '',
    contractTitle: '',
    currency: 'RWF',
    orderDeadline: null,
    expectedDeliveryDate: null,
    deliverToClientId: '',
    deliverToClientName: '',
    procurementType: 'general',
    destinationWarehouseId: '',
    destinationWarehouseName: '',
    lineItems: [emptyLineItem()],
    notes: '',
    grossWeight: 0,
    tareWeight: 0,
    deductionWeight: 0,
    netWeight: 0,
    truckPlate: '',
    driverName: '',
    pickupCode: '',
  };
}

// ─── Computed Totals ──────────────────────────────────────────────────────────

function computeLineItem(item: DraftLineItem) {
  const lineSubtotal = Number(item.orderedQty) * Number(item.unitPrice);
  const taxAmount = lineSubtotal * (Number(item.taxRatePercentage) / 100);
  return { lineSubtotal, taxAmount, lineTotal: lineSubtotal + taxAmount };
}

type ModalState =
  | { mode: 'new'; draft: DraftPO }
  | { mode: 'view' | 'edit'; order: PurchaseOrder; draft?: DraftPO }
  | null;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Data from API
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Load reference data
  useEffect(() => {
    Promise.all([
      apiListSuppliers().then(r => r.success && setSuppliers(r.data.suppliers)),
      apiListContractsForPO().then(r => r.success && setContracts(r.data.contracts)),
      apiListCurrencies().then(r => r.success && setCurrencies(r.data.currencies)),
      apiListProjects().then(r => r.success && setProjects(r.data.projects)),
      apiListClients().then(r => r.success && setClients(r.data.clients)),
      apiListStockItems().then(r => r.success && setStockItems(r.data.items)),
      apiListProducts().then(r => r.success && setProducts(r.data.products)),
      apiListWarehouses().then(r => r.success && setWarehouses(r.data.warehouses)),
    ]);
  }, []);

  // Load purchase orders
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const res = await apiListPurchaseOrders({ limit: '200' });
    if (res.success) setOrders(res.data.orders);
    setLoadingOrders(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Option lists for dropdowns
  const supplierOptions = useMemo<SearchSelectOption[]>(() =>
    suppliers.map(s => ({ value: s._id, label: s.name, sublabel: s.supplierCode, meta: s.country })),
    [suppliers]
  );

  const contractOptions = useMemo<SearchSelectOption[]>(() =>
    contracts.map(c => ({ value: c._id, label: c.contractRef, sublabel: c.title, meta: c.clientName })),
    [contracts]
  );

  // Currency shows abbreviation only — clean and compact
  const currencyOptions = useMemo<SearchSelectOption[]>(() =>
    currencies.map(c => ({ value: c.code, label: c.code, meta: c.symbol })),
    [currencies]
  );

  const projectOptions = useMemo<SearchSelectOption[]>(() =>
    projects.map(p => ({ value: p._id, label: p.name, sublabel: p.projectCode, meta: p.department })),
    [projects]
  );

  const clientOptions = useMemo<SearchSelectOption[]>(() =>
    clients.map(c => ({ value: c._id, label: c.name, sublabel: c.clientCode, meta: c.country })),
    [clients]
  );

  const stockOptions = useMemo<SearchSelectOption[]>(() =>
    stockItems.map(s => ({ value: s._id, label: s.name, sublabel: s.itemCode, meta: `${s.availableQty} ${s.stockUnit}` })),
    [stockItems]
  );

  const productOptions = useMemo<SearchSelectOption[]>(() =>
    products.map(p => ({ value: p._id, label: p.name, meta: `${p.cost_per_unit.toLocaleString()} ${p.currency}` })),
    [products]
  );

  const warehouseOptions = useMemo<SearchSelectOption[]>(() =>
    warehouses.map(w => ({ value: w._id, label: w.name, sublabel: w.warehouseCode })),
    [warehouses]
  );

  // Filter orders
  const filteredOrders = useMemo(() => {
    const statusFilter = TAB_STATUS_MAP[activeTab];
    return orders.filter(o => {
      const matchesTab = statusFilter ? statusFilter.includes(o.status) : true;
      const matchesSearch = !search ||
        o.poRef.toLowerCase().includes(search.toLowerCase()) ||
        o.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        (o.deliverToClientName || '').toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, search]);

  // Summary stats
  const summaryStats = useMemo(() => ({
    total: orders.length,
    active: orders.filter(o => ['approved', 'sent_to_supplier'].includes(o.status)).length,
    overdue: orders.filter(o => o.status === 'sent_to_supplier').length,
    totalSpend: orders.reduce((s, o) => s + o.totalValueWithTax, 0),
    currency: orders[0]?.currency || 'RWF',
  }), [orders]);

  // ─── Draft management ───────────────────────────────────────────────────────

  const draft = useMemo<DraftPO | null>(() => {
    if (!modal) return null;
    if (modal.mode === 'new') return modal.draft;
    if (modal.mode === 'edit') return modal.draft || null;
    return null;
  }, [modal]);

  function updateDraft(updates: Partial<DraftPO>) {
    setModal(prev => {
      if (!prev) return prev;
      if (prev.mode === 'new') return { ...prev, draft: { ...prev.draft, ...updates } };
      if (prev.mode === 'edit') return { ...prev, draft: { ...(prev.draft || emptyDraft()), ...updates } };
      return prev;
    });
  }

  function updateLineItem(key: string, updates: Partial<DraftLineItem>) {
    if (!draft) return;
    updateDraft({
      lineItems: draft.lineItems.map(item =>
        item._key === key ? { ...item, ...updates } : item
      ),
    });
  }

  function addLineItem() {
    if (!draft) return;
    updateDraft({ lineItems: [...draft.lineItems, emptyLineItem()] });
  }

  function removeLineItem(key: string) {
    if (!draft) return;
    if (draft.lineItems.length <= 1) return;
    updateDraft({ lineItems: draft.lineItems.filter(i => i._key !== key) });
  }

  // Totals from draft
  const draftTotals = useMemo(() => {
    if (!draft) return { subtotal: 0, tax: 0, total: 0 };
    const subtotal = draft.lineItems.reduce((s, i) => s + computeLineItem(i).lineSubtotal, 0);
    const tax = draft.lineItems.reduce((s, i) => s + computeLineItem(i).taxAmount, 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [draft]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  function handleNewOrder() {
    setSaveError(null);
    setModal({ mode: 'new', draft: emptyDraft() });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiDeletePurchaseOrder(deleteTarget._id);
      setDeleteTarget(null);
      await loadOrders();
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEdit(order: PurchaseOrder) {
    setSaveError(null);
    const d: DraftPO = {
      supplierId: typeof order.supplierId === 'string' ? order.supplierId : order.supplierId._id,
      supplierName: order.supplierName,
      vendorReference: order.vendorReference || '',
      contractId: order.contractId || '',
      contractRef: order.contractRef || '',
      contractTitle: order.contractTitle || '',
      currency: order.currency,
      orderDeadline: order.orderDeadline ? new Date(order.orderDeadline) : null,
      expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null,
      deliverToClientId: order.deliverToClientId || '',
      deliverToClientName: order.deliverToClientName || '',
      procurementType: order.procurementType,
      destinationWarehouseId: order.destinationWarehouseId || '',
      destinationWarehouseName: order.destinationWarehouseName || '',
      lineItems: order.lineItems.map(li => ({
        _key: crypto.randomUUID(),
        stockItemId: li.stockItemId || null,
        itemCode: li.itemCode || null,
        productId: li.productId || null,
        productName: li.productName || null,
        description: li.description,
        analyticProjectId: li.analyticProjectId || null,
        analyticProjectName: li.analyticProjectName || null,
        unit: li.unit,
        orderedQty: li.orderedQty,
        unitPrice: li.unitPrice,
        taxRateId: li.taxRateId || null,
        taxRateName: li.taxRateName || null,
        taxRatePercentage: li.taxRatePercentage,
      })),
      notes: order.notes || '',
    };
    setModal({ mode: 'edit', order, draft: d });
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.supplierId) { setSaveError('Please select a supplier.'); return; }
    if (draft.procurementType === 'trading' && !draft.destinationWarehouseId) { setSaveError('A destination warehouse is required for trading POs.'); return; }
    if (draft.procurementType === 'trading' && draft.lineItems.some(i => !i.productId)) { setSaveError('All line items on a trading PO must have a product selected.'); return; }
    if (draft.lineItems.some(i => !i.productId)) { setSaveError('All line items must have a product selected.'); return; }
    if (draft.lineItems.some(i => i.orderedQty <= 0)) { setSaveError('All quantities must be greater than 0.'); return; }

    setSaving(true);
    setSaveError(null);

    const payload = {
      supplierId: draft.supplierId,
      supplierName: draft.supplierName,
      vendorReference: draft.vendorReference || null,
      contractId: draft.contractId || null,
      contractRef: draft.contractRef || null,
      contractTitle: draft.contractTitle || null,
      deliverToClientId: draft.deliverToClientId || null,
      deliverToClientName: draft.deliverToClientName || null,
      currency: draft.currency,
      procurementType: draft.procurementType,
      destinationWarehouseId: draft.destinationWarehouseId || null,
      destinationWarehouseName: draft.destinationWarehouseName || null,
      orderDeadline: draft.orderDeadline ? draft.orderDeadline.toISOString() : null,
      expectedDeliveryDate: draft.expectedDeliveryDate ? draft.expectedDeliveryDate.toISOString() : null,
      notes: draft.notes || null,
      lineItems: draft.lineItems.map((item, idx) => {
        const { lineSubtotal, taxAmount, lineTotal } = computeLineItem(item);
        return {
          lineNumber: idx + 1,
          description: item.description,
          stockItemId: item.stockItemId || null,
          itemCode: item.itemCode || null,
          productId: item.productId || null,
          productName: item.productName || null,
          analyticProjectId: item.analyticProjectId || null,
          analyticProjectName: item.analyticProjectName || null,
          unit: item.unit,
          orderedQty: Number(item.orderedQty),
          unitPrice: Number(item.unitPrice),
          taxRateId: item.taxRateId || null,
          taxRateName: item.taxRateName || null,
          taxRatePercentage: Number(item.taxRatePercentage),
          lineSubtotal,
          taxAmount,
          lineTotal,
        };
      }),
    };

    let res;
    if (modal?.mode === 'edit' && modal.order) {
      res = await apiUpdatePurchaseOrder(modal.order._id, payload as any);
    } else {
      res = await apiCreatePurchaseOrder(payload as any);
    }

    setSaving(false);

    if (!res.success) {
      setSaveError(res.message || 'Failed to save purchase order.');
      return;
    }

    await loadOrders();
    setModal(null);
  }

  const chartTooltipStyle = {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-1)',
    borderRadius: '8px',
  };

  const tabs: ActiveTab[] = ['All', 'Active', 'Pending / Draft', 'Overdue', 'Order History'];

  // ─── Preview of a saved PO ──────────────────────────────────────────────────

  const previewOrder = modal && modal.mode !== 'new' ? (modal as any).order as PurchaseOrder : null;

  // ─── Form Content ───────────────────────────────────────────────────────────

  const manualForm = draft && (
    <div className="space-y-7">

      {/* General Info */}
      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Supplier Information</p>

        <SearchSelect
          label="Supplier *"
          options={supplierOptions}
          value={draft.supplierId || null}
          onChange={(val, opt) => {
            if (!val || !opt) { updateDraft({ supplierId: '', supplierName: '', vendorReference: '' }); return; }
            const supplier = suppliers.find(s => s._id === val);
            updateDraft({
              supplierId: val,
              supplierName: opt.label,
              vendorReference: supplier?.supplierCode || '',
            });
          }}
          placeholder="Search supplier..."
        />

        <div>
          <label className="block text-[10px] text-t3 mb-1">Vendor Reference (auto-filled)</label>
          <input
            type="text"
            value={draft.vendorReference}
            onChange={e => updateDraft({ vendorReference: e.target.value })}
            placeholder="Vendor reference number"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
          />
        </div>

        <SearchSelect
          label="Contract / Agreement"
          options={contractOptions}
          value={draft.contractId || null}
          onChange={(val, opt) => {
            if (!val || !opt) { updateDraft({ contractId: '', contractRef: '', contractTitle: '' }); return; }
            const c = contracts.find(x => x._id === val);
            updateDraft({ contractId: val, contractRef: opt.sublabel || '', contractTitle: c?.title || opt.label });
          }}
          placeholder="Select contract (optional)..."
        />
      </section>

      {/* Order Details */}
      <section className="space-y-4">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Order Details</p>

        <div className="grid grid-cols-2 gap-3">
          <SearchSelect
            label="Currency *"
            options={currencyOptions}
            value={draft.currency || null}
            onChange={(val) => updateDraft({ currency: val || 'RWF' })}
            placeholder="Select currency..."
            clearable={false}
          />
          {/* <div>
            <label className="block text-[10px] text-t3 mb-1">PO Type</label>
            <select
              value={draft.procurementType}
              onChange={e => updateDraft({ procurementType: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 outline-none focus:border-accent transition-colors"
            >
              <option value="general">General</option>
              <option value="trading">Trading</option>
              <option value="fleet_fuel">Fleet Fuel</option>
              <option value="fleet_parts">Fleet Parts</option>
            </select>
          </div> */}
        </div>

        {draft.procurementType === 'trading' && (
          <SearchSelect
            label="Destination Warehouse *"
            options={warehouseOptions}
            value={draft.destinationWarehouseId || null}
            onChange={(val, opt) => updateDraft({ destinationWarehouseId: val || '', destinationWarehouseName: opt?.label || '' })}
            placeholder="Select destination warehouse..."
            clearable={false}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            label="Order Deadline"
            value={draft.orderDeadline}
            onChange={d => updateDraft({ orderDeadline: d })}
            placeholder="dd/mm/yyyy"
          />
          {/* <DatePicker
            label="Expected Arrival"
            value={draft.expectedDeliveryDate}
            onChange={d => updateDraft({ expectedDeliveryDate: d })}
            placeholder="dd/mm/yyyy"
            fromDate={draft.orderDeadline || undefined}
          /> */}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-t3">Deliver To (Client)</label>
            <button
              type="button"
              onClick={() => setShowAddClient(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-accent hover:underline"
            >
              <UserPlus size={11} weight="bold" /> New Client
            </button>
          </div>
          <SearchSelect
            options={clientOptions}
            value={draft.deliverToClientId || null}
            onChange={(val, opt) => {
              updateDraft({
                deliverToClientId: val || '',
                deliverToClientName: opt?.label || '',
              });
            }}
            placeholder="Search client..."
          />
        </div>
      </section>

      {/* Line Items */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Products</p>
          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
          >
            <Plus size={11} weight="bold" /> Add Product
          </button>
        </div>

        {draft.lineItems.map((item, idx) => {
          const { lineSubtotal, taxAmount, lineTotal } = computeLineItem(item);
          return (
            <div key={item._key} className="bg-surface rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-t3 uppercase">Item #{idx + 1}</span>
                {draft.lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(item._key)} className="text-red-500 hover:text-red-400">
                    <X size={13} weight="bold" />
                  </button>
                )}
              </div>

              <SearchSelect
                label="Product *"
                options={productOptions}
                value={item.productId || null}
                onChange={(val, opt) => {
                  const prod = products.find(p => p._id === val);
                  updateLineItem(item._key, {
                    productId: val || null,
                    productName: opt?.label || null,
                    description: opt?.label || item.description,
                    unitPrice: prod?.cost_per_unit ?? item.unitPrice,
                    unit: 'kg',
                  });
                }}
                placeholder="Select product..."
                clearable={false}
              />

              <SearchSelect
                options={projectOptions}
                value={item.analyticProjectId}
                onChange={(val, opt) => updateLineItem(item._key, {
                  analyticProjectId: val,
                  analyticProjectName: opt?.label || null,
                })}
                placeholder="Analytic distribution (project)..."
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-t3 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.orderedQty}
                    onChange={e => updateLineItem(item._key, { orderedQty: Number(e.target.value) })}
                    className="w-full bg-card border border-border px-3 py-1.5 rounded-lg text-sm text-t1 outline-none focus:border-accent transition-colors"
                  />
                </div>
                <SearchSelect
                  options={UNIT_OPTIONS}
                  value={item.unit}
                  onChange={(val) => updateLineItem(item._key, { unit: val || 'kg' })}
                  placeholder="Unit..."
                  clearable={false}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-t3 mb-1">Unit Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.unitPrice}
                    onChange={e => updateLineItem(item._key, { unitPrice: Number(e.target.value) })}
                    className="w-full bg-card border border-border px-3 py-1.5 rounded-lg text-sm text-t1 outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-t3 mb-1">Tax (from product)</label>
                  <div className="w-full bg-surface border border-border px-3 py-1.5 rounded-lg text-sm text-t2 h-[34px] flex items-center">
                    {item.taxRateName
                      ? `${item.taxRateName} (${item.taxRatePercentage}%)`
                      : <span className="text-t3">No tax</span>
                    }
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                <span className="text-t3">Subtotal: <span className="text-t1 font-semibold">{lineSubtotal.toLocaleString()} {draft.currency}</span></span>
                {taxAmount > 0 && <span className="text-t3">Tax: <span className="text-amber-500 font-semibold">+{taxAmount.toLocaleString()}</span></span>}
                <span className="text-t1 font-bold">Total: {lineTotal.toLocaleString()} {draft.currency}</span>
              </div>
            </div>
          );
        })}

        {/* Summary totals */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-t2">Subtotal</span>
            <span className="font-semibold text-t1">{draftTotals.subtotal.toLocaleString()} {draft.currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-t2">Tax</span>
            <span className="font-semibold text-amber-500">{draftTotals.tax.toLocaleString()} {draft.currency}</span>
          </div>
          <div className="flex justify-between text-base border-t border-accent/20 pt-1.5 mt-1.5">
            <span className="font-bold text-t1">Grand Total</span>
            <span className="font-black text-accent">{draftTotals.total.toLocaleString()} {draft.currency}</span>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Notes</p>
        <textarea
          value={draft.notes}
          onChange={e => updateDraft({ notes: e.target.value })}
          placeholder="Additional notes or instructions..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors resize-none"
        />
      </section>

      {saveError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
          {saveError}
        </div>
      )}

    </div>
  );

  const formContent = (
    <div className="space-y-6 pb-10">
      {manualForm}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving && <Spinner size={15} className="animate-spin" />}
        {saving ? 'Saving...' : modal?.mode === 'edit' ? 'Update Purchase Order' : 'Submit Purchase Order'}
      </button>
    </div>
  );

  // ─── View mode: show saved PO details ───────────────────────────────────────

  const viewFormContent = previewOrder && modal?.mode === 'view' && (
    <div className="space-y-5 pb-10">
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Order Details</p>
        {[
          ['PO Reference', previewOrder.poRef],
          ['Supplier', previewOrder.supplierName],
          ['Vendor Ref', previewOrder.vendorReference || '—'],
          ['Contract', previewOrder.contractRef || '—'],
          ['Currency', previewOrder.currency],
          ['Deliver To', previewOrder.deliverToClientName || '—'],
          ...(previewOrder.destinationWarehouseName ? [['Destination Warehouse', previewOrder.destinationWarehouseName]] : []),
          ['Order Deadline', previewOrder.orderDeadline ? new Date(previewOrder.orderDeadline).toLocaleDateString() : '—'],
          ['Expected Arrival', previewOrder.expectedDeliveryDate ? new Date(previewOrder.expectedDeliveryDate).toLocaleDateString() : '—'],
          ['Status', STATUS_LABEL[previewOrder.status] || previewOrder.status],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-t3">{label}</span>
            <span className="font-medium text-t1 text-right max-w-[55%] truncate">{val}</span>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Line Items</p>
        {previewOrder.lineItems.map((li, i) => (
          <div key={i} className="p-3 bg-surface rounded-xl border border-border text-sm space-y-1">
            <div className="font-medium text-t1">{li.description}</div>
            <div className="flex justify-between text-xs text-t3">
              <span>{li.orderedQty} {li.unit} × {li.unitPrice.toLocaleString()}</span>
              {li.analyticProjectName && <span className="text-accent">{li.analyticProjectName}</span>}
            </div>
            {li.taxRatePercentage > 0 && (
              <div className="text-xs text-amber-500">Tax: {li.taxRateName} (+{li.taxAmount.toLocaleString()})</div>
            )}
            <div className="text-xs font-bold text-t1 text-right">= {li.lineTotal.toLocaleString()} {previewOrder.currency}</div>
          </div>
        ))}
      </section>

      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-t2">Subtotal</span>
          <span className="font-semibold text-t1">{previewOrder.totalValue.toLocaleString()} {previewOrder.currency}</span>
        </div>
        {previewOrder.totalTaxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-t2">Tax</span>
            <span className="font-semibold text-amber-500">{previewOrder.totalTaxAmount.toLocaleString()} {previewOrder.currency}</span>
          </div>
        )}
        <div className="flex justify-between text-base border-t border-accent/20 pt-1.5 mt-1.5">
          <span className="font-bold text-t1">Grand Total</span>
          <span className="font-black text-accent">{previewOrder.totalValueWithTax.toLocaleString()} {previewOrder.currency}</span>
        </div>
      </div>

      {previewOrder.notes && (
        <div className="p-3 bg-surface rounded-xl border border-border text-sm text-t2">
          <p className="text-[10px] font-black text-t3 uppercase mb-1">Notes</p>
          {previewOrder.notes}
        </div>
      )}

      <button
        type="button"
        onClick={() => handleEdit(previewOrder)}
        className="w-full py-2.5 border border-accent text-accent rounded-xl text-sm font-bold hover:bg-accent/5 transition-all"
      >
        Edit Purchase Order
      </button>
    </div>
  );

  // ─── Document Preview (right pane) ──────────────────────────────────────────

  const orderForPreview = previewOrder || (draft ? {
    poRef: '— DRAFT —',
    supplierName: draft.supplierName || 'Not selected',
    vendorReference: draft.vendorReference,
    contractRef: draft.contractRef,
    deliverToClientName: draft.deliverToClientName,
    currency: draft.currency,
    orderDeadline: draft.orderDeadline,
    expectedDeliveryDate: draft.expectedDeliveryDate,
    lineItems: draft.lineItems.map((item, idx) => {
      const { lineSubtotal, taxAmount, lineTotal } = computeLineItem(item);
      return {
        lineNumber: idx + 1,
        description: item.description || `Item ${idx + 1}`,
        orderedQty: item.orderedQty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        lineSubtotal,
        taxRatePercentage: item.taxRatePercentage,
        taxRateName: item.taxRateName,
        taxAmount,
        lineTotal,
        analyticProjectName: item.analyticProjectName,
      };
    }),
    totalValue: draftTotals.subtotal,
    totalTaxAmount: draftTotals.tax,
    totalValueWithTax: draftTotals.total,
    status: 'draft',
    notes: draft.notes,
  } : null);

  const previewContent = orderForPreview && (
    <div className="font-sans text-[#1a1a1a] w-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="w-44">
          <img src="/logo.jpg" alt="TEKACCESS" className="w-full h-auto mb-1" />
        </div>
        <div className="text-right text-[11px] leading-tight text-gray-600">
          <p className="font-bold text-gray-800 uppercase tracking-wider">TEKACCESS</p>
          <p>13 KG 599 St, Gishushu</p>
          <p>Kigali, Rwanda</p>
        </div>
      </div>

      <p className="text-[11px] font-bold text-[#4285f4] mb-8 italic">Built on trust. Delivered with Excellence</p>

      <div className="flex justify-between items-start mb-8">
        <div className="text-[12px]">
          <p className="font-bold text-gray-800 uppercase tracking-tighter mb-1">Bill To / Deliver To</p>
          <p className="text-gray-600">{(orderForPreview as any).deliverToClientName || 'N/A'}</p>
        </div>
        <div className="text-right text-[12px]">
          <p className="text-[10px] text-gray-400 uppercase font-black mb-1">Supplier</p>
          <p className="text-lg uppercase tracking-tight font-bold">{(orderForPreview as any).supplierName}</p>
          {(orderForPreview as any).vendorReference && (
            <p className="text-gray-400 text-[10px]">Ref: {(orderForPreview as any).vendorReference}</p>
          )}
          {(orderForPreview as any).contractRef && (
            <p className="text-gray-400 text-[10px]">Contract: {(orderForPreview as any).contractRef}</p>
          )}
        </div>
      </div>

      <h1 className="text-[24px] font-medium text-[#4285f4] mb-6">
        Purchase Order <span className="font-bold text-gray-800">#{(orderForPreview as any).poRef}</span>
      </h1>

      <div className="flex justify-between items-start mb-6 text-[12px] border-y border-gray-100 py-5">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Currency</p>
          <p className="text-sm font-bold text-gray-800">{(orderForPreview as any).currency}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Order Deadline</p>
          <p className="text-sm font-bold text-gray-800">
            {(orderForPreview as any).orderDeadline
              ? new Date((orderForPreview as any).orderDeadline).toLocaleDateString()
              : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Expected Arrival</p>
          <p className="text-sm font-bold text-gray-800">
            {(orderForPreview as any).expectedDeliveryDate
              ? new Date((orderForPreview as any).expectedDeliveryDate).toLocaleDateString()
              : '—'}
          </p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-6 border border-gray-800 rounded-sm text-[11px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-50">
              <th className="py-2.5 px-3 text-left font-black uppercase tracking-wider border-r border-gray-800 w-[30%]">Product</th>
              <th className="py-2.5 px-3 text-left font-black uppercase tracking-wider border-r border-gray-800 w-[20%]">Project</th>
              <th className="py-2.5 px-3 text-center font-black uppercase tracking-wider border-r border-gray-800">Qty / Unit</th>
              <th className="py-2.5 px-3 text-right font-black uppercase tracking-wider border-r border-gray-800">Unit Price</th>
              <th className="py-2.5 px-3 text-right font-black uppercase tracking-wider border-r border-gray-800">Tax</th>
              <th className="py-2.5 px-3 text-right font-black uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {(orderForPreview as any).lineItems.map((item: any, i: number) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-3 px-3 border-r border-gray-200 font-semibold">{item.description}</td>
                <td className="py-3 px-3 border-r border-gray-200 text-gray-500 text-[10px]">{item.analyticProjectName || '—'}</td>
                <td className="py-3 px-3 text-center border-r border-gray-200">{item.orderedQty} {item.unit}</td>
                <td className="py-3 px-3 text-right border-r border-gray-200">{item.unitPrice.toLocaleString()}</td>
                <td className="py-3 px-3 text-right border-r border-gray-200 text-amber-600">
                  {item.taxRatePercentage > 0 ? `${item.taxRatePercentage}%` : '—'}
                </td>
                <td className="py-3 px-3 text-right font-bold">{item.lineTotal.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-300 text-[11px]">
          <div className="flex justify-end px-3 py-1.5 gap-8">
            <span className="text-gray-500 uppercase font-black tracking-wider">Subtotal</span>
            <span className="font-bold min-w-[100px] text-right">{(orderForPreview as any).totalValue.toLocaleString()} {(orderForPreview as any).currency}</span>
          </div>
          {(orderForPreview as any).totalTaxAmount > 0 && (
            <div className="flex justify-end px-3 py-1 gap-8 border-t border-gray-100">
              <span className="text-amber-600 uppercase font-black tracking-wider">Tax</span>
              <span className="font-bold min-w-[100px] text-right text-amber-600">+{(orderForPreview as any).totalTaxAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end items-stretch border-t border-gray-800 bg-[#851C1C] text-white text-[11px]">
          <div className="py-3 px-6 font-black uppercase border-r border-white/20 tracking-widest">Grand Total</div>
          <div className="py-3 px-8 font-black text-right min-w-[160px] text-base">{(orderForPreview as any).totalValueWithTax.toLocaleString()} {(orderForPreview as any).currency}</div>
        </div>
      </div>

      {(orderForPreview as any).notes && (
        <div className="mb-6">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-1.5">Notes</p>
          <p className="text-[11px] text-gray-600">{(orderForPreview as any).notes}</p>
        </div>
      )}

      <div className="text-[10px] text-gray-400 space-y-1 mb-8">
        <p className="font-black uppercase mb-1">Conditions of Purchase</p>
        <p>• This order is subject to standard procurement terms of Tekaccess Ltd.</p>
        <p>• Delivery must be confirmed to the address / client specified above.</p>
        <p>• Invoice must reference this PO number for successful processing.</p>
      </div>

      <div className="flex justify-between items-end border-t border-gray-100 pt-6">
        <div className="text-center w-36 border-t border-gray-300 pt-2">
          <p className="text-[9px] font-black uppercase text-gray-400">Authorized Signature</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-full border-4 border-double border-gray-100">
          <CheckCircle size={36} weight="duotone" className="text-green-200" />
        </div>
      </div>
    </div>
  );

  // ─── Chart data from orders ──────────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; orders: number; amount: number }> = {};
    orders.forEach(o => {
      const d = new Date(o.issuedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { month: label, orders: 0, amount: 0 };
      map[key].orders++;
      map[key].amount += o.totalValueWithTax;
    });
    return Object.values(map).slice(-12);
  }, [orders]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => { map[o.procurementType] = (map[o.procurementType] || 0) + 1; });
    const total = orders.length || 1;
    return Object.entries(map).map(([category, count]) => ({
      category,
      value: Math.round(count / total * 100),
    }));
  }, [orders]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-t1">Purchase Orders</h1>
          <p className="text-sm text-t3 mt-0.5">Manage and track all procurement orders</p>
        </div>
        <button
          onClick={handleNewOrder}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors"
        >
          <Plus size={15} weight="bold" /> New Purchase Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: summaryStats.total, Icon: FileText, color: 'text-accent', bg: 'bg-accent-glow' },
          { label: 'Active Orders', value: summaryStats.active, Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'In Transit', value: summaryStats.overdue, Icon: Warning, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Total Spend', value: formatCurrency(summaryStats.totalSpend, summaryStats.currency), Icon: TrendUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${card.bg}`}>
              <card.Icon size={18} weight="duotone" className={card.color} />
            </div>
            <div>
              <p className="text-xs text-t3 font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-t1 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table/Charts Card */}
      <div className="bg-card rounded-xl border border-border">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-border px-4">
          <nav className="-mb-px flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-3.5 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-t3 hover:text-t2 hover:border-border'
                  }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-surface text-t1 placeholder-t3 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
            <Funnel size={14} weight="duotone" /> Filter <CaretDown size={11} weight="bold" />
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-t2 hover:bg-surface transition-colors">
            <DownloadSimple size={14} weight="duotone" /> Export
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
            {([
              { mode: 'table', Icon: ListDashes, label: 'Table' },
              { mode: 'bar', Icon: ChartBar, label: 'Bar Chart' },
              { mode: 'trend', Icon: TrendUp, label: 'Trend' },
              { mode: 'pie', Icon: ChartBar, label: 'Pie' },
            ] as { mode: ViewMode; Icon: any; label: string }[]).map(v => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                title={v.label}
                className={`px-3 py-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${viewMode === v.mode ? 'bg-accent text-white' : 'bg-card text-t3 hover:bg-surface hover:text-t2'
                  }`}
              >
                <v.Icon size={15} weight={viewMode === v.mode ? 'fill' : 'regular'} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <OverlayScrollbarsComponent options={{ scrollbars: { autoHide: 'never' } }} defer>
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface">
                <tr>
                  {['PO Ref', 'Supplier', 'Deliver To', 'Contract', 'Currency', 'Total', 'Status', 'Expected', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border-s">
                {loadingOrders ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <Spinner size={24} className="animate-spin text-t3 mx-auto" />
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-t3 text-sm">
                      {orders.length === 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <Package size={40} weight="duotone" className="text-t3/40" />
                          <p>No purchase orders yet.</p>
                          <button onClick={handleNewOrder} className="text-accent font-semibold hover:underline text-sm">Create your first PO</button>
                        </div>
                      ) : 'No orders match your criteria'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr
                      key={order._id}
                      className="hover:bg-surface transition-colors cursor-pointer"
                      onClick={() => setModal({ mode: 'view', order })}
                    >
                      <td className="px-4 py-3.5 text-sm font-semibold text-accent whitespace-nowrap">{order.poRef}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-t1 max-w-[150px] truncate">{order.supplierName}</td>
                      <td className="px-4 py-3.5 text-sm text-t2 max-w-[130px] truncate">{order.deliverToClientName || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-t2">{order.contractRef || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-t2">{order.currency}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-t1 whitespace-nowrap">{formatCurrency(order.totalValueWithTax, order.currency)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[order.status] || STATUS_STYLES.draft}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] || STATUS_DOT.draft}`} />
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-t2 whitespace-nowrap">
                        {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setModal({ mode: 'view', order }); }}
                            className="p-1.5 text-t3 hover:text-accent hover:bg-accent-glow rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye size={14} weight="duotone" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleEdit(order); }}
                            className="p-1.5 text-t3 hover:text-t1 hover:bg-surface rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilSimple size={14} weight="duotone" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTarget(order); }}
                            className="p-1.5 text-t3 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash size={14} weight="duotone" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredOrders.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-t3">
                <span>Showing {filteredOrders.length} of {orders.length} orders</span>
              </div>
            )}
          </OverlayScrollbarsComponent>
        )}

        {/* BAR CHART VIEW */}
        {viewMode === 'bar' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-4">Monthly Order Volume & Spend</h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'var(--text-3)' }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#4285f4" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="amount" name="Spend" fill="#93bbfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* TREND VIEW */}
        {viewMode === 'trend' && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-t2 mb-4">Procurement Spend Trend</h3>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="amount" name="Spend" stroke="#4285f4" strokeWidth={2.5} dot={{ fill: '#4285f4', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* PIE VIEW */}
        {viewMode === 'pie' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-sm font-semibold text-t2 mb-4">Orders by Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={false} labelLine={false}>
                    {categoryData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${Number(v ?? 0)}%`, 'Share']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {categoryData.map((item, idx) => (
                <div key={item.category} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx] }} />
                  <span className="text-sm text-t2 flex-1 capitalize">{item.category.replace('_', ' ')}</span>
                  <div className="flex-1 bg-surface rounded-full h-2 mx-2">
                    <div className="h-2 rounded-full" style={{ width: `${item.value}%`, backgroundColor: CHART_COLORS[idx] }} />
                  </div>
                  <span className="text-sm font-semibold text-t1 w-8 text-right">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document Side Panel */}
      <DocumentSidePanel
        isOpen={!!modal}
        onClose={() => { setModal(null); setSaveError(null); }}
        title={
          modal?.mode === 'new' ? 'New Purchase Order' :
            modal?.mode === 'edit' ? `Edit — ${(modal as any).order?.poRef}` :
              `PO — ${(modal as any)?.order?.poRef}`
        }
        currentIndex={
          modal && modal.mode !== 'new'
            ? filteredOrders.findIndex(o => o._id === (modal as any).order?._id) + 1
            : undefined
        }
        totalItems={filteredOrders.length}
        onPrev={() => {
          if (!modal || modal.mode === 'new') return;
          const idx = filteredOrders.findIndex(o => o._id === (modal as any).order._id);
          if (idx > 0) setModal({ mode: 'view', order: filteredOrders[idx - 1] });
        }}
        onNext={() => {
          if (!modal || modal.mode === 'new') return;
          const idx = filteredOrders.findIndex(o => o._id === (modal as any).order._id);
          if (idx < filteredOrders.length - 1) setModal({ mode: 'view', order: filteredOrders[idx + 1] });
        }}
        footerInfo={
          modal?.mode === 'new'
            ? `Draft • ${new Date().toLocaleDateString()}`
            : `Status: ${STATUS_LABEL[(modal as any)?.order?.status] || '—'} • ${new Date().toLocaleDateString()}`
        }
        formContent={modal?.mode === 'view' ? viewFormContent : formContent}
        previewContent={previewContent}
      />

      {showAddClient && (
        <QuickAddClient
          onClose={() => setShowAddClient(false)}
          onCreated={(newClient) => {
            setClients(prev => [...prev, newClient]);
            updateDraft({ deliverToClientId: newClient._id, deliverToClientName: newClient.name });
            setShowAddClient(false);
          }}
        />
      )}

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div key="del-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50" onClick={() => !isDeleting && setDeleteTarget(null)} />
            <motion.div key="del-dlg" initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash size={22} weight="duotone" className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-t1 mb-1">Delete purchase order?</h2>
                <p className="text-xs text-t3 mb-1">
                  <span className="font-semibold text-t2">{deleteTarget.poRef}</span> will be permanently removed.
                </p>
                {deleteTarget.status !== 'draft' && (
                  <p className="text-xs text-amber-500 mb-4">Only draft orders can be deleted.</p>
                )}
                {deleteTarget.status === 'draft' && <div className="mb-4" />}
                <div className="flex flex-col gap-2">
                  <button onClick={handleDelete} disabled={isDeleting || deleteTarget.status !== 'draft'}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    {isDeleting ? <><Spinner size={16} className="animate-spin" /> Deleting…</> : 'Delete'}
                  </button>
                  <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                    className="w-full py-2.5 border border-border text-t1 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
