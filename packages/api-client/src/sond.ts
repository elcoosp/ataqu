// Auto-generated for sond
import { api } from './client';

export const sondApi = {
  getList: () => api.get('/sond'),
  getOne: (id: string) => api.get(`/sond/${id}`),
  create: (data: any) => api.post('/sond', data),
  update: (id: string, data: any) => api.put(`/sond/${id}`, data),
  delete: (id: string) => api.delete(`/sond/${id}`),
};
