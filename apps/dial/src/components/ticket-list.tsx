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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { listTickets, type Ticket, updateTicketStatus } from "@/api/tickets";

export function TicketList() {
	const queryClient = useQueryClient();
	const { data, isLoading } = useQuery({
		queryKey: ["tickets"],
		queryFn: () => listTickets({ limit: 100, offset: 0 }),
	});

	const updateStatus = useMutation({
		mutationFn: ({ id, status }: { id: string; status: string }) =>
			updateTicketStatus(id, status as Ticket["status"]),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tickets"] });
			toast.success(t`Status updated`);
		},
		onError: () => {
			toast.error(t`Failed to update status`);
		},
	});

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
				return "bg-yellow-500/20 text-yellow-500";
			case "pending":
				return "bg-blue-500/20 text-blue-500";
			case "closed":
				return "bg-green-500/20 text-green-500";
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
				{data.items.map((ticket) => (
					<TableRow key={ticket.id}>
						<TableCell>
							<Link
								to="/tickets/$id"
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
						<TableCell>{ticket.customer_email}</TableCell>
						<TableCell className="text-sm text-muted-foreground">
							{formatDistanceToNow(new Date(ticket.last_message_at), {
								addSuffix: true,
							})}
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
