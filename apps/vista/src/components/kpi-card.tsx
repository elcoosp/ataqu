import { Card } from "@ataqu/ui";
import { TrendingDown, TrendingUp } from "lucide-react";
import type React from "react";

interface KpiCardProps {
	label: string;
	value: string | number;
	trend?: "up" | "down";
	trendValue?: string;
	className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
	label,
	value,
	trend,
	trendValue,
	className,
}) => {
	return (
		<Card
			className={`p-6 bg-card border-gray-700/40 flex flex-col justify-center ${className || ""}`}
			data-tour="kpi-card"
		>
			<div className="flex flex-col space-y-2">
				<span className="text-sm text-muted-foreground">{label}</span>
				<div className="flex items-baseline gap-2">
					<span className="text-3xl font-mono font-bold text-foreground">
						{value}
					</span>
					{trend && (
						<div
							className={`flex items-center text-xs font-medium ${trend === "up" ? "text-success" : "text-error"}`}
						>
							{trend === "up" ? (
								<TrendingUp className="h-3 w-3 mr-1" />
							) : (
								<TrendingDown className="h-3 w-3 mr-1" />
							)}
							{trendValue}
						</div>
					)}
				</div>
			</div>
		</Card>
	);
};
