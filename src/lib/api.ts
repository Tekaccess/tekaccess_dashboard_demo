const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

type ApiResponse<T = null> = {
  success: boolean;
  data: T;
  message?: string;
  errors?: { field: string; message: string }[];
};

// In-memory access token — never written to localStorage to avoid XSS exposure.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // send httpOnly refresh cookie
  });

  // If access token expired, try to refresh once then replay the request.
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  const json = await res.json();
  return json as ApiResponse<T>;
}

// Deduplicates concurrent refresh calls — only one HTTP request in flight at a time.
// Without this, page load fires multiple simultaneous refreshes; the server rotates
// the token on the first one and the rest get 401, which clears the auth state.
let _refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.data?.accessToken) {
        setAccessToken(json.data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ─── Auth endpoints ──────────────────────────────────────────────────────────

export type BackendUser = {
  _id: string;
  fullName: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  dashboardAccess: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  preferences: {
    timezone: string;
    dateFormat: string;
    alertsEnabled: boolean;
  };
};

export async function apiLogin(email: string, password: string) {
  return request<{ accessToken: string; user: BackendUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRefresh() {
  return tryRefresh();
}

export async function apiLogout() {
  const res = await request('/auth/logout', { method: 'POST' });
  setAccessToken(null);
  return res;
}

export async function apiValidateResetToken(token: string) {
  return request(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  });
}

export async function apiForgotPassword(email: string) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function apiResetPassword(token: string, password: string) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function apiChangePassword(currentPassword: string, newPassword: string) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function apiUpdateProfile(userId: string, fields: { fullName?: string }) {
  return request<{ user: BackendUser }>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export type ActivityLog = {
  _id: string;
  action: 'create' | 'read' | 'update' | 'delete';
  collection: string;
  documentRef: string | null;
  dashboard: string;
  status: 'success' | 'failed';
  errorMessage: string | null;
  note: string | null;
  changedFields: string[];
  createdAt: string;
};

export async function apiGetMyActivity(page = 1, limit = 20) {
  return request<{ logs: ActivityLog[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/users/me/activity?page=${page}&limit=${limit}`
  );
}

// ─── Procurement ─────────────────────────────────────────────────────────────

export type Supplier = {
  _id: string;
  supplierCode: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string;
  currency: string;
  creditTermsDays: number;
  status: string;
  supplierType: string[];
};

export type Contract = {
  _id: string;
  contractRef: string;
  title: string;
  clientName: string;
  status: string;
  currency: string;
  totalContractValue: number;
};

export type POLineItem = {
  lineNumber: number;
  description: string;
  stockItemId?: string | null;
  itemCode?: string | null;
  analyticProjectId?: string | null;
  analyticProjectName?: string | null;
  unit: 'grams' | 'kg' | 'tons' | 'litres' | 'ml' | 'units' | 'boxes';
  orderedQty: number;
  unitPrice: number;
  lineSubtotal: number;
  taxRateId?: string | null;
  taxRateName?: string | null;
  taxRatePercentage: number;
  taxAmount: number;
  lineTotal: number;
  lineStatus: string;
};

export type PurchaseOrder = {
  _id: string;
  poRef: string;
  procurementType: string;
  supplierId: string | { _id: string; supplierCode: string; name: string };
  supplierName: string;
  vendorReference: string | null;
  contractId: string | null;
  contractRef: string | null;
  contractTitle: string | null;
  deliverToClientId: string | null;
  deliverToClientName: string | null;
  lineItems: POLineItem[];
  totalOrderedQty: number;
  totalValue: number;
  totalTaxAmount: number;
  totalValueWithTax: number;
  currency: string;
  orderDeadline: string | null;
  expectedDeliveryDate: string | null;
  status: 'draft' | 'approved' | 'sent_to_supplier' | 'partially_received' | 'fully_received' | 'closed' | 'cancelled';
  raisedBy: { _id: string; fullName: string } | null;
  approvedBy: { _id: string; fullName: string } | null;
  notes: string | null;
  issuedAt: string;
  createdAt: string;
};

export async function apiListSuppliers(search?: string, status = 'active') {
  const params = new URLSearchParams({ status });
  if (search) params.set('search', search);
  return request<{ suppliers: Supplier[] }>(`/procurement/suppliers?${params}`);
}

export async function apiGetSupplierById(id: string) {
  return request<{ supplier: Supplier }>(`/procurement/suppliers/${id}`);
}

export async function apiCreateSupplier(data: Partial<Supplier> & { supplierType: string[] }) {
  return request<{ supplier: Supplier }>('/procurement/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiListContractsForPO(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  return request<{ contracts: Contract[] }>(`/procurement/contracts?${params}`);
}

export async function apiListPurchaseOrders(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ orders: PurchaseOrder[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/procurement/purchase-orders${qs ? `?${qs}` : ''}`
  );
}

export async function apiGetPurchaseOrderById(id: string) {
  return request<{ order: PurchaseOrder }>(`/procurement/purchase-orders/${id}`);
}

export async function apiCreatePurchaseOrder(data: Partial<PurchaseOrder>) {
  return request<{ order: PurchaseOrder }>('/procurement/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdatePurchaseOrder(id: string, data: Partial<PurchaseOrder>) {
  return request<{ order: PurchaseOrder }>(`/procurement/purchase-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiDeletePurchaseOrder(id: string) {
  return request(`/procurement/purchase-orders/${id}`, { method: 'DELETE' });
}

export async function apiGetProcurementSummary() {
  return request<{
    summary: { activePOs: number; draftPOs: number; activePoValue: number; activeSuppliers: number; shipmentsInTransit: number; shipmentsAtCustoms: number; sparePartAlerts: number };
    poByStatus: { _id: string; count: number; value: number }[];
  }>('/procurement/summary');
}

export async function apiUpdateSupplier(id: string, data: Partial<Supplier>) {
  return request<{ supplier: Supplier }>(`/procurement/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Shipments
export type Shipment = {
  _id: string;
  shipmentRef: string;
  poId: string;
  poRef: string;
  supplierId: string;
  supplierName: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedValue: number | null;
  currency: string;
  mode: 'road' | 'sea' | 'air' | 'rail' | 'multimodal';
  carrierName: string | null;
  carrierRef: string | null;
  originLocation: string;
  destinationLocation: string;
  destinationSiteName: string | null;
  dispatchedAt: string;
  estimatedArrivalDate: string;
  actualArrivalDate: string | null;
  status: 'in_transit' | 'at_customs' | 'out_for_delivery' | 'received' | 'delayed' | 'lost' | 'cancelled';
  notes: string | null;
};

export async function apiGetShipmentsSummary() {
  return request<{ summary: { inTransit: number; atCustoms: number; received: number; delayed: number; overdue: number } }>(
    '/procurement/shipments/summary'
  );
}

export async function apiListShipments(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ shipments: Shipment[]; pagination: { total: number; pages: number; page: number; limit: number } }>(
    `/procurement/shipments${qs ? `?${qs}` : ''}`
  );
}

export async function apiCreateShipment(data: Partial<Shipment>) {
  return request<{ shipment: Shipment }>('/procurement/shipments', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateShipment(id: string, data: Partial<Shipment>) {
  return request<{ shipment: Shipment }>(`/procurement/shipments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Spare Parts
export type SparePart = {
  _id: string;
  partCode: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  onHandQty: number;
  availableQty: number;
  reorderPoint: number;
  reorderQty: number;
  weightedAvgCost: number;
  currency: string;
  totalStockValue: number;
  belowReorderPoint: boolean;
  compatibleTruckModels: string[];
  isActive: boolean;
};

export async function apiGetSparePartsSummary() {
  return request<{ summary: { totalParts: number; totalValue: number; lowStock: number; categories: { _id: string; count: number; totalValue: number }[] } }>(
    '/procurement/spare-parts/summary'
  );
}

export async function apiListSpareParts(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ parts: SparePart[]; pagination: { total: number; pages: number } }>(
    `/procurement/spare-parts${qs ? `?${qs}` : ''}`
  );
}

export async function apiCreateSparePart(data: Partial<SparePart>) {
  return request<{ part: SparePart }>('/procurement/spare-parts', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateSparePart(id: string, data: Partial<SparePart>) {
  return request<{ part: SparePart }>(`/procurement/spare-parts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export type TaxRate = {
  _id: string;
  name: string;
  code: string;
  percentage: number;
  taxType: string;
  appliesTo: string;
  isActive: boolean;
};

export type Currency = {
  _id: string;
  code: string;
  name: string;
  symbol: string;
  region: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export async function apiListTaxRates(appliesTo?: string) {
  const params = new URLSearchParams();
  if (appliesTo) params.set('appliesTo', appliesTo);
  return request<{ taxRates: TaxRate[] }>(`/finance/tax-rates?${params}`);
}

export async function apiCreateTaxRate(data: Partial<TaxRate>) {
  return request<{ taxRate: TaxRate }>('/finance/tax-rates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiListCurrencies() {
  return request<{ currencies: Currency[] }>('/finance/currencies');
}

export async function apiCreateCurrency(data: Partial<Currency>) {
  return request<{ currency: Currency }>('/finance/currencies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Operations ───────────────────────────────────────────────────────────────

export type Project = {
  _id: string;
  projectCode: string;
  name: string;
  department: string;
  status: string;
  budget: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  managerName: string | null;
  notes: string | null;
};

export type Client = {
  _id: string;
  clientCode: string;
  name: string;
  legalName: string | null;
  clientType: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  region: string | null;
  country: string;
  currency: string;
  paymentTermsDays: number;
  creditLimit: number | null;
  isActive: boolean;
  liveStats?: {
    activeContracts: number;
    totalDeliveries: number;
    avgSatisfactionRating: number | null;
  };
};

export type ContractLine = {
  lineRef: string;
  materialDescription: string;
  unit: string;
  committedQty: number;
  deliveredQty: number;
  unitPrice: number;
  lineValue: number;
  deliveryDestination: string | null;
};

export type OperationsContract = {
  _id: string;
  contractRef: string;
  title: string;
  clientId: string | null;
  clientName: string;
  contractLines: ContractLine[];
  totalCommittedTons: number;
  totalContractValue: number;
  currency: string;
  pricePerTon: number | null;
  startDate: string;
  endDate: string;
  status: string;
  deliveryProgress: {
    deliveredTons: number;
    remainingTons: number | null;
    pctComplete: number;
    lastDeliveryAt: string | null;
    tripCount: number;
  };
  accountManagerName: string | null;
  notes: string | null;
  createdAt: string;
};

export type Delivery = {
  _id: string;
  deliveryRef: string;
  tripRef: string;
  contractRef: string;
  contractId: string;
  truckPlate: string;
  driverName: string;
  clientName: string;
  offloadingSiteName: string;
  plannedTons: number;
  reportedTons: number | null;
  confirmedTons: number | null;
  tonVariance: number | null;
  deliveryDate: string;
  confirmedAt: string | null;
  status: 'pending_confirmation' | 'confirmed' | 'disputed' | 'rejected';
  disputeReason: string | null;
  clientSatisfaction: { rating: number | null; comment: string | null } | null;
  confirmedBy: { _id: string; fullName: string } | null;
  notes: string | null;
};

export type Site = {
  _id: string;
  siteCode: string;
  name: string;
  siteType: ('loading' | 'offloading' | 'depot' | 'workshop')[];
  address: string | null;
  region: string | null;
  country: string;
  contactName: string | null;
  contactPhone: string | null;
  truckCapacity: number | null;
  isActive: boolean;
  liveStatus: {
    isActive: boolean;
    trucksWaiting: number;
    trucksLoading: number;
    trucksOffloading: number;
    loadsProcessedToday: number;
    lastActivityAt: string | null;
  };
};

// Projects
export async function apiListProjects(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  return request<{ projects: Project[] }>(`/operations/projects?${params}`);
}

export async function apiCreateProject(data: Partial<Project>) {
  return request<{ project: Project }>('/operations/projects', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateProject(id: string, data: Partial<Project>) {
  return request<{ project: Project }>(`/operations/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Clients
export async function apiListClients(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  return request<{ clients: Client[] }>(`/operations/clients?${params}`);
}

export async function apiCreateClient(data: Partial<Client>) {
  return request<{ client: Client }>('/operations/clients', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateClient(id: string, data: Partial<Client>) {
  return request<{ client: Client }>(`/operations/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Contracts
export async function apiGetContractsSummary() {
  return request<{
    summary: { active: number; draft: number; completed: number; disputed: number; totalActiveValue: number; totalActiveTons: number };
    nearingDeadline: OperationsContract[];
  }>('/operations/contracts/summary');
}

export async function apiListContracts(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ contracts: OperationsContract[]; pagination: { total: number; pages: number; page: number; limit: number } }>(
    `/operations/contracts${qs ? `?${qs}` : ''}`
  );
}

export async function apiGetContractById(id: string) {
  return request<{ contract: OperationsContract }>(`/operations/contracts/${id}`);
}

export async function apiCreateContract(data: Partial<OperationsContract> & { contractLines: Partial<ContractLine>[] }) {
  return request<{ contract: OperationsContract }>('/operations/contracts', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateContract(id: string, data: Partial<OperationsContract>) {
  return request<{ contract: OperationsContract }>(`/operations/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Deliveries
export async function apiGetDeliveriesSummary() {
  return request<{ summary: { pendingConfirmation: number; confirmed: number; disputed: number; tonsToday: number; tonsThisMonth: number } }>(
    '/operations/deliveries/summary'
  );
}

export async function apiListDeliveries(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ deliveries: Delivery[]; pagination: { total: number; pages: number; page: number; limit: number } }>(
    `/operations/deliveries${qs ? `?${qs}` : ''}`
  );
}

export async function apiCreateDelivery(data: Partial<Delivery>) {
  return request<{ delivery: Delivery }>('/operations/deliveries', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiConfirmDelivery(id: string, confirmedTons: number, notes?: string) {
  return request<{ delivery: Delivery }>(`/operations/deliveries/${id}/confirm`, {
    method: 'PATCH', body: JSON.stringify({ confirmedTons, notes }),
  });
}

export async function apiDisputeDelivery(id: string, disputeReason: string) {
  return request<{ delivery: Delivery }>(`/operations/deliveries/${id}/dispute`, {
    method: 'PATCH', body: JSON.stringify({ disputeReason }),
  });
}

// Sites
export async function apiListSites(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ sites: Site[] }>(`/operations/sites${qs ? `?${qs}` : ''}`);
}

export async function apiCreateSite(data: Partial<Site>) {
  return request<{ site: Site }>('/operations/sites', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateSite(id: string, data: Partial<Site>) {
  return request<{ site: Site }>(`/operations/sites/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockItem = {
  _id: string;
  itemCode: string;
  name: string;
  description: string | null;
  category: string;
  stockUnit: string;
  onHandQty: number;
  availableQty: number;
  weightedAvgCost: number;
  currency: string;
  warehouseId: string;
  warehouseName: string;
};

export async function apiListStockItems(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ limit: '200', ...params }).toString();
  return request<{ items: StockItem[]; pagination: { total: number } }>(`/inventory/stock-items?${qs}`);
}

export async function apiGetStockItemById(id: string) {
  return request<{ item: StockItem }>(`/inventory/stock-items/${id}`);
}

export async function apiCreateStockItem(data: Partial<StockItem> & { warehouseId: string }) {
  return request<{ item: StockItem }>('/inventory/stock-items', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateStockItem(id: string, data: Partial<StockItem>) {
  return request<{ item: StockItem }>(`/inventory/stock-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

export type Warehouse = {
  _id: string;
  warehouseCode: string;
  name: string;
  warehouseType: 'commercial' | 'workshop_store' | 'fuel_tank' | 'transit' | 'bonded';
  address: string | null;
  region: string | null;
  country: string;
  capacityUnit: string;
  totalCapacity: number;
  managerName: string | null;
  managerContact: string | null;
  isActive: boolean;
  liveCapacity?: { occupiedCapacity: number; usedPct: number; nearCapacityAlert: boolean };
};

export async function apiListWarehouses(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ warehouses: Warehouse[] }>(`/inventory/warehouses${qs ? `?${qs}` : ''}`);
}

export async function apiCreateWarehouse(data: Partial<Warehouse>) {
  return request<{ warehouse: Warehouse }>('/inventory/warehouses', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateWarehouse(id: string, data: Partial<Warehouse>) {
  return request<{ warehouse: Warehouse }>(`/inventory/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

export type StockMovement = {
  _id: string;
  movementRef: string;
  movementType: 'INBOUND' | 'OUTBOUND' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT' | 'STOCK_COUNT' | 'RETURN';
  stockItemId: string;
  itemCode: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  qty: number;
  qtyBefore: number;
  qtyAfter: number;
  unitCost: number;
  totalCost: number;
  sourceType: string;
  sourceRef: string;
  reason: string | null;
  notes: string | null;
  postedBy: { _id: string; fullName: string } | null;
  postedAt: string;
};

export async function apiListMovements(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ limit: '100', ...params }).toString();
  return request<{ movements: StockMovement[]; pagination: { total: number; pages: number } }>(`/inventory/movements?${qs}`);
}

export async function apiCreateMovement(data: {
  movementType: string;
  stockItemId: string;
  qty: number;
  unitCost?: number;
  sourceType?: string;
  sourceRef?: string;
  reason?: string;
  notes?: string;
  countedQty?: number;
}) {
  return request<{ movement: StockMovement }>('/inventory/movements', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiCreateTransfer(data: {
  stockItemId: string;
  qty: number;
  destinationWarehouseId: string;
  notes?: string;
}) {
  return request<{ transfer: any }>('/inventory/movements/transfer', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiGetInventorySummary() {
  return request<{
    summary: { totalItems: number; totalValue: number; lowStockItems: number; warehouseCount: number };
    recentMovements: StockMovement[];
    categories: { _id: string; count: number; totalValue: number; totalQty: number }[];
  }>('/inventory/summary');
}

// ─── Transport ────────────────────────────────────────────────────────────────

export type Truck = {
  _id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
  fleetType: string;
  status: 'operating' | 'idle' | 'maintenance' | 'decommissioned';
  assignedDriverName: string | null;
  assignedDriverId: string | null;
  currentOdometer: number | null;
  lastServiceDate: string | null;
  nextServiceDueKm: number | null;
  insuranceExpiry: string | null;
  notes: string | null;
  createdAt: string;
};

export type Trip = {
  _id: string;
  tripRef: string;
  truckId: string | null;
  plateNumber: string;
  driverName: string;
  contractRef: string | null;
  clientName: string | null;
  originSite: string;
  destinationSite: string;
  loadDescription: string | null;
  plannedTons: number | null;
  actualTons: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  departureDate: string | null;
  arrivalDate: string | null;
  distanceKm: number | null;
  fuelUsedLitres: number | null;
  notes: string | null;
  createdAt: string;
};

export type FuelLog = {
  _id: string;
  logRef: string;
  truckId: string | null;
  plateNumber: string;
  driverName: string | null;
  logDate: string;
  litresFilled: number;
  costPerLitre: number;
  totalCost: number;
  currency: string;
  odometerReading: number | null;
  fuelStation: string | null;
  isAnomalyFlag: boolean;
  anomalyReason: string | null;
  notes: string | null;
  createdAt: string;
};

export type MaintenanceRecord = {
  _id: string;
  recordRef: string;
  truckId: string | null;
  plateNumber: string;
  maintenanceType: 'preventive' | 'corrective' | 'inspection' | 'emergency';
  description: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string | null;
  completedDate: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  currency: string;
  mechanicName: string | null;
  workshopName: string | null;
  partsUsed: string | null;
  notes: string | null;
  createdAt: string;
};

// Trucks
export async function apiListTrucks(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ limit: '200', ...params }).toString();
  return request<{ trucks: Truck[]; pagination: { total: number; pages: number } }>(`/transport/trucks?${qs}`);
}

export async function apiCreateTruck(data: Partial<Truck>) {
  return request<{ truck: Truck }>('/transport/trucks', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateTruck(id: string, data: Partial<Truck>) {
  return request<{ truck: Truck }>(`/transport/trucks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiGetTransportSummary() {
  return request<{
    summary: { totalTrucks: number; operating: number; idle: number; inMaintenance: number; activeTrips: number; totalFuelCost: number };
  }>('/transport/summary');
}

// Trips
export async function apiListTrips(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ limit: '200', ...params }).toString();
  return request<{ trips: Trip[]; pagination: { total: number; pages: number } }>(`/transport/trips?${qs}`);
}

export async function apiCreateTrip(data: Partial<Trip>) {
  return request<{ trip: Trip }>('/transport/trips', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateTrip(id: string, data: Partial<Trip>) {
  return request<{ trip: Trip }>(`/transport/trips/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Fuel Logs
export async function apiListFuelLogs(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ limit: '200', ...params }).toString();
  return request<{ logs: FuelLog[]; pagination: { total: number; pages: number } }>(`/transport/fuel-logs?${qs}`);
}

export async function apiCreateFuelLog(data: Partial<FuelLog>) {
  return request<{ log: FuelLog }>('/transport/fuel-logs', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateFuelLog(id: string, data: Partial<FuelLog>) {
  return request<{ log: FuelLog }>(`/transport/fuel-logs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Maintenance Records
export async function apiListMaintenanceRecords(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ limit: '200', ...params }).toString();
  return request<{ records: MaintenanceRecord[]; pagination: { total: number; pages: number } }>(`/transport/maintenance?${qs}`);
}

export async function apiCreateMaintenanceRecord(data: Partial<MaintenanceRecord>) {
  return request<{ record: MaintenanceRecord }>('/transport/maintenance', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateMaintenanceRecord(id: string, data: Partial<MaintenanceRecord>) {
  return request<{ record: MaintenanceRecord }>(`/transport/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
