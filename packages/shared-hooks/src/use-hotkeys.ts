import { useCallback, useEffect } from "react";

export const useHotkeys = (
	key: string,
	callback: (event: KeyboardEvent) => void,
	deps: React.DependencyList = [],
) => {
	const handler = useCallback(
		(event: KeyboardEvent) => {
			const isMatch =
				(event.metaKey || event.ctrlKey) &&
				event.key.toLowerCase() === key.toLowerCase();
			if (isMatch) {
				event.preventDefault();
				callback(event);
			}
		},
		[key, callback],
	);

	useEffect(() => {
		document.addEventListener("keydown", handler);
		return () => {
			document.removeEventListener("keydown", handler);
		};
	}, [handler, ...deps]);
};
