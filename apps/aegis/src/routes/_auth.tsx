import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@ataqu/ui";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Avatar, AvatarFallback, AvatarImage } from "@ataqu/ui";
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const { token, refresh } = useAuthStore.getState();
    if (!token) {
      const refreshed = await refresh();
      if (!refreshed) {
        throw redirect({ to: '/login' });
      }
    }
  },
  component: () => {
    const [loading, setLoading] = useState(true);
    const { token, isAuthenticated } = useAuthStore();

    useEffect(() => {
      if (token) setLoading(false);
    }, [token]);

    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
      // Should not happen due to beforeLoad
      return <Outlet />;
    }

    return <Outlet />;
  },
});
