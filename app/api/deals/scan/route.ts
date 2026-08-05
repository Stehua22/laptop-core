// app/api/deals/scan/route.ts
// Trigger manually (GET) or via Vercel Cron (see vercel.json).
// Protect with a secret so randoms can't hammer your eBay/scraper quota.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEbayDeals } from "@/lib/dealScanner/ebay";
import { fetchBestBuyDeals } from "@/lib/dealScanner/bestbuy";
import { fetchFacebookDeals } from "@/lib/dealScanner/facebook";
import { scoreListing, isLikelyRefurbished, extractModelKey } from "@/lib/dealScanner/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Facebook scraping is slow; bump on Vercel Pro if needed


async function getMarketPrices(supabase: ReturnType<typeof createClient>): Promise<Record<string, number>> {
  // Pull rough "typical price" per model from your existing laptops table so
  // deal scoring lines up with what LaptopCore already tracks. Adjust the
  // column/table names to match your real schema.
  const { data, error } = await supabase.from("laptops").select("model, price");
  if (error || !data) return {};

  const grouped: Record<string, number[]> = {};
  for (const row of data) {
    const key = extractModelKey(row.model ?? "");
    if (!grouped[key]) grouped[key] = [];
    if (row.price) grouped[key].push(row.price);
  }

  const averages: Record<string, number> = {};
  for (const [key, prices] of Object.entries(grouped)) {
    averages[key] = prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  return averages;
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // service role, not anon — this route writes data
  );
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

  const allListings = [...ebayResults, ...bestBuyResults, ...facebookResults].filter((l) =>
    isLikelyRefurbished(l.title, l.condition)
  );

  const scored = allListings.map((l) => scoreListing(l, marketPrices));

  let upserted = 0;
  for (const deal of scored) {
    const { error } = await supabase.from("deals").upsert(
      {
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
        seen_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: "source,external_id" }
    );
    if (!error) upserted++;
    else console.error("Upsert failed:", error);
  }

  return NextResponse.json({
    scanned: allListings.length,
    upserted,
    bySource: {
      ebay: ebayResults.length,
      bestbuy: bestBuyResults.length,
      facebook: facebookResults.length,
    },
  });
}
