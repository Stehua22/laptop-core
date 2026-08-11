// lib/dealScanner/bestbuy.ts
// Best Buy Canada does NOT have an official public product API (the old
// bestbuyapis.com developer program was shut down). Best Buy US still has
// one, but it won't have CAD pricing / Canadian stock.
//
// Practical options for Best Buy Canada, ranked by reliability:
//  1. Best Buy publishes a product RSS/sitemap and a JSON search endpoint
//     used by their own site (bestbuy.ca/api/...) — undocumented, can change
//     without notice, but works today and is much lighter-weight than
//     full-page scraping.
//  2. Full HTML scraping with a headless browser (fragile, slower, higher
//     ban risk).
//
// This implementation uses option 1. If Best Buy changes their internal API
// shape, this is the file that breaks — check the Network tab on
// bestbuy.ca/en-ca/collection/laptops for the current endpoint shape.

import type { RawListing } from "./scoring";

const SEARCH_TERMS = [
  // Business lines — all conditions
  "lenovo thinkpad",
  "dell latitude",
  "hp elitebook",
  "hp probook",
  "lenovo legion",
  // Consumer lines — all conditions
  "lenovo ideapad",
  "dell inspiron",
  "hp pavilion",
  "asus vivobook",
  "asus zenbook",
  "acer aspire",
  "acer swift",
  // Gaming
  "asus rog laptop",
  "acer predator laptop",
  "acer nitro laptop",
  "msi gaming laptop",
  "dell g15 laptop",
  // Apple / premium
  "macbook air",
  "macbook pro",
  // 2-in-1s / Surface / other brands
  "microsoft surface laptop",
  "samsung galaxy book",
  "lg gram laptop",
  "lenovo yoga laptop",
  "dell xps laptop",
  // Explicit deal signals across any brand/condition
  "laptop clearance",
  "laptop open box",
  "laptop on sale",
  "refurbished laptop",
  // Seasonal sale events — Best Buy runs these as marketing campaigns, not
  // a queryable category, so we search the terms shoppers/listings use.
  "laptop summer sale",
  "laptop boxing day",
  "laptop black friday",
  "laptop cyber monday",
  "laptop deal of the day",
  "laptop clearance sale",
  // General "new laptop" catch-alls, not tied to any specific brand/line
  "windows laptop",
  "student laptop",
  "budget laptop",
  "2 in 1 laptop",
];

const PAGE_SIZE = 60;
// Best Buy's internal search endpoint may silently clamp pageSize server-side
// (many undocumented search APIs do — the request looks accepted but the
// response length is capped regardless of what you asked for). Paging
// instead of relying on one big pageSize gets around that: fetch page 1,
// and only fetch further pages if the previous page came back completely
// full (a short page means we've hit the end of that term's real results).
const MAX_PAGES_PER_TERM = 4;

async function fetchOnePage(term: string, page: number): Promise<{ items: RawListing[]; full: boolean }> {
  try {
    const url = `https://www.bestbuy.ca/api/v2/json/search?query=${encodeURIComponent(
      term
    )}&categoryid=&sortBy=relevance&sortDir=desc&currentRegion=ON&page=${page}&pageSize=${PAGE_SIZE}&lang=en-CA`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
      },
      // 8s, not 5s — a full pageSize=60 response is heavy enough that 5s
      // caused timeouts that took the whole scan down with it.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`Best Buy search failed for "${term}" page ${page}: ${res.status}`);
      return { items: [], full: false };
    }

    const data = await res.json();
    const products = data.products ?? [];

    const items: RawListing[] = products.map((product: any) => {
      const price = product.salePrice ?? product.regularPrice;
      const originalPrice =
        product.regularPrice && product.regularPrice > price ? product.regularPrice : undefined;
      return {
        source: "bestbuy" as const,
        externalId: String(product.sku),
        title: product.name,
        price,
        originalPrice,
        currency: "CAD",
        condition: /like new/i.test(product.name)
          ? "like-new"
          : /refurbished|refurb|renewed|certified pre-owned/i.test(product.name)
          ? "refurbished"
          : /open.?box/i.test(product.name)
          ? "open-box"
          : /clearance/i.test(product.name)
          ? "clearance"
          : "new",
        url: `https://www.bestbuy.ca${product.productUrl}`,
        imageUrl: product.thumbnailImage,
      };
    });

    // A page shorter than what we asked for (either because we requested
    // more than PAGE_SIZE, or the server clamped it) means there's nothing
    // more to page through for this term.
    return { items, full: items.length >= PAGE_SIZE };
  } catch (err) {
    console.error(`Best Buy fetch error for "${term}" page ${page}:`, err);
    return { items: [], full: false };
  }
}

async function searchOneTerm(term: string): Promise<RawListing[]> {
  const all: RawListing[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_TERM; page++) {
    const { items, full } = await fetchOnePage(term, page);
    all.push(...items);
    if (!full) break; // short page = no more results for this term
  }
  return all;
}

export async function fetchBestBuyDeals(): Promise<RawListing[]> {
  // Terms still run in parallel with each other; pages within a term run
  // sequentially (usually just 1 request per term unless a term is deep).
  const batches = await Promise.all(SEARCH_TERMS.map(searchOneTerm));
  const results = batches.flat();

  // De-dupe by SKU — multiple search terms can return the same product.
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.externalId)) return false;
    seen.add(r.externalId);
    return true;
  });

  // Refurbished / open-box / clearance listings are deals by definition —
  // keep those as-is. But "new" condition is the fallback classification
  // for anything that didn't match a deal-signal regex, so a plain
  // full-price laptop also lands here. Only keep "new" listings that have
  // an actual price drop (originalPrice > price), so full-price inventory
  // doesn't flood the deals feed as noise.
  return deduped.filter((r) => {
    if (r.condition !== "new") return true;
    return r.originalPrice !== undefined && r.originalPrice > r.price;
  });
}