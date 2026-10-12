// What counts as a deal on the Deals page.
//
// A laptop is a deal when its price is clearly below what a laptop with the same specs normally costs
// (value_pct, filled in by /api/enrich-laptops), not just below the store's own "regular price", which is
// easy to inflate. Hand-added laptops keep their own markdown, as long as it is believable.

import { supabase } from "@/lib/supabase";
import type { Laptop } from "@/lib/supabase";

export type DealLaptop = Laptop & { value_pct?: number | null; discount_pct?: number | null };

const COLUMNS =
  "id, brand, model, specs, store, url, image_url, retail_price, current_price, discount_pct, value_pct, cpu_year, external_id, created_at";

export async function loadDeals(): Promise<DealLaptop[]> {
  const [auto, manual] = await Promise.all([
    // Imported laptops: 10% to 40% under the usual price for their specs, modern, and not suspiciously cheap
    supabase
      .from("laptops")
      .select(COLUMNS)
      .gte("value_pct", 10)
      .lte("value_pct", 40)
      .gte("current_price", 400)
      .gte("cpu_year", 2022)
      .order("value_pct", { ascending: false })
      .limit(150),
    // Hand-added laptops: their own markdown counts, but an old processor or a price that isn't
    // actually under the usual price for its specs does not
    supabase
      .from("laptops")
      .select(COLUMNS)
      .is("external_id", null)
      .gt("discount_pct", 0)
      .lte("discount_pct", 60)
      .or("and(cpu_year.gte.2022,value_pct.gte.5),and(cpu_year.is.null,discount_pct.lte.35)")
      .limit(200),
  ]);

  const byId = new Map<number, DealLaptop>();
  const rows = ([] as unknown[]).concat(auto.data ?? [], manual.data ?? []) as DealLaptop[];
  for (const row of rows) byId.set(row.id, row);
  return Array.from(byId.values());
}

export function dealInfo(l: DealLaptop) {
  const price = Number(l.current_price);
  const retail = Number(l.retail_price);
  const value = l.value_pct === null || l.value_pct === undefined ? null : Number(l.value_pct);
  const markdown = l.discount_pct === null || l.discount_pct === undefined ? 0 : Number(l.discount_pct);
  return {
    price,
    retail,
    value, // % under the usual price for its specs (null when we couldn't compare)
    markdown, // % under the store's regular price
    showWas: retail > price && markdown >= 5 && markdown <= 45, // only show a regular price that is believable
    strength: value !== null ? value : Math.min(markdown, 35),
    saving: value !== null && value > 0 ? Math.round((price * value) / (100 - value)) : Math.max(0, Math.round(retail - price)),
  };
}

export function sortDeals(list: DealLaptop[], sortBy: string): DealLaptop[] {
  return [...list].sort((a, b) => {
    const A = dealInfo(a);
    const B = dealInfo(b);
    let diff = 0;
    if (sortBy === "discount") diff = (B.showWas ? B.markdown : 0) - (A.showWas ? A.markdown : 0) || B.strength - A.strength;
    else if (sortBy === "savings") diff = B.saving - A.saving;
    else if (sortBy === "price") diff = A.price - B.price;
    else diff = B.strength - A.strength; // "value"
    // Stable tiebreaker so equal-ranked deals don't reorder between renders/reloads
    return diff !== 0 ? diff : a.id - b.id;
  });
}
