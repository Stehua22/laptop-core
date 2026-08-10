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
  "lenovo thinkpad",
  "dell latitude",
  "hp elitebook",
  "hp probook",
  "lenovo legion",
  "lenovo ideapad",
  "dell inspiron",
  "hp pavilion",
  "asus vivobook",
  "asus zenbook",
  "acer aspire",
  "acer swift",
  "asus rog laptop",
  "acer predator laptop",
  "acer nitro laptop",
  "msi gaming laptop",
  "dell g15 laptop",
  "macbook air",
  "macbook pro",
  "microsoft surface laptop",
  "samsung galaxy book",
  "lg gram laptop",
  "lenovo yoga laptop",
  "dell xps laptop",
  "laptop clearance",
  "laptop open box",
  "laptop on sale",
  "refurbished laptop",
  "laptop summer sale",
  "laptop boxing day",
  "laptop black friday",
  "laptop cyber monday",
  "laptop deal of the day",
  "laptop clearance sale",
  "windows laptop",
  "student laptop",
  "budget laptop",
  "2 in 1 laptop",
];

async function searchOneTerm(term: string): Promise<RawListing[]> {
  try {
    // pageSize bumped from 24 to 100 so the combined pool across all
    // search terms comfortably covers the Ultra-tier result count (350)
    // after de-dupe and the "must be a real deal" filter below.
    const url = `https://www.bestbuy.ca/api/v2/json/search?query=${encodeURIComponent(
      term
    )}&categoryid=&sortBy=relevance&sortDir=desc&currentRegion=ON&page=1&pageSize=60&lang=en-CA`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`Best Buy search failed for "${term}": ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.products ?? []).map((product: any) => {
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
  } catch (err) {
    console.error(`Best Buy fetch error for "${term}":`, err);
    return [];
  }
}

export async function fetchBestBuyDeals(): Promise<RawListing[]> {
  const batches = await Promise.all(SEARCH_TERMS.map(searchOneTerm));
  const results = batches.flat();

  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    if (seen.has(r.externalId)) return false;
    seen.add(r.externalId);
    return true;
  });

  return deduped.filter((r) => {
    if (r.condition !== "new") return true;
    return r.originalPrice !== undefined && r.originalPrice > r.price;
  });
}
