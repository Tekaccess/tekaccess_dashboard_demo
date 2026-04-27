const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

type ApiResponse<T = null> = {
  success: boolean;
  data: T;
  message?: string;
  errors?: { field: string; message: string }[];
};

const TOKEN_KEY = 'tekaccess_token';

// Load persisted token on module init so it's ready before the first request.
let _accessToken: string | null = localStorage.getItem(TOKEN_KEY);

export function setAccessToken(token: string | null) {
  _accessToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAccessToken() {
  return _accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // If the server rejects the token (expired, password changed, deactivated),
  // wipe local storage so the user is redirected to login on next navigation.
  if (res.status === 401 || res.status === 403) {
    setAccessToken(null);
    localStorage.removeItem('tekaccess_user');
  }

  const json = await res.json();
  return json as ApiResponse<T>;
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
  avatarUrl: string | null;
  preferences: {
    timezone: string;
    dateFormat: string;
    alertsEnabled: boolean;
    dashboardOrder: string[];
  };
};

export async function apiLogin(email: string, password: string) {
  return request<{ accessToken: string; user: BackendUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogout() {
  setAccessToken(null);
  return request('/auth/logout', { method: 'POST' });
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

export async function apiUploadAvatar(file: File) {
  const form = new FormData();
  form.append('avatar', file);
  return request<{ user: BackendUser }>('/users/me/avatar', {
    method: 'POST',
    body: form,
  });
}

export async function apiUpdateDashboardOrder(userId: string, dashboardOrder: string[]) {
  return request<{ user: BackendUser }>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ preferences: { dashboardOrder } }),
  });
}

export async function apiListUsers(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ users: BackendUser[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/users${qs ? `?${qs}` : ''}`
  );
}

export async function apiAdminCreateUser(data: { fullName: string; email: string; password: string; role: string; dashboardAccess: string[] }) {
  return request<{ user: BackendUser }>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiAdminUpdateUser(id: string, data: Partial<Pick<BackendUser, 'fullName' | 'email' | 'role' | 'dashboardAccess' | 'isActive'>>) {
  return request<{ user: BackendUser }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeactivateUser(id: string) {
  return request(`/users/${id}`, { method: 'DELETE' });
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
  defaultWarehouseId: string | null;
  defaultWarehouseName: string | null;
  hasCrusher?: boolean | null;
  extraFeesNote?: string | null;
  isCritical?: boolean;
};

export type Contract = {
  _id: string;
  contractRef: string;
  title: string;
  clientName: string;
  status: string;
  currency: string;
  totalContractValue: number;
  contractType: 'employee' | 'driver' | 'client';
  perks?: string[];
};

export type POLineItem = {
  lineNumber: number;
  description: string;
  productId?: string | null;
  productName?: string | null;
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
  destinationWarehouseId: string | null;
  destinationWarehouseName: string | null;
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

export async function apiCreateSupplier(data: Partial<Supplier>) {
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

export async function apiDeleteSupplier(id: string) {
  return request(`/procurement/suppliers/${id}`, { method: 'DELETE' });
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

export async function apiDeleteShipment(id: string) {
  return request(`/procurement/shipments/${id}`, { method: 'DELETE' });
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

export async function apiDeleteSparePart(id: string) {
  return request(`/procurement/spare-parts/${id}`, { method: 'DELETE' });
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

export type FinanceApproval = {
  _id: string;
  approvalRef: string;
  linkedPoId: string | null;
  linkedPoRef: string | null;
  linkedRecordId: string | null;
  productName: string;
  warehouseName: string;
  requestedAmount: number;
  approvedAmount: number | null;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'partial';
  reviewedBy: { userId: string; fullName: string } | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type ApprovalsSummary = {
  totalPending: number;
  pendingAmount: number;
  approvedTodayCount: number;
  approvedTodayAmount: number;
  byStatus: { _id: string; count: number; total: number }[];
};

export async function apiListFinanceApprovals(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ approvals: FinanceApproval[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/finance/approvals${qs ? `?${qs}` : ''}`
  );
}

export async function apiGetFinanceApprovalsSummary() {
  return request<{ summary: ApprovalsSummary }>('/finance/approvals/summary');
}

