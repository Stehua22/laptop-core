// lib/dealScanner/bestbuy.ts
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

const PAGE_SIZE = 60;
// Best Buy's internal search endpoint may silently clamp pageSize server-side.
// Paging around it: fetch page 1, and only fetch further pages if the
// previous page came back completely full.
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
    if (!full) break;
  }
  return all;
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
