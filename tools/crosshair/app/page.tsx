import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { actionItems, clusters, insights, rawSignals } from "@/db/schema";
import { ClustersGrid } from "./components/ClustersGrid";
import { LeadsTable } from "./components/LeadsTable";
import { StatsCards } from "./components/StatsCards";

export default async function Home() {
	const totalSignalsCount = await db.$count(rawSignals);
	const totalInsightsCount = await db.$count(insights);
	const totalClustersCount = await db.$count(clusters);
	const pendingActionsCount = await db.$count(
		actionItems,
		eq(actionItems.status, "pending"),
	);

	// All leads
	const allLeads = await db.query.insights.findMany({
		where: (fields, { eq }) => eq(fields.human_reviewed, false),
		orderBy: [desc(insights.overall_lead_score)],
		with: {
			signal: {
				columns: {
					author: true,
					source_url: true,
					mapped_app: true,
					raw_text: true,
					thread_context: true,
				},
			},
		},
	});

	// All clusters (not just top 3)
	const allClusters = await db.query.clusters.findMany({
		orderBy: [desc(clusters.total_opportunity_score)],
	});

	return (
		<main className="min-h-screen p-8 max-w-7xl mx-auto">
			<h1 className="text-4xl font-bold mb-2">CROSSHAIR</h1>
			<p className="text-gray-500 mb-8">Competitive Intelligence Dashboard</p>

			<StatsCards
				signals={totalSignalsCount}
				insights={totalInsightsCount}
				clusters={totalClustersCount}
				pending={pendingActionsCount}
			/>

			<div className="mt-8">
				<h2 className="text-2xl font-semibold mb-4">All Leads</h2>
				<LeadsTable leads={allLeads} />
			</div>

			<div className="mt-12">
				<h2 className="text-2xl font-semibold mb-4">
					All Clusters ({totalClustersCount})
				</h2>
				<ClustersGrid clusters={allClusters} />
			</div>
		</main>
	);
}
