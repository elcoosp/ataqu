import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

export default defineConfig({
	locales: ["en", "fr", "de", "es", "pt"],
	sourceLocale: "en",
	catalogs: [
		{
			path: "<rootDir>/src/locales/{locale}/messages",
			include: ["src/"],
		},
	],
	format: formatter(),
	runtimeConfigModule: {
		i18n: ["@lingui/core", "i18n"],
		Trans: ["@lingui/react", "Trans"],
	},
});
