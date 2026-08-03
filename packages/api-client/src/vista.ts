// Auto-generated for vista
import { api } from './client';

export const vistaApi = {
  getList: () => api.get('/vista'),
  getOne: (id: string) => api.get(`/vista/${id}`),
  create: (data: any) => api.post('/vista', data),
  update: (id: string, data: any) => api.put(`/vista/${id}`, data),
  delete: (id: string) => api.delete(`/vista/${id}`),
};
