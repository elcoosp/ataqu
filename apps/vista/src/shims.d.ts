import React from 'react';

declare module '@ataqu/ui' {
  export const Chart: React.FC<any>;
  export const Shell: React.FC<any>;
  export const Card: React.FC<any>;
  export const Button: React.FC<any>;
  export const Input: React.FC<any>;
  export const Skeleton: React.FC<any>;
  export const cn: (...args: any[]) => string;
  export const Select: React.FC<any>;
  export const SelectTrigger: React.FC<any>;
  export const SelectValue: React.FC<any>;
  export const SelectContent: React.FC<any>;
  export const SelectItem: React.FC<any>;
  export const OnboardTour: React.FC<any>;
  export const EmptyState: React.FC<any>;
  export const AuthLayout: React.FC<any>;
  export const DataTable: React.FC<any>;
  export const Textarea: React.FC<any>;
  export const Sheet: React.FC<any>;
  export const SheetContent: React.FC<any>;
  export const SheetHeader: React.FC<any>;
  export const SheetTitle: React.FC<any>;
  export const SheetDescription: React.FC<any>;
}

declare module '@tanstack/react-router' {
  export const createFileRoute: any;
  export const createRouter: any;
  export const createRootRoute: any;
  export const RouterProvider: React.FC<any>;
  export const Link: React.FC<any>;
  export const Navigate: React.FC<any>;
  export const Outlet: React.FC;
  export const redirect: (opts: any) => any;
  export const useNavigate: () => any;
  export const useParams: (opts?: any) => any;
}

declare module '@tanstack/react-query' {
  export const useQueryClient: () => any;
  export const useQuery: (opts: any) => any;
  export const useMutation: (opts: any) => any;
  export const QueryClientProvider: React.FC<any>;
  export const QueryClient: any;
}

declare module '@ataqu/api-client' {
  export type Dashboard = {
    id: string;
    name: string;
    config: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    version: number;
  };
  export interface Api {
    get: <T>(path: string, opts?: any) => Promise<T>;
    post: <T>(path: string, data?: any, opts?: any) => Promise<T>;
    put: <T>(path: string, data?: any, opts?: any) => Promise<T>;
    delete: <T>(path: string, opts?: any) => Promise<T>;
  }
  export const api: Api;
  export const useListDashboards: () => { data?: Dashboard[]; isLoading: boolean };
  export const useCreateDashboard: () => { mutateAsync: (data: any) => Promise<Dashboard> };
  export const useGetDashboard: (id: string) => { data?: Dashboard; isLoading: boolean };
  export const useGetKpis: () => { data?: any };
  export const useDrillDown: () => {
    mutateAsync: (data: any) => Promise<Record<string, unknown>[]>;
  };
}

declare module '@ataqu/shared-hooks' {
  export const useLocalStorage: <T>(
    key: string,
    initial: T
  ) => [T, (val: T | ((prev: T) => T)) => void];
  export const useIdempotency: () => { getKey: () => string; resetKey: () => void };
  export const useDebounce: <T>(value: T, delay: number) => T;
}

declare module '@ataqu/shared-i18n' {
  export const I18nProvider: React.FC<{ children: React.ReactNode }>;
}

declare module '@ataqu/shared-stores' {}
