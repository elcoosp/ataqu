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
	BoneSuspense,
	BulkActionBar,
	CopyButton,
	Input,
	LoadingButton,
	SelectAllCheckbox,
	SelectionCheckbox,
	ValueFlash,
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
	const _isLoading = debouncedSearch.length > 0 ? searchLoading : allLoading;
	const error = debouncedSearch.length > 0 ? searchError : allError;
	const ids = idsFrom(contacts);

	if (error) {
		return (
			<div className="text-center py-8 text-red-400">
				<Trans>Error loading contacts</Trans>
			</div>
		);
	}

	return (
		<BoneSuspense
			name="contacts"
			fallback={
				<Bone
					loading
					name="contacts"
					fallback={<div className="h-64 w-full" />}
				>
					{null}
				</Bone>
			}
		>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-heading text-white">
						<Trans>Contacts</Trans>{" "}
						<span className="text-sm text-gray-400">
							(<ValueFlash value={contacts.length} label="contact count" />)
						</span>
					</h2>
				</div>
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
										<td className="py-2 px-3 flex items-center gap-2">
											<span>{contact.email}</span>
											<CopyButton
												value={contact.email}
												label="Copy"
												copiedLabel="Copied"
												className="h-6 px-1.5 text-[11px]"
											/>
										</td>
										<td className="py-2 px-3">{contact.phone}</td>
										<td className="py-2 px-3">{contact.company}</td>
										<td className="py-2 px-3">
											{Object.entries(contact.custom_fields || {})
												.slice(0, 2)
												.map(([k, v]) => `${k}: ${v}`)
												.join(", ")}
										</td>
										<td className="py-2 px-3 text-right">
											<LoadingButton
												onAction={() => deleteContact.mutate(contact.id)}
												errorLabel="Failed"
												className="h-7 px-2 text-[12px] border-red-500/40 text-red-300 hover:bg-red-500/10"
											>
												Delete
											</LoadingButton>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</BoneSuspense>
	);
}

function idsFrom<T extends { id: string }>(rows: T[]): string[] {
	return rows.map((r) => r.id);
}
