import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";

export function SqlEditor() {
	return (
		<section className="space-y-4 p-6">
			<h2 className="text-xl font-semibold">
				<Trans>SQL exploration is not available</Trans>
			</h2>
			<p className="text-muted-foreground">
				<Trans>
					Use dashboard widgets to explore the metrics available from your
					workspace.
				</Trans>
			</p>
			<Link to="/vista" className="text-primary hover:underline">
				<Trans>Open dashboards</Trans>
			</Link>
		</section>
	);
}
