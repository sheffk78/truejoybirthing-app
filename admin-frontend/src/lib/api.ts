const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8000'
  : '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem('tjb_admin_token');
}

export function setToken(token: string): void {
  localStorage.setItem('tjb_admin_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('tjb_admin_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.location.href = '/admin/login';
    }
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, errorBody.detail || res.statusText);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/admin/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Dashboard
  getStats: () =>
    request<{
      total_users: number;
      users_by_role: Record<string, number>;
      subscription_breakdown: Record<string, number>;
      signups_last_7_days: number;
      signups_last_30_days: number;
      trial_conversion_rate: number;
    }>('/admin/api/dashboard/stats'),

  getSignupTrend: () =>
    request<Array<{ date: string; total: number; MOM: number; DOULA: number; MIDWIFE: number; ADMIN: number }>>(
      '/admin/api/dashboard/signup-trend'
    ),

  // Users
  getUsers: (params: { q?: string; role?: string; subscription_status?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.role) searchParams.set('role', params.role);
    if (params.subscription_status) searchParams.set('subscription_status', params.subscription_status);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<{ users: Array<any>; total: number; page: number; limit: number; pages: number }>(
      `/admin/api/dashboard/users${qs ? `?${qs}` : ''}`
    );
  },

  getUser: (userId: string) =>
    request<any>(`/admin/api/dashboard/users/${userId}`),
};