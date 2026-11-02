"use client";

const baseBtn: React.CSSProperties = {
  background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
  display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
};

export default function Header({
  onAdd, isDark, onThemeToggle, onDeals, currency, onCurrencyToggle, cadToUsd = 0.73,
}: {
  onAdd: () => void; isDark: boolean; onThemeToggle: () => void;
  onDeals: () => void;
  currency: "CAD" | "USD"; onCurrencyToggle: () => void; cadToUsd?: number;
}) {
  return (
    <header style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .lc-hdr-btn:hover { border-color: var(--accent); }
        .lc-hdr-add:hover { opacity: 0.88; }
      `}} />

      <div>
        <h1
          onClick={() => (window.location.href = "/")}
          style={{ margin: 0, fontSize: "clamp(1.7rem, 4vw, 2.3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em", cursor: "pointer", userSelect: "none", color: "var(--text)" }}
        >
          LaptopCore
        </h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
          Monitor prices, compare specs, track history.
        </p>
        {currency === "USD" && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-dim)" }}>Live rate: 1 CAD = {cadToUsd.toFixed(4)} USD</p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="lc-hdr-btn" onClick={onThemeToggle} title={isDark ? "Switch to light" : "Switch to dark"} style={baseBtn}>
          {isDark ? "Light" : "Dark"}
        </button>
        <button
          className="lc-hdr-btn"
          onClick={onCurrencyToggle}
          style={{ ...baseBtn, borderColor: currency === "USD" ? "var(--accent)" : "var(--border)" }}
        >
          <span style={{ opacity: currency === "CAD" ? 1 : 0.45 }}>CAD</span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span style={{ opacity: currency === "USD" ? 1 : 0.45 }}>USD</span>
        </button>
        <button className="lc-hdr-btn" onClick={onDeals} style={baseBtn}>
          Deals
        </button>
        <button
          className="lc-hdr-add"
          onClick={onAdd}
          style={{ ...baseBtn, background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)", transition: "opacity 0.15s" }}
        >
          + Add Laptop
        </button>
      </div>
    </header>
  );
}