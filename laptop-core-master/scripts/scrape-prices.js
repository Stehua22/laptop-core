const axios = require("axios");
const cheerio = require("cheerio");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Price extractors per store ─────────────────────────────────────────────
async function scrapePrice(url, brand) {
  if (!url) return null;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
  };

  try {
    const { data: html } = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(html);

    // Best Buy Canada
    if (url.includes("bestbuy.ca")) {
      const priceText =
        $('[data-automation="product-price"] .price-display__price').first().text() ||
        $(".priceWrapper .price-display").first().text() ||
        $('[class*="price"]').first().text();
      return extractNumber(priceText);
    }

    // Apple Canada
    if (url.includes("apple.com")) {
      const priceText =
        $('[class*="current_price"]').first().text() ||
        $('[class*="price"]').first().text() ||
        $('meta[property="og:price:amount"]').attr("content");
      return extractNumber(priceText);
    }

    // Lenovo
    if (url.includes("lenovo.com")) {
      const priceText =
        $('[class*="price"]').first().text() ||
        $('[id*="price"]').first().text() ||
        $('meta[property="og:price:amount"]').attr("content");
      return extractNumber(priceText);
    }

    // Dell
    if (url.includes("dell.com")) {
      const priceText =
        $('[class*="price"]').first().text() ||
        $('meta[property="og:price:amount"]').attr("content");
      return extractNumber(priceText);
    }

    // HP
    if (url.includes("hp.com")) {
      const priceText =
        $('[class*="price"]').first().text() ||
        $('meta[property="og:price:amount"]').attr("content");
      return extractNumber(priceText);
    }

    // ASUS
    if (url.includes("asus.com")) {
      const priceText =
        $('[class*="price"]').first().text() ||
        $('meta[property="og:price:amount"]').attr("content");
      return extractNumber(priceText);
    }

    // Samsung
    if (url.includes("samsung.com")) {
      const priceText =
        $('[class*="price"]').first().text() ||
        $('meta[property="og:price:amount"]').attr("content");
      return extractNumber(priceText);
    }

    // Microsoft
    if (url.includes("microsoft.com")) {
      const priceText =
        $('[class*="price"]').first().text() ||
        $('meta[property="og:price:amount"]').attr("content");
      return extractNumber(priceText);
    }

    // Fallback — try og:price meta tag
    const metaPrice = $('meta[property="og:price:amount"]').attr("content");
    if (metaPrice) return extractNumber(metaPrice);

    return null;
  } catch (err) {
    console.log(`  ⚠ Failed to scrape ${url}: ${err.message}`);
    return null;
  }
}

function extractNumber(text) {
  if (!text) return null;
  const match = text.toString().replace(/,/g, "").match(/\d+(\.\d{1,2})?/);
  if (!match) return null;
  const price = parseFloat(match[0]);
  // Sanity check — ignore if price seems wrong
  if (price < 100 || price > 10000) return null;
  return price;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Fetching laptops from Supabase...");

  const { data: laptops, error } = await supabase
    .from("laptops")
    .select("id, brand, model, url");

  if (error) {
    console.error("❌ Failed to fetch laptops:", error);
    process.exit(1);
  }

  console.log(`📋 Found ${laptops.length} laptops to check\n`);

  let updated = 0;
  let failed = 0;

  for (const laptop of laptops) {
    console.log(`Checking: ${laptop.brand} ${laptop.model}`);

    const price = await scrapePrice(laptop.url, laptop.brand);

    if (price) {
      const today = new Date().toISOString().split("T")[0];

      // Check if we already have a price entry for today
      const { data: existing } = await supabase
        .from("price_history")
        .select("id")
        .eq("laptop_id", laptop.id)
        .eq("recorded_at", today)
        .single();

      if (existing) {
        // Update today's entry
        await supabase
          .from("price_history")
          .update({ price })
          .eq("id", existing.id);
        console.log(`  ✅ Updated: $${price}`);
      } else {
        // Insert new entry
        await supabase.from("price_history").insert({
          laptop_id: laptop.id,
          price,
          recorded_at: today,
        });
        console.log(`  ✅ Inserted: $${price}`);
      }
      updated++;
    } else {
      console.log(`  ❌ Could not get price`);
      failed++;
    }

    // Wait 2 seconds between requests to avoid getting blocked
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n✅ Done! Updated: ${updated}, Failed: ${failed}`);
}

main();