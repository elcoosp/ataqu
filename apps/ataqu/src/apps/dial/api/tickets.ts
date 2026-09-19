import { api } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";

export interface Ticket {
	id: UUID;
	subject: string;
	status: "open" | "pending" | "resolved" | "closed";
	priority: "low" | "medium" | "high" | "urgent";
	requester_name: string;
	requester_email: string;
	assignee_id: string | null;
	last_message: string | null;
	last_message_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface TicketMessage {
	id: UUID;
	ticket_id: UUID;
	from_customer: boolean;
	content: string;
	created_at: string;
}

export const listTickets = (params?: { limit?: number; offset?: number }) =>
	api.get<{ items: Ticket[]; total: number; limit: number; offset: number }>(
		"/dial/tickets",
		{
			params,
		},
	);

export const getTicket = (id: UUID) => api.get<Ticket>(`/dial/tickets/${id}`);

export const updateTicket = (
	id: UUID,
	patch: Partial<
		Pick<Ticket, "status" | "priority" | "subject" | "assignee_id">
	>,
) => api.patch<Ticket>(`/dial/tickets/${id}`, patch);

export const updateTicketStatus = (id: UUID, status: Ticket["status"]) =>
	updateTicket(id, { status });

export const replyToTicket = (id: UUID, content: string) =>
	api.post<TicketMessage>(`/dial/tickets/${id}/replies`, { content });

export const listTicketMessages = (
	id: UUID,
	params?: { limit?: number; offset?: number },
) => api.get<TicketMessage[]>(`/dial/tickets/${id}/messages`, { params });
