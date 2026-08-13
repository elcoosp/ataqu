import { Shell } from "@ataqu/ui";
import { createFileRoute } from "@tanstack/react-router";
import { SqlEditor } from "../components/sql-editor";

export const Route = createFileRoute("/_auth/explore")({
	component: ExplorePage,
});

function ExplorePage() {
	return (
		<Shell activeApp="vista">
			<div className="flex flex-col h-full">
				<div className="p-4 border-b border-gray-700/40">
					<h1 className="text-xl font-heading text-white">Explore Data</h1>
				</div>
				<div className="flex-1 overflow-hidden">
					<SqlEditor />
				</div>
			</div>
		</Shell>
	);
}
