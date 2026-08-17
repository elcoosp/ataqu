import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

/** A unified command that any app can register into the global command palette. */
export interface AppCommand {
	id: string;
	title: string;
	onSelect: () => void;
	icon?: React.ReactNode;
	/** Human-readable shortcut hint, e.g. "⌘P" or "g u". */
	shortcut?: string;
	/** Extra searchable keywords (beyond the title). */
	keywords?: string;
}

interface CommandRegistryValue {
	commands: AppCommand[];
	register: (cmds: AppCommand[]) => void;
	unregister: (ids: string[]) => void;
}

const CommandRegistryContext = createContext<CommandRegistryValue | null>(null);

/**
 * Provides a process-wide command registry. Mount once near the app root
 * (the {@link Shell} wraps its children with this provider automatically).
 */
export const CommandRegistryProvider: React.FC<{
	children: React.ReactNode;
}> = ({ children }) => {
	const [commands, setCommands] = useState<AppCommand[]>([]);

	const register = useCallback((cmds: AppCommand[]) => {
		setCommands((prev) => {
			const byId = new Map(prev.map((c) => [c.id, c]));
			for (const c of cmds) byId.set(c.id, c);
			return Array.from(byId.values());
		});
	}, []);

	const unregister = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setCommands((prev) => prev.filter((c) => !idSet.has(c.id)));
	}, []);

	const value = useMemo<CommandRegistryValue>(
		() => ({ commands, register, unregister }),
		[commands, register, unregister],
	);

	return (
		<div className="contents" data-command-registry="">
			<CommandRegistryContext.Provider value={value}>
				{children}
			</CommandRegistryContext.Provider>
		</div>
	);
};

/**
 * Register app commands into the global palette for as long as the calling
 * component is mounted. Commands are de-duplicated by `id` and removed on
 * unmount, so it is safe to call this from multiple components.
 */
export const useRegisterCommands = (cmds: AppCommand[]): void => {
	const ctx = useContext(CommandRegistryContext);
	const ids = useMemo(() => cmds.map((c) => c.id), [cmds]);

	if (!ctx) {
		if (typeof console !== "undefined") {
			console.warn(
				"useRegisterCommands called outside a CommandRegistryProvider; commands will not appear.",
			);
		}
		return;
	}

	// Register (or refresh) commands after commit, never during render — calling
	// ctx.register() synchronously here would setState on the provider while a
	// child is still rendering, which throws in React 18/19 concurrent mode.
	useEffect(() => {
		ctx.register(cmds);
		return () => ctx.unregister(ids);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ctx, ids.join(",")]);
};

/** Read all currently-registered app commands. */
export const useAllCommands = (): AppCommand[] => {
	const ctx = useContext(CommandRegistryContext);
	return ctx?.commands ?? [];
};

export const useCommandRegistry = (): CommandRegistryValue | null =>
	useContext(CommandRegistryContext);