export async function apiApproveFinanceApproval(id: string, data: { approvedAmount: number; notes?: string }) {
  return request<{ approval: FinanceApproval }>(`/finance/approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiRejectFinanceApproval(id: string, data: { notes?: string }) {
  return request<{ approval: FinanceApproval }>(`/finance/approvals/${id}/reject`, {
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
  contractId?: string | null;
  contractRef?: string | null;
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
  contractType: 'employee' | 'driver' | 'client';
  isTemplate?: boolean;
  perks?: string[];
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
  documentUrl: string | null;
  documentName: string | null;
  createdAt: string;
};

export interface Employee {
  _id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: 'active' | 'inactive' | 'on-leave';
  avatar?: string;
  personalInfo: {
    dateOfBirth: string | null;
    address: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
  };
  contract: {
    contractId?: string | OperationsContract;
    type: 'full-time' | 'part-time' | 'contract';
    startDate: string | null;
    endDate: string | null;
    salary: string | null;
  };
  kpis: {
    metric: string;
    target: string;
    actual: string;
    status: 'on-track' | 'at-risk' | 'behind';
  }[];
}

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
export async function apiListProjects(search?: string, status?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  return request<{ projects: Project[] }>(`/operations/projects?${params}`);
}

export async function apiCreateProject(data: Partial<Project>) {
  return request<{ project: Project }>('/operations/projects', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateProject(id: string, data: Partial<Project>) {
  return request<{ project: Project }>(`/operations/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteProject(id: string) {
  return request<{ message: string }>(`/operations/projects/${id}`, { method: 'DELETE' });
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

export async function apiDeleteClient(id: string) {
  return request<{ message: string }>(`/operations/clients/${id}`, { method: 'DELETE' });
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

export async function apiUploadContractDocument(contractId: string, file: File) {
  const form = new FormData();
  form.append('document', file);
  return request<{ contract: OperationsContract }>(`/operations/contracts/${contractId}/document`, {
    method: 'POST',
    body: form,
  });
}

export async function apiInstantiateContract(data: { templateId: string; targetId?: string; targetName: string; startDate: string; endDate: string }) {
  return request<{ contract: OperationsContract }>('/operations/contracts/instantiate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Employees ───────────────────────────────────────────────────────────────

export async function apiListEmployees(params: { department?: string; status?: string; search?: string } = {}) {
  const qs = new URLSearchParams(params as any).toString();
  return request<{ employees: Employee[] }>(`/hr${qs ? `?${qs}` : ''}`);
}

export async function apiGetEmployeeById(id: string) {
  return request<{ employee: Employee }>(`/hr/${id}`);
}

export async function apiCreateEmployee(data: Partial<Employee>) {
  return request<{ employee: Employee }>('/hr', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateEmployee(id: string, data: Partial<Employee>) {
  return request<{ employee: Employee }>(`/hr/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteEmployee(id: string) {
  return request(`/hr/${id}`, { method: 'DELETE' });
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

export async function apiDeleteSite(id: string) {
  return request<{ message: string }>(`/operations/sites/${id}`, { method: 'DELETE' });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

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

export async function apiDeleteWarehouse(id: string) {
  return request<{ warehouse: Warehouse }>(`/inventory/warehouses/${id}`, { method: 'DELETE' });
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

export type StockMovement = {
  _id: string;
  movementRef: string;
  movementType: 'INBOUND' | 'OUTBOUND' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT' | 'STOCK_COUNT' | 'RETURN';
  warehouseId: string | null;
  warehouseName: string | null;
  qty: number;
  unitCost: number;
  totalCost: number;
  sourceType: string;
  sourceRef: string;
  reason: string | null;
  notes: string | null;
  delay_reason: string | null;
  postedBy: { _id: string; fullName: string } | null;
  postedAt: string;
  grossWeight: number | null;
  tareWeight: number | null;
  deductionWeight: number;
  netWeight: number | null;
  transportMethod: string | null;
  truckPlate: string | null;
  driverName: string | null;
  pickupCode: string | null;
  deliveryTime: string | null;
  supplierName: string | null;
  supplierTin: string | null;
  supplierVrn: string | null;
  supplierPhone: string | null;
  remark: string | null;
  linkedPoId: string | null;
  linkedPoRef: string | null;
  crusherCost: number | null;
  samplingCost: number | null;
  otherProcessingCost: number | null;
  otherProcessingDescription: string | null;
};

export async function apiListMovements(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ limit: '100', ...params }).toString();
  return request<{ movements: StockMovement[]; pagination: { total: number; pages: number } }>(`/inventory/movements?${qs}`);
}

export async function apiCreateMovement(data: {
  movementType: string;
  warehouseId?: string;
  qty: number;
  unitCost?: number;
  sourceType?: string;
  sourceRef?: string;
  reason?: string;
  notes?: string;
  countedQty?: number;
  delay_reason?: string;
  grossWeight?: number;
  tareWeight?: number;
  deductionWeight?: number;
  netWeight?: number;
  transportMethod?: string;
  truckPlate?: string;
  driverName?: string;
  pickupCode?: string;
  deliveryTime?: string;
  supplierName?: string;
  supplierTin?: string;
  supplierVrn?: string;
  supplierPhone?: string;
  remark?: string;
  linkedPoId?: string;
  linkedPoRef?: string;
  crusherCost?: number;
  samplingCost?: number;
  otherProcessingCost?: number;
  otherProcessingDescription?: string;
}) {
  return request<{ movement: StockMovement }>('/inventory/movements', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiDeleteMovement(id: string) {
  return request<{ message: string }>(`/inventory/movements/${id}`, { method: 'DELETE' });
}

export async function apiCreateTransfer(data: {
  qty: number;
  sourceWarehouseId?: string;
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

// ─── Product Catalog ──────────────────────────────────────────────────────────

export type Product = {
  _id: string;
  name: string;
  cost_per_unit: number;
  currency: string;
};

export async function apiListProducts(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ products: Product[]; pagination: { total: number } }>(
    `/inventory/products${qs ? `?${qs}` : ''}`
  );
}

export async function apiCreateProduct(data: Omit<Product, '_id'>) {
  return request<{ product: Product }>('/inventory/products', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateProduct(id: string, data: Partial<Omit<Product, '_id'>>) {
  return request<{ product: Product }>(`/inventory/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteProduct(id: string) {
  return request<{ message: string }>(`/inventory/products/${id}`, { method: 'DELETE' });
}

// ─── Stock Records ────────────────────────────────────────────────────────────

export type StockRecord = {
  _id: string;
  item_code: string;
  product_id: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  on_hand: number;
  demand: number;
  stock_deficit: number;
  cost_per_unit: number;
  currency: string;
  total_value: number;
  paid_amount: number;
  cash_deficit: number;
  status: 'Complete' | 'Pending';
  deadline: string | null;
  supporting_doc: string | null;
  source_po_id: string | null;
  source_po_ref: string | null;
};

export async function apiListStockRecords(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ records: StockRecord[]; pagination: { total: number } }>(
    `/inventory/stock-records${qs ? `?${qs}` : ''}`
  );
}

export async function apiGetStockRecordsSummary() {
  return request<{
    summary: { totalItems: number; totalValue: number; cashDeficit: number; pendingItems: number; warehouseCount: number };
  }>('/inventory/stock-records/summary');
}

export async function apiCreateStockRecord(data: Partial<StockRecord> & { product_id: string; warehouse_id: string }) {
  return request<{ record: StockRecord }>('/inventory/stock-records', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateStockRecord(id: string, data: Partial<StockRecord>) {
  return request<{ record: StockRecord }>(`/inventory/stock-records/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function apiDeleteStockRecord(id: string) {
  return request<{ message: string }>(`/inventory/stock-records/${id}`, { method: 'DELETE' });
}

// ─── Inventory Documents ──────────────────────────────────────────────────────

export type InventoryDoc = {
  _id: string;
  movement_id: string;
  movement_ref?: string;
  doc_type: 'Invoice' | 'Receipt' | 'Waybill' | 'Weighbridge';
  image_path: string;
  uploaded_at?: string;
};

export async function apiListInventoryDocs(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ documents: InventoryDoc[]; pagination: { total: number } }>(
    `/inventory/documents${qs ? `?${qs}` : ''}`
  );
}

export async function apiCreateInventoryDoc(data: { movement_id: string; doc_type: string; image: File }) {
  const form = new FormData();
  form.append('movement_id', data.movement_id);
  form.append('doc_type', data.doc_type);
  form.append('image', data.image);
  return request<{ document: InventoryDoc }>('/inventory/documents', { method: 'POST', body: form });
}

export async function apiDeleteInventoryDoc(id: string) {
  return request<{ message: string }>(`/inventory/documents/${id}`, { method: 'DELETE' });
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
  status: 'scheduled' | 'in_progress' | 'shunting' | 'completed' | 'cancelled';
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
    summary: { totalTrucks: number; operating: number; idle: number; inMaintenance: number; activeTrips: number; shuntingTrips: number; totalFuelCost: number };
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
