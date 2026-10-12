// Smarter tracker filters:
//   - parseSmartQuery(): understands plain English in the search box ("gaming laptop under $1500 16gb")
//   - fetchLaptopsSmart(): one page of laptops with all filters applied in the database
// The spec filters (RAM, storage, processor, graphics, value) use columns filled in by /api/enrich-laptops.

import { supabase, LAPTOP_SELECT, shapeLaptop, DEFAULT_FILTERS } from "@/lib/supabase";
import type { Laptop, LaptopFilters } from "@/lib/supabase";

export type SmartFilters = LaptopFilters & {
  ramMin: string; // "" | "8" | "16" | "32"
  storageMin: string; // "" | "256" | "512" | "1000"
  cpuVendor: string; // "" | "intel" | "amd" | "apple" | "qualcomm"
  gpu: string; // "" | "dedicated" | "strong" | "integrated"
  modernOnly: boolean; // processors from 2022 or newer
  dealsOnly: boolean; // priced clearly under what the specs usually cost
};

export const DEFAULT_SMART: SmartFilters = {
  ...DEFAULT_FILTERS,
  ramMin: "",
  storageMin: "",
  cpuVendor: "",
  gpu: "",
  modernOnly: false,
  dealsOnly: false,
};

// "Good for" works from the specs, so it covers every laptop, not just ones someone tagged by hand.
// Each rule is a PostgREST filter; a laptop matches if it has the tag OR meets the rule.
const BUSINESS_MODELS = ["thinkpad", "latitude", "elitebook", "probook", "thinkbook", "vostro", "expertbook", "zbook"]
  .map((m) => `model.ilike.%${m}%`)
  .join(",");

export const USE_CASE_RULES: Record<string, string> = {
  gaming: "gpu_tier.gte.1",
  programming: "and(ram_gb.gte.16,storage_gb.gte.512,cpu_perf.gte.36)",
  school: "and(current_price.lte.1100,ram_gb.gte.8,storage_gb.gte.256,cpu_year.gte.2022)",
  video: "and(ram_gb.gte.16,cpu_perf.gte.50,or(gpu_tier.gte.2,cpu_vendor.eq.apple))",
  business: BUSINESS_MODELS,
  basic: "current_price.lte.900",
  data: "and(ram_gb.gte.32,cpu_perf.gte.50)",
  engineering: "and(ram_gb.gte.16,cpu_perf.gte.50,gpu_tier.gte.1)",
  trading: "and(ram_gb.gte.16,cpu_perf.gte.40)",
};

// Older laptops were tagged by hand with words like "student" and "home"
const TAG_ALIASES: Record<string, string[]> = { school: ["school", "student"], basic: ["basic", "home"] };

