import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  const { email } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("confirmation");
  const safeEmail = email && email.length < 200 ? email : "your inbox";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold">{t("title")}</h1>
      <p className="text-ink/80">{t("body", { email: safeEmail })}</p>
      <Link href={`/${locale}`} className="btn-secondary inline-flex">
        ← {t("backHome")}
      </Link>
    </div>
  );
}
