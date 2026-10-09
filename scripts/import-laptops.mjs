// Runs on YOUR PC: pulls Lenovo / HP / Dell laptops from Best Buy Canada,
// then sends them to your site (/api/import-laptops) which saves them to Supabase.
//
//   $env:CRON_SECRET = "your-secret"
//   node scripts\import-laptops.mjs --dry     (preview only, nothing is saved)
//   node scripts\import-laptops.mjs           (import for real)

const SITE = process.env.SITE_URL || "https://www.laptopcore.ca";
const SECRET = process.env.CRON_SECRET;
const DRY = process.argv.includes("--dry");

if (!SECRET) {
  console.error('Set your secret first:  $env:CRON_SECRET = "your-secret"');
  process.exit(1);
}

const BRANDS = ["Lenovo", "HP", "Dell", "ASUS", "Acer", "Apple", "Microsoft", "Samsung", "MSI", "Razer", "Gigabyte", "LG"];
const LAPTOP_CATEGORY = "20352";
const PAGE_SIZE = 48;
const MAX_PAGES = 100; // per brand
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(brand, page) {
  const params = new URLSearchParams({
    categoryid: LAPTOP_CATEGORY,
    query: brand,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    lang: "en-CA",
    sortBy: "relevance",
    sortDir: "desc",
  });
  const res = await fetch(`https://www.bestbuy.ca/api/v2/json/search?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Best Buy returned ${res.status} for ${brand} page ${page}`);
  const json = await res.json();
  return { products: json.products ?? [], totalPages: json.totalPages ?? 1 };
}

// <parse>
// Low-end laptops we don't want in the tracker (HP Stream, Celeron/Pentium/N-series, 4GB RAM, eMMC, tiny storage, or under $350).
function isJunk(text, price) {
  if (price < 350) return true;
  return /\bstream\b|celeron|pentium|athlon|mediatek|emmc|\bn\d{3,4}\b|\b[24]\s?gb\s+(?:ram|ddr\d?|lpddr\d?x?|memory|sdram)|\b(?:32|64)\s?gb\s+(?:ssd|emmc|storage|flash)/i.test(text);
}

function parse(brand, p) {
  const name = (p.name ?? "").trim();
  if (!p.sku || !name) return null;
  if (!new RegExp(`^${brand}\\b`, "i").test(name)) return null;
  if (/open box|refurbished|renewed|pre-owned/i.test(name)) return null;

  const price = p.salePrice ?? p.regularPrice;
  if (!price || price <= 0) return null;
  if (isJunk(name, price)) return null;
  const regular = p.regularPrice && p.regularPrice > 0 ? p.regularPrice : price;

  const paren = name.match(/\(([^()]*)\)\s*$/);
  const head = paren ? name.replace(/\s*\([^()]*\)\s*$/, "") : name;
  const parts = head.split(" - ").map((s) => s.trim());
  let specs = null;
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
// </parse>

async function main() {
  const found = new Map();

  for (const brand of BRANDS) {
    const brandRe = new RegExp(`^${brand}\\b`, "i");
    let totalPages = 1;
    for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
      let result;
      try {
        result = await fetchPage(brand, page);
      } catch (e) {
        console.error(`  ${brand} page ${page} failed: ${e.message}`);
        break;
      }
      totalPages = result.totalPages;
      let brandHits = 0;
      for (const product of result.products) {
        if (brandRe.test((product.name ?? "").trim())) brandHits += 1;
        const parsed = parse(brand, product);
        if (parsed) found.set(parsed.external_id, parsed);
      }
      console.log(`${brand} page ${page}: ${brandHits} ${brand} items, ${found.size} laptops collected so far`);
      if (brandHits === 0) break;
      await sleep(400);
    }
  }

  // Cheapest first, so the cheapest colour variant of each laptop is the one that gets saved
  const items = [...found.values()].sort((a, b) => a.price - b.price);
  console.log(`\nCollected ${items.length} laptops.`);

  if (DRY) {
    console.log("Dry run, nothing saved. Sample:");
    console.log(JSON.stringify(items.slice(0, 5), null, 2));
    return;
  }

  let added = 0;
  let repriced = 0;
  let skipped = 0;
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const res = await fetch(`${SITE}/api/import-laptops`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: chunk }),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error(`Server replied ${res.status}: ${text.slice(0, 300)}`);
      process.exit(1);
    }
    if (!res.ok) {
      console.error(`Server replied ${res.status}:`, json);
      process.exit(1);
    }
    added += json.added ?? 0;
    repriced += json.repriced ?? 0;
    skipped += json.skippedDuplicates ?? 0;
    console.log(`Saved batch ${i / 100 + 1}: +${json.added} new, ${json.repriced} repriced, ${json.skippedDuplicates ?? 0} duplicates skipped`, json.errors?.length ? json.errors : "");
  }

  console.log(`\nDone. ${added} new laptops added, ${repriced} prices updated, ${skipped} duplicates skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
