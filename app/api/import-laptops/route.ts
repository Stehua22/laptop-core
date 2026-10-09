import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Imports laptops (Lenovo, HP, Dell, ASUS, Acer, Apple and more) (and refreshes CAD prices) from Best Buy Canada.
//
//   GET  /api/import-laptops          Vercel cron: fetches from Best Buy, then saves.  (?dry=1 = preview only)
//   POST /api/import-laptops          Local script: sends already-fetched laptops, this route just saves them.
//
// Auth for both: "Authorization: Bearer $CRON_SECRET"  (GET also accepts ?key=$CRON_SECRET)
// Needs env vars: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
// Needs the columns added by migration.sql (external_id, last_price, price_updated_at).

const BRANDS = ["Lenovo", "HP", "Dell", "ASUS", "Acer", "Apple", "Microsoft", "Samsung", "MSI", "Razer", "Gigabyte", "LG"] as const;
const LAPTOP_CATEGORY = "20352"; // Best Buy Canada "Laptops & MacBooks"
const PAGE_SIZE = 48;
const MAX_PAGES = 6; // per brand, keeps the cron inside Vercel's time limit

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

// Two laptops are duplicates when brand + model + the spec parts that contain a number
// (processor, RAM, storage, graphics, Windows) match. Colour variants only differ by colour.
// This must stay identical to laptop_dedupe_key() in setup.sql.
function dedupeKey(brand: string, model: string, specs: string | null): string {
  const parts = (specs ?? "")
    .split(" / ")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => /[0-9]/.test(p));
  const raw = `${brand.toLowerCase()}|${model.replace(/\s+/g, " ").trim().toLowerCase()}|${parts.join(" / ")}`;
  return createHash("md5").update(raw).digest("hex");
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    req.headers.get("authorization") === `Bearer ${secret}` ||
    req.nextUrl.searchParams.get("key") === secret
  );
}

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

// Low-end laptops we don't want in the tracker (HP Stream, Celeron/Pentium/N-series, 4GB RAM, eMMC, tiny storage, or under $350).
function isJunk(text: string, price: number): boolean {
  if (price < 350) return true;
  return /\bstream\b|celeron|pentium|athlon|mediatek|emmc|\bn\d{3,4}\b|\b[24]\s?gb\s+(?:ram|ddr\d?|lpddr\d?x?|memory|sdram)|\b(?:32|64)\s?gb\s+(?:ssd|emmc|storage|flash)/i.test(text);
}

