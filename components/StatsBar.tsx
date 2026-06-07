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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 32 }}>
      {STATS.map((s) => (
        <div key={s.key}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", position: "relative", overflow: "hidden", transition: "all 0.2s" }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = s.color; el.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.transform = "translateY(0)"; }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.8 }} />
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 600 }}>{s.label}</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: "-0.03em" }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
