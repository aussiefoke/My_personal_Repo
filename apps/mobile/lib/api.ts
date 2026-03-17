import axios from 'axios';

// 开发时改为你的局域网 IP，例如 http://192.168.1.100:3000
const BASE_URL = 'http://172.20.10.2:3000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 自动附加 JWT token
apiClient.interceptors.request.use((config) => {
  // token 从 zustand 的 authStore 获取
  const token = (globalThis as any).__authToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 充电站相关
export const stationApi = {
  nearby:  (lat: number, lng: number, radiusKm = 5) =>
    apiClient.get('/stations/nearby', { params: { lat, lng, radiusKm } }),
  detail:  (id: string) =>
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
  list:   (stationId: string, page = 1) =>
    apiClient.get(`/reviews/${stationId}`, { params: { page } }),
  submit: (data: { stationId: string; rating: number; body?: string }) =>
    apiClient.post('/reviews', data),
};

// 费用估算
export const calculatorApi = {
  estimate: (data: {
    batteryKwh:  number;
    currentPct:  number;
    targetPct:   number;
    stationIds:  string[];
  }) => apiClient.post('/calculator/estimate', data),
};

// 认证
export const authApi = {
  sendOtp:   (phone: string) =>
    apiClient.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) =>
    apiClient.post('/auth/verify-otp', { phone, code }),
};
