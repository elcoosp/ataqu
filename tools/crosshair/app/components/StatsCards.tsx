"use client";

interface StatsCardsProps {
	signals: number;
	insights: number;
	clusters: number;
	pending: number;
}

export function StatsCards({
	signals,
	insights,
	clusters,
	pending,
}: StatsCardsProps) {
	const cards = [
		{
			label: "Raw Signals",
			value: signals,
			icon: "📡",
			color: "bg-blue-50 dark:bg-blue-950",
		},
		{
			label: "Insights",
			value: insights,
			icon: "🧠",
			color: "bg-purple-50 dark:bg-purple-950",
		},
		{
			label: "Clusters",
			value: clusters,
			icon: "📊",
			color: "bg-green-50 dark:bg-green-950",
		},
		{
			label: "Pending Actions",
			value: pending,
			icon: "⚡",
			color: "bg-orange-50 dark:bg-orange-950",
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{cards.map((card) => (
				<div
					key={card.label}
					className={`p-4 rounded-lg ${card.color} border border-gray-200 dark:border-gray-800`}
				>
					<div className="flex items-center gap-2">
						<span className="text-2xl">{card.icon}</span>
						<div>
							<div className="text-sm text-gray-500">{card.label}</div>
							<div className="text-2xl font-semibold">{card.value}</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
