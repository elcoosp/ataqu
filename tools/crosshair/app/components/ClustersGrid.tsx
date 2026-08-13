"use client";

import * as React from "react";
import { ClusterCard } from "./ClusterCard";
import { ClusterDetail } from "./ClusterDetail";

interface ClustersGridProps {
	clusters: any[];
}

export function ClustersGrid({ clusters }: ClustersGridProps) {
	const [selectedCluster, setSelectedCluster] = React.useState<any>(null);
	const [modalOpen, setModalOpen] = React.useState(false);
	const [sortBy, setSortBy] = React.useState<"score" | "evidence" | "name">(
		"score",
	);
	const [filterApp, setFilterApp] = React.useState<string>("all");

	const apps = React.useMemo(() => {
		const unique = new Set(clusters.map((c) => c.mapped_app));
		return ["all", ...Array.from(unique)];
	}, [clusters]);

	const sortedClusters = React.useMemo(() => {
		let filtered = clusters;
		if (filterApp !== "all") {
			filtered = filtered.filter((c) => c.mapped_app === filterApp);
		}
		return [...filtered].sort((a, b) => {
			if (sortBy === "score")
				return (
					(b.total_opportunity_score || 0) - (a.total_opportunity_score || 0)
				);
			if (sortBy === "evidence")
				return (b.evidence_count || 0) - (a.evidence_count || 0);
			return a.name.localeCompare(b.name);
		});
	}, [clusters, sortBy, filterApp]);

	return (
		<>
			<div className="space-y-4">
				<div className="flex items-center gap-4 flex-wrap">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium">Sort by:</label>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as any)}
							className="px-2 py-1 border rounded text-sm dark:border-gray-700 dark:bg-gray-800"
						>
							<option value="score">Score</option>
							<option value="evidence">Evidence Count</option>
							<option value="name">Name</option>
						</select>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium">Filter by App:</label>
						<select
							value={filterApp}
							onChange={(e) => setFilterApp(e.target.value)}
							className="px-2 py-1 border rounded text-sm dark:border-gray-700 dark:bg-gray-800"
						>
							{apps.map((app) => (
								<option key={app} value={app}>
									{app === "all" ? "All" : app}
								</option>
							))}
						</select>
					</div>
					<div className="text-sm text-gray-500">
						{sortedClusters.length} clusters
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{sortedClusters.map((cluster) => (
						<ClusterCard
							key={cluster.id}
							cluster={cluster}
							onView={() => {
								setSelectedCluster(cluster);
								setModalOpen(true);
							}}
						/>
					))}
					{sortedClusters.length === 0 && (
						<div className="col-span-full text-center text-gray-500 py-8">
							No clusters found.
						</div>
					)}
				</div>
			</div>

			<ClusterDetail
				cluster={selectedCluster}
				open={modalOpen}
				onOpenChange={setModalOpen}
			/>
		</>
	);
}
