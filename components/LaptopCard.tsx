"use client";
<<<<<<< HEAD
import { useState } from "react";
=======

>>>>>>> origin/fix/vercel-build-and-theme-toggle
import type { Laptop } from "@/lib/supabase";

type Props = {
  laptop: Laptop;
  onSelect: (l: Laptop) => void;
  onHistory: (l: Laptop) => void;
<<<<<<< HEAD
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
=======
};

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function LaptopCard({ laptop, onSelect, onHistory }: Props) {
>>>>>>> origin/fix/vercel-build-and-theme-toggle
  const price = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
<<<<<<< HEAD
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <>
      <div
        className="laptop-card"
        onClick={() => window.location.href = `/laptop/${laptop.id}`}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}
      >
        <div className="card-accent-bar" style={{ height: 3, background: `linear-gradient(90deg, var(--accent), var(--accent-3))`, opacity: 0.8 }} />

        {(laptop as any).image_url && !imgError ? (
          <div style={{ background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", height: 160, padding: "16px", overflow: "hidden" }}>
            <img src={(laptop as any).image_url} alt={laptop.model}
              onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
              style={{ maxHeight: 128, maxWidth: "100%", objectFit: "contain", transition: "opacity 0.3s ease, transform 0.3s ease", opacity: imgLoaded ? 1 : 0, transform: imgLoaded ? "scale(1)" : "scale(0.95)" }}
            />
          </div>
        ) : (
          <div style={{ background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", height: 100, fontSize: 32 }} className="animate-float">💻</div>
        )}

        <div style={{ padding: "16px 20px 14px", flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(139,179,245,0.12)", color: "var(--accent)", borderRadius: 6, padding: "3px 8px", fontSize: 10, letterSpacing: "0.12em", marginBottom: 10, textTransform: "uppercase", fontWeight: 600 }}>
            {laptop.brand}
          </div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: 3, lineHeight: 1.3 }}>{laptop.model}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>{laptop.store} · {laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? "—"}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--accent-3)", letterSpacing: "-0.02em", transition: "all 0.3s ease" }}>
              {fmt(price, currency, cadToUsd)}
            </span>
            {hasDiscount && (
              <>
                <span style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(retail, currency, cadToUsd)}</span>
                <span style={{ background: "rgba(247,194,106,0.15)", color: "var(--accent-2)", borderRadius: 5, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>-{discountPct}%</span>
              </>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7, borderLeft: "2px solid var(--accent)", paddingLeft: 10, opacity: 0.8 }}>{laptop.specs}</div>
        </div>

        <div style={{ display: "flex", gap: 6, padding: "12px 16px 14px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
          {[
            { label: "📈 History", onClick: () => onHistory(laptop), hoverBorder: "var(--accent)", hoverColor: "var(--accent)" },
            { label: "🔗 Visit", onClick: () => { const url = laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`; setPendingUrl(url); setShowWarning(true); }, hoverBorder: "var(--accent-3)", hoverColor: "var(--accent-3)" },
          ].map(({ label, onClick, hoverBorder, hoverColor }) => (
            <button key={label} onClick={onClick}
              style={{ flex: 1, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 11, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = hoverBorder; el.style.color = hoverColor; el.style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
            >{label}</button>
          ))}
          {isAdmin && onMoveToDeals && (
            <button onClick={() => onMoveToDeals(laptop)}
              style={{ flex: 1, background: "rgba(247,194,106,0.08)", border: "1px solid rgba(247,194,106,0.4)", borderRadius: 8, color: "var(--accent-2)", fontSize: 11, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.18)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,194,106,0.08)"; }}
            >🔥 Deal</button>
          )}
          {isAdmin && onDelete && (
            <button onClick={() => onDelete(laptop.id)}
              style={{ flex: 1, background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.4)", borderRadius: 8, color: "var(--accent-red)", fontSize: 11, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.18)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(247,106,106,0.08)"; }}
            >🗑 Remove</button>
          )}
        </div>
      </div>

      {showWarning && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowWarning(false)}>
          <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", maxWidth: 360, margin: "1rem", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
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
=======

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
>>>>>>> origin/fix/vercel-build-and-theme-toggle
  );
}
