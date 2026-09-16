// packages/shared-i18n/src/i18n-provider.tsx

import { i18n, type Messages } from "@lingui/core";
import { I18nProvider as LinguiProvider } from "@lingui/react";
import { useEffect, useState } from "react";

interface Props {
	children: React.ReactNode;
	locale?: string;
}

/**
 * Compiled message catalogs of the *consuming app*, keyed by locale code.
 *
 * The glob is root-absolute so Vite resolves it against the app's project
 * root (e.g. `apps/ataqu/src/locales/en/messages.ts`) rather than this
 * package. Each app compiles its own catalogs via `lingui compile`. Vite
 * expands the pattern at build time, so a locale without a compiled catalog
 * is simply absent here instead of producing a 404 request at runtime.
 */
const catalogs = import.meta.glob("/src/locales/*/messages.ts") as Record<
	string,
	() => Promise<{ messages: Messages }>
>;

const catalogKey = (locale: string) => `/src/locales/${locale}/messages.ts`;

export const I18nProvider = ({ children, locale = "en" }: Props) => {
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			let messages: Messages = {};
			const loadCatalog = catalogs[catalogKey(locale)];
			if (loadCatalog) {
				try {
					({ messages } = await loadCatalog());
				} catch {
					// Missing or unreadable catalog: render source strings.
					messages = {};
				}
			}
			i18n.load(locale, messages);
			i18n.activate(locale);
			if (!cancelled) setLoaded(true);
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [locale]);

	if (!loaded) return null;

	return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
};
