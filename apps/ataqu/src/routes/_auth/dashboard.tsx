// apps/aegis/src/routes/_auth/dashboard.tsx

import { api } from "@ataqu/api-client";
import { Bone, Card, CardContent, CardHeader, CardTitle } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2, Key, Users } from "lucide-react";

export const Route = createFileRoute("/_auth/dashboard")({
        component: () => {
                const {
                        data: tenant,
                        isLoading,
                        error,
                } = useQuery({
                        queryKey: ["aegis", "tenant"],
                        queryFn: () =>
                                api.get<{
                                        id: string;
                                        name: string;
                                        plan: string;
                                        userCount: number;
                                        apiKeyCount: number;
                                }>("/aegis/tenant"),
                });

                if (isLoading) {
                        return (
                                <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {[1, 2, 3, 4].map((i) => (
                                                <Bone
                                                        key={i}
                                                        loading
                                                        name="dashboard-1"
                                                        fallback={<div className="h-32 w-full" />}
                                                >
                                                        {null}
                                                </Bone>
                                        ))}
                                </div>
                        );
                }

                if (error) {
                        return <div>Error loading tenant info.</div>;
                }

                if (!tenant) return null;

                return (
                        <div className="p-6">
                                <h1 className="text-3xl font-heading mb-6">
                                        <Trans>Dashboard</Trans>
                                </h1>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                        <Card>
                                                <CardHeader>
                                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                                                <Trans>Tenant</Trans>
                                                        </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                        <div className="flex items-center">
                                                                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                <span className="text-2xl font-bold">{tenant.name}</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                <Trans>Plan:</Trans> {tenant.plan}
                                                        </p>
                                                </CardContent>
                                        </Card>
                                        <Card>
                                                <CardHeader>
                                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                                                <Trans>Users</Trans>
                                                        </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                        <div className="flex items-center">
                                                                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                <span className="text-2xl font-bold">{tenant.userCount}</span>
                                                        </div>
                                                </CardContent>
                                        </Card>
                                        <Card>
                                                <CardHeader>
                                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                                                <Trans>API Keys</Trans>
                                                        </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                        <div className="flex items-center">
                                                                <Key className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                <span className="text-2xl font-bold">{tenant.apiKeyCount}</span>
                                                        </div>
                                                </CardContent>
                                        </Card>
                                        <Card>
                                                <CardHeader>
                                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                                                <Trans>Quick Links</Trans>
                                                        </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2">
                                                        <Link
                                                                to="/users"
                                                                search={{ inviteOpen: false, createOpen: false }}
                                                                className="text-sm text-primary hover:underline block"
                                                        >
                                                                <Trans>Manage Users</Trans>
                                                        </Link>
                                                        <Link
                                                                to="/roles"
                                                                search={{ createOpen: false }}
                                                                className="text-sm text-primary hover:underline block"
                                                        >
                                                                <Trans>Manage Roles</Trans>
                                                        </Link>
                                                        <Link
                                                                to="/api-keys"
                                                                search={{ createOpen: false }}
                                                                className="text-sm text-primary hover:underline block"
                                                        >
                                                                <Trans>API Keys</Trans>
                                                        </Link>
                                                        <Link
                                                                to="/admin/access-matrix"
                                                                className="text-sm text-primary hover:underline block"
                                                        >
                                                                <Trans>Access Matrix</Trans>
                                                        </Link>
                                                        <Link
                                                                to="/admin/audit"
                                                                search={{ action: "", app: "", from_date: "", to_date: "", offset: 0 }}
                                                                className="text-sm text-primary hover:underline block"
                                                        >
                                                                <Trans>Audit Log</Trans>
                                                        </Link>
                                                </CardContent>
                                        </Card>
                                </div>
                        </div>
                );
        },
});
