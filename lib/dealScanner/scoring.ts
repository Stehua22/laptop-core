// lib/dealScanner/scoring.ts

export type RawListing = {
  source: "ebay" | "bestbuy" | "facebook";
  externalId: string;
  title: string;
  price: number;
  currency?: string;
  condition?: string;
  url: string;
  imageUrl?: string;
  location?: string;
};

export type MarketInfo = { retailPrice: number; allTimeLow: number };

export type ScoredDeal = RawListing & {
  brand: string | null;
  marketPrice: number | null;
  dealScore: number | null;
};

const TRACKED_BRANDS = [
  "lenovo",
  "dell",
  "hp",
  "asus",
  "acer",
  "microsoft",
  "apple",
  "msi",
  "samsung",
  "lg",
];

const REFURB_KEYWORDS = [
  "refurbished",
  "refurb",
  "renewed",
  "certified pre-owned",
  "open box",
  "open-box",
  "like new",
  "grade a",
  "grade b",
];

// % below retail that counts as a "big drop" even if it's not an all-time low
const BIG_DROP_PCT = 25;

export function detectBrand(title: string): string | null {
  const lower = title.toLowerCase();
  for (const brand of TRACKED_BRANDS) {
    if (lower.includes(brand)) return brand;
  }
  return null;
}

export function isLikelyRefurbished(title: string, condition?: string): boolean {
  const haystack = `${title} ${condition ?? ""}`.toLowerCase();
  return REFURB_KEYWORDS.some((kw) => haystack.includes(kw));
}

/**
 * Rough model-tier extraction so we can group "ThinkPad T14" vs "ThinkPad X1"
 * separately when estimating market price. Covers business, consumer, and
 * gaming lines across the major brands. Not exhaustive — extend as needed.
 */
export function extractModelKey(title: string): string {
  const lower = title.toLowerCase();
  const match = lower.match(
    /(thinkpad\s?\w+|ideapad\s?\w+|yoga\s?\w+|legion\s?\w+|latitude\s?\w+|inspiron\s?\w+|xps\s?\w+|elitebook\s?\w+|probook\s?\w+|pavilion\s?\w+|spectre\s?\w+|omen\s?\w+|macbook\s?(air|pro)?\s?\w*|surface\s?(laptop|pro|book|go)?\s?\w*|vivobook\s?\w+|zenbook\s?\w+|rog\s?\w+|tuf\s?\w+|aspire\s?\w+|swift\s?\w+|predator\s?\w+|nitro\s?\w+|galaxy\s?book\s?\w*|gram\s?\w*)/
  );
  return match ? match[1].replace(/\s+/g, " ").trim() : lower.split(" ").slice(0, 3).join(" ");
}

/**
 * marketPrices: map of modelKey -> { retailPrice, allTimeLow } pulled from
 * your existing `laptops` table (see route.ts getMarketPrices).
 *
 * A listing qualifies as a "good deal" if EITHER:
 *   - its price is at or below the all-time low we've ever tracked, OR
 *   - it's a big % drop off retail (>= BIG_DROP_PCT)
 * Anything that doesn't meet either condition gets dealScore = 0 and is
 * filtered out in route.ts before being saved.
 */
export function scoreListing(
  listing: RawListing,
  marketPrices: Record<string, MarketInfo>
): ScoredDeal {
  const brand = detectBrand(listing.title);
  const modelKey = extractModelKey(listing.title);
  const info = marketPrices[modelKey] ?? null;
  const marketPrice = info?.retailPrice ?? null;

  let dealScore: number | null = null;

  if (info) {
    const isAllTimeLow = listing.price <= info.allTimeLow;
    const dropFromRetailPct = ((info.retailPrice - listing.price) / info.retailPrice) * 100;
    const isBigDrop = dropFromRetailPct >= BIG_DROP_PCT;

    if (isAllTimeLow || isBigDrop) {
      // All-time lows score higher by default; big drops get a bonus scaled
      // by how far past the threshold they go.
      const base = isAllTimeLow ? 80 : 50;
      const bonus = Math.max(0, Math.min(20, Math.round((dropFromRetailPct - BIG_DROP_PCT) / 2)));
      dealScore = Math.min(100, base + bonus);
    } else {
      dealScore = 0;
    }
  }

  return {
    ...listing,
    brand,
    marketPrice,
    dealScore,
  };
}
