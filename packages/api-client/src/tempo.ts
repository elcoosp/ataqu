import { api } from './client';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

export const getCalendars = () => api.get<unknown[]>('/calendars');

export const useGetCalendars = (options?: UseQueryOptions<unknown[]>) =>
  useQuery({ queryKey: ['tempo', 'calendars'], queryFn: getCalendars, ...options });
