import { type ChannelSummary, useListChannels } from "@ataqu/api-client";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Circle, Eye, Radio, Users } from "lucide-react";
import { getCinqContext } from "@/api/cinq-context";
import { TicketList } from "@/components/ticket-list";
import { useDialStore } from "@/stores/dial-store";

export const Route = createFileRoute("/_auth/dashboard")({
	component: DashboardPage,
});

function ConnectionPill() {
	const connectionState = useDialStore((s) => s.connectionState);
	const map = {
		connected: { cls: "bg-emerald-500/15 text-emerald-400", label: t`Live` },
		reconnecting: {
			cls: "bg-amber-500/15 text-amber-400",
			label: t`Reconnecting`,
		},
		disconnected: { cls: "bg-red-500/15 text-red-400", label: t`Offline` },
	} as const;
	const { cls, label } = map[connectionState];
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
		>
			<Circle className="h-2 w-2 fill-current" />
			{label}
		</span>
	);
}

function CinqContextPanel() {
	const activeChannelId = useDialStore((s) => s.activeChannelId);
	const { data, isLoading } = useQuery({
		queryKey: ["cinq-context", activeChannelId],
		queryFn: () => getCinqContext(activeChannelId as string),
		enabled: !!activeChannelId,
	});

	if (!activeChannelId) {
		return (
			<p className="text-sm text-gray-500">
				<Trans>
					Select a conversation to see the linked CINQ deal context.
				</Trans>
			</p>
		);
	}
	if (isLoading)
		return (
			<p className="text-sm text-gray-500">
				<Trans>Loading context…</Trans>
			</p>
		);
	if (!data) {
		return (
			<p className="text-sm text-gray-500">
				<Trans>No linked CINQ deal for this conversation.</Trans>
			</p>
		);
	}
	return (
		<div className="space-y-1 text-sm">
			<p className="font-medium text-white">{data.name}</p>
			<p className="text-gray-400">
				{data.contact_name} · {data.contact_email}
			</p>
			<div className="flex items-center gap-2 pt-1">
				<Badge variant="outline">{data.stage}</Badge>
				<span className="text-gray-400">
					{new Intl.NumberFormat(undefined, {
						style: "currency",
						currency: "USD",
					}).format(data.amount)}
				</span>
			</div>
		</div>
	);
}

function ChannelRow({ channel }: { channel: ChannelSummary }) {
	return (
		<Link
			to="/channels/$id"
			params={{ id: channel.id }}
			className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/40"
		>
			<span className="truncate"># {channel.name}</span>
		</Link>
	);
}

function DashboardPage() {
	const focusMode = useDialStore((s) => s.focusMode);
	const toggleFocusMode = useDialStore((s) => s.toggleFocusMode);
	const presenceCount = useDialStore((s) => Object.keys(s.presenceMap).length);
	const { data: channels } = useListChannels();

	return (
		<div className="h-full overflow-auto">
			<div className="flex flex-wrap items-center justify-between gap-3 p-6 border-b border-gray-700/40">
				<div>
					<h1 className="text-xl font-heading text-white">
						<Trans>Support Workspace</Trans>
					</h1>
					<div className="mt-1 flex items-center gap-3 text-sm text-gray-400">
						<ConnectionPill />
						<span className="flex items-center gap-1">
							<Users className="h-4 w-4" />
							{presenceCount} <Trans>online</Trans>
						</span>
					</div>
				</div>
				<Button
					variant={focusMode ? "default" : "outline"}
					size="sm"
					onClick={toggleFocusMode}
					className="gap-2"
				>
					<Eye className="h-4 w-4" />
					{focusMode ? t`Focus mode on` : t`Focus mode`}
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
				{/* Ticket inbox */}
				<section className="lg:col-span-2">
					<div className="mb-3 flex items-center gap-2">
						<Radio className="h-5 w-5 text-amber" />
						<h2 className="text-lg font-heading text-white">
							<Trans>Ticket Inbox</Trans>
						</h2>
					</div>
					<Card>
						<CardContent className="p-0">
							<TicketList />
						</CardContent>
					</Card>
				</section>

				{/* Side: channels + CINQ context */}
				<aside className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								<Trans>Channels</Trans>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-1">
							{channels?.length ? (
								channels
									.slice(0, 8)
									.map((c) => <ChannelRow key={c.id} channel={c} />)
							) : (
								<p className="text-sm text-gray-500">
									<Trans>No channels yet.</Trans>
								</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								<Trans>CINQ Context</Trans>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CinqContextPanel />
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	);
}
