// The brain behind Today's Picks.
//
// A laptop only qualifies if:
//   1. it has a modern processor (2022 or newer), at least 8GB RAM and 256GB storage
//   2. its price is clearly BELOW what a laptop with those specs normally costs
//   3. the price looks believable (not 3x the usual, not a suspicious 60% under)
//
// "Normally costs" is learned from the whole catalog: how much each extra bit of processor speed,
// RAM, storage and graphics adds to a price, fitted on every laptop we track (ignoring the odd
// mispriced listing). The "regular price" a store shows is mostly ignored, because it is easy to inflate.

import { parseSpecs, type ParsedSpecs } from "./laptopSpecs";
import type { SlotKey } from "./todaysPicks";

export type RawLaptop = {
  id: number;
  brand: string;
  model: string;
  specs: string | null;
  store: string | null;
  url: string;
  image_url: string | null;
  retail_price: number;
  current_price: number | null;
  discount_pct: number | null;
  screen_size: number | null;
  good_for: string | null;
};

export type ExcludeReason =
  | "unknown-cpu"
  | "entry-cpu"
  | "old-cpu"
  | "unknown-memory"
  | "low-ram"
  | "low-storage"
  | "no-peers"
  | "price-looks-wrong"
  | "not-cheaper";

export const REASON_TEXT: Record<ExcludeReason, string> = {
  "unknown-cpu": "Couldn't tell which processor it has",
  "entry-cpu": "Entry-level processor",
  "old-cpu": "Processor is from before 2022",
  "unknown-memory": "Couldn't read the RAM or storage",
  "low-ram": "Less than 8GB RAM",
  "low-storage": "Less than 256GB storage",
  "no-peers": "Too few similar laptops to compare against",
  "price-looks-wrong": "Price looks wrong next to similar laptops",
  "not-cheaper": "Not clearly cheaper than similar laptops",
};

export type Scored = RawLaptop & {
  price: number;
  parsed: ParsedSpecs;
  peerMedian: number | null; // what a laptop with these specs normally costs
  peerCount: number; // how many laptops that estimate is based on
  below: number | null; // 0.25 means 25% below the typical price
  score: number;
  reason: ExcludeReason | null; // null = qualifies for Today's Picks
  lowestEver: boolean;
};

export const MIN_YEAR = 2022;
const MIN_RAM = 8;
const MIN_STORAGE = 256;
const MIN_PEERS = 6;
const MIN_BELOW = 0.07;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function basicReason(p: ParsedSpecs, price: number): ExcludeReason | null {
  if (!price || price <= 0) return "price-looks-wrong";
  if (!p.cpu) return "unknown-cpu";
  if (p.cpu.vendor === "entry") return "entry-cpu";
  if (p.cpu.year < MIN_YEAR) return "old-cpu";
  if (p.ramGb === null || p.storageGb === null) return "unknown-memory";
  if (p.ramGb < MIN_RAM) return "low-ram";
  if (p.storageGb < MIN_STORAGE) return "low-storage";
  return null;
}

export type PriceModel = {
  n: number; // laptops the model learned from
  sigma: number; // typical unexplained price spread (0.10 = about 10%)
  needBelow: number; // how far under the expected price a laptop must be to count as a deal
  perDoubleRam: number; // e.g. 0.12 = doubling the RAM adds about 12%
  perDoubleStorage: number;
  per10Perf: number; // price change for each +10 on the processor speed score
  gpu: number[]; // price premium for graphics tier 1..4
  apple: number;
  business: number;
  ready: boolean;
};

const BUSINESS_LINE = /thinkpad|latitude|elitebook|probook|vostro|thinkbook|expertbook|zbook|precision/i;

function featuresOf(p: ParsedSpecs, name: string): number[] {
  const t = p.gpu.tier;
  return [
    1,
    (p.cpu ? p.cpu.perf : 0) / 10,
    Math.log2((p.ramGb ?? 8) / 8),
    Math.log2((p.storageGb ?? 256) / 256),
    t === 1 ? 1 : 0,
    t === 2 ? 1 : 0,
    t === 3 ? 1 : 0,
    t === 4 ? 1 : 0,
    p.cpu && p.cpu.vendor === "apple" ? 1 : 0,
    BUSINESS_LINE.test(name) ? 1 : 0,
  ];
}

// Solves A x = b (Gaussian elimination with partial pivoting)
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
    x[r] = sum / M[r][r];
  }
  return x;
}

function fit(X: number[][], y: number[], rows: number[]): number[] | null {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b = new Array<number>(k).fill(0);
  for (const i of rows) {
    for (let a = 0; a < k; a++) {
      b[a] += X[i][a] * y[i];
      for (let c = 0; c < k; c++) A[a][c] += X[i][a] * X[i][c];
    }
  }
  for (let a = 1; a < k; a++) A[a][a] += 1e-3; // tiny ridge so an unused feature can't break the fit
  return solve(A, b);
}

const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

