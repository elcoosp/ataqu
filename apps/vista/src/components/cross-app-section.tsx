import { useCombineData, useGetCrossAppView } from "@ataqu/api-client";
import {
	Bone,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	SkeletonSwap,
	TreeView,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

type Row = Record<string, unknown>;

const VIEWS = [
	{ id: "revenue-inventory", label: "Revenue + Inventory" },
	{ id: "support-sales", label: "Support + Sales" },
];

function CrossAppView({ view }: { view: string }) {
	const { data, isLoading, error } = useGetCrossAppView({ view });
	const rows = (data ?? []) as Row[];

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="text-white">
					{view === "revenue-inventory" ? (
						<Trans>Revenue + Inventory</Trans>
					) : (
						<Trans>Support + Sales</Trans>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Bone
					loading={isLoading}
					name="cross-app-view"
					fallback={<div className="h-24 w-full rounded bg-white/5" />}
				>
					{error ? (
						<p className="text-sm text-red-400">
							<Trans>Unable to load cross-app data.</Trans>
						</p>
					) : rows.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							<Trans>No combined data yet — connect the source apps.</Trans>
						</p>
					) : (
						<SkeletonSwap ready={!isLoading} lines={4}>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-left text-xs uppercase text-muted-foreground">
											{Object.keys(rows[0]).map((k) => (
												<th key={k} className="px-2 py-1">
													{k}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{rows.map((r, i) => (
											<tr key={i} className="border-t border-white/5">
												{Object.values(r).map((v, j) => (
													<td key={j} className="px-2 py-1 text-white/90">
														{String(v)}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</SkeletonSwap>
					)}
				</Bone>
			</CardContent>
		</Card>
	);
}

function CombineDataPanel() {
	const [primary, setPrimary] = useState("cinq");
	const [secondary, setSecondary] = useState("vault");
	const [result, setResult] = useState<Row[] | null>(null);

	const combine = useCombineData({
		onSuccess: (data) => setResult((data as Row[]) ?? []),
	});

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="text-white">
					<Trans>Combine Data</Trans>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex items-center gap-2">
					<select
						value={primary}
						onChange={(e) => setPrimary(e.target.value)}
						className="rounded border border-gray-700 bg-deep-night px-2 py-1 text-sm text-white"
					>
						<option value="cinq">CINQ</option>
						<option value="vault">VAULT</option>
						<option value="dial">DIAL</option>
						<option value="spark">SPARK</option>
					</select>
					<span className="text-sm text-muted-foreground">+</span>
					<select
						value={secondary}
						onChange={(e) => setSecondary(e.target.value)}
						className="rounded border border-gray-700 bg-deep-night px-2 py-1 text-sm text-white"
					>
						<option value="vault">VAULT</option>
						<option value="cinq">CINQ</option>
						<option value="dial">DIAL</option>
						<option value="spark">SPARK</option>
					</select>
				</div>
				<Button
					size="sm"
					disabled={combine.isPending}
					onClick={() =>
						combine.mutate({
							primary,
							secondary,
							from_date: "2026-01-01T00:00:00Z",
							to_date: "2026-12-31T00:00:00Z",
						})
					}
				>
					<Trans>Combine</Trans>
				</Button>
				{result && result.length > 0 && (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-xs uppercase text-muted-foreground">
									{Object.keys(result[0]).map((k) => (
										<th key={k} className="px-2 py-1">
											{k}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{result.map((r, i) => (
									<tr key={i} className="border-t border-white/5">
										{Object.values(r).map((v, j) => (
											<td key={j} className="px-2 py-1 text-white/90">
												{String(v)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function CrossAppSection() {
	const appTree = [
		{
			id: "ataqu",
			label: "Ataqu Platform",
			children: [
				{ id: "cinq", label: "CINQ (CRM)" },
				{ id: "vault", label: "VAULT (Inventory)" },
				{ id: "dial", label: "DIAL (Comms)" },
				{ id: "spark", label: "SPARK (Automation)" },
			],
		},
	];
	return (
		<div className="space-y-4">
			<h2 className="text-lg font-heading text-white">
				<Trans>Cross-App Dashboards</Trans>
			</h2>
			<Card className="h-full">
				<CardHeader>
					<CardTitle className="text-white">
						<Trans>App Data Graph</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<TreeView
						nodes={appTree}
						label={t`Apps`}
						defaultExpanded={["ataqu"]}
					/>
				</CardContent>
			</Card>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{VIEWS.map((v) => (
					<CrossAppView key={v.id} view={v.id} />
				))}
				<CombineDataPanel />
			</div>
		</div>
	);
}
