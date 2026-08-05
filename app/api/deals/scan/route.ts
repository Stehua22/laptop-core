// app/api/deals/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEbayDeals } from "@/lib/dealScanner/ebay";
import { fetchBestBuyDeals } from "@/lib/dealScanner/bestbuy";
import { fetchFacebookDeals } from "@/lib/dealScanner/facebook";
import { scoreListing, isLikelyRefurbished, extractModelKey } from "@/lib/dealScanner/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MarketInfo = { retailPrice: number; allTimeLow: number };

async function getMarketPrices(supabase: any): Promise<Record<string, MarketInfo>> {
  const { data, error } = await supabase
    .from("laptops")
    .select("model, retail_price, price_history(price)");

  console.log("LAPTOPS QUERY ERROR:", error);
  console.log("LAPTOPS ROW COUNT:", data ? data.length : 0);
  console.log("LAPTOPS SAMPLE ROW:", data ? data[0] : null);

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

  const includeFacebook = req.nextUrl.searchParams.get("facebook") !== "off";

  const [ebayResults, bestBuyResults, facebookResults, marketPrices] = await Promise.all([
    fetchEbayDeals().catch((err) => { console.error("eBay scan failed:", err); return []; }),
    fetchBestBuyDeals().catch((err) => { console.error("Best Buy scan failed:", err); return []; }),
    includeFacebook
      ? fetchFacebookDeals().catch((err) => { console.error("Facebook scan failed:", err); return []; })
      : Promise.resolve([]),
    getMarketPrices(supabase),
  ]);

  const allListings = [...ebayResults, ...bestBuyResults, ...facebookResults].filter((l) =>
    isLikelyRefurbished(l.title, l.condition)
  );

  const scored = allListings.map((l) => scoreListing(l, marketPrices));
  const qualifyingDeals = scored.filter((d) => d.dealScore !== null && d.dealScore > 0);

  let upserted = 0;
  for (const deal of qualifyingDeals) {
    const { error } = await supabase.from("deals").upsert(
      {
        source: deal.source, external_id: deal.externalId, title: deal.title,
        brand: deal.brand, price: deal.price, currency: deal.currency ?? "CAD",
        condition: deal.condition, url: deal.url, image_url: deal.imageUrl,
        location: deal.location, deal_score: deal.dealScore, market_price: deal.marketPrice,
        seen_at: new Date().toISOString(), is_active: true,
      },
      { onConflict: "source,external_id" }
    );
    if (!error) upserted++;
    else console.error("Upsert failed:", error);
  }

  return NextResponse.json({
    scanned: allListings.length,
    qualifyingDeals: qualifyingDeals.length,
    upserted,
    bySource: { ebay: ebayResults.length, bestbuy: bestBuyResults.length, facebook: facebookResults.length },
  });
}
