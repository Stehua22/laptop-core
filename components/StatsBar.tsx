"use client";

function fmt(n: number, currency: "CAD" | "USD" = "CAD", rate = 0.73) {
  if (n === 0) return currency === "USD" ? "US$0" : "CA$0";
  const value = currency === "USD" ? n * rate : n;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

type Stats = { count: number; avg: number; min: number; max: number };

export default function StatsBar({ stats, currency = "CAD", cadToUsd = 0.73 }: { stats: Stats; currency?: "CAD" | "USD"; cadToUsd?: number }) {
  const STATS = [
    { key: "count", label: "Tracked",   color: "var(--accent)",     value: stats.count.toString() },
    { key: "avg",   label: "Avg Price", color: "var(--accent-2)",   value: fmt(stats.avg, currency, cadToUsd) },
    { key: "min",   label: "Lowest",    color: "var(--accent-3)",   value: fmt(stats.min, currency, cadToUsd) },
    { key: "max",   label: "Highest",   color: "var(--accent-red)", value: fmt(stats.max, currency, cadToUsd) },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 40 }}>
      {STATS.map((s, i) => (
        <div key={s.key} className="animate-fade-up stats-card"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden", animationDelay: `${i * 0.07}s`, cursor: "default" }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = s.color; el.style.transform = "translateY(-3px)"; el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px ${s.color}33`; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
        >
          <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${s.color}28, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, fontWeight: 600 }}>{s.label}</div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: "-0.03em", transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)" }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
