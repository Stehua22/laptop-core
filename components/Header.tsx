"use client";

export default function Header({
  onAdd, isDark, onThemeToggle, onDeals, onAdmin, currency, onCurrencyToggle, cadToUsd = 0.73,
}: {
  onAdd: () => void; isDark: boolean; onThemeToggle: () => void;
  onDeals: () => void; onAdmin: () => void;
  currency: "CAD" | "USD"; onCurrencyToggle: () => void; cadToUsd?: number;
}) {
  return (
    <header className="animate-fade-up" style={{ marginBottom: 48, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600, opacity: 0.8 }}>// price intelligence</div>
        <h1 onClick={() => window.location.href = "/"} style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text)", cursor: "pointer", userSelect: "none", transition: "opacity 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
          LaptopCore<span style={{ color: "var(--accent)", opacity: 0.9 }}>.</span>
        </h1>
        <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>Monitor prices · compare specs · track history</p>
        {currency === "USD" && <p style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)" }}>Live rate: 1 CAD = {cadToUsd.toFixed(4)} USD</p>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onThemeToggle} title={isDark ? "Switch to light" : "Switch to dark"}
          style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
          {isDark ? "☀️" : "🌙"}
        </button>
        <button onClick={onCurrencyToggle}
          style={{ background: currency === "USD" ? "rgba(139,179,245,0.12)" : "var(--surface)", color: "var(--text)", border: currency === "USD" ? "1px solid rgba(139,179,245,0.5)" : "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = currency === "USD" ? "rgba(139,179,245,0.5)" : "var(--border)"; }}>
          <span style={{ opacity: currency === "CAD" ? 1 : 0.45 }}>CAD</span>
          <span style={{ opacity: 0.35, fontSize: 11 }}>/</span>
          <span style={{ opacity: currency === "USD" ? 1 : 0.45 }}>USD</span>
        </button>
        <button onClick={onAdmin} title="Admin panel"
          style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>⚙️</button>
        <button onClick={onDeals}
          style={{ background: "rgba(247,194,106,0.12)", color: "var(--accent-2)", border: "1px solid rgba(247,194,106,0.4)", borderRadius: 10, padding: "11px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(247,194,106,0.22)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(247,194,106,0.12)"; }}>🔥 Crazy Deals</button>
        <button onClick={onAdd}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(139,179,245,0.3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>+ Add Laptop</button>
      </div>
    </header>
  );
}
