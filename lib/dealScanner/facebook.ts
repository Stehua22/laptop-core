// lib/dealScanner/facebook.ts
//
// WARNING: READ THIS BEFORE ENABLING
// Facebook Marketplace has no public API. This scrapes the public search
// HTML with a headless browser. Consequences to know about:
//
//  1. It violates Facebook's Terms of Service (automated data collection).
//     Realistic worst case is your scraping IP/account getting rate-limited
//     or blocked — low risk for a low-volume personal project run from a
//     server IP, but not zero.
//  2. Facebook actively changes their markup and adds bot detection
//     (interstitials, login walls, captchas). This WILL break periodically
//     and needs maintenance — it is the least stable source of the three.
//  3. Vercel's default serverless functions can't run a full Chromium
//     browser. This needs @sparticuz/chromium + puppeteer-core, and even
//     then cold starts are slow (3-8s) and memory-hungry — you likely want
//     this route on a longer timeout / separate cron-only function, not
//     blocking the user-facing scan endpoint.
//  4. Logged-out Marketplace search often shows limited results or a login
//     wall depending on region/session. There's no clean workaround short
//     of using an authenticated session (higher ToS + account-ban risk).
//
// Recommended: run this LAST, treat failures as non-fatal (the eBay/BestBuy
// scan should still work if this throws), and don't be surprised if it
// needs re-work in a month. If it becomes too high-maintenance, dropping
// this source entirely and relying on eBay + Best Buy is a completely
// reasonable call.
//
// npm install puppeteer-core @sparticuz/chromium

import type { RawListing } from "./scoring";

const SEARCH_TERMS = ["lenovo thinkpad refurbished", "dell latitude", "hp elitebook"];
const MARKETPLACE_CITY = "toronto"; // change to your FB Marketplace city slug

export async function fetchFacebookDeals(): Promise<RawListing[]> {
  // Lazy-import so this dependency does not need to load for eBay/BestBuy-only
  // scans, and so a missing/broken chromium binary does not crash the route.
  let chromium: any;
  let puppeteer: any;
  try {
    const chromiumPkg = "@sparticuz/chromium";
    const puppeteerPkg = "puppeteer-core";
    chromium = (await import(chromiumPkg)).default;
    puppeteer = await import(puppeteerPkg);
  } catch (err) {
    console.error("Facebook scraper dependencies not installed, skipping:", err);
    return [];
  }

  const results: RawListing[] = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    );

    for (const term of SEARCH_TERMS) {
      const url = `https://www.facebook.com/marketplace/${MARKETPLACE_CITY}/search?query=${encodeURIComponent(
        term
      )}`;

      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

        // Bail out early if we hit a login wall.
        const loginWall = await page.$('[data-testid="royal_login_form"]');
        if (loginWall) {
          console.warn("Facebook login wall hit — skipping remaining terms");
          break;
        }

        const items = await page.evaluate(() => {
          const nodes = Array.from(
            document.querySelectorAll('a[href*="/marketplace/item/"]')
          );
          return nodes.slice(0, 20).map((node) => {
            const href = (node as HTMLAnchorElement).href;
            const text = node.textContent ?? "";
            const img = node.querySelector("img") as HTMLImageElement | null;
            return { href, text, imageUrl: img?.src };
          });
        });

        for (const item of items) {
          const priceMatch = item.text.match(/\$[\d,]+/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, "")) : null;
          const idMatch = item.href.match(/\/marketplace\/item\/(\d+)/);
          if (!price || !idMatch) continue;

          results.push({
            source: "facebook",
            externalId: idMatch[1],
            title: item.text.replace(/\$[\d,]+/, "").trim(),
            price,
            currency: "CAD",
            url: item.href,
            imageUrl: item.imageUrl,
            location: MARKETPLACE_CITY,
          });
        }
      } catch (err) {
        console.error(`Facebook search failed for "${term}":`, err);
      }
    }
  } catch (err) {
    console.error("Facebook scraper failed to launch browser:", err);
  } finally {
    if (browser) await browser.close();
  }

  return results;
}
