import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales, localeNames, type Locale } from "@/i18n/config";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-muted">{t("estimatedTime")}</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-ink/80">{t("subtitle")}</p>
      </header>

      <section aria-label="language" className="card space-y-3">
        <p className="text-sm font-medium text-muted">{t("chooseLanguage")}</p>
        <div className="flex flex-wrap gap-2">
          {locales.map((l) => (
            <Link
              key={l}
              href={`/${l}`}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                l === locale
                  ? "border-accent bg-accent text-white"
                  : "border-ink/15 hover:bg-ink/5"
              }`}
            >
              {localeNames[l as Locale]}
            </Link>
          ))}
        </div>
      </section>

      <Link href={`/${locale}/test`} className="btn-primary w-full md:w-auto">
        {t("start")}
      </Link>

      <section className="space-y-2 text-sm text-muted">
        <h2 className="text-base font-medium text-ink">{t("privacyHeading")}</h2>
        <p>{t("privacy")}</p>
      </section>
    </div>
  );
}
