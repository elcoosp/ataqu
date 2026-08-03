// Auto-generated for aegis
import { api } from './client';

export const aegisApi = {
  getList: () => api.get('/aegis'),
  getOne: (id: string) => api.get(`/aegis/${id}`),
  create: (data: any) => api.post('/aegis', data),
  update: (id: string, data: any) => api.put(`/aegis/${id}`, data),
  delete: (id: string) => api.delete(`/aegis/${id}`),
};
