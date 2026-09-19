import {
	useBulkDeleteContacts,
	useDeleteContact,
	useExportCsv,
	useListContacts,
	useSearchContacts,
} from "@ataqu/api-client";
import {
	useDebounce,
	useShortcut,
	useShortcutScope,
} from "@ataqu/shared-hooks";
import { useSelectionStore } from "@ataqu/shared-stores";
import {
	Bone,
	BoneSuspense,
	BulkActionBar,
	CopyButton,
	cn,
	ExpandingSearch,
	HoldToConfirm,
	SegmentedControl,
	SelectAllCheckbox,
	SelectionCheckbox,
	ValueFlash,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	Download,
	Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const SCOPE = "cinq:contacts";

/** Table header cell that toggles client-side sorting on click. */
function SortableHead({
	label,
	sortKey,
	activeKey,
	sortDir,
	onSort,
}: {
	label: ReactNode;
	sortKey: "name" | "email" | "company";
	activeKey: "name" | "email" | "company" | null;
	sortDir: "asc" | "desc";
	onSort: (key: "name" | "email" | "company") => void;
}) {
	const isActive = activeKey === sortKey;
	return (
		<th className="text-left py-2 px-3 font-medium text-muted-foreground">
			<button
				type="button"
				onClick={() => onSort(sortKey)}
				className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
				aria-label={`Sort by ${sortKey}`}
			>
				{label}
				{isActive ? (
					sortDir === "asc" ? (
						<ChevronUp className="h-3 w-3" />
					) : (
						<ChevronDown className="h-3 w-3" />
					)
				) : (
					<ChevronsUpDown className="h-3 w-3 opacity-40" />
				)}
			</button>
		</th>
	);
}

const CONTACTS_FIXTURE = (
	<div className="space-y-2">
		<div className="h-6 w-40 rounded bg-muted dark:bg-white/10" />
		{Array.from({ length: 6 }).map((_, i) => (
			<div
				key={i}
				className="flex items-center gap-3 rounded border border-border/40 p-2"
			>
				<div className="h-4 w-4 rounded" />
				<div className="h-4 w-40 rounded bg-muted dark:bg-white/10" />
				<div className="h-4 w-52 rounded bg-muted dark:bg-white/10" />
				<div className="h-7 w-16 rounded border border-destructive/40" />
			</div>
		))}
	</div>
);

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

	const { data: allData, error: allError } = useListContacts(
		{ limit: 1000 },
		{
			enabled: debouncedSearch.length === 0,
			queryKey: ["cinq", "contacts", "list"],
		},
	);

	const [filter, setFilter] = useState("all");
	const [sortKey, setSortKey] = useState<"name" | "email" | "company" | null>(
		null,
	);
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

	const { data: searchData, error: searchError } = useSearchContacts(
		{ q: debouncedSearch, limit: 50 },
		{
			enabled: debouncedSearch.length > 0,
			queryKey: ["cinq", "contacts", "search", debouncedSearch],
		},
	);

	const rawContacts =
		debouncedSearch.length > 0 ? searchData || [] : (allData?.items ?? []);
	const filteredContacts = applyContactFilter(rawContacts, filter);
	const sortedContacts = sortContacts(filteredContacts, sortKey, sortDir);
	const error = debouncedSearch.length > 0 ? searchError : allError;
	const ids = idsFrom(filteredContacts);

	const toggleSort = (key: "name" | "email" | "company") => {
		if (sortKey !== key) {
			setSortKey(key);
			setSortDir("asc");
			return;
		}
		if (sortDir === "asc") {
			setSortDir("desc");
			return;
		}
		setSortKey(null);
	};

	if (error) {
		return (
			<div className="text-center py-8 text-destructive">
				<Trans>Error loading contacts</Trans>
			</div>
		);
	}

	return (
		<ContactTableBody
			contacts={sortedContacts}
			search={search}
			setSearch={setSearch}
			onOpen={(id) => navigate({ to: `/cinq/contacts/${id}` })}
			onDelete={(id) => deleteContact.mutate(id)}
			scope={SCOPE}
			ids={ids}
			sortKey={sortKey}
			sortDir={sortDir}
			onSort={toggleSort}
			onBulkDelete={(selected) => bulkDelete.mutate({ ids: selected })}
			onExport={() => exportCsv.mutate()}
			filter={filter}
			setFilter={setFilter}
		/>
	);
}
interface ContactRow {
	id: string;
	name: string;
	email: string;
	phone?: string;
	company?: string | null;
	custom_fields?: Record<string, unknown> | null;
}

