import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { locales, type Locale } from "@/i18n/config";

const SubmissionSchema = z.object({
  locale: z.string().refine((l): l is Locale => locales.includes(l as Locale)),
  email: z.string().email().max(254),
  answers: z.record(z.string(), z.unknown()),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = SubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.format() }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      email: parsed.data.email,
      locale: parsed.data.locale,
      answers: parsed.data.answers,
      ip,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("submission insert failed", error);
    return NextResponse.json({ error: "storage" }, { status: 500 });
  }

  // Kick off interpretation in the background. We don't await — the route
  // returns immediately and the interpret endpoint runs the Claude call +
  // email asynchronously. Vercel will keep the function warm long enough on
  // typical free-tier timeouts to start the fetch; if it gets killed before
  // the interpret call finishes, the row stays in `status='pending'` and a
  // cron can retry. (Out of scope for v1.)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const secret = process.env.INTERPRET_TASK_SECRET ?? "";
  void fetch(`${base}/api/interpret`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-task-secret": secret },
    body: JSON.stringify({ id: data.id }),
  }).catch((e) => console.error("interpret kickoff failed", e));

  return NextResponse.json({ ok: true, id: data.id });
}
