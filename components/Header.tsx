"use client";

export default function Header({
  onAdd, isDark, onThemeToggle, onDeals, currency, onCurrencyToggle, cadToUsd = 0.73,
}: {
  onAdd: () => void; isDark: boolean; onThemeToggle: () => void;
  onDeals: () => void;
  currency: "CAD" | "USD"; onCurrencyToggle: () => void; cadToUsd?: number;
}) {
  return (
    <header className="animate-fade-up" style={{ position: "relative", marginBottom: 48, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", overflow: "visible" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lc-orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(24px, -18px) scale(1.08); }
        }
        @keyframes lc-title-sheen {
          0% { background-position: -120% 0; }
          100% { background-position: 220% 0; }
        }
        @keyframes lc-dot-pulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        .lc-hero-orb {
          position: absolute; top: -60px; left: -40px; width: 260px; height: 260px;
          background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
          opacity: 0.18; filter: blur(30px); pointer-events: none; z-index: 0;
          animation: lc-orb-drift 9s ease-in-out infinite;
        }
        .lc-hero-title {
          background: linear-gradient(100deg, var(--text) 30%, var(--accent) 45%, var(--text) 60%);
          background-size: 250% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: lc-title-sheen 6s linear infinite;
        }
        .lc-live-dot {
          display: inline-block; width: 6px; height: 6px; border-radius: 50%;
          background: var(--accent-3); margin-right: 6px; animation: lc-dot-pulse 2s ease-in-out infinite;
        }
        .lc-icon-btn { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .lc-icon-btn:hover { transform: translateY(-2px); border-color: var(--accent); box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
        .lc-deals-btn { transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease; }
        .lc-deals-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(247,194,106,0.25); }
        .lc-add-btn { position: relative; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .lc-add-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(139,179,245,0.4); }
      `}} />

      <div className="lc-hero-orb" />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 10, color: "var(--accent)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700, opacity: 0.9 }}>
          <span className="lc-live-dot" />
          Price intelligence · live
        </div>
        <h1 onClick={() => window.location.href = "/"} className="lc-hero-title" style={{ fontSize: "clamp(2.1rem, 5.2vw, 3.5rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", cursor: "pointer", userSelect: "none" }}>
          LaptopCore<span style={{ color: "var(--accent)", opacity: 0.9, WebkitTextFillColor: "var(--accent)" }}>.</span>
        </h1>
        <p style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>Monitor prices</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span>compare specs</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span>track history</span>
        </p>
        {currency === "USD" && <p style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)" }}>Live rate: 1 CAD = {cadToUsd.toFixed(4)} USD</p>}
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="lc-icon-btn" onClick={onThemeToggle} title={isDark ? "Switch to light" : "Switch to dark"}
          style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isDark ? "☀️" : "🌙"}
        </button>
        <button className="lc-icon-btn" onClick={onCurrencyToggle}
          style={{ background: currency === "USD" ? "rgba(139,179,245,0.12)" : "var(--surface)", color: "var(--text)", border: currency === "USD" ? "1px solid rgba(139,179,245,0.5)" : "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ opacity: currency === "CAD" ? 1 : 0.45 }}>CAD</span>
          <span style={{ opacity: 0.35, fontSize: 11 }}>/</span>
          <span style={{ opacity: currency === "USD" ? 1 : 0.45 }}>USD</span>
        </button>
        <button className="lc-deals-btn" onClick={onDeals}
          style={{ background: "rgba(247,194,106,0.12)", color: "var(--accent-2)", border: "1px solid rgba(247,194,106,0.4)", borderRadius: 10, padding: "11px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          🔥 Crazy Deals
        </button>
        <button className="lc-add-btn" onClick={onAdd}
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-3))", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 700, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(139,179,245,0.3)" }}>
          + Add Laptop
        </button>
      </div>
    </header>
  );
}