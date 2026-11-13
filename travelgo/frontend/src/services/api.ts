import axios from 'axios';
import { normalizeAgentError } from '../utils/agentContract';

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
  const agentRequest = /^\/agent\//.test(config.url || '');
  const pinnedRequest = agentRequest || /^\/(?:maps|public-agent)\//.test(config.url || '');
  const pinned = config.headers.Authorization;
  // Agent-only captured credentials prevent old-account work from being sent
  // under a new login. DELETE may finish best-effort erasure with the old JWT.
  if (pinnedRequest && pinned && config.method?.toLowerCase() !== 'delete' && pinned !== `Bearer ${token}`) {
    throw new axios.CanceledError('Agent authentication changed', config);
  }
  if (token && (!pinnedRequest || !pinned)) {
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
    if (/^\/agent\/core\//.test(error.config?.url || '')) return Promise.reject({status:error.response?.status||0,code:error.response?.data?.code,message:error.response?.status===403?'Ghi Trip cần database test riêng được phê duyệt.':error.response?.status===429?'Đã đạt giới hạn yêu cầu Core.':'Chưa hoàn thành yêu cầu Core. Hãy kiểm tra lựa chọn hoặc kết thúc phiên.',conversation:error.response?.data?.conversation});
    if (agentRequest) return Promise.reject(normalizeAgentError(error.response?.data,
      error.response?.status || (error.code === 'ECONNABORTED' ? 504 : 0),
      error.config?.url === '/agent/chat' ? error.config?.data : undefined, axios.isCancel(error)));
    return Promise.reject(error.response?.data || error);
  }
);
