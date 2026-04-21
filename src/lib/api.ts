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
  managerName: string | null;
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
  isActive: boolean;
};

export async function apiListProjects(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  return request<{ projects: Project[] }>(`/operations/projects?${params}`);
}

export async function apiCreateProject(data: Partial<Project>) {
  return request<{ project: Project }>('/operations/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiListClients(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  return request<{ clients: Client[] }>(`/operations/clients?${params}`);
}

export async function apiCreateClient(data: Partial<Client>) {
  return request<{ client: Client }>('/operations/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockItem = {
  _id: string;
  itemCode: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  onHandQty: number;
  availableQty: number;
  weightedAvgCost: number | null;
  warehouseName: string;
};

export async function apiListStockItems(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  return request<{ items: StockItem[]; pagination: { total: number } }>(`/inventory/stock-items?${params}&limit=200`);
}
