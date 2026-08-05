// app/api/bestbuy-deals/route.ts
// Server-side proxy for Best Buy Canada's internal search API.
// No API key required – uses the same endpoint bestbuy.ca uses on their site.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEARCH_TERMS = [
  "lenovo thinkpad refurbished",
  "dell latitude refurbished",
  "hp elitebook refurbished",
  "macbook refurbished",
  "laptop open box",
];

export async function GET() {
  const results: any[] = [];

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://www.bestbuy.ca/api/v2/json/search?query=${encodeURIComponent(
        term
      )}&categoryid=&sortBy=relevance&sortDir=desc&currentRegion=ON&page=1&pageSize=20&lang=en-CA`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 300 }, // cache 5 min
      });

      if (!res.ok) continue;

      const data = await res.json();
      for (const p of data.products ?? []) {
        const sale = p.salePrice ?? null;
        const reg = p.regularPrice ?? null;
        const savings = reg && sale && reg > sale ? reg - sale : 0;
        const pct = reg && savings ? Math.round((savings / reg) * 100) : 0;

        results.push({
          sku: String(p.sku),
          title: p.name,
          salePrice: sale,
          regularPrice: reg,
          savings,
          savingsPct: pct,
          url: `https://www.bestbuy.ca${p.productUrl}`,
          image: p.thumbnailImage,
          condition: /open.?box/i.test(p.name) ? "Open Box" : /refurb/i.test(p.name) ? "Refurbished" : "New",
        });
      }
    } catch {
      // silently skip failed terms
    }
  }

  // deduplicate by sku, sort by savings %
  const seen = new Set<string>();
  const unique = results
    .filter((r) => { if (seen.has(r.sku)) return false; seen.add(r.sku); return true; })
    .sort((a, b) => b.savingsPct - a.savingsPct);

  return NextResponse.json({ deals: unique, scannedAt: new Date().toISOString() });
}
