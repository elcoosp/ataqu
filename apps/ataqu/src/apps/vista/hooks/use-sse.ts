import { getKpis } from "@ataqu/api-client";
import { useQuery } from "@tanstack/react-query";

/** HTTP polling: the server does not expose an SSE transport. */
export const useVistaPolling = () => {
	const query = useQuery({
		queryKey: ["vista", "kpis"],
		queryFn: getKpis,
		refetchInterval: 30_000,
	});
	return {
		isConnected: query.isSuccess && !query.isError,
		isFetching: query.isFetching,
	};
};
