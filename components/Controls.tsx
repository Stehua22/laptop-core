"use client";
import { useState } from "react";

const GOOD_FOR_OPTIONS = [
  { key: "gaming",       label: "🎮 Gaming" },
  { key: "programming",  label: "💻 Programming" },
  { key: "school",       label: "📚 School" },
  { key: "video",        label: "🎬 Video Editing" },
  { key: "business",     label: "💼 Business" },
  { key: "basic",        label: "🖥️ Basic Use" },
  { key: "data",         label: "🔬 Data Science" },
  { key: "engineering",  label: "⚙️ Engineering" },
  { key: "trading",      label: "📈 Trading" },
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

type Props = {
  search: string; onSearch: (v: string) => void;
  brands: string[]; brandFilter: string; onBrandFilter: (v: string) => void;
  sortBy: string; onSort: (v: string) => void;
  goodForFilter: string; onGoodForFilter: (v: string) => void;
  screenFilter: string; onScreenFilter: (v: string) => void;
  weightFilter: string; onWeightFilter: (v: string) => void;
  priceMin: string; priceMax: string;
  onPriceMin: (v: string) => void; onPriceMax: (v: string) => void;
};

export default function Controls({
  search, onSearch, brands, brandFilter, onBrandFilter, sortBy, onSort,
  goodForFilter, onGoodForFilter, screenFilter, onScreenFilter,
  weightFilter, onWeightFilter, priceMin, priceMax, onPriceMin, onPriceMax,
}: Props) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const activeCount = [brandFilter, goodForFilter, screenFilter, weightFilter, priceMin, priceMax].filter(Boolean).length;

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

  const numInput: React.CSSProperties = {
    background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9,
    padding: "8px 12px", color: "var(--text)", fontSize: 13, outline: "none",
    width: 110, boxSizing: "border-box" as const,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
    letterSpacing: "0.12em", fontWeight: 600, marginBottom: 8,
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Top row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: searchFocused ? "var(--accent)" : "var(--text-muted)", fontSize: 14, pointerEvents: "none", transition: "color 0.2s" }}>🔍</div>
          <input
            type="text" placeholder="Search brand, model, specs..." value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            style={{ background: "var(--surface)", border: `1px solid ${searchFocused ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "10px 36px", color: "var(--text)", fontSize: 13, outline: "none", width: "100%", transition: "border-color 0.2s", boxSizing: "border-box" }}
          />
          {search && (
            <button onClick={() => onSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "2px 4px" }}>✕</button>
          )}
        </div>

        {/* Brand */}
        <select value={brandFilter} onChange={(e) => onBrandFilter(e.target.value)}
          style={{ ...selectStyle, borderColor: brandFilter ? "var(--accent)" : "var(--border)" }}>
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={(e) => onSort(e.target.value)} style={{ ...selectStyle, minWidth: 170 }}>
          <option value="newest">Newest First</option>
          <option value="priceAsc">Price: Low → High</option>
          <option value="priceDesc">Price: High → Low</option>
        </select>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${showFilters || activeCount > 0 ? "var(--accent)" : "var(--border)"}`, background: showFilters || activeCount > 0 ? "rgba(139,179,245,0.10)" : "var(--surface)", color: showFilters || activeCount > 0 ? "var(--accent)" : "var(--text-muted)", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          ⚙ Filters
          {activeCount > 0 && (
            <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 6px", fontWeight: 700, lineHeight: 1.4 }}>{activeCount}</span>
          )}
        </button>
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div style={{ marginTop: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Good For */}
          <div>
            <p style={sectionLabel}>Good For</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {GOOD_FOR_OPTIONS.map(o => (
                <button key={o.key} onClick={() => onGoodForFilter(goodForFilter === o.key ? "" : o.key)} style={pill(goodForFilter === o.key)}>{o.label}</button>
              ))}
            </div>
          </div>

          {/* Screen Size */}
          <div>
            <p style={sectionLabel}>Screen Size</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SCREEN_OPTIONS.map(o => (
                <button key={o.key} onClick={() => onScreenFilter(screenFilter === o.key ? "" : o.key)} style={pill(screenFilter === o.key)}>{o.label}</button>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div>
            <p style={sectionLabel}>Weight</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {WEIGHT_OPTIONS.map(o => (
                <button key={o.key} onClick={() => onWeightFilter(weightFilter === o.key ? "" : o.key)} style={pill(weightFilter === o.key)}>{o.label}</button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <p style={sectionLabel}>Price Range (CAD)</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="number" placeholder="Min $" value={priceMin} onChange={e => onPriceMin(e.target.value)} style={numInput} />
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>–</span>
              <input type="number" placeholder="Max $" value={priceMax} onChange={e => onPriceMax(e.target.value)} style={numInput} />
            </div>
          </div>

          {/* Clear all */}
          {activeCount > 0 && (
            <div>
              <button
                onClick={() => { onBrandFilter(""); onGoodForFilter(""); onScreenFilter(""); onWeightFilter(""); onPriceMin(""); onPriceMax(""); }}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
                ✕ Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
