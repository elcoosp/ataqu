// Auto-generated for dial
import { api } from './client';

export const dialApi = {
  getList: () => api.get('/dial'),
  getOne: (id: string) => api.get(`/dial/${id}`),
  create: (data: any) => api.post('/dial', data),
  update: (id: string, data: any) => api.put(`/dial/${id}`, data),
  delete: (id: string) => api.delete(`/dial/${id}`),
};
