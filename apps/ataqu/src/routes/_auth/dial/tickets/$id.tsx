import { createFileRoute } from "@tanstack/react-router";
import { TicketDetail } from "../../../../apps/dial/components/ticket-detail";

export const Route = createFileRoute("/_auth/dial/tickets/$id")({
	component: TicketDetail,
});
