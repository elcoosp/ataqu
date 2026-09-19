export const formatDate = (date: Date | string, locale = "en-US") =>
	new Intl.DateTimeFormat(locale).format(
		typeof date === "string" ? new Date(date) : date,
	);

/** Relative time label — "2 min ago", "yesterday", "in 3h" (P1 §5.7). */
export const formatRelative = (date: Date | string, locale = "en-US"): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	const now = new Date();
	const seconds = Math.round((now.getTime() - d.getTime()) / 1000);
	if (Math.abs(seconds) < 60) return seconds < 0 ? "in a few seconds" : "just now";
	if (Math.abs(seconds) < 3600) {
		const mins = Math.abs(Math.round(seconds / 60));
		return seconds < 0 ? `in ${mins} min` : `${mins} min ago`;
	}
	if (Math.abs(seconds) < 86_400) {
		const hours = Math.abs(Math.round(seconds / 3600));
		return seconds < 0 ? `in ${hours} h` : `${hours} h ago`;
	}
	const dayDiff = Math.round(seconds / 86_400);
	if (Math.abs(dayDiff) < 2) {
		return seconds < 0 ? "tomorrow" : "yesterday";
	}
	return new Intl.DateTimeFormat(locale, {
		month: "short",
		day: "numeric",
	}).format(d);
};
export const formatCurrency = (
	amount: number,
	currency = "USD",
	locale = "en-US",
) =>
	new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
export const truncateText = (text: string, maxLength: number) =>
	text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

/** Alias for template readability (P1 §5.7). */
export const formatMoney = formatCurrency;
