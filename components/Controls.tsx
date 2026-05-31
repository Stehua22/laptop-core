"use client";
<<<<<<< HEAD
import { useState } from "react";
=======
>>>>>>> origin/fix/vercel-build-and-theme-toggle

type Props = {
  search: string;
  onSearch: (v: string) => void;
  brands: string[];
  brandFilter: string;
  onBrandFilter: (v: string) => void;
  sortBy: string;
  onSort: (v: string) => void;
};

<<<<<<< HEAD
export default function Controls({
  search, onSearch, brands, brandFilter, onBrandFilter, sortBy, onSort,
}: Props) {
  const [searchFocused, setSearchFocused] = useState(false);

  const selectStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "var(--text)",
    fontSize: 13,
    outline: "none",
    cursor: "pointer",
    width: "auto",
    minWidth: 140,
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238892aa' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 32,
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: 10, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.14em",
        marginBottom: 12, fontWeight: 600,
=======
const inputStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 14px",
  color: "var(--text)",
  fontFamily: "'DM Mono', monospace",
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.2s",
  width: "100%",
};

export default function Controls({
  search, onSearch, brands, brandFilter, onBrandFilter, sortBy, onSort,
}: Props) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        marginBottom: 12,
>>>>>>> origin/fix/vercel-build-and-theme-toggle
      }}>
        // filter & sort
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
<<<<<<< HEAD
      }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: searchFocused ? "var(--accent)" : "var(--text-muted)",
            fontSize: 14, pointerEvents: "none",
            transition: "color 0.2s",
          }}>
            🔍
          </div>
          <input
            type="text"
            placeholder="Search brand, model, specs..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              background: "var(--surface)",
              border: `1px solid ${searchFocused ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 10,
              padding: "10px 14px 10px 36px",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
              width: "100%",
              boxShadow: searchFocused ? "0 0 0 3px rgba(139,179,245,0.1)" : "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 14, padding: "2px 4px", borderRadius: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Brand filter */}
        <select
          value={brandFilter}
          onChange={(e) => onBrandFilter(e.target.value)}
          style={{
            ...selectStyle,
            borderColor: brandFilter ? "var(--accent)" : "var(--border)",
          }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(139,179,245,0.1)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = brandFilter ? "var(--accent)" : "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
=======
        flexWrap: "wrap",
      }}>
        <input
          type="text"
          placeholder="Search brand, model, specs..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          style={inputStyle}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        />
        <select
          value={brandFilter}
          onChange={(e) => onBrandFilter(e.target.value)}
          style={{ ...inputStyle, width: "auto", minWidth: 140, cursor: "pointer" }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
>>>>>>> origin/fix/vercel-build-and-theme-toggle
        >
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
<<<<<<< HEAD

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSort(e.target.value)}
          style={{ ...selectStyle, minWidth: 170 }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(139,179,245,0.1)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
=======
        <select
          value={sortBy}
          onChange={(e) => onSort(e.target.value)}
          style={{ ...inputStyle, width: "auto", minWidth: 160, cursor: "pointer" }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
>>>>>>> origin/fix/vercel-build-and-theme-toggle
        >
          <option value="newest">Newest First</option>
          <option value="priceAsc">Price: Low → High</option>
          <option value="priceDesc">Price: High → Low</option>
        </select>
      </div>
    </div>
  );
}