function parse(brand: string, p: BestBuyProduct): ParsedLaptop | null {
  const name = (p.name ?? "").trim();
  if (!p.sku || !name) return null;

  // Only this brand, and skip used / open-box stock (the marketplace and Deal Scanner cover those).
  if (!new RegExp(`^${brand}\\b`, "i").test(name)) return null;
  if (/open box|refurbished|renewed|pre-owned/i.test(name)) return null;

  const price = p.salePrice ?? p.regularPrice;
  if (!price || price <= 0) return null;
  if (isJunk(name, price)) return null;
  const regular = p.regularPrice && p.regularPrice > 0 ? p.regularPrice : price;

  // Best Buy names look like:
  //   Lenovo IdeaPad Slim 3i 15.3" Laptop - Intel Core Ultra 7 355 - 16GB DDR5 - 512GB SSD - Windows 11 Home - Luna Grey
  // Older style puts the specs in brackets at the end, so both are handled.
  const paren = name.match(/\(([^()]*)\)\s*$/);
  const head = paren ? name.replace(/\s*\([^()]*\)\s*$/, "") : name;
  const parts = head.split(" - ").map((s) => s.trim());
  let specs: string | null = null;
  if (paren) specs = paren[1].split("/").map((s) => s.trim()).join(" / ");
  else if (parts.length > 1) specs = parts.slice(1).join(" / ");
  const model = parts[0].replace(new RegExp(`^${brand}\\s+`, "i"), "").trim();

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

async function collectFromBestBuy(errors: string[]): Promise<ParsedLaptop[]> {
  const found = new Map<string, ParsedLaptop>();

  for (const brand of BRANDS) {
    const brandRe = new RegExp(`^${brand}\\b`, "i");
    let totalPages = 1;
    for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
      try {
        const result = await fetchPage(brand, page);
        totalPages = result.totalPages;
        let brandHits = 0;
        for (const product of result.products) {
          if (brandRe.test((product.name ?? "").trim())) brandHits += 1;
          const parsed = parse(brand, product);
          if (parsed) found.set(parsed.external_id, parsed);
        }
        // Results are sorted by relevance, so once a whole page has no <brand> laptops we're done.
        if (brandHits === 0) break;
      } catch (e) {
        errors.push(`${brand} page ${page}: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }
  }

  return Array.from(found.values());
}

async function writeItems(items: ParsedLaptop[]) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const today = new Date().toISOString().split("T")[0];
  const nowIso = new Date().toISOString();
  const errors: string[] = [];
  let added = 0;
  let repriced = 0;
  let skipped = 0;
  const seenKeys = new Set<string>();

  // Cheapest first, so when several colour variants of the same laptop show up the cheapest one is kept
  const ordered = [...items].sort((a, b) => a.price - b.price);

  for (let i = 0; i < ordered.length; i += 100) {
    const chunk = ordered.slice(i, i + 100);

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

    // New laptops, minus any that are duplicates of a laptop we already have
    const freshCandidates = chunk.filter((c) => !byExternalId.has(c.external_id));
    let existingKeys = new Set<string>();
    if (freshCandidates.length > 0) {
      const { data: keyRows, error: keyErr } = await supabase
        .from("laptops")
        .select("dedupe_key")
        .in("dedupe_key", freshCandidates.map((c) => dedupeKey(c.brand, c.model, c.specs)));
      if (keyErr) errors.push(keyErr.message);
      else existingKeys = new Set((keyRows ?? []).map((r) => r.dedupe_key as string));
    }
    const fresh = freshCandidates.filter((c) => {
      const key = dedupeKey(c.brand, c.model, c.specs);
      if (existingKeys.has(key) || seenKeys.has(key)) {
        skipped += 1;
        return false;
      }
      seenKeys.add(key);
      return true;
    });

    // Insert the new ones, plus their first price point
    if (fresh.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("laptops")
        .insert(
          fresh.map((c) => ({
            external_id: c.external_id,
            brand: c.brand,
            model: c.model,
            specs: c.specs ?? null,
            store: "Best Buy",
            url: c.url,
            retail_price: c.regular_price,
            date_added: today,
            image_url: c.image_url ?? null,
            screen_size: c.screen_size ?? null,
            good_for: c.good_for ?? null,
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

  return { added, repriced, skipped, errors };
}

function isParsedLaptop(x: unknown): x is ParsedLaptop {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.external_id === "string" &&
    o.external_id.startsWith("bestbuy-ca:") &&
    typeof o.brand === "string" &&
    (BRANDS as readonly string[]).includes(o.brand) &&
    typeof o.model === "string" &&
    typeof o.url === "string" &&
    typeof o.price === "number" &&
    o.price > 0 &&
    typeof o.regular_price === "number"
  );
}

// Cron path: fetch from Best Buy here, then save
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const errors: string[] = [];
  const items = await collectFromBestBuy(errors);

  if (req.nextUrl.searchParams.get("dry") === "1") {
    return NextResponse.json({ dry: true, found: items.length, errors, sample: items.slice(0, 8) });
  }

  const result = await writeItems(items);
  return NextResponse.json({
    found: items.length,
    added: result.added,
    repriced: result.repriced,
    skippedDuplicates: result.skipped,
    errors: [...errors, ...result.errors],
  });
}

// Local-script path: the PC fetched from Best Buy, this just validates and saves
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { items?: unknown } | null;
  const raw: unknown[] = Array.isArray(body?.items) ? (body?.items as unknown[]) : [];
  const items = raw.filter(isParsedLaptop);

  const result = await writeItems(items);
  return NextResponse.json({
    received: raw.length,
    valid: items.length,
    added: result.added,
    repriced: result.repriced,
    skippedDuplicates: result.skipped,
    errors: result.errors,
  });
}
