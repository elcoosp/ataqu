import { ApiError, api } from "@ataqu/api-client";
import type { UUID } from "@ataqu/types";

export interface CinqDealContext {
	deal_id: UUID;
	name: string;
	amount: number;
	stage: string;
	contact_name: string;
	contact_email: string;
}

export const getCinqContext = async (channelId: UUID) => {
	try {
		return await api.get<CinqDealContext | null>(
			`/dial/channels/${channelId}/cinq-context`,
		);
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) return null;
		throw e;
	}
};
