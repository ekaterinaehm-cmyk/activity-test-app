import { getSupabase } from "./supabase";

/**
 * Allow at most `max` submissions per `windowSeconds` per IP.
 * Uses a Supabase table `rate_limits(ip text, ts timestamptz)`.
 */
export async function checkRateLimit(ip: string, max = 5, windowSeconds = 3600): Promise<boolean> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from("rate_limits")
    .select("ts", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("ts", since);

  if (error) {
    // Fail open: don't block users if our rate-limit table is unavailable.
    console.error("rate limit lookup failed", error);
    return true;
  }
  if ((count ?? 0) >= max) return false;

  await supabase.from("rate_limits").insert({ ip, ts: new Date().toISOString() });
  return true;
}
