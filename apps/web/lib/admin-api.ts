// Admin API client — used only in /admin pages (server-side safe)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

function getAdminToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('admin_token') || ''
}

async function adminRequest(path: string, options: RequestInit = {}) {
  const token = getAdminToken()
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Hata oluştu' }))
    throw new Error(err.error || `Admin API hatası (${res.status})`)
  }
  return res.json()
}

export const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    adminRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Overview
  overview: () => adminRequest('/overview'),

  // Users
  users: (params?: Record<string, string>) =>
    adminRequest('/users?' + new URLSearchParams(params || {}).toString()),
  user: (id: string) => adminRequest(`/users/${id}`),
  userData: (id: string, type: string, page = 1) =>
    adminRequest(`/users/${id}/data?type=${type}&page=${page}`),
  updateUser: (id: string, data: object) =>
    adminRequest(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addCredits: (id: string, amount: number, reason: string) =>
    adminRequest(`/users/${id}/credits`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
  impersonate: (id: string) =>
    adminRequest(`/users/${id}/impersonate`, { method: 'POST' }),

  // Banners
  banners: () => adminRequest('/content/banners'),
  activeBanners: (type: string, slug?: string, plan?: string) =>
    adminRequest(`/content/banners/active?type=${type}${slug ? `&slug=${slug}` : ''}${plan ? `&plan=${plan}` : ''}`),
  createBanner: (data: object) =>
    adminRequest('/content/banners', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id: string, data: object) =>
    adminRequest(`/content/banners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBanner: (id: string) =>
    adminRequest(`/content/banners/${id}`, { method: 'DELETE' }),

  // System
  systemConfig: () => adminRequest('/system/config'),
  systemErrors: () => adminRequest('/system/errors'),
  systemUptime: () => adminRequest('/system/uptime'),

  // Analytics
  analytics: () => adminRequest('/analytics'),

  // Revenue
  revenue: () => adminRequest('/revenue'),

  // Notifications
  broadcast: (data: object) =>
    adminRequest('/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),

  // Promo codes
  promoCodes: () => adminRequest('/promo'),
  createPromo: (data: object) =>
    adminRequest('/promo', { method: 'POST', body: JSON.stringify(data) }),
  updatePromo: (id: string, data: object) =>
    adminRequest(`/promo/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Audit
  auditLog: () => adminRequest('/audit'),
}
