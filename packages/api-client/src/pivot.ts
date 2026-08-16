import type {
	UseMutationOptions,
	UseQueryOptions,
} from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
	Block,
	CreateBlockRequest,
	CreateDatabaseCommand,
	CreateDocumentCommand,
	CreateRelationCommand,
	Database,
	DatabaseRow,
	Document,
	ListDocumentsParams,
	ListRelationsParams,
	Relation,
	SearchDocumentsParams,
	Template,
	UpdateBlockRequest,
	UpdateDocumentCommand,
} from "./types";

// ---- Documents ----
export const createDocument = (data: CreateDocumentCommand) =>
	api.post<Document>("/pivot/docs", data);
export const listDocuments = (params?: ListDocumentsParams) =>
	api.get<Document[]>("/pivot/docs", { params });
export const getDocument = (id: string) =>
	api.get<Document>(`/pivot/docs/${id}`);
export const updateDocument = (
	id: string,
	data: UpdateDocumentCommand,
	version?: number,
) =>
	api.put<Document>(`/pivot/docs/${id}`, data, {
		headers: version != null ? { "If-Match": String(version) } : {},
	});
export const deleteDocument = (id: string) =>
	api.delete<void>(`/pivot/docs/${id}`);

// ---- Document versions ----
export const listDocumentVersions = (id: string) =>
	api.get<unknown[]>(`/pivot/docs/${id}/versions`);

// ---- Databases ----
export const listDatabases = (params?: { limit?: number; offset?: number }) =>
	api.get<Database[]>("/pivot/databases", { params });
export const getDatabase = (id: string) =>
	api.get<Database>(`/pivot/databases/${id}`);
export const getDatabaseRows = (id: string) =>
	api.get<DatabaseRow[]>(`/pivot/databases/${id}/rows`);
export const createDatabaseRow = (
	databaseId: string,
	data: Record<string, unknown>,
) => api.post<DatabaseRow>(`/pivot/databases/${databaseId}/rows`, data);
export const updateDatabaseRow = (
	databaseId: string,
	rowId: string,
	data: Record<string, unknown>,
) =>
	api.patch<DatabaseRow>(`/pivot/databases/${databaseId}/rows/${rowId}`, data);
export const updateBlock = (
	id: string,
	data: UpdateBlockRequest,
	version: number,
) =>
	api.put<Block>(`/pivot/blocks/${id}`, data, {
		headers: { "If-Match": String(version) },
	});
export const listBlocks = (documentId: string) =>
	api.get<Block[]>(`/pivot/docs/${documentId}/blocks`);
export const createBlock = (data: CreateBlockRequest) =>
	api.post<Block>("/pivot/blocks", data);
export const createDatabase = (data: CreateDatabaseCommand) =>
	api.post<Database>("/pivot/databases", data);

// ---- Templates ----
export const listTemplates = () => api.get<Template[]>("/pivot/templates");
export const createTemplate = (data: { name: string; content: string }) =>
	api.post<Template>("/pivot/templates", data);
export const applyTemplate = (id: string, data: { name: string }) =>
	api.post<Template>(`/pivot/templates/${id}/apply`, data);
export const applyTemplateToDoc = (docId: string, templateId: string) =>
	api.post<Document>(`/pivot/docs/${docId}/apply-template`, { templateId });

// ---- Relations ----
export const createRelation = (docId: string, data: CreateRelationCommand) =>
	api.post<Relation>(`/pivot/docs/${docId}/relations`, data);
export const listRelations = (docId: string, params?: ListRelationsParams) =>
	api.get<Relation[]>(`/pivot/docs/${docId}/relations`, { params });
export const getRelation = (id: string) =>
	api.get<Relation>(`/pivot/relations/${id}`);
export const deleteRelation = (id: string) =>
	api.delete<void>(`/pivot/relations/${id}`);

// ---- Search ----
export const searchDocuments = (params: SearchDocumentsParams) =>
	api.get<Document[]>("/pivot/search", { params });

// ---- React Query hooks ----
export const useListDocuments = (
	params?: ListDocumentsParams,
	options?: UseQueryOptions<Document[]>,
) =>
	useQuery({
		queryKey: ["pivot", "documents", params],
		queryFn: () => listDocuments(params),
		...options,
	});
export const useGetDocument = (
	id: string,
	options?: UseQueryOptions<Document>,
) =>
	useQuery({
		queryKey: ["pivot", "document", id],
		queryFn: () => getDocument(id),
		...options,
	});
export const useGetDatabase = (
	id: string,
	options?: UseQueryOptions<Database>,
) =>
	useQuery({
		queryKey: ["pivot", "database", id],
		queryFn: () => getDatabase(id),
		...options,
	});
