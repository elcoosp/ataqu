import { UUID } from '@ataqu/types';
import { api } from './client';
import type {
  Document,
  Database,
  Relation,
  CreateDocumentCommand,
  UpdateDocumentCommand,
  CreateRelationCommand,
  ListDocumentsParams,
  ListRelationsParams,
  SearchDocumentsParams,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Documents ----
export const createDocument = (data: CreateDocumentCommand) =>
  api.post<Document>('/docs', data);
export const listDocuments = (params?: ListDocumentsParams) =>
  api.get<Document[]>('/docs', { params });
export const getDocument = (id: string) =>
  api.get<Document>(`/docs/${id}`);
export const updateDocument = (id: string, data: UpdateDocumentCommand) =>
  api.put<Document>(`/docs/${id}`, data);
export const deleteDocument = (id: string) =>
  api.delete<void>(`/docs/${id}`);

// ---- Databases ----
export const getDatabase = (id: string) =>
  api.get<Database>(`/databases/${id}`);

// ---- Relations ----
export const createRelation = (docId: string, data: CreateRelationCommand) =>
  api.post<Relation>(`/docs/${docId}/relations`, data);
export const listRelations = (docId: string, params?: ListRelationsParams) =>
  api.get<Relation[]>(`/docs/${docId}/relations`, { params });
export const getRelation = (id: string) =>
  api.get<Relation>(`/relations/${id}`);
export const deleteRelation = (id: string) =>
  api.delete<void>(`/relations/${id}`);

// ---- Search ----
export const searchDocuments = (params: SearchDocumentsParams) =>
  api.get<Document[]>('/search', { params });

// ---- React Query hooks ----
export const useListDocuments = (params?: ListDocumentsParams, options?: UseQueryOptions<Document[]>) =>
  useQuery({
    queryKey: ['pivot', 'documents', params],
    queryFn: () => listDocuments(params),
    ...options,
  });
export const useGetDocument = (id: string, options?: UseQueryOptions<Document>) =>
  useQuery({ queryKey: ['pivot', 'document', id], queryFn: () => getDocument(id), ...options });
export const useGetDatabase = (id: string, options?: UseQueryOptions<Database>) =>
  useQuery({ queryKey: ['pivot', 'database', id], queryFn: () => getDatabase(id), ...options });
export const useListRelations = (docId: string, params?: ListRelationsParams, options?: UseQueryOptions<Relation[]>) =>
  useQuery({
    queryKey: ['pivot', 'relations', docId, params],
    queryFn: () => listRelations(docId, params),
    ...options,
  });
export const useSearchDocuments = (params: SearchDocumentsParams, options?: UseQueryOptions<Document[]>) =>
  useQuery({
    queryKey: ['pivot', 'search', params],
    queryFn: () => searchDocuments(params),
    ...options,
  });

export const useCreateDocument = (options?: UseMutationOptions<Document, Error, CreateDocumentCommand>) =>
  useMutation({ mutationFn: createDocument, ...options });
export const useUpdateDocument = (options?: UseMutationOptions<Document, Error, { id: string; data: UpdateDocumentCommand }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateDocument(id, data),
    ...options,
  });
export const useDeleteDocument = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({ mutationFn: deleteDocument, ...options });
export const useCreateRelation = (options?: UseMutationOptions<Relation, Error, { docId: string; data: CreateRelationCommand }>) =>
  useMutation({
    mutationFn: ({ docId, data }) => createRelation(docId, data),
    ...options,
  });
export const useDeleteRelation = (options?: UseMutationOptions<void, Error, string>) =>
  useMutation({ mutationFn: deleteRelation, ...options });
