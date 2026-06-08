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

function parseSpecs(specs: string) {
  return specs.split(",").map(s => s.trim()).filter(Boolean);
}

export default function LaptopCard({ laptop, onSelect, onHistory, isAdmin, onMoveToDeals, onDelete, currency = "CAD", cadToUsd = 0.73 }: Props) {
  const price       = laptop.current_price ?? 0;
  const retail      = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUrl, setPendingUrl]   = useState("");
  const [imgError, setImgError]       = useState(false);
  const [imgLoaded, setImgLoaded]     = useState(false);
  const [hovered, setHovered]         = useState(false);

  const specParts  = laptop.specs ? parseSpecs(laptop.specs) : [];
  const goodForTags = laptop.good_for
    ? laptop.good_for.split(",").map(s => s.trim()).filter(Boolean).slice(0, 2)
    : [];

  return (
    <>
      <div
        onClick={() => window.location.href = `/laptop/${laptop.id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "var(--surface-2)" : "var(--surface)",
          border: `1px solid ${hovered ? "rgba(139,179,245,0.3)" : "var(--border)"}`,
          borderRadius: 16,
          overflow: "hidden",
          cursor: "pointer",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          transition: "all 0.18s ease",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hovered ? "0 10px 40px rgba(0,0,0,0.25)" : "none",
        }}
      >
        {/* Left accent bar */}
        <div style={{
          width: 3, flexShrink: 0,
          background: hasDiscount
            ? "linear-gradient(180deg, var(--accent-2), var(--accent-3))"
            : "linear-gradient(180deg, var(--accent), var(--accent-3))",
          opacity: hovered ? 1 : 0.45,
          transition: "opacity 0.18s",
        }} />

        {/* Image */}
        <div style={{
          width: 160, flexShrink: 0,
          background: "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px 16px",
          borderRight: "1px solid var(--border)",
          position: "relative",
        }}>
          {hasDiscount && (
            <div style={{
              position: "absolute", top: 10, left: 10,
              fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
              color: "var(--accent-2)", background: "rgba(247,194,106,0.15)",
              border: "1px solid rgba(247,194,106,0.3)",
              borderRadius: 5, padding: "2px 6px",
            }}>-{discountPct}% OFF</div>
          )}
          {(laptop as any).image_url && !imgError ? (
            <img
              src={(laptop as any).image_url}
              alt={laptop.model}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{
                maxHeight: 110, maxWidth: 130, objectFit: "contain",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.3s, transform 0.2s",
                transform: hovered ? "scale(1.06)" : "scale(1)",
              }}
            />
          ) : (
            <div style={{ fontSize: 44, opacity: 0.25 }}>💻</div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          <div>
            {/* Brand + store + year */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--accent)", background: "rgba(139,179,245,0.1)",
                border: "1px solid rgba(139,179,245,0.2)", borderRadius: 4, padding: "2px 7px",
              }}>{laptop.brand}</span>
              {(laptop as any).is_deal && !hasDiscount && (
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent-3)", background: "rgba(106,247,184,0.1)", border: "1px solid rgba(106,247,184,0.2)", borderRadius: 4, padding: "2px 7px" }}>✦ DEAL</span>
              )}
              <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>
                {laptop.store} · {laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? "—"}
              </span>
            </div>

            {/* Model name */}
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", marginBottom: 10, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {laptop.model}
            </div>

            {/* Spec pills */}
            {specParts.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                {specParts.slice(0, 4).map((s, i) => (
                  <span key={i} style={{
                    fontSize: 10, color: "var(--text-muted)",
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: 5, padding: "2px 8px", whiteSpace: "nowrap",
                  }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: screen/weight/good-for badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {laptop.screen_size && (
              <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 8px" }}>
                🖥 {laptop.screen_size}"
              </span>
            )}
            {laptop.weight_kg && (
              <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 8px" }}>
                ⚖ {laptop.weight_kg} kg
              </span>
            )}
            {goodForTags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, color: "var(--accent)", opacity: 0.8,
                background: "rgba(139,179,245,0.07)", border: "1px solid rgba(139,179,245,0.15)",
                borderRadius: 5, padding: "2px 8px",
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Right: price + actions */}
        <div style={{
          flexShrink: 0, padding: "18px 20px",
          display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between",
          borderLeft: "1px solid var(--border)", minWidth: 170,
          background: hovered ? "rgba(139,179,245,0.03)" : "transparent",
          transition: "background 0.18s",
        }}>
          {/* Price */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--accent-3)", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {fmt(price, currency, cadToUsd)}
            </div>
            {hasDiscount && (
              <>
                <div style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through", marginTop: 4, opacity: 0.7 }}>
                  {fmt(retail, currency, cadToUsd)}
                </div>
                <div style={{ fontSize: 11, color: "var(--accent-2)", fontWeight: 700, marginTop: 3 }}>
                  Save {fmt(retail - price, currency, cadToUsd)}
                </div>
              </>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => window.location.href = `/laptop/${laptop.id}`}
              style={{ width: "100%", background: "var(--accent)", border: "none", borderRadius: 9, color: "var(--bg)", fontSize: 12, fontWeight: 700, padding: "9px 12px", cursor: "pointer", transition: "opacity 0.15s, transform 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
            >View Details</button>

            <div style={{ display: "flex", gap: 5 }}>
              <button
                onClick={() => onHistory(laptop)}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 10, padding: "7px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, transition: "all 0.15s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent)"; el.style.color = "var(--accent)"; el.style.background = "rgba(139,179,245,0.06)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
              >📈 History</button>
              <button
                onClick={() => { const url = laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`; setPendingUrl(url); setShowWarning(true); }}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", fontSize: 10, padding: "7px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, transition: "all 0.15s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent-3)"; el.style.color = "var(--accent-3)"; el.style.background = "rgba(106,247,184,0.06)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
              >🔗 Visit</button>
            </div>

            {isAdmin && (
              <div style={{ display: "flex", gap: 5 }}>
                {onMoveToDeals && (
                  <button onClick={() => onMoveToDeals(laptop)}
                    style={{ flex: 1, background: "rgba(247,194,106,0.08)", border: "1px solid rgba(247,194,106,0.3)", borderRadius: 7, color: "var(--accent-2)", fontSize: 10, padding: "6px 0", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.18)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.08)"; }}
                  >🔥 Deal</button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(laptop.id)}
                    style={{ flex: 1, background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 7, color: "var(--accent-red)", fontSize: 10, padding: "6px 0", cursor: "pointer", transition: "background 0.15s" }}
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
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}
          onClick={() => setShowWarning(false)}
        >
          <div
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", maxWidth: 360, margin: "1rem" }}
            onClick={(e) => e.stopPropagation()}
          >
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
