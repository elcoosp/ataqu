// Auto-generated for pivot
import { api } from './client';

export const pivotApi = {
  getList: () => api.get('/pivot'),
  getOne: (id: string) => api.get(`/pivot/${id}`),
  create: (data: any) => api.post('/pivot', data),
  update: (id: string, data: any) => api.put(`/pivot/${id}`, data),
  delete: (id: string) => api.delete(`/pivot/${id}`),
};
