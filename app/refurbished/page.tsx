"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { fetchListings } from "@/lib/supabase";
import type { Listing } from "@/lib/supabase";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const CONDITION_COLOR: Record<string, string> = {
  "New - Open Box": "#e0a530",
  "Used - Like New": "#4caf7d",
  "Used - Good": "#5e8fe8",
  "Used - Fair": "#a374e0",
  "For Parts": "#ec6f9b",
};

type SortKey = "newest" | "price-low" | "price-high";

export default function RefurbishedMarketPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [brandFilter, setBrandFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");

  useEffect(() => {
    fetchListings()
      .then(setListings)
      .finally(() => setLoading(false));

    supabaseBrowser.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(listings.map((l) => l.brand))).sort(),
    [listings]
  );

  const filtered = useMemo(() => {
    let list = listings;
    if (brandFilter) list = list.filter((l) => l.brand === brandFilter);
    if (deliveryFilter) list = list.filter((l) => l.delivery_method === deliveryFilter || l.delivery_method === "both");
    return [...list].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [listings, brandFilter, deliveryFilter, sortBy]);

  const selectStyle: React.CSSProperties = {
    fontSize: 13, padding: "9px 14px", borderRadius: "var(--btn-radius, 10px)",
    border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)",
    fontFamily: "inherit", cursor: "pointer", outline: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--card-bg, var(--surface))", border: "1px solid var(--border)",
    borderRadius: "var(--modal-radius, 16px)", overflow: "hidden",
    display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
  };

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600, opacity: 0.8 }}>
            // buy and sell with other people
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text)", margin: 0 }}>
                Refurbished Market<span style={{ color: "var(--accent)", opacity: 0.9 }}>.</span>
              </h1>
              <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
                Laptops listed by other people · {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {loggedIn && (
                <Link href="/refurbished/my-listings" style={{
                  fontSize: 13, fontWeight: 600, padding: "11px 18px", borderRadius: "var(--btn-radius, 10px)",
                  border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none",
                }}>
                  My Listings
                </Link>
              )}
              <Link href="/refurbished/sell" style={{
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: "var(--btn-radius, 10px)", padding: "11px 22px",
                fontWeight: 700, fontSize: 14, textDecoration: "none",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 4px 16px var(--glow)",
              }}>
                + Sell Your Laptop
              </Link>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} style={selectStyle}>
            <option value="newest">Sort: Newest</option>
            <option value="price-low">Sort: Price (Low to High)</option>
            <option value="price-high">Sort: Price (High to Low)</option>
          </select>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={selectStyle}>
            <option value="">All Brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)} style={selectStyle}>
            <option value="">Pickup or Shipping</option>
            <option value="pickup">Local Pickup</option>
            <option value="shipping">Shipping</option>
          </select>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 0" }}>Loading listings…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardStyle, padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No listings yet.{" "}
            <Link href="/refurbished/sell" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Be the first to list one.
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
            {filtered.map((l) => {
              const color = CONDITION_COLOR[l.condition] ?? "var(--accent)";
              return (
                <Link
                  key={l.id}
                  href={`/refurbished/${l.id}`}
                  style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "var(--border-hover, var(--accent))"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}60)` }} />
                  {l.images?.[0] ? (
                    <div style={{ height: 150, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={l.images[0]} alt={`${l.brand} ${l.model}`} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                    </div>
                  ) : (
                    <div style={{ height: 150, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, opacity: 0.15 }}>▭</div>
                  )}
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: "3px 9px", borderRadius: 999 }}>
                      {l.condition}
                    </span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{l.brand} {l.model}</div>
                    {l.specs && <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{l.specs}</div>}
                    <div style={{ marginTop: "auto", fontSize: 20, fontWeight: 800, color: "var(--text)", paddingTop: 8 }}>{fmt(l.price)}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                      <span>{l.delivery_method === "both" ? "Pickup or shipping" : l.delivery_method === "pickup" ? "Local pickup" : "Ships"}</span>
                      {l.location && <span>{l.location}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}