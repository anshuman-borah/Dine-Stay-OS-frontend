import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { subscriptionWallStore } from '@/store/subscriptionWall.store';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://dinestay-backend-dubd.onrender.com';

export const api = axios.create({ 
  baseURL: BASE,
  withCredentials: true 
});

// Attach JWT + tenant headers to every request
api.interceptors.request.use((config) => {
  const { accessToken, tenantId, branchId, user } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (tenantId && user?.role !== 'superadmin') config.headers['x-tenant-id'] = tenantId;
  if (branchId && user?.role !== 'superadmin') config.headers['x-branch-id'] = branchId;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void, reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Unwraps Spring Boot responses & Auto-refreshes tokens
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (err) => {
    const original = err.config;

    if (err.response?.status === 402) {
      const body = err.response.data ?? {};
      const plan = body?.data?.plan ?? body?.plan ?? null;
      const daysLeft = body?.data?.daysLeft ?? body?.daysLeft ?? 0;
      subscriptionWallStore.block(plan, daysLeft);
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(err => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      
      if (!refreshToken) { 
        logout(); 
        return Promise.reject(err); 
      }
      
      try {
        const res = await axios.post(`${BASE}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken: at, refreshToken: rt } = res.data?.data ?? res.data;
        setTokens(at, rt);
        original.headers.Authorization = `Bearer ${at}`;
        processQueue(null, at); 
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export const apiFetch = async (url: string, params?: object) => {
  const res = await api.get(url, { params });
  return { data: res.data, status: res.status };
};

export const apiPost = async (url: string, body?: object) => {
  const res = await api.post(url, body);
  return { data: res.data, status: res.status };
};

export const apiPatch = async (url: string, body?: object) => {
  const res = await api.patch(url, body);
  return { data: res.data, status: res.status };
};

export const apiPut = async (url: string, body?: object) => {
  const res = await api.put(url, body);
  return { data: res.data, status: res.status };
};

export const apiDelete = async (url: string) => {
  const res = await api.delete(url);
  return { data: res.data, status: res.status };
};