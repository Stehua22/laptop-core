"use client";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  brands: string[];
  brandFilter: string;
  onBrandFilter: (v: string) => void;
  sortBy: string;
  onSort: (v: string) => void;
};

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
      }}>
        // filter & sort
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
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
        >
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => onSort(e.target.value)}
          style={{ ...inputStyle, width: "auto", minWidth: 160, cursor: "pointer" }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          <option value="newest">Newest First</option>
          <option value="priceAsc">Price: Low → High</option>
          <option value="priceDesc">Price: High → Low</option>
        </select>
      </div>
    </div>
  );
}
