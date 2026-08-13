export interface TempoAction {
	id: string;
	label: string;
	shortcut?: string;
	action: () => void;
}

export const tempoActions: TempoAction[] = [
	{
		id: "create-event-type",
		label: "Create Event Type",
		action: () => {},
	},
	{
		id: "go-event-types",
		label: "Go to Event Types",
		action: () => {
			window.location.href = "/";
		},
	},
	{
		id: "go-meetings",
		label: "Go to Meetings",
		action: () => {
			window.location.href = "/";
		},
	},
	{
		id: "go-calendar-settings",
		label: "Go to Calendar Settings",
		action: () => {
			window.location.href = "/calendar-settings";
		},
	},
	{
		id: "connect-google",
		label: "Connect Google Calendar",
		action: () => {
			window.location.href = "/api/v1/tempo/oauth/google";
		},
	},
	{
		id: "connect-outlook",
		label: "Connect Outlook Calendar",
		action: () => {
			window.location.href = "/api/v1/tempo/oauth/outlook";
		},
	},
	{
		id: "create-booking-link",
		label: "Create Booking Link",
		action: () => {},
	},
	{
		id: "search-meetings",
		label: "Search Meetings",
		action: () => {},
	},
	{
		id: "cancel-meeting",
		label: "Cancel Meeting",
		action: () => {},
	},
	{
		id: "reschedule-meeting",
		label: "Reschedule Meeting",
		action: () => {},
	},
];
