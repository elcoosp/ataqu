import {
	useOptimisticMutation,
	useShortcut,
	useShortcutScope,
} from "@ataqu/shared-hooks";
import {
	Badge,
	Bone,
	Button,
	cn,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { listTickets, type Ticket, updateTicketStatus } from "../api/tickets";

export function TicketList() {
	const navigate = useNavigate();
	const { data, isLoading } = useQuery({
		queryKey: ["tickets"],
		queryFn: () => listTickets({ limit: 100, offset: 0 }),
	});

	// Status flips paint optimistically: the row recolours immediately and
	// rolls back with an error toast if the server rejects the change.
	const updateStatus = useOptimisticMutation<
		Ticket,
		{ items: Ticket[]; total: number } | undefined,
		{ id: string; status: string }
	>({
		listQueryKey: ["tickets"],
		mutationFn: ({ id, status }) =>
			updateTicketStatus(id, status as Ticket["status"]),
		optimisticUpdate: (old, vars) =>
			old
				? {
						...old,
						items: old.items.map((ticket) =>
							ticket.id === vars.id
								? { ...ticket, status: vars.status as Ticket["status"] }
								: ticket,
						),
					}
				: old,
		onSuccess: () => {
			toast.success(t`Status updated`);
		},
		onError: () => {
			toast.error(t`Failed to update status`);
		},
	});

	const tickets = data?.items ?? [];
	const [cursor, setCursor] = useState(-1);

	// List keyboard scope (P2): j/k move, Enter opens the ticket.
	useShortcutScope("list");
	useShortcut(
		"j",
		() => setCursor((c) => Math.min(tickets.length - 1, Math.max(0, c + 1))),
		{ scope: "list" },
	);
	useShortcut("k", () => setCursor((c) => Math.max(0, c - 1)), {
		scope: "list",
	});
	useShortcut(
		"enter",
		() => {
			const row = tickets[cursor];
			if (row) navigate({ to: `/dial/tickets/${row.id}` });
		},
		{ scope: "list" },
	);

	if (isLoading) {
		return (
			<Bone
				loading
				name="ticket-list-1"
				fallback={<div className="h-20 w-full" />}
			>
				{null}
			</Bone>
		);
	}

	if (!data?.items.length) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground">
				No support tickets yet.
			</div>
		);
	}

	const statusColor = (status: string) => {
		switch (status) {
			case "open":
				return "bg-warning/20 text-warning";
			case "pending":
				return "bg-info/20 text-info";
			case "closed":
				return "bg-success/20 text-success";
			default:
				return "";
		}
	};

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>
						<Trans>Subject</Trans>
					</TableHead>
					<TableHead>
						<Trans>Status</Trans>
					</TableHead>
					<TableHead>
						<Trans>Priority</Trans>
					</TableHead>
					<TableHead>
						<Trans>Customer</Trans>
					</TableHead>
					<TableHead>
						<Trans>Last Message</Trans>
					</TableHead>
					<TableHead>
						<Trans>Actions</Trans>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{data.items.map((ticket, index) => (
					<TableRow
						key={ticket.id}
						className={cn(index === cursor && "bg-white/10")}
					>
						<TableCell>
							<Link
								to="/dial/tickets/$id"
								params={{ id: ticket.id }}
								className="hover:underline"
							>
								{ticket.subject}
							</Link>
						</TableCell>
						<TableCell>
							<Badge className={cn("capitalize", statusColor(ticket.status))}>
								{ticket.status}
							</Badge>
						</TableCell>
						<TableCell className="capitalize">{ticket.priority}</TableCell>
						<TableCell>{ticket.requester_email}</TableCell>
						<TableCell className="text-sm text-muted-foreground">
							{ticket.last_message_at
								? formatDistanceToNow(new Date(ticket.last_message_at), {
										addSuffix: true,
									})
								: "—"}
						</TableCell>
						<TableCell>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const newStatus =
										ticket.status === "closed" ? "open" : "closed";
									updateStatus.mutate({ id: ticket.id, status: newStatus });
								}}
							>
								{ticket.status === "closed" ? t`Reopen` : t`Close`}
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
