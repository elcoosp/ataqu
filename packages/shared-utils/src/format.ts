const DATE: Intl.DateTimeFormatOptions = {};
const DATE_SHORT: Intl.DateTimeFormatOptions = {
	month: "short",
	day: "numeric",
};
const DATE_MEDIUM: Intl.DateTimeFormatOptions = {
	weekday: "short",
	month: "short",
	day: "numeric",
};
const DATE_LONG: Intl.DateTimeFormatOptions = {
	weekday: "long",
	month: "long",
	day: "numeric",
};
const TIME: Intl.DateTimeFormatOptions = {
	hour: "2-digit",
	minute: "2-digit",
};
const DATETIME: Intl.DateTimeFormatOptions = {
	month: "numeric",
	day: "numeric",
	year: "2-digit",
	hour: "numeric",
	minute: "2-digit",
};

/** Shared Intl.DateTimeFormat options cache. */
const dtf = (
	locale: string,
	options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat =>
	// biome-ignore lint/suspicious/noAssignInExpressions: compact memoization
	((dtfCache[locale] ??= {})[cacheKey(options)] ??= new Intl.DateTimeFormat(
		locale,
		options,
	));

const cacheKey = (options: Intl.DateTimeFormatOptions) =>
	JSON.stringify(options);
const dtfCache: Record<string, Record<string, Intl.DateTimeFormat>> = {};

export const formatDate = (date: Date | string, locale = "en-US") =>
	dtf(locale, DATE).format(typeof date === "string" ? new Date(date) : date);

/** "Aug 16" — dashboard cards, activity feeds, timelines. */
export const formatDateShort = (date: Date | string, locale = "en-US") =>
	dtf(locale, DATE_SHORT).format(
		typeof date === "string" ? new Date(date) : date,
	);

/** "Sat, Aug 16" — booking day headers. */
export const formatDateMedium = (date: Date | string, locale = "en-US") =>
	dtf(locale, DATE_MEDIUM).format(
		typeof date === "string" ? new Date(date) : date,
	);

/** "Saturday, August 16" — booking confirmations. */
export const formatDateLong = (date: Date | string, locale = "en-US") =>
	dtf(locale, DATE_LONG).format(
		typeof date === "string" ? new Date(date) : date,
	);

/** "12:00 PM" — booking slots, message timestamps. */
export const formatTime = (date: Date | string, locale = "en-US") =>
	dtf(locale, TIME).format(typeof date === "string" ? new Date(date) : date);

/** "8/16/26, 12:00 PM" — timestamps in tables, logs, detail metadata. */
export const formatDateTime = (date: Date | string, locale = "en-US") =>
	dtf(locale, DATETIME).format(
		typeof date === "string" ? new Date(date) : date,
	);

/** "1,234,567" — tabular numbers (pair with the `tabular-nums` class). */
export const formatNumber = (value: number, locale = "en-US") =>
	new Intl.NumberFormat(locale).format(value);

/** Relative time label — "2 min ago", "yesterday", "in 3h" (P1 §5.7). */
export const formatRelative = (
	date: Date | string,
	locale = "en-US",
): string => {
	const d = typeof date === "string" ? new Date(date) : date;
	const now = new Date();
	const seconds = Math.round((now.getTime() - d.getTime()) / 1000);
	if (Math.abs(seconds) < 60)
		return seconds < 0 ? "in a few seconds" : "just now";
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
