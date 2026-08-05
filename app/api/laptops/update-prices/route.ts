// app/api/laptops/update-prices/route.ts
// Fetches live Best Buy Canada listings and matches them against your
// existing `laptops` table by brand + model keywords. When a match is found,
// appends (or updates) today's price_history entry so tracked laptops stay
// current automatically — no manual scraping needed.
//
// Trigger manually (GET) or via Vercel Cron (see vercel.json).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchBestBuyDeals } from "@/lib/dealScanner/bestbuy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LaptopRow = { id: number; brand: string; model: string };

// Normalize text for loose matching: lowercase, strip punctuation.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// A listing "matches" a laptop if the laptop's brand appears in the listing
// title AND enough of the laptop's model words also appear in the title.
// This avoids over-matching (e.g. "Lenovo IdeaPad" listings shouldn't match
// a tracked "Lenovo ThinkPad").
function findMatch(listingTitle: string, laptops: LaptopRow[]): LaptopRow | null {
  const normTitle = normalize(listingTitle);

  let best: { laptop: LaptopRow; score: number } | null = null;

  for (const laptop of laptops) {
    const brand = normalize(laptop.brand);
    if (!brand || !normTitle.includes(brand)) continue;

    const modelWords = normalize(laptop.model)
      .split(" ")
      .filter((w) => w.length > 1 && !["laptop", "the", "and"].includes(w));
    if (modelWords.length === 0) continue;

    const matchedWords = modelWords.filter((w) => normTitle.includes(w));
    const score = matchedWords.length / modelWords.length;

    // Require at least 60% of the model's distinguishing words to appear.
    if (score >= 0.6 && (!best || score > best.score)) {
      best = { laptop, score };
    }
  }

  return best?.laptop ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.DEAL_SCAN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: laptops, error: laptopsError } = await supabase
    .from("laptops")
    .select("id, brand, model");

  if (laptopsError || !laptops) {
    return NextResponse.json({ error: "failed to load laptops", detail: laptopsError }, { status: 500 });
  }

  const listings = await fetchBestBuyDeals().catch((err) => {
    console.error("Best Buy fetch failed:", err);
    return [];
  });

  const today = new Date().toISOString().split("T")[0];
  let matched = 0;
  let updated = 0;
  let inserted = 0;
  const unmatchedSample: string[] = [];

  for (const listing of listings) {
    const match = findMatch(listing.title, laptops as LaptopRow[]);
    if (!match) {
      if (unmatchedSample.length < 10) unmatchedSample.push(listing.title);
      continue;
    }
    matched++;

    const { data: existing } = await supabase
      .from("price_history")
      .select("id")
      .eq("laptop_id", match.id)
      .eq("recorded_at", today)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("price_history")
        .update({ price: listing.price })
        .eq("id", existing.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase
        .from("price_history")
        .insert({ laptop_id: match.id, price: listing.price, recorded_at: today });
      if (!error) inserted++;
    }
  }

  return NextResponse.json({
    listingsFetched: listings.length,
    laptopsInDb: laptops.length,
    matched,
    updated,
    inserted,
    unmatchedSample,
  });
}
