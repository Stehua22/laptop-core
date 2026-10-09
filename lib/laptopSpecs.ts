// Reads a laptop's processor, memory, storage and graphics out of its name and spec text.
// Works on both the importer's format ("Intel Core i7-1355U / 16GB DDR5 / 512GB SSD") and free text.

export type Cpu = {
  vendor: "intel" | "amd" | "apple" | "qualcomm" | "entry";
  label: string;
  year: number; // roughly when the chip came out
  perf: number; // rough speed score, about 8 (very slow) to 110 (fastest laptop chips)
};

export type Gpu = { tier: 0 | 1 | 2 | 3 | 4; label: string }; // 0 = built into the processor

export type ParsedSpecs = {
  cpu: Cpu | null;
  ramGb: number | null;
  storageGb: number | null;
  gpu: Gpu;
};

const TIER_BASE: Record<string, number> = { "3": 18, "5": 32, "7": 46, "9": 60 };
const ULTRA_BASE: Record<string, number> = { "3": 30, "5": 38, "7": 52, "9": 66 };
const CORE_BASE: Record<string, number> = { "3": 22, "5": 34, "7": 48 };

const INTEL_GEN_YEAR: Record<number, number> = {
  4: 2014, 5: 2015, 6: 2016, 7: 2017, 8: 2018, 9: 2019, 10: 2020, 11: 2021, 12: 2022, 13: 2023, 14: 2024,
};
const AMD_SERIES_YEAR: Record<number, number> = {
  1: 2017, 2: 2018, 3: 2019, 4: 2020, 5: 2021, 6: 2022, 7: 2023, 8: 2024, 9: 2025,
};

function suffixBoost(suffix: string): number {
  const s = suffix.toUpperCase();
  if (s.startsWith("HX")) return 22;
  if (s.startsWith("HK")) return 16;
  if (s.startsWith("H")) return 12;
  if (s.startsWith("P")) return 6;
  if (s.startsWith("V")) return 4;
  return 0; // U, G7 and friends
}

export function parseCpu(input: string): Cpu | null {
  const t = input.replace(/[\u2122\u00ae]/g, " ");
  let m: RegExpMatchArray | null;

  // Apple silicon
  if (/apple|macbook/i.test(t)) {
    m = t.match(/\bM([1-5])\b(?:\s+(Pro|Max|Ultra))?/i);
    if (m) {
      const gen = Number(m[1]);
      const variant = (m[2] ?? "").toLowerCase();
      const base = [0, 40, 48, 56, 66, 74][gen];
      const extra = variant === "pro" ? 12 : variant === "max" ? 24 : variant === "ultra" ? 36 : 0;
      const year = [0, 2020, 2022, 2023, 2024, 2025][gen];
      const name = variant ? " " + variant.charAt(0).toUpperCase() + variant.slice(1) : "";
      return { vendor: "apple", label: `Apple M${gen}${name}`, year, perf: base + extra };
    }
  }

  // Snapdragon X
  if (/snapdragon\s*x/i.test(t)) {
    const elite = /elite|x1e/i.test(t);
    return { vendor: "qualcomm", label: `Snapdragon X ${elite ? "Elite" : "Plus"}`, year: 2024, perf: elite ? 58 : 46 };
  }

  // Intel Core Ultra (2024 and newer)
  m = t.match(/core\s*ultra\s*([3579])\s*(?:processor\s*)?(\d{3})([A-Z]{0,2})\b/i);
  if (m) {
    const tier = m[1];
    const num = m[2];
    const suffix = m[3] ?? "";
    const series = Number(num.charAt(0));
    return {
      vendor: "intel",
      label: `Intel Core Ultra ${tier} ${num}${suffix.toUpperCase()}`,
      year: series <= 1 ? 2024 : series === 2 ? 2025 : 2026,
      perf: (ULTRA_BASE[tier] ?? 38) + suffixBoost(suffix) + series * 4,
    };
  }

  // Intel Core 3 / 5 / 7 (new naming, no "Ultra" and no "i")
  m = t.match(/\bcore\s*([357])\s*(?:processor\s*)?(\d{3})([A-Z]{0,2})\b/i);
  if (m) {
    const tier = m[1];
    const num = m[2];
    const suffix = m[3] ?? "";
    const series = Number(num.charAt(0));
    return {
      vendor: "intel",
      label: `Intel Core ${tier} ${num}${suffix.toUpperCase()}`,
      year: series <= 1 ? 2024 : series === 2 ? 2025 : 2026,
      perf: (CORE_BASE[tier] ?? 34) + suffixBoost(suffix) + series * 2,
    };
  }

  // Intel Core i3 / i5 / i7 / i9
  m = t.match(/\bi([3579])[-\s]?(\d{4,5})([A-Z]{0,3}\d?)\b/i);
  if (m) {
    const tier = m[1];
    const digits = m[2];
    const suffix = m[3] ?? "";
    const gen =
      digits.length === 5 ? Number(digits.slice(0, 2)) : digits.charAt(0) === "1" ? Number(digits.slice(0, 2)) : Number(digits.charAt(0));
    const year = INTEL_GEN_YEAR[gen] ?? (gen > 14 ? 2025 : 2010);
    const genBonus = gen >= 12 ? Math.min(14, (gen - 12) * 2) : -(10 - Math.min(gen, 10)) * 2;
    return {
      vendor: "intel",
      label: `Intel Core i${tier}-${digits}${suffix.toUpperCase()}`,
      year,
      perf: TIER_BASE[tier] + suffixBoost(suffix) + genBonus,
    };
  }

  // AMD Ryzen (including Ryzen AI)
  m = t.match(/ryzen\b([^/,;|()]{0,40})/i);
  if (m) {
    const tokens = m[1].trim().split(/\s+/).filter(Boolean);
    const ai = tokens.slice(0, 3).some((x) => /^ai$/i.test(x));
    const max = tokens.slice(0, 4).some((x) => /^max\+?$/i.test(x));
    let tier = "";
    let preSuffix = "";
    let num = "";
    let tail = "";
    for (const tok of tokens) {
      if (num) break;
      if (!tier && /^[3579]$/.test(tok)) {
        tier = tok;
        continue;
      }
      if (/^(hx3d|hx|hs|h|u)$/i.test(tok)) {
        preSuffix = tok;
        continue;
      }
      const nm = tok.match(/^(\d{3,4})([a-z0-9]{0,4})$/i);
      if (nm && !/^(gb|tb)/i.test(nm[2])) {
        num = nm[1];
        tail = nm[2];
      }
    }
    if (num) {
      if (!tier && max) tier = "9";
      const year = ai ? 2024 : num.length === 3 ? 2025 : AMD_SERIES_YEAR[Number(num.charAt(0))] ?? 2020;
      return {
        vendor: "amd",
        label: `AMD Ryzen ${ai ? "AI " : ""}${tier ? tier + " " : ""}${preSuffix ? preSuffix.toUpperCase() + " " : ""}${num}${tail.toUpperCase()}`,
        year,
        perf: (TIER_BASE[tier || "7"] ?? 46) + suffixBoost(preSuffix || tail) + (year - 2022) * 2 + (ai ? 6 : 0),
      };
    }
  }

  // Entry-level chips (Celeron, Pentium, Athlon, Intel N-series, MediaTek...)
  if (/celeron|pentium|athlon|\bintel\s+n\d{2,3}\b|\bn\d{3,4}\b|mediatek|snapdragon\s*7c/i.test(t)) {
    return { vendor: "entry", label: "Entry-level processor", year: 2020, perf: 8 };
  }

  return null;
}

