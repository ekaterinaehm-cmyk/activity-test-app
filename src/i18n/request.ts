import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const candidate = (await requestLocale) ?? defaultLocale;
  if (!locales.includes(candidate as Locale)) notFound();
  const locale = candidate as Locale;

  const ui = (await import(`../../locales/${locale}.json`)).default;
  return { locale, messages: ui };
});

