import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabase } from "@/lib/supabase";
import { interpret } from "@/lib/interpret";

export const runtime = "nodejs";
// Vercel free-tier serverless caps at ~10s; Pro at 60s. Claude calls regularly
// take 20–40s. If you're on free tier, deploy this route to Vercel's longer
// "background function" target or run the worker elsewhere.
export const maxDuration = 60;

const SUBJECT_BY_LOCALE: Record<string, string> = {
  ru: "Ваша интерпретация — Activity Test",
  en: "Your Activity Test interpretation",
  de: "Ihre Auswertung — Activity Test",
  fr: "Votre interprétation — Activity Test",
  es: "Tu interpretación — Activity Test",
  it: "La tua interpretazione — Activity Test",
  pt: "Sua interpretação — Activity Test",
  pl: "Twoja interpretacja — Activity Test",
  uk: "Ваша інтерпретація — Activity Test",
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-task-secret");
  if (!secret || secret !== process.env.INTERPRET_TASK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const id = body.id;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("submissions")
    .select("id, email, locale, answers, status")
    .eq("id", id)
    .single();
  if (error || !row) {
    console.error("submission fetch failed", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status === "sent") {
    return NextResponse.json({ ok: true, already: true });
  }

  let interpretationHtml: string;
  try {
    interpretationHtml = await interpret(row.locale, row.answers as Record<string, unknown>);
  } catch (e) {
    console.error("interpretation failed", e);
    await supabase.from("submissions").update({ status: "interpret_failed" }).eq("id", id);
    return NextResponse.json({ error: "interpret_failed" }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Activity Test <onboarding@resend.dev>";
  if (!resendKey) {
    console.error("RESEND_API_KEY missing — interpretation generated but not sent");
    await supabase
      .from("submissions")
      .update({ status: "interpret_done_no_email", interpretation: interpretationHtml })
      .eq("id", id);
    return NextResponse.json({ ok: false, reason: "no_email_key" });
  }

  const resend = new Resend(resendKey);
  const subject = SUBJECT_BY_LOCALE[row.locale] ?? SUBJECT_BY_LOCALE.en;
  try {
    await resend.emails.send({
      from,
      to: row.email,
      subject,
      html: interpretationHtml,
    });
  } catch (e) {
    console.error("email send failed", e);
    await supabase
      .from("submissions")
      .update({ status: "email_failed", interpretation: interpretationHtml })
      .eq("id", id);
    return NextResponse.json({ error: "email_failed" }, { status: 500 });
  }

  await supabase
    .from("submissions")
    .update({ status: "sent", interpretation: interpretationHtml, sent_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
