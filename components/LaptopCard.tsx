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
  const price       = laptop.current_price ?? 0;
  const retail      = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUrl, setPendingUrl]   = useState("");
  const [imgError, setImgError]       = useState(false);
  const [imgLoaded, setImgLoaded]     = useState(false);
  const [hovered, setHovered]         = useState(false);

  const specParts   = laptop.specs ? laptop.specs.split(",").map(s => s.trim()).filter(Boolean) : [];
  const goodForTags = laptop.good_for ? laptop.good_for.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3) : [];

  const visitUrl = laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`;

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "var(--surface)",
          border: `1px solid ${hovered ? "rgba(139,179,245,0.35)" : "var(--border)"}`,
          borderRadius: 18,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "200px 1fr auto",
          cursor: "pointer",
          transition: "all 0.2s ease",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 16px 48px rgba(0,0,0,0.3), 0 0 0 1px rgba(139,179,245,0.1)"
            : "0 2px 8px rgba(0,0,0,0.15)",
        }}
        onClick={() => window.location.href = `/laptop/${laptop.id}`}
      >
        {/* ── IMAGE COLUMN ── */}
        <div style={{
          background: "linear-gradient(135deg, rgba(139,179,245,0.06) 0%, rgba(106,247,184,0.04) 100%)",
          borderRight: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, position: "relative", minHeight: 160,
        }}>
          {/* Discount badge */}
          {hasDiscount && (
            <div style={{
              position: "absolute", top: 12, left: 12,
              background: "linear-gradient(135deg, #f7c26a, #f4a830)",
              color: "#1a1200", fontSize: 10, fontWeight: 900,
              borderRadius: 6, padding: "3px 8px", letterSpacing: "0.04em",
            }}>-{discountPct}%</div>
          )}
          {(laptop as any).is_deal && (
            <div style={{
              position: "absolute", top: hasDiscount ? 38 : 12, left: 12,
              background: "linear-gradient(135deg, rgba(106,247,184,0.2), rgba(106,247,184,0.1))",
              border: "1px solid rgba(106,247,184,0.3)",
              color: "var(--accent-3)", fontSize: 9, fontWeight: 800,
              borderRadius: 6, padding: "3px 8px", letterSpacing: "0.06em",
            }}>HOT DEAL</div>
          )}

          {(laptop as any).image_url && !imgError ? (
            <img
              src={(laptop as any).image_url}
              alt={laptop.model}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{
                maxHeight: 120, maxWidth: 160, objectFit: "contain",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.3s, transform 0.25s",
                transform: hovered ? "scale(1.08) translateY(-2px)" : "scale(1)",
                filter: hovered ? "drop-shadow(0 8px 16px rgba(0,0,0,0.3))" : "none",
              }}
            />
          ) : (
            <div style={{ fontSize: 52, opacity: 0.15, transition: "transform 0.25s", transform: hovered ? "scale(1.08)" : "scale(1)" }}>💻</div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          <div>
            {/* Brand chip + meta */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "var(--accent)", background: "rgba(139,179,245,0.12)",
                border: "1px solid rgba(139,179,245,0.25)", borderRadius: 6, padding: "3px 9px",
              }}>{laptop.brand}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {laptop.store && `${laptop.store} · `}{laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? ""}
              </span>
            </div>

            {/* Model name */}
            <h3 style={{
              fontWeight: 800, fontSize: 18, color: "var(--text)",
              margin: "0 0 12px 0", lineHeight: 1.2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{laptop.model}</h3>

            {/* Spec pills */}
            {specParts.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {specParts.slice(0, 4).map((s, i) => (
                  <span key={i} style={{
                    fontSize: 11, color: "var(--text-muted)",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, padding: "3px 10px",
                  }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom row: screen/weight/tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {laptop.screen_size && (
              <span style={{ fontSize: 10, color: "var(--text-dim)", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 8px" }}>
                {laptop.screen_size}" display
              </span>
            )}
            {laptop.weight_kg && (
              <span style={{ fontSize: 10, color: "var(--text-dim)", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 8px" }}>
                {laptop.weight_kg} kg
              </span>
            )}
            {goodForTags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, color: "var(--accent)", fontWeight: 600,
                background: "rgba(139,179,245,0.08)",
                border: "1px solid rgba(139,179,245,0.18)",
                borderRadius: 5, padding: "2px 8px",
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* ── PRICE + ACTIONS COLUMN ── */}
        <div style={{
          borderLeft: "1px solid var(--border)",
          padding: "20px 22px",
          display: "flex", flexDirection: "column",
          alignItems: "flex-end", justifyContent: "space-between",
          minWidth: 190,
          background: hovered
            ? "linear-gradient(180deg, rgba(139,179,245,0.04) 0%, transparent 100%)"
            : "transparent",
          transition: "background 0.2s",
        }}>
          {/* Price block */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
              color: hasDiscount ? "var(--accent-3)" : "var(--text)",
              background: hasDiscount
                ? "linear-gradient(135deg, var(--accent-3), #4dffc3)"
                : "none",
              WebkitBackgroundClip: hasDiscount ? "text" : "unset",
              WebkitTextFillColor: hasDiscount ? "transparent" : "unset",
            }}>
              {fmt(price, currency, cadToUsd)}
            </div>
            {hasDiscount && (
              <div style={{ marginTop: 5 }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through", opacity: 0.6 }}>
                  {fmt(retail, currency, cadToUsd)}
                </div>
                <div style={{ fontSize: 12, color: "#f7c26a", fontWeight: 700, marginTop: 2 }}>
                  Save {fmt(retail - price, currency, cadToUsd)}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.location.href = `/laptop/${laptop.id}`}
              style={{
                width: "100%", border: "none", borderRadius: 10,
                background: "linear-gradient(135deg, var(--accent), #6ab4f5)",
                color: "#fff", fontSize: 12, fontWeight: 700,
                padding: "10px 14px", cursor: "pointer",
                transition: "opacity 0.15s, transform 0.15s",
                boxShadow: "0 4px 14px rgba(139,179,245,0.25)",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
            >View Details →</button>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => onHistory(laptop)}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 10, fontWeight: 600, padding: "7px 0", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent)"; el.style.color = "var(--accent)"; el.style.background = "rgba(139,179,245,0.07)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
              >📈 History</button>
              <button
                onClick={() => { setPendingUrl(visitUrl); setShowWarning(true); }}
                style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 10, fontWeight: 600, padding: "7px 0", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent-3)"; el.style.color = "var(--accent-3)"; el.style.background = "rgba(106,247,184,0.07)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
              >🔗 Visit</button>
            </div>

            {isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                {onMoveToDeals && (
                  <button onClick={() => onMoveToDeals(laptop)}
                    style={{ flex: 1, background: "rgba(247,194,106,0.08)", border: "1px solid rgba(247,194,106,0.3)", borderRadius: 7, color: "var(--accent-2)", fontSize: 10, padding: "6px 0", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.08)"; }}
                  >🔥 Deal</button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(laptop.id)}
                    style={{ flex: 1, background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 7, color: "var(--accent-red)", fontSize: 10, padding: "6px 0", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.2)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.08)"; }}
                  >🗑</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWarning && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
          onClick={() => setShowWarning(false)}
        >
          <div
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", maxWidth: 360, margin: "1rem" }}
            onClick={e => e.stopPropagation()}
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
