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
  compareSelected?: boolean;
  onCompareToggle?: (l: Laptop) => void;
  compareDisabled?: boolean;
  cardLayout?: "row" | "grid" | "compact";
};

function fmt(n: number, currency: "CAD" | "USD" = "CAD", rate = 0.73) {
  const value = currency === "USD" ? n * rate : n;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default function LaptopCard({ laptop, onSelect, onHistory, isAdmin, onMoveToDeals, onDelete, currency = "CAD", cadToUsd = 0.73, compareSelected = false, onCompareToggle, compareDisabled = false, cardLayout = "row" }: Props) {
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
  const visitUrl    = laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`;

  /* ═════════════════════════════════════════════
     Compact layout — dense single-line list row
     ═════════════════════════════════════════════ */
  if (cardLayout === "compact") {
    return (
      <>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: compareSelected ? "rgba(139,179,245,0.06)" : "var(--card-bg, var(--surface))",
            border: `1px solid ${compareSelected ? "var(--accent)" : hovered ? "var(--border-hover)" : "var(--card-border, var(--border))"}`,
            borderRadius: "var(--card-radius, 18px)",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            cursor: "pointer",
            transition: "all 0.2s ease",
            transform: hovered ? `translateY(var(--card-hover-y, -3px))` : "translateY(0)",
            boxShadow: hovered ? "var(--card-hover-shadow)" : "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
            backdropFilter: `blur(var(--card-blur, 0px))`,
          }}
          onClick={() => window.location.href = `/laptop/${laptop.id}`}
        >
          {/* Brand badge */}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(139,179,245,0.12)", border: "1px solid rgba(139,179,245,0.25)", borderRadius: "var(--btn-radius, 10px)", padding: "3px 9px", flexShrink: 0 }}>{laptop.brand}</span>

          {/* Model name */}
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{laptop.model}</span>

          {/* Key spec */}
          {specParts.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-dim)", display: "none" }} className="compact-spec">{specParts[0]}</span>
          )}

          {/* Tags */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {goodForTags.slice(0, 2).map(tag => (
              <span key={tag} style={{ fontSize: 9, color: "var(--accent)", fontWeight: 600, background: "rgba(139,179,245,0.08)", border: "1px solid rgba(139,179,245,0.18)", borderRadius: 5, padding: "2px 6px" }}>{tag}</span>
            ))}
          </div>

          {/* Price */}
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: hasDiscount ? "var(--accent-3)" : "var(--text)", flexShrink: 0, textAlign: "right", minWidth: 80 }}>
            {fmt(price, currency, cadToUsd)}
          </div>

          {hasDiscount && (
            <span style={{ fontSize: 10, color: "#f7c26a", fontWeight: 700, flexShrink: 0 }}>-{discountPct}%</span>
          )}

          {/* Compare */}
          {onCompareToggle && (
            <button
              onClick={e => { e.stopPropagation(); if (!compareDisabled || compareSelected) onCompareToggle(laptop); }}
              disabled={compareDisabled && !compareSelected}
              style={{ fontSize: 10, padding: "4px 10px", borderRadius: "var(--btn-radius, 10px)", border: `1px solid ${compareSelected ? "var(--accent)" : "var(--border)"}`, background: compareSelected ? "rgba(139,179,245,0.15)" : "transparent", color: compareSelected ? "var(--accent)" : "var(--text-muted)", cursor: compareDisabled && !compareSelected ? "not-allowed" : "pointer", fontWeight: 600, transition: "all 0.15s", opacity: compareDisabled && !compareSelected ? 0.4 : 1, flexShrink: 0 }}
            >
              {compareSelected ? "✓" : "+"}
            </button>
          )}
        </div>

        {showWarning && renderWarning()}
      </>
    );
  }

  /* ═════════════════════════════════════════════
     Grid layout — vertical card (image on top)
     ═════════════════════════════════════════════ */
  if (cardLayout === "grid") {
    return (
      <>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: compareSelected ? "rgba(139,179,245,0.06)" : "var(--card-bg, var(--surface))",
            border: `1px solid ${compareSelected ? "var(--accent)" : hovered ? "var(--border-hover)" : "var(--card-border, var(--border))"}`,
            borderRadius: "var(--card-radius, 18px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer",
            transition: "all 0.2s ease",
            transform: hovered ? `translateY(var(--card-hover-y, -3px))` : "translateY(0)",
            boxShadow: compareSelected
              ? "0 0 0 2px rgba(139,179,245,0.2)"
              : hovered
              ? "var(--card-hover-shadow)"
              : "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
            backdropFilter: `blur(var(--card-blur, 0px))`,
          }}
          onClick={() => window.location.href = `/laptop/${laptop.id}`}
        >
          {/* Image area */}
          <div style={{
            background: "linear-gradient(135deg, rgba(139,179,245,0.06) 0%, rgba(106,247,184,0.04) 100%)",
            borderBottom: "1px solid var(--card-border, var(--border))",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, position: "relative", minHeight: 140,
          }}>
            {hasDiscount && (
              <div style={{ position: "absolute", top: 10, left: 10, background: "linear-gradient(135deg, #f7c26a, #f4a830)", color: "#1a1200", fontSize: 10, fontWeight: 900, borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px", letterSpacing: "0.04em" }}>-{discountPct}%</div>
            )}
            {(laptop as any).is_deal && (
              <div style={{ position: "absolute", top: hasDiscount ? 34 : 10, left: 10, background: "rgba(106,247,184,0.15)", border: "1px solid rgba(106,247,184,0.3)", color: "var(--accent-3)", fontSize: 9, fontWeight: 800, borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px" }}>HOT DEAL</div>
            )}
            {(laptop as any).image_url && !imgError ? (
              <img
                src={(laptop as any).image_url} alt={laptop.model}
                onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
                style={{ maxHeight: 110, maxWidth: "85%", objectFit: "contain", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s, transform 0.25s", transform: hovered ? "scale(1.08) translateY(-2px)" : "scale(1)", filter: hovered ? "drop-shadow(0 8px 16px rgba(0,0,0,0.3))" : "none" }}
              />
            ) : (
              <div style={{ fontSize: 44, opacity: 0.15 }}>💻</div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(139,179,245,0.12)", border: "1px solid rgba(139,179,245,0.25)", borderRadius: "var(--btn-radius, 10px)", padding: "2px 7px" }}>{laptop.brand}</span>
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{laptop.release_year ?? ""}</span>
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", margin: 0, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{laptop.model}</h3>
            {specParts.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {specParts.slice(0, 3).map((s, i) => (
                  <span key={i} style={{ fontSize: 10, color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, padding: "2px 8px" }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Price + Actions */}
          <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--card-border, var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: hasDiscount ? "var(--accent-3)" : "var(--text)" }}>
                {fmt(price, currency, cadToUsd)}
              </div>
              {hasDiscount && (
                <div style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "line-through", opacity: 0.6, marginTop: 2 }}>{fmt(retail, currency, cadToUsd)}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onHistory(laptop)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", color: "var(--text-muted)", fontSize: 10, fontWeight: 600, padding: "6px 10px", cursor: "pointer", transition: "all 0.15s" }}>📈</button>
              <button onClick={() => { setPendingUrl(visitUrl); setShowWarning(true); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", color: "var(--text-muted)", fontSize: 10, fontWeight: 600, padding: "6px 10px", cursor: "pointer", transition: "all 0.15s" }}>🔗</button>
            </div>
          </div>
        </div>

        {showWarning && renderWarning()}
      </>
    );
  }

  /* ═════════════════════════════════════════════
     Row layout — default 3-column horizontal card
     ═════════════════════════════════════════════ */
  function renderWarning() {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={() => setShowWarning(false)}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 16px)", padding: "1.5rem", maxWidth: 360, margin: "1rem" }} onClick={e => e.stopPropagation()}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>⚠️ Price Warning</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>Prices may not be accurate. The price shown may differ from what's currently on the store website.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowWarning(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: "var(--btn-radius, 10px)", border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
            <button onClick={() => { window.open(pendingUrl, "_blank"); setShowWarning(false); }} style={{ fontSize: 13, padding: "8px 18px", borderRadius: "var(--btn-radius, 10px)", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Continue →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: compareSelected ? "rgba(139,179,245,0.06)" : "var(--card-bg, var(--surface))",
          border: `1px solid ${compareSelected ? "var(--accent)" : hovered ? "rgba(139,179,245,0.35)" : "var(--card-border, var(--border))"}`,
          borderRadius: "var(--card-radius, 18px)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "200px 1fr auto",
          cursor: "pointer",
          transition: "all 0.2s ease",
          transform: hovered ? `translateY(var(--card-hover-y, -3px))` : "translateY(0)",
          boxShadow: compareSelected
            ? "0 0 0 2px rgba(139,179,245,0.2)"
            : hovered
            ? "var(--card-hover-shadow)"
            : "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
          backdropFilter: `blur(var(--card-blur, 0px))`,
        }}
        onClick={() => window.location.href = `/laptop/${laptop.id}`}
      >
        {/* IMAGE */}
        <div style={{
          background: "linear-gradient(135deg, rgba(139,179,245,0.06) 0%, rgba(106,247,184,0.04) 100%)",
          borderRight: "1px solid var(--card-border, var(--border))",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, position: "relative", minHeight: 160,
        }}>
          {hasDiscount && (
            <div style={{ position: "absolute", top: 12, left: 12, background: "linear-gradient(135deg, #f7c26a, #f4a830)", color: "#1a1200", fontSize: 10, fontWeight: 900, borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px", letterSpacing: "0.04em" }}>-{discountPct}%</div>
          )}
          {(laptop as any).is_deal && (
            <div style={{ position: "absolute", top: hasDiscount ? 38 : 12, left: 12, background: "rgba(106,247,184,0.15)", border: "1px solid rgba(106,247,184,0.3)", color: "var(--accent-3)", fontSize: 9, fontWeight: 800, borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px" }}>HOT DEAL</div>
          )}
          {(laptop as any).image_url && !imgError ? (
            <img
              src={(laptop as any).image_url} alt={laptop.model}
              onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
              style={{ maxHeight: 120, maxWidth: 160, objectFit: "contain", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s, transform 0.25s", transform: hovered ? "scale(1.08) translateY(-2px)" : "scale(1)", filter: hovered ? "drop-shadow(0 8px 16px rgba(0,0,0,0.3))" : "none" }}
            />
          ) : (
            <div style={{ fontSize: 52, opacity: 0.15 }}>💻</div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", background: "rgba(139,179,245,0.12)", border: "1px solid rgba(139,179,245,0.25)", borderRadius: "var(--btn-radius, 10px)", padding: "3px 9px" }}>{laptop.brand}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {laptop.store && `${laptop.store} · `}{laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? ""}
              </span>
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", margin: "0 0 12px 0", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{laptop.model}</h3>
            {specParts.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {specParts.slice(0, 4).map((s, i) => (
                  <span key={i} style={{ fontSize: 11, color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 10px" }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: badges + compare toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {laptop.screen_size && <span style={{ fontSize: 10, color: "var(--text-dim)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 8px" }}>{laptop.screen_size}" display</span>}
              {laptop.weight_kg && <span style={{ fontSize: 10, color: "var(--text-dim)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 8px" }}>{laptop.weight_kg} kg</span>}
              {goodForTags.map(tag => (
                <span key={tag} style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, background: "rgba(139,179,245,0.08)", border: "1px solid rgba(139,179,245,0.18)", borderRadius: 5, padding: "2px 8px" }}>{tag}</span>
              ))}
            </div>

           {onCompareToggle && (
  <button
    onClick={e => { e.stopPropagation(); if (!compareDisabled || compareSelected) onCompareToggle(laptop); }}
    disabled={compareDisabled && !compareSelected}
    style={{ fontSize: 11, padding: "4px 12px", borderRadius: "var(--btn-radius, 10px)", border: `1px solid ${compareSelected ? "var(--accent)" : "var(--border)"}`, background: compareSelected ? "rgba(139,179,245,0.15)" : "transparent", color: compareSelected ? "var(--accent)" : "var(--text-muted)", cursor: compareDisabled && !compareSelected ? "not-allowed" : "pointer", fontWeight: 600, transition: "all 0.15s", opacity: compareDisabled && !compareSelected ? 0.4 : 1, flexShrink: 0 }}
  >
    {compareSelected ? "✓ Added" : "+ Compare"}
  </button>
)}
          </div>
        </div>

        {/* PRICE + ACTIONS */}
        <div style={{ borderLeft: "1px solid var(--card-border, var(--border))", padding: "20px 22px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", minWidth: 190, background: hovered ? "linear-gradient(180deg, rgba(139,179,245,0.04) 0%, transparent 100%)" : "transparent", transition: "background 0.2s" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: hasDiscount ? "var(--accent-3)" : "var(--text)", background: hasDiscount ? "linear-gradient(135deg, var(--accent-3), #4dffc3)" : "none", WebkitBackgroundClip: hasDiscount ? "text" : "unset", WebkitTextFillColor: hasDiscount ? "transparent" : "unset" }}>
              {fmt(price, currency, cadToUsd)}
            </div>
            {hasDiscount && (
              <div style={{ marginTop: 5 }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through", opacity: 0.6 }}>{fmt(retail, currency, cadToUsd)}</div>
                <div style={{ fontSize: 12, color: "#f7c26a", fontWeight: 700, marginTop: 2 }}>Save {fmt(retail - price, currency, cadToUsd)}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.location.href = `/laptop/${laptop.id}`}
              style={{ width: "100%", border: "none", borderRadius: "var(--btn-radius, 10px)", background: "linear-gradient(135deg, var(--accent), #6ab4f5)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "10px 14px", cursor: "pointer", transition: "opacity 0.15s, transform 0.15s", boxShadow: "0 4px 14px rgba(139,179,245,0.25)" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
            >View Details →</button>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onHistory(laptop)} style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", color: "var(--text-muted)", fontSize: 10, fontWeight: 600, padding: "7px 0", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent)"; el.style.color = "var(--accent)"; el.style.background = "rgba(139,179,245,0.07)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
              >📈 History</button>
              <button onClick={() => { setPendingUrl(visitUrl); setShowWarning(true); }} style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", color: "var(--text-muted)", fontSize: 10, fontWeight: 600, padding: "7px 0", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--accent-3)"; el.style.color = "var(--accent-3)"; el.style.background = "rgba(106,247,184,0.07)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
              >🔗 Visit</button>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                {onMoveToDeals && <button onClick={() => onMoveToDeals(laptop)} style={{ flex: 1, background: "rgba(247,194,106,0.08)", border: "1px solid rgba(247,194,106,0.3)", borderRadius: "var(--btn-radius, 10px)", color: "var(--accent-2)", fontSize: 10, padding: "6px 0", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.08)"; }}
                >🔥 Deal</button>}
                {onDelete && <button onClick={() => onDelete(laptop.id)} style={{ flex: 1, background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: "var(--btn-radius, 10px)", color: "var(--accent-red)", fontSize: 10, padding: "6px 0", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.08)"; }}
                >🗑</button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWarning && renderWarning()}
    </>
  );
}