export async function fetchLaptopsSmart(
  filters: SmartFilters,
  page: number,
  perPage: number
): Promise<{ laptops: Laptop[]; total: number }> {
  let q = supabase.from("laptops").select(LAPTOP_SELECT, { count: "exact" });

  // Every word has to match the brand, model or specs ("lenovo legion 5" works)
  const words = filters.search
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[%,()*"'\\]/g, ""))
    .filter(Boolean);
  for (const w of words) {
    q = q.or(`brand.ilike.%${w}%,model.ilike.%${w}%,specs.ilike.%${w}%`);
  }

  if (filters.brand) q = q.eq("brand", filters.brand);

  if (filters.goodFor) {
    const rule = USE_CASE_RULES[filters.goodFor];
    const tags = (TAG_ALIASES[filters.goodFor] ?? [filters.goodFor]).map((t) => `good_for.ilike.%${t}%`).join(",");
    q = rule ? q.or(`${tags},${rule}`) : q.or(tags);
  }

  if (filters.screen === "small") q = q.lte("screen_size", 13);
  else if (filters.screen === "medium") q = q.gt("screen_size", 13).lt("screen_size", 15);
  else if (filters.screen === "large") q = q.gte("screen_size", 15).lt("screen_size", 17);
  else if (filters.screen === "xlarge") q = q.gte("screen_size", 17);

  if (filters.weight === "ultralight") q = q.lt("weight_kg", 1.2);
  else if (filters.weight === "light") q = q.gte("weight_kg", 1.2).lt("weight_kg", 1.6);
  else if (filters.weight === "medium") q = q.gte("weight_kg", 1.6).lt("weight_kg", 2.2);
  else if (filters.weight === "heavy") q = q.gte("weight_kg", 2.2);

  const min = parseFloat(filters.priceMin);
  const max = parseFloat(filters.priceMax);
  if (!isNaN(min)) q = q.gte("current_price", min);
  if (!isNaN(max)) q = q.lte("current_price", max);

  const ram = parseFloat(filters.ramMin);
  const storage = parseFloat(filters.storageMin);
  if (!isNaN(ram)) q = q.gte("ram_gb", ram);
  if (!isNaN(storage)) q = q.gte("storage_gb", storage);
  if (filters.cpuVendor) q = q.eq("cpu_vendor", filters.cpuVendor);

  if (filters.gpu === "dedicated") q = q.gte("gpu_tier", 1);
  else if (filters.gpu === "strong") q = q.gte("gpu_tier", 2);
  else if (filters.gpu === "integrated") q = q.eq("gpu_tier", 0);

  if (filters.modernOnly) q = q.gte("cpu_year", 2022);
  // Credible deals only: clearly under the usual price for the specs, but not so far under it that it looks fake
  if (filters.dealsOnly) q = q.gte("value_pct", 10).lte("value_pct", 40).gte("current_price", 400);

  const sorted =
    filters.sortBy === "priceAsc"
      ? q.order("current_price", { ascending: true, nullsFirst: false }).order("id", { ascending: false })
      : filters.sortBy === "priceDesc"
      ? q.order("current_price", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
      : filters.sortBy === "value"
      ? q.order("value_pct", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
      : filters.sortBy === "perf"
      ? q.order("cpu_perf", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
      : filters.sortBy === "chip"
      ? q
          .order("cpu_year", { ascending: false, nullsFirst: false })
          .order("cpu_perf", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false })
      : q.order("created_at", { ascending: false }).order("id", { ascending: false });

  const from = (page - 1) * perPage;
  const { data, error, count } = await sorted.range(from, from + perPage - 1);
  if (error) throw error;

  return { laptops: (data ?? []).map(shapeLaptop), total: count ?? 0 };
}

// ---------------------------------------------------------------------------------------------
// Plain-English search
// ---------------------------------------------------------------------------------------------

export type Chip = { field: keyof SmartFilters; label: string; match: string };
export type SmartParse = { patch: Partial<SmartFilters>; text: string; chips: Chip[] };

const HOLE = "\u0001"; // stands in for text we've already understood, so later patterns can't straddle it
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toNum = (s: string) => Number(s.replace(/,/g, ""));
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const withK = (value: string, k: string | undefined) => toNum(value) * (k ? 1000 : 1);

export function removePhrase(query: string, phrase: string): string {
  if (!phrase) return query;
  return query.replace(new RegExp(esc(phrase), "i"), " ").replace(/\s{2,}/g, " ").trim();
}

const nearest = (n: number, steps: number[]) => steps.find((s) => n <= s) ?? steps[steps.length - 1];
const storageLabel = (gb: number) => `${gb >= 1000 ? gb / 1000 + "TB" : gb + "GB"}+ storage`;

const SCREEN_LABEL: Record<string, string> = { small: '13" or smaller', medium: '14" screen', large: '15-16" screen', xlarge: '17"+ screen' };
const GOOD_FOR_LABEL: Record<string, string> = {
  gaming: "Gaming", school: "School", business: "Work", programming: "Programming", video: "Video editing",
  data: "Data science", engineering: "Engineering", trading: "Trading", basic: "Everyday use",
};

const USE_CASES: { re: RegExp; key: string }[] = [
  { re: /\b(?:gaming|gamer|games)\b/i, key: "gaming" },
  { re: /\b(?:students?|school|college|university|homework)\b/i, key: "school" },
  { re: /\b(?:business|office|professional|work(?:ing)?)\b/i, key: "business" },
  { re: /\b(?:programming|coding|developers?|software\s+engineer(?:ing)?)\b/i, key: "programming" },
  { re: /\b(?:video\s+editing|video|editing|creators?|content\s+creation|photoshop|premiere)\b/i, key: "video" },
  { re: /\b(?:data\s+science|machine\s+learning)\b/i, key: "data" },
  { re: /\b(?:engineering|cad|autocad|solidworks)\b/i, key: "engineering" },
  { re: /\b(?:trading|traders?)\b/i, key: "trading" },
  { re: /\b(?:basic|everyday|browsing|simple)\b/i, key: "basic" },
];

const STOP_WORDS =
  /\b(?:laptops?|notebooks?|computers?|pcs?|a|an|the|for|with|and|me|my|i|need|want|looking|find|show|something|good|great|best|that|has|have|in|of|to|is|are|please)\b/gi;

export function parseSmartQuery(raw: string, brands: string[]): SmartParse {
  const patch: Partial<SmartFilters> = {};
  const chips: Chip[] = [];
  let rest = raw;

  // Finds the first match that passes `ok`, removes it from the text and returns it
  const take = (re: RegExp, ok?: (m: RegExpMatchArray) => boolean): RegExpMatchArray | null => {
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let found: RegExpExecArray | null;
    while ((found = global.exec(rest)) !== null) {
      if (found[0] === "") {
        global.lastIndex += 1;
        continue;
      }
      if (ok && !ok(found)) continue;
      const at = found.index;
      rest = rest.slice(0, at) + HOLE + rest.slice(at + found[0].length);
      return found;
    }
    return null;
  };
  const add = (field: keyof SmartFilters, label: string, m: RegExpMatchArray) => {
    chips.push({ field, label, match: m[0].trim() });
  };
  const price = (m: RegExpMatchArray) => withK(m[1], m[2]);

  // ---- price ranges ----
  let m = take(/\bbetween\s+\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\s+and\s+\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i);
  if (m) {
    const lo = withK(m[1], m[2]);
    const hi = withK(m[3], m[4]);
    if (lo > 0 && hi > lo) {
      patch.priceMin = String(Math.round(lo));
      patch.priceMax = String(Math.round(hi));
      add("priceMax", `${money(lo)} to ${money(hi)}`, m);
    }
  }
  if (patch.priceMax === undefined) {
    m = take(
      /\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*(?:-|to|\u2013)\s*\$?\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?/i,
      (x) => withK(x[3], x[4]) > withK(x[1], x[2])
    );
    if (m) {
      patch.priceMin = String(Math.round(withK(m[1], m[2])));
      patch.priceMax = String(Math.round(withK(m[3], m[4])));
      add("priceMax", `${money(withK(m[1], m[2]))} to ${money(withK(m[3], m[4]))}`, m);
    }
  }

  // ---- storage and memory (before prices like "under 1500" can be confused with them) ----
  m = take(/(?:\b(?:at least|min(?:imum)?|with)\s+)?\b(\d+(?:\.\d+)?)\s*(tb|gb)\+?\s*(?:ssd|nvme|storage|hdd|drive)\b/i);
  if (m) {
    const gb = toNum(m[1]) * (m[2].toLowerCase() === "tb" ? 1000 : 1);
    const step = nearest(gb, [256, 512, 1000, 2000]);
    patch.storageMin = String(step);
    add("storageMin", storageLabel(step), m);
  }
  m = take(/(?:\b(?:at least|min(?:imum)?|with)\s+)?\b(\d+)\s*gb\+?\s*(?:of\s+)?(?:ram|memory)\b/i);
  if (m) {
    const step = nearest(toNum(m[1]), [8, 16, 32, 64]);
    patch.ramMin = String(step);
    add("ramMin", `${step}GB+ RAM`, m);
  }
  if (!patch.storageMin) {
    m = take(/\b(\d(?:\.\d+)?)\s*tb\b\+?/i);
    if (m) {
      const step = nearest(toNum(m[1]) * 1000, [256, 512, 1000, 2000]);
      patch.storageMin = String(step);
      add("storageMin", storageLabel(step), m);
    }
  }
  m = take(/\b(\d+)\s*gb\b\+?/i, (x) => {
    const n = toNum(x[1]);
    return (n <= 64 && !patch.ramMin) || (n >= 128 && !patch.storageMin);
  });
  if (m) {
    const n = toNum(m[1]);
    if (n <= 64) {
      const step = nearest(n, [8, 16, 32, 64]);
      patch.ramMin = String(step);
      add("ramMin", `${step}GB+ RAM`, m);
    } else {
      const step = nearest(n, [256, 512, 1000, 2000]);
      patch.storageMin = String(step);
      add("storageMin", storageLabel(step), m);
    }
  }

  // ---- screen size ----
  m = take(
    /\b(?:(\d{2}(?:\.\d)?)\s*(?:-|to)\s*)?(\d{2}(?:\.\d)?)\s*(?:-?\s*inch(?:es)?|in\b|")/i,
    (x) => toNum(x[2]) >= 11 && toNum(x[2]) <= 18
  );
  if (m) {
    // "15-16 inch" means somewhere in between
    const n = m[1] ? (toNum(m[1]) + toNum(m[2])) / 2 : toNum(m[2]);
    const key = n <= 13.5 ? "small" : n <= 14.9 ? "medium" : n <= 16.9 ? "large" : "xlarge";
    patch.screen = key;
    add("screen", SCREEN_LABEL[key], m);
  }

  // ---- more price patterns ----
  if (patch.priceMax === undefined) {
    m = take(
      /(?:\b(?:under|below|less than|cheaper than|max(?:imum)?|up to|within|no more than)|<=?)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i,
      (x) => price(x) >= 100
    );
    if (m) {
      patch.priceMax = String(Math.round(price(m)));
      add("priceMax", `Under ${money(price(m))}`, m);
    }
  }
  if (patch.priceMin === undefined) {
    m = take(
      /(?:\b(?:over|above|more than|at least|min(?:imum)?|from|starting at)|>=?)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i,
      (x) => price(x) >= 100
    );
    if (m) {
      patch.priceMin = String(Math.round(price(m)));
      add("priceMin", `Over ${money(price(m))}`, m);
    }
  }
  if (patch.priceMax === undefined && patch.priceMin === undefined) {
    m = take(/(?:\b(?:around|about|approx(?:imately)?|roughly)|~)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i, (x) => price(x) >= 100);
    if (m) {
      const mid = price(m);
      patch.priceMin = String(Math.round(mid * 0.85));
      patch.priceMax = String(Math.round(mid * 1.15));
      add("priceMax", `About ${money(mid)}`, m);
    }
  }
  if (patch.priceMax === undefined && patch.priceMin === undefined) {
    m = take(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?/i, (x) => price(x) >= 100);
    if (m) {
      patch.priceMax = String(Math.round(price(m)));
      add("priceMax", `Under ${money(price(m))}`, m);
    }
  }

  // ---- brand ----
  const sortedBrands = [...brands].sort((a, b) => b.length - a.length);
  for (const b of sortedBrands) {
    m = take(new RegExp("\\b" + esc(b) + "\\b", "i"));
    if (m) {
      patch.brand = b;
      add("brand", b, m);
      break;
    }
  }
  if (!patch.brand) {
    const apple = brands.find((b) => b.toLowerCase() === "apple");
    m = apple ? take(/\bmac(?:book)?s?\b/i) : null;
    if (m && apple) {
      patch.brand = apple;
      add("brand", apple, m);
    }
  }

  // ---- processor and graphics ----
  if ((m = take(/\bintel\b/i))) {
    patch.cpuVendor = "intel";
    add("cpuVendor", "Intel", m);
  } else if ((m = take(/\bamd\b/i))) {
    patch.cpuVendor = "amd";
    add("cpuVendor", "AMD", m);
  } else if ((m = take(/\bsnapdragon\b/i))) {
    patch.cpuVendor = "qualcomm";
    add("cpuVendor", "Snapdragon", m);
  }

  if ((m = take(/\b(?:strong|powerful|high[- ]end)\s+(?:gpu|graphics)\b/i))) {
    patch.gpu = "strong";
    add("gpu", "Strong graphics", m);
  } else if ((m = take(/\b(?:dedicated|discrete)(?:\s+(?:gpu|graphics(?:\s+card)?))?\b/i))) {
    patch.gpu = "dedicated";
    add("gpu", "Dedicated graphics", m);
  } else if ((m = take(/\b(?:rtx|gtx)\b(?!\s*\d)/i))) {
    patch.gpu = "dedicated";
    add("gpu", "Dedicated graphics", m);
  } else if ((m = take(/\bintegrated(?:\s+(?:gpu|graphics))?\b/i))) {
    patch.gpu = "integrated";
    add("gpu", "Integrated graphics", m);
  }

  // ---- what it's for ----
  for (const uc of USE_CASES) {
    m = take(uc.re);
    if (m) {
      patch.goodFor = uc.key;
      add("goodFor", GOOD_FOR_LABEL[uc.key], m);
      break;
    }
  }

  // ---- deals, newness, speed, budget ----
  if ((m = take(/\b(?:best\s+value|good\s+deals?|great\s+deals?|deals?|on\s+sale|discounted|bargains?)\b/i))) {
    patch.dealsOnly = true;
    if (/best\s+value/i.test(m[0])) patch.sortBy = "value";
    add("dealsOnly", "Priced under usual", m);
  }
  if ((m = take(/\b(?:latest|newest|modern|current[- ]gen(?:eration)?|up[- ]to[- ]date)\b/i))) {
    patch.modernOnly = true;
    add("modernOnly", "Modern processor", m);
  }
  if ((m = take(/\b(?:fastest|most\s+powerful|high[- ]performance|best\s+performance)\b/i))) {
    patch.sortBy = "perf";
    add("sortBy", "Fastest first", m);
  }
  if ((m = take(/\b(?:cheap|budget|affordable|inexpensive|low[- ]cost)\b/i))) {
    if (patch.priceMax === undefined) {
      patch.priceMax = "800";
      add("priceMax", "Budget (under $800)", m);
    }
  }

  const text = rest
    .replace(new RegExp(HOLE, "g"), " ")
    .replace(STOP_WORDS, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { patch, text, chips };
}
