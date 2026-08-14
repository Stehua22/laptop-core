// lib/dealScanner/scoring.ts

export type RawListing = {
  source: "ebay" | "bestbuy" | "facebook";
  externalId: string;
  title: string;
  price: number;
  originalPrice?: number;
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
  isPremiumDeal: boolean;
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

const BIG_DROP_PCT = 25;
const PREMIUM_DROP_PCT = 15;
const REFURB_BASELINE_SCORE = 20;
// A real laptop clearance rarely exceeds ~80% off. Anything past this is
// almost certainly bad source data (a glitched $0/near-$0 price, or a
// non-laptop SKU that slipped through) rather than a genuine deal — reject
// it instead of letting it score as a perfect 100.
const MAX_PLAUSIBLE_DROP_PCT = 80;

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

export function extractModelKey(title: string): string {
  const lower = title.toLowerCase();
  const match = lower.match(
    /(thinkpad\s?\w+|ideapad\s?\w+|yoga\s?\w+|legion\s?\w+|latitude\s?\w+|inspiron\s?\w+|xps\s?\w+|elitebook\s?\w+|probook\s?\w+|pavilion\s?\w+|spectre\s?\w+|omen\s?\w+|macbook\s?(air|pro)?\s?\w*|surface\s?(laptop|pro|book|go)?\s?\w*|vivobook\s?\w+|zenbook\s?\w+|rog\s?\w+|tuf\s?\w+|aspire\s?\w+|swift\s?\w+|predator\s?\w+|nitro\s?\w+|galaxy\s?book\s?\w*|gram\s?\w*)/
  );
  return match ? match[1].replace(/\s+/g, " ").trim() : lower.split(" ").slice(0, 3).join(" ");
}

export function scoreListing(
  listing: RawListing,
  marketPrices: Record<string, MarketInfo>
): ScoredDeal {
  const brand = detectBrand(listing.title);
  const modelKey = extractModelKey(listing.title);
  const info = marketPrices[modelKey] ?? null;

  let marketPrice: number | null = info?.retailPrice ?? null;
  let dealScore: number | null = null;
  let isPremiumDeal = false;

  // Reject implausible prices outright, regardless of source.
  if (!listing.price || listing.price <= 1) {
    return { ...listing, brand, marketPrice: null, dealScore: null, isPremiumDeal: false };
  }

  if (info) {
    const dropFromRetailPct = ((info.retailPrice - listing.price) / info.retailPrice) * 100;
    if (dropFromRetailPct > MAX_PLAUSIBLE_DROP_PCT) {
      return { ...listing, brand, marketPrice: info.retailPrice, dealScore: null, isPremiumDeal: false };
    }
    const isAllTimeLow = listing.price <= info.allTimeLow;
    const isBigDrop = dropFromRetailPct >= BIG_DROP_PCT;
    const isPremiumDrop = !isBigDrop && dropFromRetailPct >= PREMIUM_DROP_PCT;

    if (isAllTimeLow || isBigDrop) {
      const base = isAllTimeLow ? 80 : 50;
      const bonus = Math.max(0, Math.min(20, Math.round((dropFromRetailPct - BIG_DROP_PCT) / 2)));
      dealScore = Math.min(100, base + bonus);
    } else if (isPremiumDrop) {
      const bonus = Math.max(0, Math.min(10, Math.round((dropFromRetailPct - PREMIUM_DROP_PCT) / 2)));
      dealScore = Math.min(40, 25 + bonus);
      isPremiumDeal = true;
    } else if (isLikelyRefurbished(listing.title, listing.condition)) {
      dealScore = REFURB_BASELINE_SCORE;
      isPremiumDeal = true;
    } else {
      dealScore = 0;
    }
  } else if (listing.originalPrice && listing.originalPrice > listing.price) {
    marketPrice = listing.originalPrice;
    const dropPct = ((listing.originalPrice - listing.price) / listing.originalPrice) * 100;
    if (dropPct > MAX_PLAUSIBLE_DROP_PCT) {
      dealScore = null;
    } else if (dropPct >= BIG_DROP_PCT) {
      const bonus = Math.max(0, Math.min(15, Math.round((dropPct - BIG_DROP_PCT) / 2)));
      dealScore = Math.min(70, 35 + bonus);
    } else if (dropPct >= PREMIUM_DROP_PCT) {
      dealScore = Math.min(30, 15 + Math.round((dropPct - PREMIUM_DROP_PCT) / 2));
      isPremiumDeal = true;
    } else if (isLikelyRefurbished(listing.title, listing.condition)) {
      dealScore = REFURB_BASELINE_SCORE;
      isPremiumDeal = true;
    } else {
      dealScore = 0;
    }
  } else if (isLikelyRefurbished(listing.title, listing.condition)) {
    dealScore = REFURB_BASELINE_SCORE;
    isPremiumDeal = true;
  } else {
    dealScore = 0;
  }

  return {
    ...listing,
    brand,
    marketPrice,
    dealScore,
    isPremiumDeal,
  };
}