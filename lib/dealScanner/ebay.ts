// lib/dealScanner/ebay.ts
// Uses eBay's Browse API (free tier, official, ToS-compliant).
// Requires an eBay Developer account -> production app keys.
// Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html

import type { RawListing } from "./scoring";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getEbayToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });

  if (!res.ok) {
    throw new Error(`eBay token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

const SEARCH_TERMS = [
  "lenovo thinkpad refurbished",
  "lenovo ideapad refurbished",
  "dell latitude refurbished",
  "hp elitebook refurbished",
  "macbook refurbished",
];

export async function fetchEbayDeals(): Promise<RawListing[]> {
  const token = await getEbayToken();
  const results: RawListing[] = [];

  for (const term of SEARCH_TERMS) {
    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", term);
    url.searchParams.set("category_ids", "177"); // Laptops & Netbooks
    url.searchParams.set("filter", "conditionIds:{2000|2500|3000},priceCurrency:CAD");
    url.searchParams.set("sort", "price");
    url.searchParams.set("limit", "25");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_CA",
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(`eBay search failed for "${term}": ${res.status}`);
      continue;
    }

    const data = await res.json();
    for (const item of data.itemSummaries ?? []) {
      results.push({
        source: "ebay",
        externalId: item.itemId,
        title: item.title,
        price: parseFloat(item.price?.value ?? "0"),
        currency: item.price?.currency ?? "CAD",
        condition: item.condition,
        url: item.itemWebUrl,
        imageUrl: item.image?.imageUrl,
        location: item.itemLocation?.city,
      });
    }
  }

  return results;
}
