"use client";
import { useState } from "react";
import type { Chip } from "@/lib/smartFilters";

const GOOD_FOR_OPTIONS = [
  { key: "gaming",       label: "🎮 Gaming",         hint: "Has a dedicated graphics card" },
  { key: "programming",  label: "💻 Programming",    hint: "16GB+ RAM, 512GB+ storage and a fast processor" },
  { key: "school",       label: "📚 School",         hint: "Modern, affordable (up to $1,100) with enough RAM and storage" },
  { key: "video",        label: "🎬 Video Editing",  hint: "16GB+ RAM, a fast processor and strong graphics (or an Apple chip)" },
  { key: "business",     label: "💼 Business",       hint: "Business lines like ThinkPad, Latitude and EliteBook" },
  { key: "basic",        label: "🖥️ Basic Use",      hint: "Everyday laptops up to $900" },
  { key: "data",         label: "🔬 Data Science",   hint: "32GB+ RAM and a fast processor" },
  { key: "engineering",  label: "⚙️ Engineering",    hint: "16GB+ RAM, a fast processor and a dedicated graphics card" },
  { key: "trading",      label: "📈 Trading",        hint: "16GB+ RAM and a solid processor" },
];

const SCREEN_OPTIONS = [
  { key: "small",  label: '≤ 13"' },
  { key: "medium", label: '14"' },
  { key: "large",  label: '15–16"' },
  { key: "xlarge", label: '17"+' },
];

const WEIGHT_OPTIONS = [
  { key: "ultralight", label: "< 1.2 kg" },
  { key: "light",      label: "1.2–1.6 kg" },
  { key: "medium",     label: "1.6–2.2 kg" },
  { key: "heavy",      label: "> 2.2 kg" },
];

const RAM_OPTIONS = [{ key: "8", label: "8GB+" }, { key: "16", label: "16GB+" }, { key: "32", label: "32GB+" }];
const STORAGE_OPTIONS = [{ key: "256", label: "256GB+" }, { key: "512", label: "512GB+" }, { key: "1000", label: "1TB+" }];
const CPU_OPTIONS = [
  { key: "intel", label: "Intel" }, { key: "amd", label: "AMD" },
  { key: "apple", label: "Apple" }, { key: "qualcomm", label: "Snapdragon" },
];
const GPU_OPTIONS = [
  { key: "dedicated", label: "Dedicated graphics" },
  { key: "strong", label: "Strong (RTX 4060 and up)" },
  { key: "integrated", label: "Integrated only" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "priceAsc", label: "Price: Low → High" },
  { key: "priceDesc", label: "Price: High → Low" },
  { key: "value", label: "Best value (under usual price)" },
  { key: "perf", label: "Fastest processor" },
  { key: "chip", label: "Newest processor" },
];

// One-tap starting points. Each one just sets several filters at once.
type PresetPatch = { goodFor?: string; priceMax?: string; modernOnly?: boolean; dealsOnly?: boolean; sortBy?: string };
const PRESETS: { key: string; label: string; hint: string; patch: PresetPatch }[] = [
  { key: "student", label: "🎓 Student", hint: "Modern, affordable laptops for school", patch: { goodFor: "school", modernOnly: true } },
  { key: "gaming", label: "🎮 Gaming", hint: "Laptops with dedicated graphics", patch: { goodFor: "gaming", modernOnly: true } },
  { key: "work", label: "💼 Work", hint: "Business-class laptops", patch: { goodFor: "business", modernOnly: true } },
  { key: "creator", label: "🎬 Creator", hint: "Strong processor, 16GB+ RAM and good graphics", patch: { goodFor: "video", modernOnly: true } },
  { key: "budget", label: "💰 Under $800", hint: "Best value under $800, no outdated processors", patch: { priceMax: "800", modernOnly: true, sortBy: "value" } },
  { key: "deals", label: "🔥 Best deals", hint: "Priced well under what their specs usually cost", patch: { dealsOnly: true, sortBy: "value" } },
  { key: "fast", label: "⚡ Fastest", hint: "Fastest modern processors first", patch: { modernOnly: true, sortBy: "perf" } },
];
const PRESET_OFF: Required<PresetPatch> = { goodFor: "", priceMax: "", modernOnly: false, dealsOnly: false, sortBy: "newest" };

