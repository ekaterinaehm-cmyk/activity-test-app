/**
 * Locales exposed in the UI.
 *
 * `allLocales` is the full list the project plans to support — used by the
 * translate.ts script to know what languages to generate.
 *
 * `locales` is what the running app actually serves. We only ship en + ru with
 * translations committed; running `npm run translate` produces the rest and
 * you can add them to this array when you've reviewed the output.
 */
export const allLocales = ["en", "ru", "de", "fr", "es", "it", "pt", "pl", "uk"] as const;
export type Locale = (typeof allLocales)[number];

export const locales: Locale[] = ["en", "ru"];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  pl: "Polski",
  uk: "Українська",
};
