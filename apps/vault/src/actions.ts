import { type AppCommand, useRegisterCommands } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useNavigate } from "@tanstack/react-router";

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

export const getVaultActions = (): VaultAction[] => [
	{
		id: "create-product",
		label: t`Create Product`,
		shortcut: "⌘P",
		url: "/products?create=product",
	},
	{
		id: "create-variant",
		label: t`Create Variant`,
		context: "product-detail",
		url: "/products?create=variant",
	},
	{ id: "go-to-products", label: t`Go to Products`, url: "/products" },
	{ id: "go-to-movements", label: t`Go to Movements`, url: "/movements" },
	{ id: "go-to-warehouses", label: t`Go to Warehouses`, url: "/warehouses" },
	{
		id: "go-to-reservations",
		label: t`Go to Reservations`,
		url: "/reservations",
	},
	{
		id: "search-products",
		label: t`Search Products`,
		shortcut: "⌘S",
		url: "/products?focus=search",
	},
	{
		id: "adjust-stock",
		label: t`Adjust Stock`,
		context: "product-detail",
		url: "/products?adjust=stock",
	},
	{
		id: "set-low-stock-alert",
		label: t`Set Low Stock Alert`,
		context: "product-detail",
		url: "/products?set-low-stock-alert=true",
	},
	{
		id: "reserve-stock-for-deal",
		label: t`Reserve Stock for Deal [ID]`,
		url: "/reservations?reserve=stock",
	},
	{
		id: "connect-to-cinq",
		label: t`Connect to CINQ`,
		url: "/products?connect=cinq",
	},
	{
		id: "export-products-csv",
		label: t`Export Products CSV`,
		url: "/products?export=csv",
	},
	{ id: "sync-shopify", label: t`Sync Shopify`, url: "/products?sync=shopify" },
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
	const navigate = useNavigate();
	return getVaultActions().map((action) => ({
		...action,
		handler: () => navigate({ to: action.url }),
	}));
};

/** Adapts VAULT actions to the unified command-palette contract. */
export const useVaultCommands = (): AppCommand[] => {
	const navigate = useNavigate();
	return getVaultActions().map((action) => ({
		id: action.id,
		title: action.label,
		shortcut: action.shortcut,
		onSelect: action.url
			? () => navigate({ to: action.url })
			: action.handler
				? action.handler
				: () => window.dispatchEvent(new CustomEvent(`vault:${action.id}`)),
	}));
};

/** Registers VAULT commands into the global palette for the app's lifetime. */
export const VaultCommandRegistrar: React.FC = () => {
	const commands = useVaultCommands();
	useRegisterCommands(commands);
	return null;
};