export const SEARCH_PLACEHOLDER = 'Search, or describe it: "gaming laptop under $1500 16GB"';

type Props = {
  search: string; onSearch: (v: string) => void;
  smartChips: Chip[]; onRemoveChip: (chip: Chip) => void;
  brands: string[]; brandFilter: string; onBrandFilter: (v: string) => void;
  sortBy: string; onSort: (v: string) => void;
  goodForFilter: string; onGoodForFilter: (v: string) => void;
  screenFilter: string; onScreenFilter: (v: string) => void;
  weightFilter: string; onWeightFilter: (v: string) => void;
  priceMin: string; priceMax: string;
  onPriceMin: (v: string) => void; onPriceMax: (v: string) => void;
  ramMin: string; onRamMin: (v: string) => void;
  storageMin: string; onStorageMin: (v: string) => void;
  cpuVendor: string; onCpuVendor: (v: string) => void;
  gpuFilter: string; onGpuFilter: (v: string) => void;
  modernOnly: boolean; onModernOnly: (v: boolean) => void;
  dealsOnly: boolean; onDealsOnly: (v: boolean) => void;
  onApplyPreset: (patch: PresetPatch) => void;
  onClearAll: () => void;
};

const money = (v: string) => "$" + Number(v).toLocaleString("en-US");

