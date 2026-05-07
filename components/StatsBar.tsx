"use client";

const fmt = (n: number) =>
  n === 0 ? "$0" : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type Stats = { count: number; avg: number; min: number; max: number };

const STATS = [
  { key: "count",  label: "Tracked",  color: "var(--accent)",   format: (s: Stats) => s.count.toString() },
  { key: "avg",    label: "Avg Price", color: "var(--accent-2)", format: (s: Stats) => fmt(s.avg) },
  { key: "min",    label: "Lowest",   color: "var(--accent-3)", format: (s: Stats) => fmt(s.min) },
  { key: "max",    label: "Highest",  color: "#f76a6a",         format: (s: Stats) => fmt(s.max) },
];

export default function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 12,
      marginBottom: 32,
    }}>
      {STATS.map((s) => (
        <div key={s.key} style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
          transition: "border-color 0.2s",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 8,
          }}>{s.label}</div>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "1.75rem",
            fontWeight: 800,
            color: s.color,
            lineHeight: 1,
          }}>{s.format(stats)}</div>
        </div>
      ))}
    </div>
  );
}
