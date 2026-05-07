"use client";

import type { Laptop } from "@/lib/supabase";

type Props = {
  laptop: Laptop;
  onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void;
};

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function LaptopCard({ laptop, onSelect, onHistory }: Props) {
  const price = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;

  return (
    <div
      onClick={() => onSelect(laptop)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--border-hover)";
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--border)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: "var(--accent)", opacity: 0.6 }} />

      <div style={{ padding: "20px 20px 16px", flex: 1 }}>
        {/* Brand tag */}
        <div style={{
          display: "inline-block",
          background: "rgba(124, 106, 247, 0.12)",
          color: "var(--accent)",
          borderRadius: 6,
          padding: "3px 8px",
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.1em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          {laptop.brand}
        </div>

        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: "1rem",
          color: "var(--text)",
          marginBottom: 4,
          lineHeight: 1.3,
        }}>
          {laptop.model}
        </div>

        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 14,
        }}>
          {laptop.store} · {laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? "—"}
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "1.5rem",
            color: "var(--accent-3)",
          }}>
            {fmt(price)}
          </span>
          {hasDiscount && (
            <>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                color: "var(--text-dim)",
                textDecoration: "line-through",
              }}>
                {fmt(retail)}
              </span>
              <span style={{
                background: "rgba(247, 194, 106, 0.15)",
                color: "var(--accent-2)",
                borderRadius: 5,
                padding: "2px 6px",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
              }}>
                -{discountPct}%
              </span>
            </>
          )}
        </div>

        {/* Specs */}
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: "var(--text-muted)",
          lineHeight: 1.6,
          borderLeft: "2px solid var(--border)",
          paddingLeft: 10,
        }}>
          {laptop.specs}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: "flex",
        gap: 8,
        padding: "12px 20px 16px",
        borderTop: "1px solid var(--border)",
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onHistory(laptop)}
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-muted)",
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            padding: "8px 12px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--accent)";
            el.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--border)";
            el.style.color = "var(--text-muted)";
          }}
        >
          📈 History
        </button>
        <a
          href={laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-muted)",
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            padding: "8px 12px",
            cursor: "pointer",
            transition: "all 0.15s",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--accent-3)";
            el.style.color = "var(--accent-3)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--border)";
            el.style.color = "var(--text-muted)";
          }}
        >
          🔗 Visit
        </a>
      </div>
    </div>
  );
}
