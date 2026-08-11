// app/api/deals/scan/route.ts
// Trigger manually (GET) or via Vercel Cron (see vercel.json).
// Protect with a secret so randoms can't hammer your eBay/scraper quota.
//
// NOTE: eBay + Facebook scanning temporarily disabled — Best Buy only for now.
// To re-enable, uncomment the fetchEbayDeals/fetchFacebookDeals imports and
// calls below.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// import { fetchEbayDeals } from "@/lib/dealScanner/ebay";
import { fetchBestBuyDeals } from "@/lib/dealScanner/bestbuy";
// import { fetchFacebookDeals } from "@/lib/dealScanner/facebook";
import { scoreListing, extractModelKey } from "@/lib/dealScanner/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — bump on Vercel Pro if needed

type MarketInfo = { retailPrice: number; allTimeLow: number };

async function getMarketPrices(supabase: any): Promise<Record<string, MarketInfo>> {
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
  );
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.DEAL_SCAN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [bestBuyResults, marketPrices] = await Promise.all([
    fetchBestBuyDeals().catch((err) => {
      console.error("Best Buy scan failed:", err);
      return [];
    }),
    getMarketPrices(supabase),
  ]);

  const allListings = [...bestBuyResults];

  const scored = allListings.map((l) => scoreListing(l, marketPrices));

  const qualifyingDeals = scored.filter((d) => d.dealScore !== null && d.dealScore > 0);

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
      bestbuy: bestBuyResults.length,
    },
  });
}
