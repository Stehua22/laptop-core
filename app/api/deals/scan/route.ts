// app/api/deals/scan/route.ts
// Trigger manually (GET) or via Vercel Cron (see vercel.json).
// Protect with a secret so randoms can't hammer your eBay/scraper quota.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEbayDeals } from "@/lib/dealScanner/ebay";
import { fetchBestBuyDeals } from "@/lib/dealScanner/bestbuy";
import { fetchFacebookDeals } from "@/lib/dealScanner/facebook";
import { scoreListing, extractModelKey } from "@/lib/dealScanner/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Facebook scraping is slow; bump on Vercel Pro if needed

type MarketInfo = { retailPrice: number; allTimeLow: number };

async function getMarketPrices(supabase: any): Promise<Record<string, MarketInfo>> {
  // Pull retail price + all-time-low tracked price per model from the
  // laptops table so deal scoring lines up with what LaptopCore already
  // tracks. A "good deal" = at/below the all-time low we've ever seen, OR
  // a big % drop off retail.
  const { data, error } = await supabase
    .from("laptops")
    .select("model, retail_price, price_history(price)");
  if (error || !data) return {};
  const rows = data as any[];

  const grouped: Record<string, { retail: number[]; allPrices: number[] }> = {};
  for (const row of rows) {
    const key = extractModelKey(row.model ?? "");
    if (!grouped[key]) grouped[key] = { retail: [], allPrices: [] };
    if (row.retail_price) grouped[key].retail.push(row.retail_price);
    const history = (row.price_history ?? []) as { price: number }[];
    for (const h of history) if (h.price) grouped[key].allPrices.push(h.price);
    if (row.retail_price) grouped[key].allPrices.push(row.retail_price);
  }

  const result: Record<string, MarketInfo> = {};
  for (const [key, { retail, allPrices }] of Object.entries(grouped)) {
    if (!retail.length || !allPrices.length) continue;
    result[key] = {
      retailPrice: retail.reduce((a, b) => a + b, 0) / retail.length,
      allTimeLow: Math.min(...allPrices),
    };
  }
  return result;
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  ); // secret/service role — this route writes data
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.DEAL_SCAN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const includeFacebook = req.nextUrl.searchParams.get("facebook") !== "off";

  const [ebayResults, bestBuyResults, facebookResults, marketPrices] = await Promise.all([
    fetchEbayDeals().catch((err) => {
      console.error("eBay scan failed:", err);
      return [];
    }),
    fetchBestBuyDeals().catch((err) => {
      console.error("Best Buy scan failed:", err);
      return [];
    }),
    includeFacebook
      ? fetchFacebookDeals().catch((err) => {
          console.error("Facebook scan failed:", err);
          return [];
        })
      : Promise.resolve([]),
    getMarketPrices(supabase),
  ]);

  // No condition filter — scan all listings (new, open-box, refurbished,
  // clearance). The deal-score logic below decides what actually counts as
  // a good deal, regardless of condition.
  const allListings = [...ebayResults, ...bestBuyResults, ...facebookResults];

  const scored = allListings.map((l) => scoreListing(l, marketPrices));

  // Only keep listings that actually qualify as a "good deal":
  // all-time low OR a big % drop from retail (see scoring.ts).
  const qualifyingDeals = scored.filter((d) => d.dealScore !== null && d.dealScore > 0);

  // Upsert all qualifying deals in a single batched call instead of one
  // sequential round-trip per row — with 20-40 qualifying deals, sequential
  // awaits alone can eat several seconds and tip the route over Vercel's
  // serverless timeout (hard-capped at 10s on Hobby plans, regardless of
  // the maxDuration setting above).
  let upserted = 0;
  if (qualifyingDeals.length > 0) {
const rows = qualifyingDeals.map((deal) => ({
      source: deal.source,
      external_id: deal.externalId,
      title: deal.title,
      brand: deal.brand,
      price: deal.price,
      currency: deal.currency ?? "CAD",
      condition: deal.condition,
      url: deal.url,
      image_url: deal.imageUrl,
      location: deal.location,
      deal_score: deal.dealScore,
      market_price: deal.marketPrice,
      is_premium_deal: deal.isPremiumDeal,
      seen_at: new Date().toISOString(),
      is_active: true,
    }));

    const { data, error } = await supabase
      .from("deals")
      .upsert(rows, { onConflict: "source,external_id" })
      .select("id");

    if (error) console.error("Batch upsert failed:", error);
    else upserted = data?.length ?? 0;
  }

  return NextResponse.json({
    scanned: allListings.length,
    qualifyingDeals: qualifyingDeals.length,
    upserted,
    bySource: {
      ebay: ebayResults.length,
      bestbuy: bestBuyResults.length,
      facebook: facebookResults.length,
    },
  });
}
