import { supabase } from "@/lib/supabase";
import { SLOTS, choosePicks } from "@/lib/todaysPicks";
import { scoreAll, buildPools, applyHistory, type RawLaptop } from "@/lib/picksEngine";

const COLUMNS =
  "id, brand, model, specs, store, url, image_url, retail_price, current_price, discount_pct, screen_size, good_for";

// Every laptop with a price, read 1000 at a time (all pages at once)
export async function fetchAllForPicks(): Promise<RawLaptop[]> {
  const PAGE = 1000;
  const { count, error: countError } = await supabase
    .from("laptops")
    .select("id", { count: "exact", head: true })
    .gt("current_price", 0);
  if (countError) throw countError;

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const pages = await Promise.all(
    Array.from({ length: pageCount }, async (_, i) => {
      const { data, error } = await supabase
        .from("laptops")
        .select(COLUMNS)
        .gt("current_price", 0)
        .order("id", { ascending: true })
        .range(i * PAGE, i * PAGE + PAGE - 1);
      if (error) throw error;
      return (data ?? []) as unknown as RawLaptop[];
    })
  );
  return ([] as RawLaptop[]).concat(...pages);
}

async function fetchHistory(ids: number[]): Promise<Map<number, { min: number; count: number }>> {
  const out = new Map<number, { min: number; count: number }>();
  if (ids.length === 0) return out;
  const { data, error } = await supabase.from("price_history").select("laptop_id, price").in("laptop_id", ids);
  if (error || !data) return out; // history is a bonus, never worth failing the page over
  for (const row of data as { laptop_id: number; price: number }[]) {
    const h = out.get(row.laptop_id);
    const price = Number(row.price);
    if (h) {
      h.min = Math.min(h.min, price);
      h.count += 1;
    } else {
      out.set(row.laptop_id, { min: price, count: 1 });
    }
  }
  return out;
}

export async function loadPicks(dateKey: string) {
  const raw = await fetchAllForPicks();
  const { scored, model } = scoreAll(raw);
  const slotKeys = SLOTS.map((s) => s.key);
  let pools = buildPools(scored, slotKeys);

  const ids = Array.from(new Set(slotKeys.flatMap((k) => pools[k].map((s) => s.id))));
  pools = applyHistory(pools, await fetchHistory(ids));

  return { total: raw.length, scored, model, pools, picks: choosePicks(pools, dateKey) };
}
