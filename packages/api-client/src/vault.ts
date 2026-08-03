// Auto-generated for vault
import { api } from './client';

export const vaultApi = {
  getList: () => api.get('/vault'),
  getOne: (id: string) => api.get(`/vault/${id}`),
  create: (data: any) => api.post('/vault', data),
  update: (id: string, data: any) => api.put(`/vault/${id}`, data),
  delete: (id: string) => api.delete(`/vault/${id}`),
};
