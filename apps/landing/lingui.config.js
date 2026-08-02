import { formatter } from "@lingui/format-po";

/** @type {import('@lingui/cli').LinguiConfig} */
export default {
  locales: ["en", "fr", "de", "es", "pt"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/locales/{locale}/messages",
      include: ["src/"],
    },
  ],
  format: formatter(),
};
