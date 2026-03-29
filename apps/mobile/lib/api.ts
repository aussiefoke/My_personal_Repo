import axios from 'axios';
import CryptoJS from 'crypto-js';

const BASE_URL = 'https://mypersonalrepo-production.up.railway.app';
const APP_SECRET = 'chargesmart_2026_x9k2p';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：附加 JWT token + 请求签名
apiClient.interceptors.request.use((config) => {
  // JWT token
  const token = (globalThis as any).__authToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // 请求签名
  const timestamp = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2, 10);
  const signature = CryptoJS.HmacSHA256(
    `${timestamp}${nonce}${APP_SECRET}`,
    APP_SECRET
  ).toString();

  config.headers['x-timestamp'] = timestamp;
  config.headers['x-nonce'] = nonce;
  config.headers['x-signature'] = signature;

  return config;
});

// 充电站相关
export const stationApi = {
  nearby: (lat: number, lng: number, radiusKm = 5) =>
    apiClient.get('/stations/nearby', { params: { lat, lng, radiusKm } }),
  detail: (id: string) =>
    apiClient.get(`/stations/${id}/details`),
};

// 排名相关
export const rankingApi = {
  nearby: (lat: number, lng: number, sortBy = 'best', radiusKm = 5) =>
    apiClient.get('/ranking/nearby', { params: { lat, lng, sortBy, radiusKm } }),
};

// 贡献相关
export const contributionApi = {
  submit: (data: {
    stationId: string;
    type: string;
    payload: Record<string, unknown>;
    userLat: number;
    userLng: number;
  }) => apiClient.post('/contributions', data),
  recent: (stationId: string) =>
    apiClient.get(`/contributions/${stationId}/recent`),
};

// 评价相关
export const reviewApi = {
  list: (stationId: string, page = 1) =>
    apiClient.get(`/reviews/${stationId}`, { params: { page } }),
  submit: (data: { stationId: string; rating: number; body?: string }) =>
    apiClient.post('/reviews', data),
};

// 费用估算
export const calculatorApi = {
  estimate: (data: {
    batteryKwh: number;
    currentPct: number;
    targetPct: number;
    stationIds: string[];
  }) => apiClient.post('/calculator/estimate', data),
};

// 认证
export const authApi = {
  sendOtp: (phone: string) =>
    apiClient.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) =>
    apiClient.post('/auth/verify-otp', { phone, code }),
};