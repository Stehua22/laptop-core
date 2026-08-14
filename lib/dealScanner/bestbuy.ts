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

// All 34 terms fire in parallel — this is necessary to stay under Vercel's
// serverless function timeout (60s hard cap). A batched/sequential version
// with retries was tried and blew past 60s, causing the whole scan to fail
// with a 504 and silently leave stale data in place. Parallel + no retry is
// the tradeoff: a handful of terms may occasionally time out and return
// zero results, but the scan as a whole reliably completes.
const FETCH_TIMEOUT_MS = 10000;

// Brand/model search terms (e.g. "acer predator laptop") also surface
// accessories — batteries, chargers, cases, docks — that share the brand
// name in their title. These aren't laptops, so they get excluded entirely
// rather than reaching the scoring step. Left unfiltered, a battery listed
// at $85 against a $2900 "original price" scores as a near-perfect deal
// and crowds out real laptop listings at the top of the sort.
const NON_LAPTOP_KEYWORDS = [
  "battery",
  "charger",
  "charging",
  "adapter",
  "power cord",
  "power supply",
  "ac adapter",
  "case",
  "sleeve",
  "bag",
  "backpack",
  "cover",
  "skin",
  "decal",
  "screen protector",
  "privacy filter",
  "stylus",
  "pen",
  "dock",
  "docking station",
  "hub",
  "cable",
  "mouse",
  "keyboard",
  "webcam",
  "stand",
  "mount",
  "cooling pad",
  "cooler",
  "fan",
  "ram",
  "memory module",
  "ssd",
  "hard drive",
  "hdd",
  "replacement screen",
];

function isLaptopListing(title: string): boolean {
  const lower = title.toLowerCase();
  return !NON_LAPTOP_KEYWORDS.some((kw) => lower.includes(kw));
}

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
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`Best Buy search failed for "${term}" page ${page}: ${res.status}`);
      return { items: [], full: false };
    }

    const data = await res.json();
    const products = data.products ?? [];

    const items: RawListing[] = products
      .filter((product: any) => isLaptopListing(product.name ?? ""))
      // Best Buy's API occasionally returns salePrice: 0 (or some other junk
      // near-zero value) for a SKU — a glitch on their end, not a real price.
      // `??` alone doesn't catch this since 0 isn't null/undefined, so it was
      // sailing straight through and scoring as a "100% off" perfect deal.
      .filter((product: any) => {
        const p = product.salePrice ?? product.regularPrice;
        return typeof p === "number" && p > 1; // reject 0 / negative / junk
      })
      .map((product: any) => {
        const price = product.salePrice > 1 ? product.salePrice : product.regularPrice;
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

    // A page shorter than what Best Buy actually returned (before our own
    // filtering) means there's nothing more to page through for this term.
    // Use the raw product count, not the filtered items count, so a page
    // full of filtered-out accessories doesn't look like a "short page"
    // and stop pagination early.
    return { items, full: products.length >= PAGE_SIZE };
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
  // Terms run in parallel with each other; pages within a term run
  // sequentially (usually just 1 request per term unless a term is deep).
  const batches = await Promise.all(SEARCH_TERMS.map(searchOneTerm));
  const results = batches.flat();

  console.log(`Best Buy scan: ${results.length} laptop listings across ${SEARCH_TERMS.length} search terms`);

  // De-dupe by SKU — multiple search terms can return the same product.
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.externalId)) return false;
    seen.add(r.externalId);
    return true;
  });

  console.log(`Best Buy scan: ${deduped.length} unique listings after dedup`);

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