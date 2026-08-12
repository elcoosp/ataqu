import { UUID } from '@ataqu/types';
import { api } from './client';
import type {
  ChannelSummary,
  Channel,
  CreateChannelRequest,
  Message,
  MessageListResponse,
  SendMessageRequest,
  EditMessageRequest,
  StartThreadRequest,
  Thread,
  Mention,
  AddReactionRequest,
  Reaction,
  UploadFileRequest,
  UploadFileResponse,
  SearchMessagesParams,
  BulkDeleteRequest,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Channels ----
export const listChannels = () => api.get<ChannelSummary[]>('/dial/channels');
export const createChannel = (data: CreateChannelRequest) =>
  api.post<Channel>('/dial/channels', data);
export const getChannel = (id: UUID) => api.get<Channel>(`/dial/channels/${id}`);
export const updateChannel = (id: UUID, data: { name: string }) =>
  api.put<Channel>(`/dial/channels/${id}`, data);
export const archiveChannel = (id: UUID) =>
  api.post<void>(`/dial/channels/${id}/archive`);

// ---- Messages ----
export const listMessages = (channelId: UUID, params?: { limit?: number; offset?: number }) =>
  api.get<MessageListResponse>(`/dial/channels/${channelId}/messages`, { params });
export const sendMessage = (channelId: UUID, data: SendMessageRequest) =>
  api.post<Message>(`/dial/channels/${channelId}/messages`, data);
export const editMessage = (messageId: UUID, data: EditMessageRequest) =>
  api.put<Message>(`/dial/messages/${messageId}`, data);
export const deleteMessage = (messageId: UUID) =>
  api.delete<void>(`/dial/messages/${messageId}`);
export const bulkDeleteMessages = (data: BulkDeleteRequest) =>
  api.post<void>('/dial/messages/bulk-delete', data);

// ---- Threads ----
export const startThread = (data: StartThreadRequest) =>
  api.post<Thread>('/dial/threads', data);
export const getThread = (id: UUID) => api.get<Thread>(`/dial/threads/${id}`);
export const listThreadMessages = (threadId: UUID, params?: { limit?: number; offset?: number }) =>
  api.get<Message[]>(`/dial/threads/${threadId}/messages`, { params });

// ---- Mentions ----
export const addMention = (data: { message_id: UUID; user_id: UUID }) =>
  api.post<Mention>('/dial/mentions', data);
export const listMentions = () =>
  api.get<{ mentions: Mention[] }>('/dial/mentions');
export const markMentionRead = (mentionId: UUID) =>
  api.post<void>(`/dial/mentions/${mentionId}/read`);

// ---- Reactions ----
export const addReaction = (messageId: UUID, data: AddReactionRequest) =>
  api.post<Reaction>(`/dial/messages/${messageId}/reactions`, data);
export const listReactions = (messageId: UUID) =>
  api.get<Reaction[]>(`/dial/messages/${messageId}/reactions`);
export const deleteReaction = (messageId: UUID, reactionId: UUID) =>
  api.delete<void>(`/dial/messages/${messageId}/reactions/${reactionId}`);

// ---- Files ----
export const uploadFile = (channelId: UUID, data: UploadFileRequest) =>
  api.post<UploadFileResponse>(`/dial/channels/${channelId}/files`, data);

// ---- Presence ----
export const getOnlineUsers = () => api.get<{ online_users: UUID[] }>('/dial/presence/online');

// ---- Search ----
export const searchMessages = (params: SearchMessagesParams) =>
  api.get<{ messages: Message[] }>('/dial/search', { params });

// ---- Export ----
export const exportChannelCsv = (channelId: UUID) =>
  api.get<Blob>(`/dial/channels/${channelId}/export`, { responseType: 'blob' });
export const exportChannelPdf = (channelId: UUID) =>
  api.get<Blob>(`/dial/channels/${channelId}/export/pdf`, { responseType: 'blob' });

// ---- React Query hooks ----
export const useListChannels = (options?: UseQueryOptions<ChannelSummary[]>) =>
  useQuery({ queryKey: ['dial', 'channels'], queryFn: listChannels, ...options });
export const useGetChannel = (id: UUID, options?: UseQueryOptions<Channel>) =>
  useQuery({ queryKey: ['dial', 'channel', id], queryFn: () => getChannel(id), ...options });
export const useListMessages = (
  channelId: UUID,
  params?: { limit?: number; offset?: number },
  options?: UseQueryOptions<MessageListResponse>
) =>
  useQuery({
    queryKey: ['dial', 'messages', channelId, params],
    queryFn: () => listMessages(channelId, params),
    ...options,
  });
export const useGetThread = (id: UUID, options?: UseQueryOptions<Thread>) =>
  useQuery({ queryKey: ['dial', 'thread', id], queryFn: () => getThread(id), ...options });
export const useListThreadMessages = (threadId: UUID, params?: { limit?: number; offset?: number }, options?: UseQueryOptions<Message[]>) =>
  useQuery({
    queryKey: ['dial', 'thread-messages', threadId, params],
    queryFn: () => listThreadMessages(threadId, params),
    ...options,
  });
export const useListMentions = (options?: UseQueryOptions<{ mentions: Mention[] }>) =>
  useQuery({ queryKey: ['dial', 'mentions'], queryFn: listMentions, ...options });
export const useListReactions = (messageId: UUID, options?: UseQueryOptions<Reaction[]>) =>
  useQuery({
    queryKey: ['dial', 'reactions', messageId],
    queryFn: () => listReactions(messageId),
    ...options,
  });
export const useSearchMessages = (params: SearchMessagesParams, options?: UseQueryOptions<{ messages: Message[] }>) =>
  useQuery({
    queryKey: ['dial', 'search', params],
    queryFn: () => searchMessages(params),
    ...options,
  });

export const useCreateChannel = (options?: UseMutationOptions<Channel, Error, CreateChannelRequest>) =>
  useMutation({ mutationFn: createChannel, ...options });
export const useUpdateChannel = (options?: UseMutationOptions<Channel, Error, { id: UUID; data: { name: string } }>) =>
  useMutation({
    mutationFn: ({ id, data }) => updateChannel(id, data),
    ...options,
  });
export const useArchiveChannel = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: archiveChannel, ...options });

