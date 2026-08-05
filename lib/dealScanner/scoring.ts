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
 * separately when estimating market price. Not exhaustive — extend as needed.
 */
export function extractModelKey(title: string): string {
  const lower = title.toLowerCase();
  const match = lower.match(
    /(thinkpad\s?\w+|ideapad\s?\w+|yoga\s?\w+|latitude\s?\w+|inspiron\s?\w+|xps\s?\w+|elitebook\s?\w+|probook\s?\w+|pavilion\s?\w+|macbook\s?(air|pro)?\s?\w*|surface\s?\w+)/
  );
  return match ? match[1].replace(/\s+/g, " ").trim() : lower.split(" ").slice(0, 3).join(" ");
}

/**
 * marketPrices: map of modelKey -> known typical price (CAD), e.g. pulled
 * from your existing `laptops` table averages. Pass in whatever you already
 * track in LaptopCore so deal scoring is consistent with the rest of the app.
 */
export function scoreListing(
  listing: RawListing,
  marketPrices: Record<string, number>
): ScoredDeal {
  const brand = detectBrand(listing.title);
  const modelKey = extractModelKey(listing.title);
  const marketPrice = marketPrices[modelKey] ?? null;

  let dealScore: number | null = null;
  if (marketPrice && marketPrice > 0) {
    const discountPct = ((marketPrice - listing.price) / marketPrice) * 100;
    // clamp 0-100, discount of 40%+ off maps to 100
    dealScore = Math.max(0, Math.min(100, Math.round((discountPct / 40) * 100)));
  }

  return {
    ...listing,
    brand,
    marketPrice,
    dealScore,
  };
}
