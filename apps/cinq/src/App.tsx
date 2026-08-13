import { api } from "@ataqu/api-client";
import { Shell } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Outlet, useNavigate } from "@tanstack/react-router";

export function App() {
	const navigate = useNavigate();

	const searchFn = async (query: string) => {
		const actions = [
			{
				id: "cinq-create-contact",
				title: t`Create Contact`,
				shortcut: "C",
				action: () => navigate({ to: "/contacts" }),
			},
			{
				id: "cinq-create-deal",
				title: t`Create Deal`,
				shortcut: "D",
				action: () => navigate({ to: "/deals" }),
			},
			{
				id: "cinq-go-contacts",
				title: t`Go to Contacts`,
				action: () => navigate({ to: "/contacts" }),
			},
			{
				id: "cinq-go-deals",
				title: t`Go to Deals`,
				action: () => navigate({ to: "/deals" }),
			},
			{
				id: "cinq-go-tasks",
				title: t`Go to Tasks`,
				action: () => navigate({ to: "/tasks" }),
			},
			{
				id: "cinq-go-import",
				title: t`Go to Import`,
				action: () => navigate({ to: "/import" }),
			},
			{
				id: "cinq-import-csv",
				title: t`Import CSV`,
				action: () => navigate({ to: "/import" }),
			},
			{
				id: "cinq-search-contacts",
				title: t`Search Contacts`,
				shortcut: "F",
				action: () => navigate({ to: "/contacts" }),
			},
			{
				id: "cinq-search-deals",
				title: t`Search Deals`,
				action: () => navigate({ to: "/deals" }),
			},
			{
				id: "cinq-export-contacts",
				title: t`Export Contacts CSV`,
				action: () => {
					api.get("/cinq/csv/export", { responseType: "blob" }).then((blob) => {
						const url = URL.createObjectURL(blob as Blob);
						const a = document.createElement("a");
						a.href = url;
						a.download = "contacts.csv";
						a.click();
						URL.revokeObjectURL(url);
					});
				},
			},
			{
				id: "cinq-export-deals",
				title: t`Export Deals CSV`,
				action: () => {
					api
						.get("/cinq/deals/export", { responseType: "blob" })
						.then((blob) => {
							const url = URL.createObjectURL(blob as Blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = "deals.csv";
							a.click();
							URL.revokeObjectURL(url);
						});
				},
			},
		];

		const filtered = actions.filter((a) =>
			a.title.toLowerCase().includes(query.toLowerCase()),
		);
		return filtered.map((a) => ({
			id: a.id,
			title: a.title,
			url: "",
			action: a.action,
		}));
	};

	return (
		<Shell activeApp="cinq" searchFn={searchFn}>
			<Outlet />
		</Shell>
	);
}