export function scoreAll(laptops: RawLaptop[]): { scored: Scored[]; model: PriceModel } {
  const base = laptops.map((l) => {
    const price = l.current_price ?? l.retail_price;
    const parsed = parseSpecs(`${l.model} ${l.specs ?? ""}`);
    return { l, price, parsed, reason: basicReason(parsed, price), x: featuresOf(parsed, `${l.brand} ${l.model}`) };
  });

  // Learn what specs cost, from every laptop that has readable specs
  const rows: number[] = [];
  base.forEach((b, i) => {
    if (!b.reason) rows.push(i);
  });
  const X = base.map((b) => b.x);
  const y = base.map((b) => (b.price > 0 ? Math.log(b.price) : 0));

  const model: PriceModel = {
    n: 0, sigma: 0, needBelow: MIN_BELOW, perDoubleRam: 0, perDoubleStorage: 0, per10Perf: 0,
    gpu: [0, 0, 0, 0], apple: 0, business: 0, ready: false,
  };

  let beta: number[] | null = rows.length >= 60 ? fit(X, y, rows) : null;
  let kept = rows;
  if (beta) {
    // Refit a few times without the odd mispriced listings, so they can't drag "normal" up or down
    for (let round = 0; round < 3; round++) {
      const current = beta;
      const resid = rows.map((i) => y[i] - dot(current, X[i]));
      const center = median(resid);
      const mad = median(resid.map((r) => Math.abs(r - center))) * 1.4826;
      const limit = 2.5 * Math.max(mad, 0.04);
      const next = rows.filter((_, j) => Math.abs(resid[j] - center) <= limit);
      if (next.length < 50) break;
      const refit = fit(X, y, next);
      if (!refit) break;
      beta = refit;
      kept = next;
    }
    const final = beta;
    const resid = kept.map((i) => y[i] - dot(final, X[i]));
    const center = median(resid);
    model.n = kept.length;
    model.sigma = median(resid.map((r) => Math.abs(r - center))) * 1.4826;
    model.needBelow = Math.min(0.2, Math.max(MIN_BELOW, model.sigma));
    model.per10Perf = Math.exp(final[1]) - 1;
    model.perDoubleRam = Math.exp(final[2]) - 1;
    model.perDoubleStorage = Math.exp(final[3]) - 1;
    model.gpu = [Math.exp(final[4]) - 1, Math.exp(final[5]) - 1, Math.exp(final[6]) - 1, Math.exp(final[7]) - 1];
    model.apple = Math.exp(final[8]) - 1;
    model.business = Math.exp(final[9]) - 1;
    model.ready = true;
  }

  // The model is only trusted for kinds of laptop it has seen enough of
  const seen = { gpu: [0, 0, 0, 0, 0], apple: 0 };
  for (const i of kept) {
    seen.gpu[base[i].parsed.gpu.tier] += 1;
    if (base[i].parsed.cpu?.vendor === "apple") seen.apple += 1;
  }

  const scored = base.map(({ l, price, parsed, reason, x }) => {
    const result: Scored = {
      ...l,
      price,
      parsed,
      peerMedian: null,
      peerCount: 0,
      below: null,
      score: -1,
      reason,
      lowestEver: false,
    };
    if (reason) return result;

    const wellCovered =
      model.ready && seen.gpu[parsed.gpu.tier] >= 8 && (parsed.cpu?.vendor !== "apple" || seen.apple >= 6);
    if (!wellCovered || !beta) {
      result.reason = "no-peers";
      return result;
    }

    const expected = Math.exp(dot(beta, x));
    result.peerMedian = expected;
    result.peerCount = model.n;

    const ratio = price / expected;
    result.below = 1 - ratio;
    if (ratio > 3 || ratio < 0.4) {
      result.reason = "price-looks-wrong";
      return result;
    }
    if (result.below < model.needBelow) {
      result.reason = "not-cheaper";
      return result;
    }

    // Ranking: how far below normal it is, plus small bonuses for newer chips and a believable discount
    const year = parsed.cpu ? parsed.cpu.year : MIN_YEAR;
    const modern = Math.min(0.06, Math.max(0, (year - MIN_YEAR) * 0.02));
    const d = l.discount_pct ?? 0;
    const discount = d >= 5 && d <= 45 ? (d / 100) * 0.15 : 0;
    result.score = result.below + modern + discount;
    return result;
  });

  return { scored, model };
}

const GAMING = /legion|loq|omen|victus|alienware|rog|tuf|predator|nitro|katana|raider|stealth|blade|zephyrus|strix|gaming|\bg1[56]\b/i;

export function fitsSlot(slot: SlotKey, s: Scored): boolean {
  const name = `${s.brand} ${s.model}`;
  switch (slot) {
    case "deal":
      return s.price >= 500;
    case "gaming":
      return s.parsed.gpu.tier >= 1 && s.price >= 800 && (s.parsed.gpu.tier >= 2 || GAMING.test(name) || /gaming/i.test(s.good_for ?? ""));
    case "budget":
      return s.price >= 450 && s.price <= 900;
    case "work":
      return s.price >= 600 && (BUSINESS_LINE.test(name) || /business/i.test(s.good_for ?? ""));
    case "bigscreen":
      return (s.screen_size ?? 0) >= 15.6 && s.price >= 600;
    case "premium":
      return s.price >= 1800;
  }
}

export const POOL_SIZE = 5;

export function buildPools(scored: Scored[], slots: SlotKey[]): Record<SlotKey, Scored[]> {
  const qualifying = scored.filter((s) => s.reason === null);
  const pools = {} as Record<SlotKey, Scored[]>;
  for (const slot of slots) {
    pools[slot] = qualifying
      .filter((s) => fitsSlot(slot, s))
      .sort((a, b) => b.score - a.score)
      .slice(0, POOL_SIZE);
  }
  return pools;
}

// Bonus for laptops sitting at the lowest price we have ever tracked for them (needs 3+ data points)
export function applyHistory(
  pools: Record<SlotKey, Scored[]>,
  history: Map<number, { min: number; count: number }>
): Record<SlotKey, Scored[]> {
  const out = {} as Record<SlotKey, Scored[]>;
  (Object.keys(pools) as SlotKey[]).forEach((slot) => {
    out[slot] = pools[slot]
      .map((s) => {
        const h = history.get(s.id);
        const lowestEver = !!h && h.count >= 3 && s.price <= h.min * 1.005;
        return lowestEver ? { ...s, lowestEver, score: s.score + 0.04 } : s;
      })
      .sort((a, b) => b.score - a.score);
  });
  return out;
}
