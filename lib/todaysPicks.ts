// Today's Picks: which laptop fills which slot today.
// The choice is based on the date (Toronto time), so everyone sees the same picks all day
// and they change by themselves at midnight.

export type SlotKey = "deal" | "gaming" | "budget" | "work" | "bigscreen" | "premium";

export const SLOTS: { key: SlotKey; label: string; blurb: string }[] = [
  { key: "deal", label: "Deal of the Day", blurb: "One of the biggest price drops on a laptop worth buying" },
  { key: "gaming", label: "Best for Gaming", blurb: "Gaming laptops that are on sale right now" },
  { key: "budget", label: "Best Budget Pick", blurb: "Solid laptops between $450 and $900" },
  { key: "work", label: "Best for Work", blurb: "Business-class laptops with a price cut" },
  { key: "bigscreen", label: "Best Big Screen", blurb: "15.6 inch and up, for when you want room to work" },
  { key: "premium", label: "Premium Pick", blurb: "Top-end laptops marked down" },
];

export function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// pools: for each slot, the best candidates (already sorted by discount).
// Picks one per slot, never the same laptop twice.
export function choosePicks<T extends { id: number }>(pools: Record<SlotKey, T[]>, dateKey: string) {
  const used = new Set<number>();
  const picks: { slot: (typeof SLOTS)[number]; laptop: T }[] = [];

  for (const slot of SLOTS) {
    const pool = (pools[slot.key] ?? []).filter((l) => !used.has(l.id));
    if (pool.length === 0) continue;
    const laptop = pool[hashString(`${dateKey}:${slot.key}`) % pool.length];
    used.add(laptop.id);
    picks.push({ slot, laptop });
  }

  return picks;
}
