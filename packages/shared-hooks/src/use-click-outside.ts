import { useEffect, useRef } from "react";

export const useClickOutside = <T extends HTMLElement>(
	handler: (event: MouseEvent | TouchEvent) => void,
) => {
	const ref = useRef<T>(null);

	// Keep the latest handler in a ref so the listener is attached once and
	// always invokes the current handler (avoids re-subscribing every render).
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		const listener = (event: MouseEvent | TouchEvent) => {
			if (!ref.current || ref.current.contains(event.target as Node)) {
				return;
			}
			handlerRef.current(event);
		};

		document.addEventListener("mousedown", listener);
		document.addEventListener("touchstart", listener);

		return () => {
			document.removeEventListener("mousedown", listener);
			document.removeEventListener("touchstart", listener);
		};
	}, []);

	return ref;
};
