import axios from 'axios';
import { storage } from './storage';
import { API_BASE_URL } from './config';

const api = axios.create({ baseURL: `${API_BASE_URL}/api`, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new Error('Không thể kết nối. Vui lòng thử lại.'));
    }
    const msg = error.response?.data?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.';
    return Promise.reject(new Error(msg));
  }
);

export default api;
