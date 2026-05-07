"use client";

import type { Laptop } from "@/lib/supabase";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = {
  laptop: Laptop;
  onClose: () => void;
  onUpdatePrice: (id: number) => void;
  onDelete: (id: number) => void;
  onHistory: (l: Laptop) => void;
};

export default function LaptopModal({ laptop, onClose, onUpdatePrice, onDelete, onHistory }: Props) {
  const price = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? price;
  const hasDiscount = retail > price;
  const discountPct = hasDiscount ? ((retail - price) / retail * 100).toFixed(1) : null;

  const rows: [string, string][] = [
    ["Brand",        laptop.brand],
    ["Model",        laptop.model],
    ["Store",        laptop.store],
    ["Release Year", String(laptop.release_year ?? "—")],
    ["Date Added",   laptop.date_added],
    ["Current Price",fmt(price)],
    ["Retail Price", fmt(retail)],
    ...(discountPct ? [["Discount", `${discountPct}% off`] as [string, string]] : []),
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border-hover)",
        borderRadius: 16,
        width: "100%",
        maxWidth: 560,
        maxHeight: "85vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: "fadeUp 0.3s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 6,
            }}>{laptop.brand}</div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "1.4rem",
              color: "var(--text)",
              lineHeight: 1.2,
            }}>{laptop.model}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text-muted)",
              cursor: "pointer",
              width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
              transition: "all 0.15s",
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {/* Specs */}
          <div style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 20,
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.7,
            borderLeft: "3px solid var(--accent)",
          }}>
            {laptop.specs}
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{
                    padding: "10px 0",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    width: "40%",
                  }}>{label}</td>
                  <td style={{
                    padding: "10px 0",
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: label === "Current Price" ? "var(--accent-3)" : "var(--text)",
                  }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* URL */}
          {laptop.url && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>Store URL</div>
              <a
                href={laptop.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "var(--accent)",
                  wordBreak: "break-all",
                }}
              >
                {laptop.url}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}>
          <button
            onClick={() => onUpdatePrice(laptop.id)}
            style={btnStyle("var(--accent)")}
          >
            + Update Price
          </button>
          <button
            onClick={() => onHistory(laptop)}
            style={btnStyle("transparent", "var(--border)", "var(--text-muted)")}
          >
            📈 Price History
          </button>
          <a
            href={laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnStyle("transparent", "var(--border)", "var(--text-muted)"), textDecoration: "none" }}
          >
            🔗 Visit Store
          </a>
          <button
            onClick={() => onDelete(laptop.id)}
            style={{ ...btnStyle("transparent", "rgba(247,106,106,0.3)", "#f76a6a"), marginLeft: "auto" }}
          >
            🗑 Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string, border = "transparent", color = "#fff"): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 8,
    color,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    padding: "9px 16px",
    cursor: "pointer",
    transition: "opacity 0.15s",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  };
}
