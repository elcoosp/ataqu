// Auto-generated for pause
import { api } from './client';

export const pauseApi = {
  getList: () => api.get('/pause'),
  getOne: (id: string) => api.get(`/pause/${id}`),
  create: (data: any) => api.post('/pause', data),
  update: (id: string, data: any) => api.put(`/pause/${id}`, data),
  delete: (id: string) => api.delete(`/pause/${id}`),
};
