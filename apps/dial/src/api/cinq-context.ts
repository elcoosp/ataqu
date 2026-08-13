import { api } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";

export interface CinqDealContext {
	deal_id: UUID;
	name: string;
	amount: number;
	stage: string;
	contact_name: string;
	contact_email: string;
}

export const getCinqContext = (channelId: UUID) =>
	api.get<CinqDealContext | null>(`/dial/channels/${channelId}/cinq-context`);