export const useSendMessage = (options?: UseMutationOptions<Message, Error, { channelId: UUID; data: SendMessageRequest }>) =>
  useMutation({
    mutationFn: ({ channelId, data }) => sendMessage(channelId, data),
    ...options,
  });
export const useEditMessage = (options?: UseMutationOptions<Message, Error, { messageId: UUID; data: EditMessageRequest }>) =>
  useMutation({
    mutationFn: ({ messageId, data }) => editMessage(messageId, data),
    ...options,
  });
export const useDeleteMessage = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: deleteMessage, ...options });
export const useBulkDeleteMessages = (options?: UseMutationOptions<void, Error, BulkDeleteRequest>) =>
  useMutation({ mutationFn: bulkDeleteMessages, ...options });

export const useStartThread = (options?: UseMutationOptions<Thread, Error, StartThreadRequest>) =>
  useMutation({ mutationFn: startThread, ...options });
export const useAddMention = (options?: UseMutationOptions<Mention, Error, { message_id: UUID; user_id: UUID }>) =>
  useMutation({ mutationFn: addMention, ...options });
export const useMarkMentionRead = (options?: UseMutationOptions<void, Error, UUID>) =>
  useMutation({ mutationFn: markMentionRead, ...options });
export const useAddReaction = (options?: UseMutationOptions<Reaction, Error, { messageId: UUID; data: AddReactionRequest }>) =>
  useMutation({
    mutationFn: ({ messageId, data }) => addReaction(messageId, data),
    ...options,
  });
export const useDeleteReaction = (options?: UseMutationOptions<void, Error, { messageId: UUID; reactionId: UUID }>) =>
  useMutation({
    mutationFn: ({ messageId, reactionId }) => deleteReaction(messageId, reactionId),
    ...options,
  });
export const useUploadFile = (options?: UseMutationOptions<UploadFileResponse, Error, { channelId: UUID; data: UploadFileRequest }>) =>
  useMutation({
    mutationFn: ({ channelId, data }) => uploadFile(channelId, data),
    ...options,
  });
