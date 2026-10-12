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
  // A "regular price" far above the real price is a pricing trick, not a discount: ignore it
  const listed = p.regularPrice && p.regularPrice > 0 ? p.regularPrice : price;
  const regular = listed > price * 1.6 ? price : listed;

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

// The same laptop is often listed several times (colours, third-party sellers, refurbished stock priced like new).
// Keep ONE listing per laptop, and never an outlier: a listing far below the others (under 70% of their median)
// is far more likely to be refurbished, used or mislabeled than a real bargain, so it never wins.
function dedupeKey(brand, model, specs) {
  const parts = (specs ?? "").split(" / ").map((x) => x.trim().toLowerCase()).filter((x) => /[0-9]/.test(x));
  return `${brand.toLowerCase()}|${model.replace(/\s+/g, " ").trim().toLowerCase()}|${parts.join(" / ")}`;
}

function pickRepresentatives(items) {
  const groups = new Map();
  for (const item of items) {
    const key = dedupeKey(item.brand, item.model, item.specs);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const chosen = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      chosen.push(group[0]);
      continue;
    }
    const prices = group.map((g) => g.price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    chosen.push(group.filter((g) => g.price >= median * 0.7).sort((a, b) => a.price - b.price)[0]);
  }
  return chosen;
}

// What fields does Best Buy send? (printed with --dry or --fields, to help spot third-party / refurbished listings)
const fieldInfo = new Map();
function recordFields(product) {
  for (const [key, value] of Object.entries(product)) {
    let info = fieldInfo.get(key);
    if (!info) fieldInfo.set(key, (info = { count: 0, values: new Map() }));
    info.count += 1;
    if (/seller|market|vendor|condition|open|refurb|clearance|availab|type/i.test(key) && ["string", "boolean", "number"].includes(typeof value)) {
      const v = String(value).slice(0, 40);
      info.values.set(v, (info.values.get(v) ?? 0) + 1);
    }
  }
}

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
        recordFields(product);
        if (brandRe.test((product.name ?? "").trim())) brandHits += 1;
        const parsed = parse(brand, product);
        if (parsed) found.set(parsed.external_id, parsed);
      }
      console.log(`${brand} page ${page}: ${brandHits} ${brand} items, ${found.size} laptops collected so far`);
      if (brandHits === 0) break;
      await sleep(400);
    }
  }

  // One listing per laptop (never a suspiciously cheap outlier), cheapest first
  const everything = [...found.values()];
  const items = pickRepresentatives(everything).sort((a, b) => a.price - b.price);
  console.log(`\nCollected ${everything.length} listings, ${items.length} distinct laptops.`);

  if (DRY || process.argv.includes("--fields")) {
    console.log("\nFields Best Buy sends:", [...fieldInfo.keys()].join(", "));
    for (const [key, info] of fieldInfo) {
      if (info.values.size > 0 && info.values.size <= 12) console.log(`  ${key}: ${[...info.values].map(([v, n]) => `${v} x${n}`).join(", ")}`);
    }
    const cheapest = [...everything].sort((a, b) => a.price - b.price).slice(0, 12);
    console.log("\nThe 12 cheapest listings found:");
    for (const c of cheapest) console.log(`  $${c.price}  ${c.brand} ${c.model.slice(0, 50)}  |  ${(c.specs ?? "").slice(0, 60)}`);
  }

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

  // Refresh what the tracker's smart filters use (RAM, storage, processor, graphics, value) for every laptop
  console.log("\nRefreshing the smart filter data...");
  try {
    const er = await fetch(`${SITE}/api/enrich-laptops`, { headers: { Authorization: `Bearer ${SECRET}` }, signal: AbortSignal.timeout(90000) });
    const ej = await er.json().catch(() => null);
    if (er.ok && ej) console.log(`Done. ${ej.updated} of ${ej.laptops} laptops updated.`, ej.errors && ej.errors.length ? ej.errors : "");
    else console.log(`Could not refresh it (the server replied ${er.status}). You can run it by opening ${SITE}/api/enrich-laptops?key=YOUR_SECRET in a browser.`);
  } catch (e) {
    console.log("Could not refresh it:", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
