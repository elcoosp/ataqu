import { createFileRoute } from "@tanstack/react-router";
import { VistaCommandRegistrar } from "../../../apps/vista/actions";
import { SqlEditor } from "../../../apps/vista/components/sql-editor";

export const Route = createFileRoute("/_auth/vista/explore")({
	component: ExplorePage,
});

function ExplorePage() {
	return (
		<>
			<VistaCommandRegistrar />
			<div className="flex flex-col h-full">
				<div className="p-4 border-b border-gray-700/40">
					<h1 className="text-xl font-heading text-white">Explore Data</h1>
				</div>
				<div className="flex-1 overflow-hidden">
					<SqlEditor />
				</div>
			</div>
		</>
	);
}
