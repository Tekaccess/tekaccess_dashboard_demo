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
