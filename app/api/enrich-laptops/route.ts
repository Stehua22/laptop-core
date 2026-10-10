import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAllForPicks } from "@/lib/picksData";
import { scoreAll } from "@/lib/picksEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Reads every laptop's specs and saves what it found (RAM, storage, processor, graphics, value) so the
// tracker can filter and sort by them in the database.
//
//   Cron / script: "Authorization: Bearer $CRON_SECRET"   (or ?key=$CRON_SECRET)
// Needs env vars: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
// Needs the columns and apply_laptop_specs() function from setup.sql.

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    req.headers.get("authorization") === `Bearer ${secret}` ||
    req.nextUrl.searchParams.get("key") === secret
  );
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await fetchAllForPicks();
  const { scored } = scoreAll(raw);

  const rows = scored.map((s) => ({
    id: s.id,
    ram_gb: s.parsed.ramGb,
    storage_gb: s.parsed.storageGb,
    cpu_vendor: s.parsed.cpu ? s.parsed.cpu.vendor : null,
    cpu_year: s.parsed.cpu ? s.parsed.cpu.year : null,
    cpu_perf: s.parsed.cpu ? Math.round(s.parsed.cpu.perf * 10) / 10 : null,
    gpu_tier: s.parsed.gpu.tier,
    // How far under (+) or over (-) the usual price for its specs. Only filled in when the comparison is trustworthy.
    value_pct:
      s.below !== null && (s.reason === null || s.reason === "not-cheaper") ? Math.round(s.below * 1000) / 10 : null,
  }));

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const errors: string[] = [];
  let updated = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await supabase.rpc("apply_laptop_specs", { rows: rows.slice(i, i + 500) });
    if (error) errors.push(error.message);
    else updated += Number(data ?? 0);
  }

  return NextResponse.json({ laptops: raw.length, updated, errors });
}
