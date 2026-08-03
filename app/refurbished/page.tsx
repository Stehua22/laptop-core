"use client";
import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops } from "@/lib/supabase";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Heuristic condition detection until a dedicated `condition` column exists in Supabase.
const REFURB_PATTERNS: { key: string; label: string; color: string; test: RegExp }[] = [
  { key: "certified", label: "Certified Refurbished", color: "#4caf7d", test: /certified.{0,15}refurb/i },
  { key: "refurb", label: "Refurbished", color: "#5e8fe8", test: /refurb/i },
  { key: "renewed", label: "Renewed", color: "#a374e0", test: /renewed/i },
  { key: "openbox", label: "Open Box", color: "#e0a530", test: /open[\s-]?box/i },
  { key: "preowned", label: "Pre-Owned", color: "#ec6f9b", test: /pre[\s-]?owned/i },
];

function detectCondition(l: Laptop) {
  const haystack = `${l.store ?? ""} ${l.specs ?? ""} ${l.model ?? ""}`;
  for (const p of REFURB_PATTERNS) {
    if (p.test.test(haystack)) return p;
  }
  return null;
}

type SortKey = "discount" | "savings" | "price-low" | "price-high";

export default function RefurbishedPage() {
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("discount");
  const [brandFilter, setBrandFilter] = useState<string>("");

  useEffect(() => {
    fetchLaptops().then((data) => {
      setLaptops(data);
      setLoading(false);
    });
  }, []);

  const refurbished = useMemo(() => {
    return laptops
      .map((l) => ({ laptop: l, condition: detectCondition(l) }))
      .filter((x): x is { laptop: Laptop; condition: NonNullable<ReturnType<typeof detectCondition>> } => x.condition !== null);
  }, [laptops]);

  const brands = useMemo(
    () => Array.from(new Set(refurbished.map((x) => x.laptop.brand))).sort(),
    [refurbished]
  );

  const filtered = useMemo(() => {
    let list = brandFilter ? refurbished.filter((x) => x.laptop.brand === brandFilter) : refurbished;
    return [...list].sort((a, b) => {
      const ap = a.laptop.current_price ?? a.laptop.retail_price;
      const bp = b.laptop.current_price ?? b.laptop.retail_price;
      const aSave = a.laptop.retail_price - ap;
      const bSave = b.laptop.retail_price - bp;
      if (sortBy === "discount") {
        const ad = a.laptop.retail_price ? aSave / a.laptop.retail_price : 0;
        const bd = b.laptop.retail_price ? bSave / b.laptop.retail_price : 0;
        return bd - ad;
      }
      if (sortBy === "savings") return bSave - aSave;
      if (sortBy === "price-low") return ap - bp;
      return bp - ap;
    });
  }, [refurbished, brandFilter, sortBy]);

  const cardStyle: React.CSSProperties = {
    background: "var(--card-bg, var(--surface))",
    border: "1px solid var(--border)",
    borderRadius: "var(--modal-radius, 16px)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const selectStyle: React.CSSProperties = {
    fontSize: 13,
    padding: "9px 14px",
    borderRadius: "var(--btn-radius, 10px)",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontFamily: "inherit",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--accent)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: 10,
              fontWeight: 600,
              opacity: 0.8,
            }}
          >
            // second life, first-rate prices
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text)", margin: 0 }}>
                Refurbished Market<span style={{ color: "var(--accent)", opacity: 0.9 }}>.</span>
              </h1>
              <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
                Certified, renewed, and open-box laptops · {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} style={selectStyle}>
            <option value="discount">Sort: Biggest Discount</option>
            <option value="savings">Sort: Biggest Savings ($)</option>
            <option value="price-low">Sort: Price (Low to High)</option>
            <option value="price-high">Sort: Price (High to Low)</option>
          </select>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={selectStyle}>
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 0" }}>Loading refurbished listings…</div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No refurbished listings yet. Add a laptop whose store or specs mention "refurbished", "renewed",
            "open box", or "pre-owned" and it'll show up here automatically.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
            {filtered.map(({ laptop: l, condition }) => {
              const price = l.current_price ?? l.retail_price;
              const discountPct = l.retail_price ? Math.round(((l.retail_price - price) / l.retail_price) * 100) : 0;
              return (
                <a
                  key={l.id}
                  href={l.url || `/laptop/${l.id}`}
                  target={l.url ? "_blank" : undefined}
                  rel={l.url ? "noopener noreferrer" : undefined}
                  style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${condition.color}, ${condition.color}60)` }} />
                  {l.image_url ? (
                    <div style={{ height: 150, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={l.image_url} alt={`${l.brand} ${l.model}`} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                    </div>
                  ) : null}
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    <span
                      style={{
                        alignSelf: "flex-start",
                        fontSize: 11,
                        fontWeight: 700,
                        color: condition.color,
                        background: `${condition.color}18`,
                        padding: "3px 9px",
                        borderRadius: 999,
                      }}
                    >
                      {condition.label}
                    </span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      {l.brand} {l.model}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{l.specs}</div>
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 8, paddingTop: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{fmt(price)}</span>
                      {discountPct > 0 && (
                        <>
                          <span style={{ fontSize: 12.5, color: "var(--text-muted)", textDecoration: "line-through" }}>
                            {fmt(l.retail_price)}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#4caf7d" }}>-{discountPct}%</span>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{l.store}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
