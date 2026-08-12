import { type Form, useListForms } from "@ataqu/api-client";
import { Button, Card, Shell, Skeleton } from "@ataqu/ui";
import { Trans, t } from "@lingui/macro";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardList, Plus } from "lucide-react";
import { useCallback } from "react";

export const Route = createFileRoute("/_auth/")({
	component: FormsIndex,
});

function FormsIndex() {
	const navigate = useNavigate();
	const { data: forms = [], isLoading } = useListForms();

	const searchForms = useCallback(
		async (q: string) => {
			if (!q.trim()) return [];
			const lower = q.toLowerCase();
			return forms
				.filter((f: Form) => f.title.toLowerCase().includes(lower))
				.slice(0, 10)
				.map((f: Form) => ({
					id: f.id,
					title: f.title,
					url: `/builder/${f.id}`,
				}));
		},
		[forms],
	);

	if (isLoading) {
		return (
			<Shell activeApp="sond" searchFn={searchForms}>
				<div className="p-8">
					<div className="space-y-4">
						<Skeleton className="h-8 w-48" />
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-32 rounded-lg" />
							))}
						</div>
					</div>
				</div>
			</Shell>
		);
	}

	if (forms.length === 0) {
		return (
			<Shell activeApp="sond" searchFn={searchForms}>
				<div className="p-8">
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<div className="mb-4 rounded-full bg-muted p-4">
							<ClipboardList className="h-8 w-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-semibold">
							<Trans>No forms</Trans>
						</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							<Trans>
								Create one to start collecting responses. No response limits.
							</Trans>
						</p>
						<Button
							className="mt-6"
							onClick={() => navigate({ to: "/builder/new" })}
						>
							<Trans>Create Form</Trans>
						</Button>
					</div>
				</div>
			</Shell>
		);
	}

	return (
		<Shell activeApp="sond" searchFn={searchForms}>
			<div className="p-8">
				<div className="mb-8 flex items-center justify-between">
					<h1 className="text-3xl font-bold">
						<Trans>Forms</Trans>
					</h1>
					<Button asChild>
						<Link to="/builder/new">
							<Plus className="mr-2 h-4 w-4" />
							<Trans>Create Form</Trans>
						</Link>
					</Button>
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{forms.map((f: Form) => (
						<Link
							key={f.id}
							to="/builder/$id"
							params={{ id: f.id }}
							className="block"
						>
							<Card className="p-6 transition-shadow hover:shadow-md">
								<h3 className="mb-2 text-lg font-bold">{f.title}</h3>
								<div className="text-sm text-muted-foreground">
									{f.mode === "conversational"
										? t`Conversational`
										: t`Standard`}{" "}
									· v{f.version}
								</div>
							</Card>
						</Link>
					))}
				</div>
			</div>
		</Shell>
	);
}
