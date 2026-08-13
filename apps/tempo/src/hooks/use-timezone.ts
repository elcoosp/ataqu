import { useEffect, useState } from "react";

export function useTimezone(): string {
	const [timezone, setTimezone] = useState("UTC");

	useEffect(() => {
		try {
			const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (detected) setTimezone(detected);
		} catch {
			// fallback to UTC
		}
	}, []);

	return timezone;
}
