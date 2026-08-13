import { createFileRoute } from "@tanstack/react-router";
import { TicketDetail } from "@/components/ticket-detail";

export const Route = createFileRoute("/_auth/tickets/$id")({
	component: TicketDetail,
});
