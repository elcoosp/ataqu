// Auto-generated for tempo
import { api } from './client';

export const tempoApi = {
  getList: () => api.get('/tempo'),
  getOne: (id: string) => api.get(`/tempo/${id}`),
  create: (data: any) => api.post('/tempo', data),
  update: (id: string, data: any) => api.put(`/tempo/${id}`, data),
  delete: (id: string) => api.delete(`/tempo/${id}`),
};
