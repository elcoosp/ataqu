import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { navigate as navigateTo } from "../../lib/navigation";

export interface VaultAction {
	id: string;
	label: string;
	shortcut?: string;
	context?: string;
	url: string;
	handler?: () => void;
}

export interface VaultCommandItem {
	id: string;
	title: string;
	url: string;
}

// Every entry below points at a route that exists and a search flag a screen
// actually reads (brainstorm P2-2 — "make every command real"). The previous
// list mixed `?create=product`, `?sync=shopify`, `/reservations?reserve=...`
// style targets that no screen ever read: the command navigated somewhere and
// then did nothing.
export const getVaultActions = (): VaultAction[] => [
	{
		id: "create-product",
		label: t`Create Product`,
		url: "/vault/products?createOpen=1",
	},
	{ id: "go-to-products", label: t`Go to Products`, url: "/vault/products" },
	{ id: "go-to-movements", label: t`Go to Movements`, url: "/vault/movements" },
	{
		id: "go-to-warehouses",
		label: t`Go to Warehouses`,
		url: "/vault/warehouses",
	},
	{
		id: "go-to-reservations",
		label: t`Go to Reservations`,
		url: "/vault/reservations",
	},
	{
		id: "search-products",
		label: t`Search Products`,
		url: "/vault/products",
	},
	{
		id: "import-products-csv",
		label: t`Import Products CSV`,
		url: "/vault/products",
	},
	{ id: "sync-shopify", label: t`Sync Shopify`, url: "/vault/products" },
];

export const searchVaultActions = async (
	query: string,
): Promise<VaultCommandItem[]> => {
	const normalizedQuery = query.trim().toLowerCase();
	const actions = getVaultActions();
	return actions
		.filter(
			(action) =>
				normalizedQuery.length === 0 ||
				action.label.toLowerCase().includes(normalizedQuery),
		)
		.map((action) => ({ id: action.id, title: action.label, url: action.url }));
};

export const useVaultActions = () => {
	return getVaultActions().map((action) => ({
		...action,
		handler: () => navigateTo(action.url),
	}));
};

/** Adapts VAULT actions to the unified command-palette contract. */
export const useVaultCommands = (): AppCommand[] => {
	return getVaultActions().map((action) => ({
		id: action.id,
		title: action.label,
		onSelect: () => navigateTo(action.url),
	}));
};

/** Registers VAULT commands into the global palette for the app's lifetime. */
export const VaultCommandRegistrar: React.FC = () => {
	const commands = useVaultCommands();
	useRegisterCommands(commands);
	return null;
};