export const useListDatabases = (
	params?: { limit?: number; offset?: number },
	options?: UseQueryOptions<Database[]>,
) =>
	useQuery({
		queryKey: ["pivot", "databases", params],
		queryFn: () => listDatabases(params),
		...options,
	});
export const useGetDatabaseRows = (
	id: string,
	options?: UseQueryOptions<DatabaseRow[]>,
) =>
	useQuery({
		queryKey: ["pivot", "database", id, "rows"],
		queryFn: () => getDatabaseRows(id),
		...options,
	});
export const useListTemplates = (options?: UseQueryOptions<Template[]>) =>
	useQuery({
		queryKey: ["pivot", "templates"],
		queryFn: listTemplates,
		...options,
	});
export const useListDocumentVersions = (
	id: string,
	options?: UseQueryOptions<unknown[]>,
) =>
	useQuery({
		queryKey: ["pivot", "document", id, "versions"],
		queryFn: () => listDocumentVersions(id),
		...options,
	});
export const useListRelations = (
	docId: string,
	params?: ListRelationsParams,
	options?: UseQueryOptions<Relation[]>,
) =>
	useQuery({
		queryKey: ["pivot", "relations", docId, params],
		queryFn: () => listRelations(docId, params),
		...options,
	});
export const useSearchDocuments = (
	params: SearchDocumentsParams,
	options?: UseQueryOptions<Document[]>,
) =>
	useQuery({
		queryKey: ["pivot", "search", params],
		queryFn: () => searchDocuments(params),
		...options,
	});

export const useCreateDocument = (
	options?: UseMutationOptions<Document, Error, CreateDocumentCommand>,
) => useMutation({ mutationFn: createDocument, ...options });
export const useUpdateDocument = (
	options?: UseMutationOptions<
		Document,
		Error,
		{ id: string; data: UpdateDocumentCommand; version?: number }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data, version }) => updateDocument(id, data, version),
		...options,
	});
export const useUpdateBlock = (
	options?: UseMutationOptions<
		Block,
		Error,
		{ id: string; data: UpdateBlockRequest; version: number }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data, version }) => updateBlock(id, data, version),
		...options,
	});
export const useListBlocks = (
	documentId: string,
	options?: UseQueryOptions<Block[]>,
) =>
	useQuery({
		queryKey: ["pivot", "document", documentId, "blocks"],
		queryFn: () => listBlocks(documentId),
		...options,
	});
export const useCreateBlock = (
	_documentId: string,
	options?: UseMutationOptions<Block, Error, CreateBlockRequest>,
) =>
	useMutation({
		mutationFn: createBlock,
		...options,
	});
export const useDeleteDocument = (
	options?: UseMutationOptions<void, Error, string>,
) => useMutation({ mutationFn: deleteDocument, ...options });
export const useCreateRelation = (
	options?: UseMutationOptions<
		Relation,
		Error,
		{ docId: string; data: CreateRelationCommand }
	>,
) =>
	useMutation({
		mutationFn: ({ docId, data }) => createRelation(docId, data),
		...options,
	});
export const useDeleteRelation = (
	options?: UseMutationOptions<void, Error, string>,
) => useMutation({ mutationFn: deleteRelation, ...options });
export const useApplyTemplate = (
	options?: UseMutationOptions<
		Template,
		Error,
		{ id: string; data: { name: string } }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data }) => applyTemplate(id, data),
		...options,
	});

export const useCreateTemplate = (
	options?: UseMutationOptions<
		Template,
		Error,
		{ name: string; content: string }
	>,
) => useMutation({ mutationFn: createTemplate, ...options });

export const useCreateDatabase = (
	options?: UseMutationOptions<Database, Error, CreateDatabaseCommand>,
) => useMutation({ mutationFn: createDatabase, ...options });

export const useCreateDatabaseRow = (
	databaseId: string,
	options?: UseMutationOptions<DatabaseRow, Error, Record<string, unknown>>,
) =>
	useMutation({
		mutationFn: (data) => createDatabaseRow(databaseId, data),
		...options,
	});

export const useUpdateDatabaseRow = (
	databaseId: string,
	options?: UseMutationOptions<
		DatabaseRow,
		Error,
		{ rowId: string; values: Record<string, unknown> }
	>,
) =>
	useMutation({
		mutationFn: ({ rowId, values }) =>
			updateDatabaseRow(databaseId, rowId, values),
		...options,
	});

export const useApplyTemplateToDoc = (
	docId: string,
	options?: UseMutationOptions<Document, Error, string>,
) =>
	useMutation({
		mutationFn: (templateId) => applyTemplateToDoc(docId, templateId),
		...options,
	});
