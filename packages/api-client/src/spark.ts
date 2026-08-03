// Auto-generated for spark
import { api } from './client';

export const sparkApi = {
  getList: () => api.get('/spark'),
  getOne: (id: string) => api.get(`/spark/${id}`),
  create: (data: any) => api.post('/spark', data),
  update: (id: string, data: any) => api.put(`/spark/${id}`, data),
  delete: (id: string) => api.delete(`/spark/${id}`),
};
