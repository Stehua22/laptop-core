"use client";
import { useState } from "react";
import type { Laptop } from "@/lib/supabase";

type Props = {
  laptop: Laptop;
  onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void;
  isAdmin?: boolean;
  onMoveToDeals?: (l: Laptop) => void;
  onDelete?: (id: number) => void;
  currency?: "CAD" | "USD";
  cadToUsd?: number;
};

function fmt(n: number, currency: "CAD" | "USD" = "CAD", rate = 0.73) {
  const value = currency === "USD" ? n * rate : n;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function LaptopCard({ laptop, onSelect, onHistory, isAdmin, onMoveToDeals, onDelete, currency = "CAD", cadToUsd = 0.73 }: Props) {
  const price = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <div
        onClick={() => window.location.href = `/laptop/${laptop.id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "var(--surface-2)" : "var(--surface)",
          border: `1px solid ${hovered ? "rgba(139,179,245,0.25)" : "var(--border)"}`,
          borderRadius: 16,
          overflow: "hidden",
          cursor: "pointer",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          transition: "all 0.2s ease",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.2)" : "none",
        }}
      >
        {/* Left accent bar */}
        <div style={{ width: 3, flexShrink: 0, background: hasDiscount ? "linear-gradient(180deg, var(--accent-2), var(--accent-3))" : "linear-gradient(180deg, var(--accent), var(--accent-3))", opacity: hovered ? 1 : 0.5, transition: "opacity 0.2s" }} />

        {/* Image */}
        <div style={{ width: 140, flexShrink: 0, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, borderRight: "1px solid var(--border)" }}>
          {(laptop as any).image_url && !imgError ? (
            <img
              src={(laptop as any).image_url}
              alt={laptop.model}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{ maxHeight: 100, maxWidth: 110, objectFit: "contain", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s", transform: hovered ? "scale(1.05)" : "scale(1)", transitionProperty: "opacity, transform" }}
            />
          ) : (
            <div style={{ fontSize: 40, opacity: 0.4 }}>💻</div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(139,179,245,0.1)", border: "1px solid rgba(139,179,245,0.2)", borderRadius: 4, padding: "2px 7px" }}>{laptop.brand}</span>
              {hasDiscount && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-2)", background: "rgba(247,194,106,0.1)", border: "1px solid rgba(247,194,106,0.25)", borderRadius: 4, padding: "2px 7px" }}>🔥 -{discountPct}% OFF</span>}
              {(laptop as any).is_deal && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent-3)", background: "rgba(106,247,184,0.1)", border: "1px solid rgba(106,247,184,0.2)", borderRadius: 4, padding: "2px 7px" }}>DEAL</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{laptop.model}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>{laptop.store} · {laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? "—"}</div>
            {laptop.specs && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                {laptop.specs}
              </div>
            )}
          </div>
        </div>

        {/* Right: price + actions */}
        <div style={{ flexShrink: 0, padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", borderLeft: "1px solid var(--border)", minWidth: 160 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-3)", letterSpacing: "-0.03em", lineHeight: 1 }}>{fmt(price, currency, cadToUsd)}</div>
            {hasDiscount && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through", marginTop: 3 }}>{fmt(retail, currency, cadToUsd)}</div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => window.location.href = `/laptop/${laptop.id}`}
              style={{ width: "100%", background: "var(--accent)", border: "none", borderRadius: 8, color: "var(--bg)", fontSize: 11, fontWeight: 700, padding: "8px 12px", cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >View Details</button>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => onHistory(laptop)}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 10, padding: "6px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent)"; el.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; }}
              >📈 History</button>
              <button onClick={() => { const url = laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`; setPendingUrl(url); setShowWarning(true); }}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 10, padding: "6px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent-3)"; el.style.color = "var(--accent-3)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; }}
              >🔗 Visit</button>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 5 }}>
                {onMoveToDeals && (
                  <button onClick={() => onMoveToDeals(laptop)}
                    style={{ flex: 1, background: "rgba(247,194,106,0.08)", border: "1px solid rgba(247,194,106,0.3)", borderRadius: 7, color: "var(--accent-2)", fontSize: 10, padding: "6px 0", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.18)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.08)"; }}
                  >🔥 Deal</button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(laptop.id)}
                    style={{ flex: 1, background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 7, color: "var(--accent-red)", fontSize: 10, padding: "6px 0", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.18)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.08)"; }}
                  >🗑</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowWarning(false)}>
          <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", maxWidth: 360, margin: "1rem" }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>⚠️ Price Warning</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>Prices may not be accurate. The price shown may differ from what's currently on the store website.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowWarning(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { window.open(pendingUrl, "_blank"); setShowWarning(false); }} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Continue →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