interface ContactTableBodyProps {
	contacts: ContactRow[];
	search: string;
	setSearch: (v: string) => void;
	onOpen: (id: string) => void;
	onDelete: (id: string) => void;
	scope: string;
	ids: string[];
	sortKey: "name" | "email" | "company" | null;
	sortDir: "asc" | "desc";
	onSort: (key: "name" | "email" | "company") => void;
	onBulkDelete: (selected: string[]) => void;
	onExport: () => void;
	filter: string;
	setFilter: (v: string) => void;
}

/**
 * Renders the table and owns the "list" keyboard scope (brainstorm P2):
 * j/k move a row cursor, x toggles selection, Enter opens the row, mod+a
 * select-all, `/` focuses search. Bare letters are input-guarded by the
 * engine, so typing in the search box never triggers navigation keys.
 */
function ContactTableBody({
	contacts,
	search,
	setSearch,
	onOpen,
	onDelete,
	scope,
	ids,
	sortKey,
	sortDir,
	onSort,
	onBulkDelete,
	onExport,
	filter,
	setFilter,
}: ContactTableBodyProps) {
	useShortcutScope("list");
	const [cursor, setCursor] = useState(-1);
	const [searchOpen, setSearchOpen] = useState(false);
	const toolbarRef = useRef<HTMLDivElement>(null);
	const toggleRow = useSelectionStore((s) => s.toggle);
	const selectAllFor = useSelectionStore((s) => s.selectAllFor);

	const moveCursor = useCallback(
		(delta: number) => {
			setCursor((c) => {
				if (contacts.length === 0) return -1;
				const next = c + delta;
				return Math.max(0, Math.min(contacts.length - 1, next));
			});
		},
		[contacts.length],
	);

	useShortcut("j", () => moveCursor(1), { scope: "list" });
	useShortcut("k", () => moveCursor(-1), { scope: "list" });
	useShortcut(
		"enter",
		() => {
			const row = contacts[cursor];
			if (row) onOpen(row.id);
		},
		{ scope: "list" },
	);
	useShortcut(
		"x",
		() => {
			const row = contacts[cursor];
			if (row) toggleRow(scope, row.id);
		},
		{ scope: "list" },
	);
	useShortcut(
		"mod+a",
		() => {
			selectAllFor(scope, ids, true);
		},
		{ scope: "list", allowInInput: true },
	);
	// "/" expands the toolbar search and focuses its input (P2-4). Focus is
	// deferred so the expanding search has mounted its input first.
	useShortcut(
		"/",
		() => {
			setSearchOpen(true);
			setTimeout(() => {
				const input = toolbarRef.current?.querySelector<HTMLInputElement>(
					'input[type="search"]',
				);
				input?.focus();
			}, 0);
		},
		{ scope: "list" },
	);

	return (
		<BoneSuspense
			name="contacts"
			fallback={
				<Bone
					loading
					name="contacts"
					fixture={CONTACTS_FIXTURE}
					snapshotConfig={{
						leafTags: ["p", "h1", "h2", "li", "td", "tr"],
						captureRoundedBorders: true,
					}}
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
						<span className="text-sm text-muted-foreground">
							(
							<ValueFlash value={contacts.length} label="contact count" />)
						</span>
					</h2>
				</div>
				<div className="flex items-center gap-2" ref={toolbarRef}>
					<ExpandingSearch
						value={search}
						onChange={setSearch}
						open={searchOpen}
						onOpenChange={setSearchOpen}
						placeholder={t`Search contacts...`}
						className="relative flex-1 max-w-sm"
					/>
					<SegmentedControl
						label={t`Filter contacts`}
						options={[
							{ value: "all", label: t`All` },
							{ value: "company", label: t`Company` },
							{ value: "person", label: t`Person` },
						]}
						value={filter}
						onValueChange={setFilter}
					/>
				</div>

				<BulkActionBar
					scope={scope}
					actions={[
						{
							id: "export",
							label: t`Export CSV`,
							icon: <Download className="h-4 w-4" />,
							onClick: () => onExport(),
						},
						{
							id: "delete",
							label: t`Delete`,
							icon: <Trash2 className="h-4 w-4" />,
							variant: "destructive",
							onClick: (selected) => onBulkDelete(selected),
						},
					]}
				/>

				{contacts.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<Trans>No contacts yet. Create one to get started.</Trans>
					</div>
				) : (
					<div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-border/40 rounded-lg">
						<table className="w-full text-sm">
							<thead className="sticky top-0 bg-deep-night/90 z-10 border-b border-border">
								<tr>
									<th className="w-10 py-2 px-3">
										<SelectAllCheckbox scope={SCOPE} ids={ids} />
									</th>
									<SortableHead
										label={<Trans>Name</Trans>}
										sortKey="name"
										activeKey={sortKey}
										sortDir={sortDir}
										onSort={onSort}
									/>
									<SortableHead
										label={<Trans>Email</Trans>}
										sortKey="email"
										activeKey={sortKey}
										sortDir={sortDir}
										onSort={onSort}
									/>
									<th className="text-left py-2 px-3 font-medium text-muted-foreground">
										<Trans>Phone</Trans>
									</th>
									<SortableHead
										label={<Trans>Company</Trans>}
										sortKey="company"
										activeKey={sortKey}
										sortDir={sortDir}
										onSort={onSort}
									/>
									<th className="text-left py-2 px-3 font-medium text-muted-foreground">
										<Trans>Custom</Trans>
									</th>
								</tr>
							</thead>
							<tbody>
								{contacts.map((contact, index) => (
									<tr
										key={contact.id}
										className={cn(
											"border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors",
											index === cursor && "bg-white/10",
										)}
										onClick={() => onOpen(contact.id)}
									>
										<td
											className="py-2 px-3"
											onClick={(e) => e.stopPropagation()}
										>
											<SelectionCheckbox scope={scope} id={contact.id} />
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
											<HoldToConfirm
												onConfirm={() => onDelete(contact.id)}
												confirmLabel="Deleted"
												className="h-7 px-2 text-[12px] border-destructive/40 text-destructive hover:bg-destructive/10"
											>
												Delete
											</HoldToConfirm>
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

type ContactLike = { id: string; company?: string | null };

function applyContactFilter<T extends ContactLike>(
	rows: T[],
	filter: string,
): T[] {
	if (filter === "company") return rows.filter((r) => Boolean(r.company));
	if (filter === "person") return rows.filter((r) => !r.company);
	return rows;
}

type ContactSortKey = "name" | "email" | "company";

function sortContacts<T extends { id: string }>(
	rows: T[],
	sortKey: ContactSortKey | null,
	sortDir: "asc" | "desc",
): T[] {
	if (!sortKey) return rows;
	return [...rows].sort((a, b) => {
		const left = String(
			(a as Record<string, unknown>)[sortKey] ?? "",
		).toLowerCase();
		const right = String(
			(b as Record<string, unknown>)[sortKey] ?? "",
		).toLowerCase();
		if (left === right) return 0;
		const comparison = left < right ? -1 : 1;
		return sortDir === "asc" ? comparison : -comparison;
	});
}
