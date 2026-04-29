import axios from 'axios';
import { router } from 'expo-router';
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
  async (error) => {
    if (!error.response) {
      return Promise.reject(new Error('Không thể kết nối. Vui lòng thử lại.'));
    }
    if (error.response.status === 401) {
      await storage.clear();
      router.replace('/login');
      return Promise.reject(new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'));
    }
    const msg = error.response?.data?.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.';
    return Promise.reject(new Error(msg));
  }
);

export default api;
