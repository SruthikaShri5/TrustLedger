import axios from 'axios';
import { MockAPIService } from '../services/mockApi';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const IS_VERCEL = false; // Always use real API now

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const mockAPI = MockAPIService.getInstance();

// ── Simple in-memory cache (cleared on logout) ──────────────────────────────
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 30_000 // 30 seconds

export function clearAPICache() {
  cache.clear()
}

async function cachedGet(url: string, params?: Record<string, any>) {
  const key = url + JSON.stringify(params ?? {})
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return { data: hit.data }
  }
  const res = await api.get(url, { params })
  cache.set(key, { data: res.data, ts: Date.now() })
  return res
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userType');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: async (username: string, password: string) => {
    if (IS_VERCEL) {
      const result = await mockAPI.login(username, password);
      return { data: result };
    }
    return api.post('/auth/login', { username, password });
  },

  register: (data: { username: string; email: string; password: string; full_name?: string; phone?: string }) =>
    api.post('/auth/register', data),

  getMe: () => api.get('/auth/me'),

  updateSettings: (settings: Record<string, any>) =>
    api.put('/auth/settings', settings),

  freezeAccount: () => api.post('/auth/freeze-account'),
  unfreezeAccount: () => api.post('/auth/unfreeze-account'),
};

// Transaction APIs
export const transactionAPI = {
  getAll: async (params?: { skip?: number; limit?: number; category?: string }) => {
    if (IS_VERCEL) {
      const result = await mockAPI.getTransactions();
      return { data: result };
    }
    return cachedGet('/transactions/', params as any);
  },

  create: (data: { merchant: string; amount: number; category?: string; description?: string; location?: string }) => {
    cache.delete('/transactions/' + JSON.stringify({}))
    cache.forEach((_, k) => { if (k.startsWith('/transactions/')) cache.delete(k) })
    return api.post('/transactions/', data)
  },

  getStats: (days?: number) =>
    cachedGet('/transactions/stats', { days: days || 30 }),

  getCategories: () => cachedGet('/transactions/categories'),

  getById: (transactionId: string) =>
    api.get(`/transactions/${transactionId}`),

  delete: (transactionId: string) => {
    cache.forEach((_, k) => { if (k.startsWith('/transactions/')) cache.delete(k) })
    return api.delete(`/transactions/${transactionId}`)
  },
};

// Fraud APIs
export const fraudAPI = {
  analyze: (data: { transaction_id?: string; merchant?: string; amount?: number; location?: string }) =>
    api.post('/fraud/analyze', data),

  getAlerts: () => cachedGet('/fraud/alerts'),

  getCases: () => cachedGet('/fraud/cases'),

  reportFraud: (transactionId: string) => {
    cache.delete('/fraud/alerts' + JSON.stringify({}))
    cache.delete('/fraud/stats' + JSON.stringify({}))
    return api.post('/fraud/report', { transaction_id: transactionId })
  },

  getStats: () => cachedGet('/fraud/stats'),
};

// Market APIs
export const marketAPI = {
  getLive: async () => {
    if (IS_VERCEL) {
      const result = await mockAPI.getMarketData();
      return { data: result };
    }
    return cachedGet('/market/live');
  },
  getRisk: () => cachedGet('/market/risk'),
  getVolatility: () => cachedGet('/market/volatility'),
  getAnalysis: () => cachedGet('/market/analysis'),
  getAlerts: () => cachedGet('/market/alerts'),
  getTrend: (days?: number) => cachedGet('/market/trend', { days: days || 30 }),
};

// AI APIs
export const aiAPI = {
  chat: async (message: string, context?: string) => {
    if (IS_VERCEL) {
      const result = await mockAPI.askAI(message);
      return { data: result };
    }
    return api.post('/ai/chat', { message, context: context || '' });
  },

  queryDocuments: (query: string, documentType?: string) =>
    api.post('/ai/document-query', { query, document_type: documentType }),

  getInsights: () => api.get('/ai/insights'),

  generateReport: () => api.get('/ai/reports/generate'),

  getNotifications: () => api.get('/ai/notifications'),

  markNotificationRead: (id: number) =>
    api.put(`/ai/notifications/${id}/read`),
};

// Compliance APIs
export const complianceAPI = {
  runCheck: () => {
    cache.delete('/compliance/score' + JSON.stringify({}))
    return api.get('/compliance/check')
  },
  getHistory: () => cachedGet('/compliance/history'),
  getScore: () => cachedGet('/compliance/score'),
  getDocuments: () => cachedGet('/compliance/documents'),
  getRegulations: () => cachedGet('/compliance/regulations'),
  uploadDocument: (file: File, documentType?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('document_type', documentType);
    return api.post('/compliance/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getFraudCases: (status?: string) =>
    api.get('/admin/fraud-cases', { params: status ? { status } : {} }),
  updateFraudCaseStatus: (caseId: number, status: string, notes?: string) =>
    api.put(`/admin/fraud-cases/${caseId}/status`, null, { params: { status, notes } }),
  getUsers: () => api.get('/admin/users'),
  updateUserStatus: (userId: number, isActive: boolean) =>
    api.put(`/admin/users/${userId}/status`, null, { params: { is_active: isActive } }),
  getLogs: (level?: string) =>
    api.get('/admin/logs', { params: level ? { level } : {} }),
  getAnalytics: (days?: number) =>
    api.get('/admin/analytics', { params: { days: days || 30 } }),
  broadcastAlert: (title: string, message: string, severity?: string) =>
    api.post('/admin/alerts/broadcast', null, { params: { title, message, severity: severity || 'info' } }),
};

export default api;