export default function Controls({
  search, onSearch, smartChips, onRemoveChip, brands, brandFilter, onBrandFilter, sortBy, onSort,
  goodForFilter, onGoodForFilter, screenFilter, onScreenFilter,
  weightFilter, onWeightFilter, priceMin, priceMax, onPriceMin, onPriceMax,
  ramMin, onRamMin, storageMin, onStorageMin, cpuVendor, onCpuVendor, gpuFilter, onGpuFilter,
  modernOnly, onModernOnly, dealsOnly, onDealsOnly, onApplyPreset, onClearAll,
}: Props) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const activeCount = [
    brandFilter, goodForFilter, screenFilter, weightFilter, priceMin, priceMax, ramMin, storageMin, cpuVendor, gpuFilter,
    modernOnly ? "1" : "", dealsOnly ? "1" : "",
  ].filter(Boolean).length;

  // Everything currently filtering, shown as removable chips
  const label = (opts: { key: string; label: string }[], key: string) => opts.find((o) => o.key === key)?.label ?? key;
  const explicitChips: { id: string; label: string; clear: () => void }[] = [];
  if (brandFilter) explicitChips.push({ id: "brand", label: brandFilter, clear: () => onBrandFilter("") });
  if (goodForFilter) explicitChips.push({ id: "goodFor", label: label(GOOD_FOR_OPTIONS, goodForFilter), clear: () => onGoodForFilter("") });
  if (screenFilter) explicitChips.push({ id: "screen", label: label(SCREEN_OPTIONS, screenFilter), clear: () => onScreenFilter("") });
  if (weightFilter) explicitChips.push({ id: "weight", label: label(WEIGHT_OPTIONS, weightFilter), clear: () => onWeightFilter("") });
  if (priceMin) explicitChips.push({ id: "priceMin", label: `Over ${money(priceMin)}`, clear: () => onPriceMin("") });
  if (priceMax) explicitChips.push({ id: "priceMax", label: `Under ${money(priceMax)}`, clear: () => onPriceMax("") });
  if (ramMin) explicitChips.push({ id: "ram", label: `${label(RAM_OPTIONS, ramMin)} RAM`, clear: () => onRamMin("") });
  if (storageMin) explicitChips.push({ id: "storage", label: `${label(STORAGE_OPTIONS, storageMin)} storage`, clear: () => onStorageMin("") });
  if (cpuVendor) explicitChips.push({ id: "cpu", label: label(CPU_OPTIONS, cpuVendor), clear: () => onCpuVendor("") });
  if (gpuFilter) explicitChips.push({ id: "gpu", label: label(GPU_OPTIONS, gpuFilter), clear: () => onGpuFilter("") });
  if (modernOnly) explicitChips.push({ id: "modern", label: "Modern processors (2022+)", clear: () => onModernOnly(false) });
  if (dealsOnly) explicitChips.push({ id: "deals", label: "Priced under usual", clear: () => onDealsOnly(false) });
  const hasAnyChip = smartChips.length + explicitChips.length > 0;

  // A preset counts as "on" when every filter it sets currently has the value it would set
  const current: Record<string, string | boolean> = { goodFor: goodForFilter, priceMax, modernOnly, dealsOnly, sortBy };
  const presetOn = (patch: PresetPatch) => Object.entries(patch).every(([k, v]) => current[k] === v);
  const togglePreset = (patch: PresetPatch) => {
    if (presetOn(patch)) {
      const off: PresetPatch = {};
      for (const k of Object.keys(patch) as (keyof PresetPatch)[]) (off as Record<string, string | boolean>)[k] = PRESET_OFF[k];
      onApplyPreset(off);
    } else {
      onApplyPreset(patch);
    }
  };

  const selectStyle: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
    padding: "10px 14px", color: "var(--text)", fontSize: 13, outline: "none", cursor: "pointer",
    minWidth: 140, appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238892aa' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 32,
  };

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "5px 13px", borderRadius: 99, fontSize: 12, cursor: "pointer",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    background: active ? "rgba(139,179,245,0.12)" : "var(--surface-2)",
    color: active ? "var(--accent)" : "var(--text-muted)",
    fontWeight: active ? 600 : 400, whiteSpace: "nowrap" as const, transition: "all 0.15s",
  });

  const chipStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 6px 4px 11px", borderRadius: 99, fontSize: 12,
    border: "1px solid var(--accent)", background: "rgba(139,179,245,0.10)", color: "var(--accent)", fontWeight: 600, whiteSpace: "nowrap",
  };
  const chipX: React.CSSProperties = {
    background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, padding: "0 4px", lineHeight: 1,
  };

  const numInput: React.CSSProperties = {
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9,
    padding: "8px 12px", color: "var(--text)", fontSize: 13, outline: "none",
    width: 110, boxSizing: "border-box" as const,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
    letterSpacing: "0.12em", fontWeight: 600, marginBottom: 8,
  };

  const optionRow = (options: { key: string; label: string }[], value: string, set: (v: string) => void) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o.key} className="lc-pill" onClick={() => set(value === o.key ? "" : o.key)} style={pill(value === o.key)}>{o.label}</button>
      ))}
    </div>
  );

  const checkRow = (checked: boolean, set: (v: boolean) => void, title: string, text: string) => (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} style={{ marginTop: 3, accentColor: "var(--accent)" }} />
      <span>
        <span style={{ display: "block", fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{title}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{text}</span>
      </span>
    </label>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Top row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: searchFocused ? "var(--accent)" : "var(--text-muted)", fontSize: 14, pointerEvents: "none", transition: "color 0.2s" }}>🔍</div>
          <input
            type="text" data-lc-search="true" placeholder={SEARCH_PLACEHOLDER} value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            style={{ background: "var(--surface)", border: `1px solid ${searchFocused ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "10px 36px", color: "var(--text)", fontSize: 13, outline: "none", width: "100%", transition: "border-color 0.2s", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => onSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "2px 4px" }}>✕</button>
          )}
        </div>

        {/* Brand */}
        <select value={brandFilter} onChange={(e) => onBrandFilter(e.target.value)} className="lc-select"
          style={{ ...selectStyle, borderColor: brandFilter ? "var(--accent)" : "var(--border)" }}>
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={(e) => onSort(e.target.value)} className="lc-select" style={{ ...selectStyle, minWidth: 200 }}>
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className="lc-filter-toggle"
          style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${showFilters || activeCount > 0 ? "var(--accent)" : "var(--border)"}`, background: showFilters || activeCount > 0 ? "rgba(139,179,245,0.10)" : "var(--surface)", color: showFilters || activeCount > 0 ? "var(--accent)" : "var(--text-muted)", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          ⚙ Filters
          {activeCount > 0 && (
            <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 6px", fontWeight: 700, lineHeight: 1.4, animation: "lc-badge-pop 0.25s ease" }}>{activeCount}</span>
          )}
        </button>
      </div>

      {/* Quick picks */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
        {PRESETS.map((p) => (
          <button key={p.key} className="lc-pill" title={p.hint} onClick={() => togglePreset(p.patch)} style={pill(presetOn(p.patch))}>{p.label}</button>
        ))}
      </div>

      {/* What's filtering right now */}
      {hasAnyChip && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 2 }}>Showing:</span>
          {smartChips.map((c, i) => (
            <span key={`s${i}-${c.label}`} style={chipStyle} title="Understood from your search">
              ✨ {c.label}
              <button onClick={() => onRemoveChip(c)} style={chipX} aria-label={`Remove ${c.label}`}>✕</button>
            </span>
          ))}
          {explicitChips.map((c) => (
            <span key={c.id} style={chipStyle}>
              {c.label}
              <button onClick={c.clear} style={chipX} aria-label={`Remove ${c.label}`}>✕</button>
            </span>
          ))}
          <button onClick={onClearAll} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 99, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
            Clear all
          </button>
        </div>
      )}

      {/* Expanded filter panel */}
      {showFilters && (
        <div style={{ marginTop: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18, animation: "lc-filter-panel-in 0.22s cubic-bezier(0.16,1,0.3,1) both", transformOrigin: "top" }}>

          {/* Good For */}
          <div>
            <p style={sectionLabel}>Good For</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {GOOD_FOR_OPTIONS.map(o => (
                <button key={o.key} className="lc-pill" title={o.hint} onClick={() => onGoodForFilter(goodForFilter === o.key ? "" : o.key)} style={pill(goodForFilter === o.key)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            <div><p style={sectionLabel}>Memory (RAM)</p>{optionRow(RAM_OPTIONS, ramMin, onRamMin)}</div>
            <div><p style={sectionLabel}>Storage</p>{optionRow(STORAGE_OPTIONS, storageMin, onStorageMin)}</div>
            <div><p style={sectionLabel}>Processor</p>{optionRow(CPU_OPTIONS, cpuVendor, onCpuVendor)}</div>
            <div><p style={sectionLabel}>Graphics</p>{optionRow(GPU_OPTIONS, gpuFilter, onGpuFilter)}</div>
          </div>

          {/* Screen Size */}
          <div>
            <p style={sectionLabel}>Screen Size</p>
            {optionRow(SCREEN_OPTIONS, screenFilter, onScreenFilter)}
          </div>

          {/* Weight */}
          <div>
            <p style={sectionLabel}>Weight</p>
            {optionRow(WEIGHT_OPTIONS, weightFilter, onWeightFilter)}
          </div>

          {/* Price Range */}
          <div>
            <p style={sectionLabel}>Price Range (CAD)</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="number" placeholder="Min $" value={priceMin} onChange={e => onPriceMin(e.target.value)} className="lc-num-input" style={numInput} />
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>–</span>
              <input type="number" placeholder="Max $" value={priceMax} onChange={e => onPriceMax(e.target.value)} className="lc-num-input" style={numInput} />
            </div>
          </div>

          {/* Smart toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {checkRow(modernOnly, onModernOnly, "Modern processors only", "Hides laptops with processors from before 2022 and entry-level chips")}
            {checkRow(dealsOnly, onDealsOnly, "Only laptops priced under their usual price", "At least 10% below what laptops with the same specs normally cost")}
          </div>

          {/* Clear all */}
          {(activeCount > 0 || search) && (
            <div>
              <button
                onClick={onClearAll}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
                ✕ Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes lc-filter-panel-in {
          from { opacity: 0; transform: translateY(-6px) scaleY(0.96); }
          to { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        @keyframes lc-badge-pop {
          0% { transform: scale(0.5); }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .lc-pill:hover { transform: translateY(-1px); border-color: var(--accent); }
        .lc-filter-toggle:hover { transform: translateY(-1px); }
        .lc-select:hover { border-color: var(--accent); }
        .lc-num-input:focus { border-color: var(--accent); }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
