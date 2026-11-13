import axios from 'axios';

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('travelgo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const agentRequest = /^\/agent\//.test(error.config?.url || '');
    if (!agentRequest) console.error('API Error:', error.response?.data || error.message);
    const currentToken = localStorage.getItem('travelgo_token');
    // A delayed response for the previous account must not log out the new one.
    if (error.response?.status === 401 && currentToken && error.config?.headers?.Authorization === `Bearer ${currentToken}`) {
      localStorage.removeItem('travelgo_token');
      localStorage.removeItem('travelgo_user');
      window.dispatchEvent(new Event('travelgo:unauthorized'));
    }
    if (agentRequest) return Promise.reject({ status: error.response?.status || (error.code === 'ECONNABORTED' ? 504 : 0),
      code: typeof error.response?.data?.code === 'string' ? error.response.data.code : undefined,
      canceled: axios.isCancel(error) });
    return Promise.reject(error.response?.data || error);
  }
);
