import {
	useBulkDeleteContacts,
	useDeleteContact,
	useExportCsv,
	useListContacts,
	useSearchContacts,
} from "@ataqu/api-client";
import { useDebounce } from "@ataqu/shared-hooks";
import {
	Bone,
	BulkActionBar,
	Input,
	SelectAllCheckbox,
	SelectionCheckbox,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Download, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SCOPE = "cinq:contacts";

export function ContactTable() {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const queryClient = useQueryClient();
	const exportCsv = useExportCsv();
	const bulkDelete = useBulkDeleteContacts();
	const deleteContact = useDeleteContact({
		onSuccess: () => {
			queryClient.invalidateQueries?.({ queryKey: ["cinq", "contacts"] });
			toast.success("Contact deleted.");
		},
		onError: () => toast.error("Delete failed"),
	});

	const {
		data: allData,
		isLoading: allLoading,
		error: allError,
	} = useListContacts(
		{ limit: 1000 },
		{
			enabled: debouncedSearch.length === 0,
			queryKey: ["cinq", "contacts", "list"],
		},
	);

	const {
		data: searchData,
		isLoading: searchLoading,
		error: searchError,
	} = useSearchContacts(
		{ q: debouncedSearch, limit: 50 },
		{
			enabled: debouncedSearch.length > 0,
			queryKey: ["cinq", "contacts", "search", debouncedSearch],
		},
	);

	const contacts =
		debouncedSearch.length > 0 ? searchData || [] : allData || [];
	const isLoading = debouncedSearch.length > 0 ? searchLoading : allLoading;
	const error = debouncedSearch.length > 0 ? searchError : allError;
	const ids = contacts.map((c) => c.id);

	if (isLoading) {
		return (
			<Bone loading name="contacts" fallback={<div className="h-64 w-full" />}>
				{null}
			</Bone>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8 text-red-400">
				<Trans>Error loading contacts</Trans>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder={t`Search contacts...`}
						value={search}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearch(e.target.value)
						}
						className="pl-9 bg-deep-night/50 border-gray-700/40 text-white placeholder-gray-400"
					/>
				</div>
			</div>

			<BulkActionBar
				scope={SCOPE}
				actions={[
					{
						id: "export",
						label: t`Export CSV`,
						icon: <Download className="h-4 w-4" />,
						onClick: () => exportCsv.mutate(),
					},
					{
						id: "delete",
						label: t`Delete`,
						icon: <Trash2 className="h-4 w-4" />,
						variant: "destructive",
						onClick: (selected) => bulkDelete.mutate({ ids: selected }),
					},
				]}
			/>

			{contacts.length === 0 ? (
				<div className="text-center py-8 text-gray-400">
					<Trans>No contacts yet. Create one to get started.</Trans>
				</div>
			) : (
				<div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-gray-700/40 rounded-lg">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-deep-night/90 z-10 border-b border-gray-700">
							<tr>
								<th className="w-10 py-2 px-3">
									<SelectAllCheckbox scope={SCOPE} ids={ids} />
								</th>
								<th className="text-left py-2 px-3 font-medium text-gray-400">
									<Trans>Name</Trans>
								</th>
								<th className="text-left py-2 px-3 font-medium text-gray-400">
									<Trans>Email</Trans>
								</th>
								<th className="text-left py-2 px-3 font-medium text-gray-400">
									<Trans>Phone</Trans>
								</th>
								<th className="text-left py-2 px-3 font-medium text-gray-400">
									<Trans>Company</Trans>
								</th>
								<th className="text-left py-2 px-3 font-medium text-gray-400">
									<Trans>Custom</Trans>
								</th>
							</tr>
						</thead>
						<tbody>
							{contacts.map((contact) => (
								<tr
									key={contact.id}
									className="border-b border-gray-700/50 hover:bg-white/5 cursor-pointer transition-colors"
									onClick={() => navigate({ to: `/contacts/${contact.id}` })}
								>
									<td
										className="py-2 px-3"
										onClick={(e) => e.stopPropagation()}
									>
										<SelectionCheckbox scope={SCOPE} id={contact.id} />
									</td>
									<td className="py-2 px-3">{contact.name}</td>
									<td className="py-2 px-3">{contact.email}</td>
									<td className="py-2 px-3">{contact.phone}</td>
									<td className="py-2 px-3">{contact.company}</td>
									<td className="py-2 px-3">
										{Object.entries(contact.custom_fields || {})
											.slice(0, 2)
											.map(([k, v]) => `${k}: ${v}`)
											.join(", ")}
									</td>
									<td className="py-2 px-3 text-right">
										<button
											type="button"
											aria-label="Delete contact"
											className="text-red-400 hover:text-red-300"
											onClick={(e) => {
												e.stopPropagation();
												deleteContact.mutate(contact.id);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