export function parseGpu(input: string): Gpu {
  let m = input.match(/\b(rtx|gtx)\s*(\d{3,4})\s*(ti|super)?/i);
  if (m) {
    const n = Number(m[2]);
    const last = n % 100;
    let tier: 1 | 2 | 3 | 4 = 1;
    if (/gtx/i.test(m[1])) tier = last >= 60 ? 2 : 1;
    else if (last >= 80) tier = 4;
    else if (last >= 70) tier = 3;
    else if (last >= 60) tier = 2;
    const extra = m[3] ? " " + m[3].charAt(0).toUpperCase() + m[3].slice(1).toLowerCase() : "";
    return { tier, label: `NVIDIA ${m[1].toUpperCase()} ${m[2]}${extra}` };
  }
  m = input.match(/radeon\s*rx\s*(\d{4})/i);
  if (m) {
    const n = Number(m[1]);
    const tier: 1 | 2 | 3 | 4 = n >= 7800 ? 4 : n >= 7700 ? 3 : n >= 7600 || n >= 6600 ? 2 : 1;
    return { tier, label: `AMD Radeon RX ${m[1]}` };
  }
  m = input.match(/\barc\s*([ab]\d{3}m?)\b/i);
  if (m) return { tier: 1, label: `Intel Arc ${m[1].toUpperCase()}` };
  return { tier: 0, label: "Integrated graphics" };
}

export function parseMemory(input: string): { ramGb: number | null; storageGb: number | null } {
  const re = /(\d+(?:\.\d+)?)\s*(tb|gb)\b/gi;
  let ram: number | null = null;
  let storage: number | null = null;
  const unlabeled: number[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    const gb = Number(m[1]) * (m[2].toLowerCase() === "tb" ? 1000 : 1);
    const before = input.slice(Math.max(0, m.index - 14), m.index).toLowerCase();
    const after = input.slice(re.lastIndex, re.lastIndex + 28).toLowerCase();

    // memory on the graphics card, not the laptop's RAM
    if (/^\s*g\s*ddr/.test(after) || /^\s*vram/.test(after) || /(vram|graphics)\s*[:-]?\s*$/.test(before)) continue;

    const isStorage =
      /^(?:\s*(?:pcie|nvme|m\.?2|gen\s?\d|sata|ufs|solid state))*\s*(ssd|hdd|emmc|storage|flash)\b/.test(after) ||
      /(ssd|storage|hdd)\s*[:-]?\s*$/.test(before);
    const isRam =
      /^\s*(?:ram\b|memory|(?:lp)?ddr\d?x?|unified|sdram)/.test(after) || /(ram|memory)\s*[:-]?\s*$/.test(before);

    if (isStorage) {
      if (storage === null) storage = gb;
    } else if (isRam) {
      if (ram === null) ram = gb;
    } else {
      unlabeled.push(gb);
    }
  }

  // Plain numbers like "16GB / 512GB": a small one is the RAM, a big one is the storage
  if (ram === null) {
    const i = unlabeled.findIndex((g) => g <= 64);
    if (i !== -1) ram = unlabeled.splice(i, 1)[0];
  }
  if (storage === null) {
    const i = unlabeled.findIndex((g) => g >= 128);
    if (i !== -1) storage = unlabeled[i];
  }

  if (ram !== null && (ram < 2 || ram > 192)) ram = null;
  if (storage !== null && storage < 32) storage = null;
  return { ramGb: ram, storageGb: storage };
}

export function parseSpecs(text: string): ParsedSpecs {
  const { ramGb, storageGb } = parseMemory(text);
  return { cpu: parseCpu(text), ramGb, storageGb, gpu: parseGpu(text) };
}

export function formatStorage(gb: number): string {
  return gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`;
}
