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

const badgeStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--accent)", background: "var(--surface-2)",
  border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px",
};

const tagStyle: React.CSSProperties = {
  fontSize: 10, color: "var(--text-muted)", background: "var(--surface-2)",
  border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px",
};

const goodForTagStyle: React.CSSProperties = {
  fontSize: 10, color: "var(--accent)", fontWeight: 600, background: "var(--surface-2)",
  border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px",
};

const discountBadgeStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: "0.03em",
  color: "var(--accent-2)", background: "var(--surface-2)",
  border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)",
  color: "var(--text-muted)", fontSize: 11, fontWeight: 600, padding: "7px 0", cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s",
};

export default function LaptopCard({ laptop, onSelect, onHistory, isAdmin, onMoveToDeals, onDelete, currency = "CAD", cadToUsd = 0.73, compareSelected = false, onCompareToggle, compareDisabled = false, cardLayout = "row" }: Props) {
  const price       = laptop.current_price ?? 0;
  const retail      = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
  const [showWarning, setShowWarning] = useState(false);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [pendingUrl, setPendingUrl]   = useState("");
  const [pendingStore, setPendingStore] = useState("");
  const [imgError, setImgError]       = useState(false);
  const [imgLoaded, setImgLoaded]     = useState(false);
  const [hovered, setHovered]         = useState(false);

  const specParts   = laptop.specs ? laptop.specs.split(",").map(s => s.trim()).filter(Boolean) : [];
  const goodForTags = laptop.good_for ? laptop.good_for.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3) : [];
  const links        = laptop.links ?? [];
  const visitUrl    = laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`;

  function handleVisitClick(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (links.length > 1) {
      setShowStorePicker(true);
    } else {
      setPendingUrl(links[0]?.url ?? visitUrl);
      setPendingStore(links[0]?.store ?? "");
      setShowWarning(true);
    }
  }

  function pickStore(url: string, store: string) {
    setShowStorePicker(false);
    setPendingUrl(url);
    setPendingStore(store);
    setShowWarning(true);
  }

  function renderWarning() {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={() => setShowWarning(false)}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 16px)", padding: "1.5rem", maxWidth: 360, margin: "1rem" }} onClick={e => e.stopPropagation()}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{pendingStore ? `Continue to ${pendingStore}` : "Price notice"}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>Prices may not be accurate. The price shown may differ from what's currently on the store website.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowWarning(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: "var(--btn-radius, 10px)", border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
            <button onClick={() => { window.open(pendingUrl, "_blank"); setShowWarning(false); }} style={{ fontSize: 13, padding: "8px 18px", borderRadius: "var(--btn-radius, 10px)", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  function renderStorePicker() {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={() => setShowStorePicker(false)}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 16px)", padding: "1.5rem", maxWidth: 380, width: "100%", margin: "1rem" }} onClick={e => e.stopPropagation()}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{links.length} places to buy</p>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>{laptop.brand} {laptop.model}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {links.map((link, i) => (
              <button
                key={link.id}
                onClick={() => pickStore(link.url, link.store)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: i === 0 ? "var(--accent)" : "var(--surface-2)",
                  color: i === 0 ? "#fff" : "var(--text)",
                  border: i === 0 ? "none" : "1px solid var(--border)",
                  borderRadius: "var(--btn-radius, 10px)", padding: "11px 16px",
                  fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%",
                }}
              >
                <span>{link.store}</span>
                <span>{link.price != null ? fmt(link.price, currency, cadToUsd) : "Visit"}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowStorePicker(false)} style={{ marginTop: 14, fontSize: 13, padding: "8px 18px", borderRadius: "var(--btn-radius, 10px)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", width: "100%" }}>Cancel</button>
        </div>
      </div>
    );
  }

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
            background: compareSelected ? "var(--surface-2)" : "var(--card-bg, var(--surface))",
            border: `1px solid ${compareSelected ? "var(--accent)" : hovered ? "var(--border-hover)" : "var(--card-border, var(--border))"}`,
            borderRadius: "var(--card-radius, 18px)",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            cursor: "pointer",
            transition: "border-color 0.15s, transform 0.2s ease",
            transform: hovered ? `translateY(var(--card-hover-y, -3px))` : "translateY(0)",
            boxShadow: hovered ? "var(--card-hover-shadow)" : "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
            backdropFilter: `blur(var(--card-blur, 0px))`,
          }}
          onClick={() => window.location.href = `/laptop/${laptop.id}`}
        >
          <span style={{ ...badgeStyle, flexShrink: 0 }}>{laptop.brand}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{laptop.model}</span>

          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {goodForTags.slice(0, 2).map(tag => (
              <span key={tag} style={goodForTagStyle}>{tag}</span>
            ))}
          </div>

          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: "var(--text)", flexShrink: 0, textAlign: "right", minWidth: 80 }}>
            {fmt(price, currency, cadToUsd)}
          </div>

          {hasDiscount && <span style={{ fontSize: 10, color: "var(--accent-2)", fontWeight: 700, flexShrink: 0 }}>-{discountPct}%</span>}

          {onCompareToggle && (
            <button
              onClick={e => { e.stopPropagation(); if (!compareDisabled || compareSelected) onCompareToggle(laptop); }}
              disabled={compareDisabled && !compareSelected}
              style={{ fontSize: 10, padding: "4px 10px", borderRadius: "var(--btn-radius, 10px)", border: `1px solid ${compareSelected ? "var(--accent)" : "var(--border)"}`, background: compareSelected ? "var(--surface-2)" : "transparent", color: compareSelected ? "var(--accent)" : "var(--text-muted)", cursor: compareDisabled && !compareSelected ? "not-allowed" : "pointer", fontWeight: 600, opacity: compareDisabled && !compareSelected ? 0.4 : 1, flexShrink: 0 }}
            >
              {compareSelected ? "Added" : "Compare"}
            </button>
          )}
        </div>

        {showWarning && renderWarning()}
        {showStorePicker && renderStorePicker()}
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
            background: compareSelected ? "var(--surface-2)" : "var(--card-bg, var(--surface))",
            border: `1px solid ${compareSelected ? "var(--accent)" : hovered ? "var(--border-hover)" : "var(--card-border, var(--border))"}`,
            borderRadius: "var(--card-radius, 18px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer",
            transition: "border-color 0.15s, transform 0.2s ease",
            transform: hovered ? `translateY(var(--card-hover-y, -3px))` : "translateY(0)",
            boxShadow: hovered ? "var(--card-hover-shadow)" : "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
            backdropFilter: `blur(var(--card-blur, 0px))`,
          }}
          onClick={() => window.location.href = `/laptop/${laptop.id}`}
        >
          <div style={{
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--card-border, var(--border))",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, position: "relative", minHeight: 140,
          }}>
            {hasDiscount && <div style={{ position: "absolute", top: 10, left: 10, ...discountBadgeStyle }}>-{discountPct}%</div>}
            {(laptop as any).is_deal && (
              <div style={{ position: "absolute", top: hasDiscount ? 34 : 10, left: 10, fontSize: 9, fontWeight: 800, color: "var(--accent-3)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px" }}>HOT DEAL</div>
            )}
            {(laptop as any).image_url && !imgError ? (
              <img
                src={(laptop as any).image_url} alt={laptop.model}
                onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
                style={{ maxHeight: 110, maxWidth: "85%", objectFit: "contain", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s, transform 0.25s", transform: hovered ? "scale(1.04)" : "scale(1)" }}
              />
            ) : (
              <div style={{ fontSize: 40, opacity: 0.15 }}>▭</div>
            )}
          </div>

          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={badgeStyle}>{laptop.brand}</span>
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{laptop.release_year ?? ""}</span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", margin: 0, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{laptop.model}</h3>
            {specParts.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {specParts.slice(0, 3).map((s, i) => <span key={i} style={tagStyle}>{s}</span>)}
              </div>
            )}
          </div>

          <div style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--card-border, var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: "var(--text)" }}>
                {fmt(price, currency, cadToUsd)}
              </div>
              {hasDiscount && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(retail, currency, cadToUsd)}</span>
                  <span style={{ fontSize: 10.5, color: "var(--accent-2)", fontWeight: 700 }}>Save {fmt(retail - price, currency, cadToUsd)}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onHistory(laptop)} aria-label="Price history" style={{ ...ghostBtnStyle, padding: "6px 10px" }}>History</button>
              <button onClick={handleVisitClick} aria-label="Visit store" style={{ ...ghostBtnStyle, padding: "6px 10px" }}>Visit</button>
            </div>
          </div>
        </div>

        {showWarning && renderWarning()}
        {showStorePicker && renderStorePicker()}
      </>
    );
  }

  /* ═════════════════════════════════════════════
     Row layout — default 3-column horizontal card
     ═════════════════════════════════════════════ */
  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: compareSelected ? "var(--surface-2)" : "var(--card-bg, var(--surface))",
          border: `1px solid ${compareSelected ? "var(--accent)" : hovered ? "var(--border-hover)" : "var(--card-border, var(--border))"}`,
          borderRadius: "var(--card-radius, 18px)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "180px 1fr auto",
          cursor: "pointer",
          transition: "border-color 0.15s, transform 0.2s ease",
          transform: hovered ? `translateY(var(--card-hover-y, -3px))` : "translateY(0)",
          boxShadow: hovered ? "var(--card-hover-shadow)" : "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
          backdropFilter: `blur(var(--card-blur, 0px))`,
        }}
        onClick={() => window.location.href = `/laptop/${laptop.id}`}
      >
        {/* IMAGE */}
        <div style={{
          background: "var(--surface-2)",
          borderRight: "1px solid var(--card-border, var(--border))",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, position: "relative", minHeight: 160,
        }}>
          {hasDiscount && <div style={{ position: "absolute", top: 12, left: 12, ...discountBadgeStyle }}>-{discountPct}%</div>}
          {(laptop as any).is_deal && (
            <div style={{ position: "absolute", top: hasDiscount ? 38 : 12, left: 12, fontSize: 9, fontWeight: 800, color: "var(--accent-3)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 10px)", padding: "3px 8px" }}>HOT DEAL</div>
          )}
          {(laptop as any).image_url && !imgError ? (
            <img
              src={(laptop as any).image_url} alt={laptop.model}
              onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
              style={{ maxHeight: 120, maxWidth: 150, objectFit: "contain", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s, transform 0.25s", transform: hovered ? "scale(1.04)" : "scale(1)" }}
            />
          ) : (
            <div style={{ fontSize: 48, opacity: 0.15 }}>▭</div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={badgeStyle}>{laptop.brand}</span>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {laptop.store && `${laptop.store} · `}{laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? ""}
              </span>
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", margin: "0 0 12px 0", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{laptop.model}</h3>
            {specParts.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {specParts.slice(0, 4).map((s, i) => <span key={i} style={{ ...tagStyle, padding: "3px 10px" }}>{s}</span>)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {laptop.screen_size && <span style={tagStyle}>{laptop.screen_size}" display</span>}
              {laptop.weight_kg && <span style={tagStyle}>{laptop.weight_kg} kg</span>}
              {goodForTags.map(tag => <span key={tag} style={goodForTagStyle}>{tag}</span>)}
            </div>

            {onCompareToggle && (
              <button
                onClick={e => { e.stopPropagation(); if (!compareDisabled || compareSelected) onCompareToggle(laptop); }}
                disabled={compareDisabled && !compareSelected}
                style={{ fontSize: 11, padding: "4px 12px", borderRadius: "var(--btn-radius, 10px)", border: `1px solid ${compareSelected ? "var(--accent)" : "var(--border)"}`, background: compareSelected ? "var(--surface-2)" : "transparent", color: compareSelected ? "var(--accent)" : "var(--text-muted)", cursor: compareDisabled && !compareSelected ? "not-allowed" : "pointer", fontWeight: 600, opacity: compareDisabled && !compareSelected ? 0.4 : 1, flexShrink: 0 }}
              >
                {compareSelected ? "Added" : "+ Compare"}
              </button>
            )}
          </div>
        </div>

        {/* PRICE + ACTIONS */}
        <div style={{ borderLeft: "1px solid var(--card-border, var(--border))", padding: "20px 22px", display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", minWidth: 190 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--text)" }}>
              {fmt(price, currency, cadToUsd)}
            </div>
            {hasDiscount && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginTop: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(retail, currency, cadToUsd)}</span>
                <span style={{ fontSize: 11.5, color: "var(--accent-2)", fontWeight: 700 }}>Save {fmt(retail - price, currency, cadToUsd)}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, width: "100%" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.location.href = `/laptop/${laptop.id}`}
              style={{ width: "100%", border: "none", borderRadius: "var(--btn-radius, 10px)", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "10px 14px", cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >View details</button>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => onHistory(laptop)}
                style={{ ...ghostBtnStyle, flex: 1 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
              >History</button>
              <button
                onClick={handleVisitClick}
                style={{ ...ghostBtnStyle, flex: 1 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
              >Visit</button>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                {onMoveToDeals && (
                  <button
                    onClick={() => onMoveToDeals(laptop)}
                    style={{ ...ghostBtnStyle, flex: 1, color: "var(--accent-2)", fontSize: 10 }}
                  >Mark deal</button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(laptop.id)}
                    style={{ ...ghostBtnStyle, flex: 1, color: "var(--accent-red)", fontSize: 10 }}
                  >Remove</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWarning && renderWarning()}
        {showStorePicker && renderStorePicker()}
    </>
  );
}
