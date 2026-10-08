import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Imports Lenovo / HP / Dell laptops (and refreshes their CAD prices) from Best Buy Canada.
//
//   Cron:  Vercel calls this daily with "Authorization: Bearer $CRON_SECRET".
//   Test:  /api/import-laptops?key=YOUR_CRON_SECRET&dry=1   (parses only, writes nothing)
//
// Needs env vars: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
// Needs the columns added by migration.sql (external_id, last_price, price_updated_at).

const BRANDS = ["Lenovo", "HP", "Dell"] as const;
const LAPTOP_CATEGORY = "20352"; // Best Buy Canada "Laptops & MacBooks"
const PAGE_SIZE = 48;
const MAX_PAGES = 6; // per brand

type BestBuyProduct = {
  sku?: string;
  name?: string;
  productUrl?: string;
  salePrice?: number | null;
  regularPrice?: number | null;
  highResImage?: string | null;
  thumbnailImage?: string | null;
};

type ParsedLaptop = {
  external_id: string;
  brand: string;
  model: string;
  specs: string | null;
  url: string;
  image_url: string | null;
  screen_size: number | null;
  good_for: string | null;
  regular_price: number;
  price: number;
};

async function fetchPage(brand: string, page: number) {
  const params = new URLSearchParams({
    categoryid: LAPTOP_CATEGORY,
    query: brand,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    lang: "en-CA",
    sortBy: "relevance",
    sortDir: "desc",
  });

  const res = await fetch(`https://www.bestbuy.ca/api/v2/json/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en-CA,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`Best Buy returned ${res.status} for ${brand} page ${page}`);

  const json = (await res.json()) as { products?: BestBuyProduct[]; totalPages?: number };
  return { products: json.products ?? [], totalPages: json.totalPages ?? 1 };
}

function parse(brand: string, p: BestBuyProduct): ParsedLaptop | null {
  const name = (p.name ?? "").trim();
  if (!p.sku || !name) return null;

  // Only this brand, and skip used / open-box stock (the marketplace and Deal Scanner cover those).
  if (!new RegExp(`^${brand}\\b`, "i").test(name)) return null;
  if (/open box|refurbished|renewed|pre-owned/i.test(name)) return null;

  const price = p.salePrice ?? p.regularPrice;
  if (!price || price <= 0) return null;
  const regular = p.regularPrice && p.regularPrice > 0 ? p.regularPrice : price;

  // Best Buy names look like: Lenovo IdeaPad Slim 3 15.6" Laptop - Grey (Intel i5/16GB RAM/512GB SSD/Windows 11)
  const specsMatch = name.match(/\(([^()]*)\)\s*$/);
  const specs = specsMatch ? specsMatch[1].split("/").map((s) => s.trim()).join(" / ") : null;
  const model = name
    .replace(/\s*\([^()]*\)\s*$/, "")
    .replace(new RegExp(`^${brand}\\s+`, "i"), "")
    .trim();

  const screenMatch = name.match(/(\d{2}(?:\.\d)?)\s*(?:"|\u201d|-?inch)/i);
  const screen = screenMatch ? Number(screenMatch[1]) : null;

  const gaming = /legion|loq|omen|victus|alienware|rtx|geforce/i.test(name);
  const business = /thinkpad|latitude|elitebook|probook|vostro/i.test(name);

  const path = p.productUrl ?? "";
  const url = path.startsWith("http") ? path : `https://www.bestbuy.ca${path}`;

  return {
    external_id: `bestbuy-ca:${p.sku}`,
    brand,
    model,
    specs,
    url,
    image_url: p.highResImage ?? p.thumbnailImage ?? null,
    screen_size: screen,
    good_for: gaming ? "gaming" : business ? "business" : null,
    regular_price: regular,
    price,
  };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (!secret || (auth !== `Bearer ${secret}` && key !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const errors: string[] = [];
  const found = new Map<string, ParsedLaptop>();

  // 1. Pull listings from Best Buy Canada
  for (const brand of BRANDS) {
    let totalPages = 1;
    for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
      try {
        const result = await fetchPage(brand, page);
        totalPages = result.totalPages;
        if (result.products.length === 0) break;
        for (const product of result.products) {
          const parsed = parse(brand, product);
          if (parsed) found.set(parsed.external_id, parsed);
        }
      } catch (e) {
        errors.push(`${brand} page ${page}: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }
  }

  const items = Array.from(found.values());

  if (dry) {
    return NextResponse.json({ dry: true, found: items.length, errors, sample: items.slice(0, 8) });
  }

  // 2. Write to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const today = new Date().toISOString().split("T")[0];
  const nowIso = new Date().toISOString();
  let added = 0;
  let repriced = 0;

  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);

    const { data: existing, error: readErr } = await supabase
      .from("laptops")
      .select("id, external_id, last_price")
      .in("external_id", chunk.map((c) => c.external_id));
    if (readErr) {
      errors.push(readErr.message);
      continue;
    }

    const byExternalId = new Map<string, { id: number; last_price: number | null }>();
    for (const row of existing ?? []) {
      byExternalId.set(row.external_id as string, {
        id: row.id as number,
        last_price: row.last_price === null ? null : Number(row.last_price),
      });
    }

    // New laptops: insert everything, plus their first price point
    const fresh = chunk.filter((c) => !byExternalId.has(c.external_id));
    if (fresh.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("laptops")
        .insert(
          fresh.map((c) => ({
            external_id: c.external_id,
            brand: c.brand,
            model: c.model,
            specs: c.specs,
            store: "Best Buy",
            url: c.url,
            retail_price: c.regular_price,
            date_added: today,
            image_url: c.image_url,
            screen_size: c.screen_size,
            good_for: c.good_for,
            last_price: c.price,
            price_updated_at: nowIso,
          }))
        )
        .select("id, external_id");

      if (insertErr) {
        errors.push(insertErr.message);
      } else {
        const priceByExternalId = new Map(fresh.map((c) => [c.external_id, c.price] as const));
        const history = (inserted ?? []).map((r) => ({
          laptop_id: r.id as number,
          price: priceByExternalId.get(r.external_id as string) ?? 0,
          recorded_at: today,
        }));
        const { error: histErr } = await supabase.from("price_history").insert(history);
        if (histErr) errors.push(histErr.message);
        added += inserted?.length ?? 0;
      }
    }

    // Existing laptops: only touch price fields, and only when the price actually changed.
    // (Anything you edited by hand, like specs, pros/cons or good_for, is left alone.)
    const changed = chunk.filter((c) => {
      const row = byExternalId.get(c.external_id);
      return row !== undefined && row.last_price !== c.price;
    });

    await Promise.all(
      changed.map(async (c) => {
        const row = byExternalId.get(c.external_id)!;
        const { error: updateErr } = await supabase
          .from("laptops")
          .update({
            retail_price: c.regular_price,
            last_price: c.price,
            price_updated_at: nowIso,
            url: c.url,
          })
          .eq("id", row.id);
        if (updateErr) {
          errors.push(updateErr.message);
          return;
        }
        const { error: histErr } = await supabase
          .from("price_history")
          .insert({ laptop_id: row.id, price: c.price, recorded_at: today });
        if (histErr) {
          errors.push(histErr.message);
          return;
        }
        repriced += 1;
      })
    );
  }

  return NextResponse.json({ found: items.length, added, repriced, errors });
}