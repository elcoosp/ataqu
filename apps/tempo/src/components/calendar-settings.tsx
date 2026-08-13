import { Button, Card, CardContent, CardHeader, CardTitle } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";

export function CalendarSettings() {
	const handleConnectGoogle = () => {
		window.location.href = "/api/v1/tempo/oauth/google";
	};

	const handleConnectOutlook = () => {
		window.location.href = "/api/v1/tempo/oauth/outlook";
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Connect Calendars</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button
						onClick={handleConnectGoogle}
						variant="outline"
						className="w-full"
					>
						<Trans>Connect Google Calendar</Trans>
					</Button>
					<Button
						onClick={handleConnectOutlook}
						variant="outline"
						className="w-full"
					>
						<Trans>Connect Outlook Calendar</Trans>
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Connected Calendars</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						<Trans>No calendars connected yet.</Trans>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
