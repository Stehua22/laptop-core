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

// Firing all 34 terms at once was tripping Best Buy's rate limiting /
// making individual requests slow enough to hit the fetch timeout (seen in
// prod logs: "2 in 1 laptop" page 1 timed out at 8s). Batching keeps total
// scan time reasonable while cutting how many concurrent connections hit
// Best Buy at once.
const TERM_BATCH_SIZE = 6;

// 8s was too tight under load — bumped to 15s. A slow response we wait out
// beats a fast timeout that silently drops an entire search term's results.
const FETCH_TIMEOUT_MS = 15000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOnePage(
  term: string,
  page: number,
  attempt = 1
): Promise<{ items: RawListing[]; full: boolean }> {
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
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
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

    return { items, full: items.length >= PAGE_SIZE };
  } catch (err) {
    // Retry once on timeout/network error before giving up on this page —
    // a single slow response shouldn't cost us the whole term's results.
    if (attempt < 2) {
      console.error(`Best Buy fetch error for "${term}" page ${page} (attempt ${attempt}), retrying:`, err);
      await sleep(500);
      return fetchOnePage(term, page, attempt + 1);
    }
    console.error(`Best Buy fetch error for "${term}" page ${page}, giving up:`, err);
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
  // Batch terms instead of firing all 34 at once — cuts concurrent
  // connections to Best Buy, which was causing timeouts under load.
  const results: RawListing[] = [];
  for (let i = 0; i < SEARCH_TERMS.length; i += TERM_BATCH_SIZE) {
    const batch = SEARCH_TERMS.slice(i, i + TERM_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(searchOneTerm));
    results.push(...batchResults.flat());
  }

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