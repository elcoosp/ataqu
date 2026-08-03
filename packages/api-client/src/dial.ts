import { api } from './client';
import type {
  ChannelSummary,
  Channel,
  CreateChannelRequest,
  MessageListParams,
  MessageListResponse,
  SendMessageRequest,
  Message,
  ThreadSummary,
  Thread,
  CreateThreadRequest,
  UploadUrlRequest,
  UploadUrlResponse,
  SearchMessagesParams,
  SearchMessagesResults,
} from './types';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// ---- Channels ----
export const listChannels = () =>
  api.get<ChannelSummary[]>('/channels');
export const createChannel = (data: CreateChannelRequest) =>
  api.post<Channel>('/channels', data);
export const getChannel = (id: string) =>
  api.get<Channel>(`/channels/${id}`);

// ---- Messages ----
export const listMessages = (channelId: string, params?: MessageListParams) =>
  api.get<MessageListResponse>(`/channels/${channelId}/messages`, { params });
export const sendMessage = (channelId: string, data: SendMessageRequest) =>
  api.post<Message>(`/channels/${channelId}/messages`, data);

// ---- Threads ----
export const listThreads = (channelId: string) =>
  api.get<ThreadSummary[]>(`/channels/${channelId}/threads`);
export const createThread = (channelId: string, data: CreateThreadRequest) =>
  api.post<Thread>(`/channels/${channelId}/threads`, data);

// ---- Upload ----
export const getUploadUrl = (data: UploadUrlRequest) =>
  api.post<UploadUrlResponse>('/upload', data);

// ---- Search ----
export const searchMessages = (params: SearchMessagesParams) =>
  api.get<SearchMessagesResults>('/search', { params });

// ---- Presence (WebSocket handled separately) ----
// Presence is not REST; handled via WebSocket in useWebSocket hook.

// ---- React Query hooks ----
export const useListChannels = (options?: UseQueryOptions<ChannelSummary[]>) =>
  useQuery({ queryKey: ['dial', 'channels'], queryFn: listChannels, ...options });
export const useGetChannel = (id: string, options?: UseQueryOptions<Channel>) =>
  useQuery({ queryKey: ['dial', 'channel', id], queryFn: () => getChannel(id), ...options });
export const useListMessages = (
  channelId: string,
  params?: MessageListParams,
  options?: UseQueryOptions<MessageListResponse>
) =>
  useQuery({
    queryKey: ['dial', 'messages', channelId, params],
    queryFn: () => listMessages(channelId, params),
    ...options,
  });
export const useListThreads = (channelId: string, options?: UseQueryOptions<ThreadSummary[]>) =>
  useQuery({
    queryKey: ['dial', 'threads', channelId],
    queryFn: () => listThreads(channelId),
    ...options,
  });
export const useSearchMessages = (params: SearchMessagesParams, options?: UseQueryOptions<SearchMessagesResults>) =>
  useQuery({
    queryKey: ['dial', 'search', params],
    queryFn: () => searchMessages(params),
    ...options,
  });

export const useCreateChannel = (options?: UseMutationOptions<Channel, Error, CreateChannelRequest>) =>
  useMutation({ mutationFn: createChannel, ...options });
export const useSendMessage = (options?: UseMutationOptions<Message, Error, { channelId: string; data: SendMessageRequest }>) =>
  useMutation({
    mutationFn: ({ channelId, data }) => sendMessage(channelId, data),
    ...options,
  });
export const useCreateThread = (options?: UseMutationOptions<Thread, Error, { channelId: string; data: CreateThreadRequest }>) =>
  useMutation({
    mutationFn: ({ channelId, data }) => createThread(channelId, data),
    ...options,
  });
export const useGetUploadUrl = (options?: UseMutationOptions<UploadUrlResponse, Error, UploadUrlRequest>) =>
  useMutation({ mutationFn: getUploadUrl, ...options });
