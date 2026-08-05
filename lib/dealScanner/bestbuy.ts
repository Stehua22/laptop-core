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
  "lenovo thinkpad refurbished",
  "dell latitude refurbished",
  "hp elitebook refurbished",
  "macbook refurbished",
];

export async function fetchBestBuyDeals(): Promise<RawListing[]> {
  const results: RawListing[] = [];

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://www.bestbuy.ca/api/v2/json/search?query=${encodeURIComponent(
        term
      )}&categoryid=&sortBy=relevance&sortDir=desc&currentRegion=ON&page=1&pageSize=24&lang=en-CA`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        console.error(`Best Buy search failed for "${term}": ${res.status}`);
        continue;
      }

      const data = await res.json();
      for (const product of data.products ?? []) {
        results.push({
          source: "bestbuy",
          externalId: String(product.sku),
          title: product.name,
          price: product.salePrice ?? product.regularPrice,
          currency: "CAD",
          condition: /open.?box/i.test(product.name) ? "open-box" : "new",
          url: `https://www.bestbuy.ca${product.productUrl}`,
          imageUrl: product.thumbnailImage,
        });
      }
    } catch (err) {
      console.error(`Best Buy fetch error for "${term}":`, err);
    }
  }

  return results;
}
