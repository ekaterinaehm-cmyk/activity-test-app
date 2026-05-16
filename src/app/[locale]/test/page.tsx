import { setRequestLocale } from "next-intl/server";
import { TestRunner } from "@/components/TestRunner";

export default async function TestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TestRunner locale={locale} />;
}
