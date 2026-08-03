// Auto-generated for cinq
import { api } from './client';

export const cinqApi = {
  getList: () => api.get('/cinq'),
  getOne: (id: string) => api.get(`/cinq/${id}`),
  create: (data: any) => api.post('/cinq', data),
  update: (id: string, data: any) => api.put(`/cinq/${id}`, data),
  delete: (id: string) => api.delete(`/cinq/${id}`),
};
