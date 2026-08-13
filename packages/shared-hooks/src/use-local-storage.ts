import { useCallback, useEffect, useState } from "react";

export const useLocalStorage = <T>(
	key: string,
	initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] => {
	const readValue = useCallback((): T => {
		if (typeof window === "undefined") return initialValue;
		try {
			const item = window.localStorage.getItem(key);
			return item ? JSON.parse(item) : initialValue;
		} catch {
			return initialValue;
		}
	}, [key, initialValue]);

	const [storedValue, setStoredValue] = useState<T>(readValue);

	const setValue = useCallback(
		(value: T | ((prev: T) => T)) => {
			try {
				const newValue = value instanceof Function ? value(storedValue) : value;
				setStoredValue(newValue);
				if (typeof window !== "undefined") {
					window.localStorage.setItem(key, JSON.stringify(newValue));
				}
			} catch (error) {
				console.warn(`Error setting localStorage key “${key}”:`, error);
			}
		},
		[key, storedValue],
	);

	useEffect(() => {
		setStoredValue(readValue());
	}, [readValue]);

	useEffect(() => {
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === key) {
				setStoredValue(readValue());
			}
		};
		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [key, readValue]);

	return [storedValue, setValue];
};
