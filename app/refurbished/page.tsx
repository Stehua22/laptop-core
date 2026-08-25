"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { fetchListings } from "@/lib/supabase";
import type { Listing } from "@/lib/supabase";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type SortKey = "newest" | "price-low" | "price-high";

export default function RefurbishedMarketPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [brandFilter, setBrandFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

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
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((l) =>
        `${l.brand} ${l.model} ${l.specs ?? ""}`.toLowerCase().includes(q)
      );
    }
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    if (min !== null) list = list.filter((l) => l.price >= min);
    if (max !== null) list = list.filter((l) => l.price <= max);
    return [...list].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [listings, brandFilter, deliveryFilter, searchQuery, minPrice, maxPrice, sortBy]);

  const selectStyle: React.CSSProperties = {
    fontSize: 13, padding: "9px 14px", borderRadius: "var(--btn-radius, 10px)",
    border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)",
    fontFamily: "inherit", cursor: "pointer", outline: "none",
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 13, padding: "9px 14px", borderRadius: "var(--btn-radius, 10px)",
    border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)",
    fontFamily: "inherit", outline: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--card-bg, var(--surface))", border: "none",
    borderRadius: "8px", overflow: "hidden",
    display: "flex", flexDirection: "column", transition: "box-shadow 0.15s",
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

        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text-muted)", pointerEvents: "none" }}>
            🔍
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand, model, or specs…"
            style={{ ...inputStyle, width: "100%", padding: "12px 14px 12px 38px", boxSizing: "border-box", fontSize: 14 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
              style={{ ...inputStyle, width: 80 }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>to</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
              style={{ ...inputStyle, width: 80 }}
            />
          </div>
          {(searchQuery || minPrice || maxPrice || brandFilter || deliveryFilter) && (
            <button
              onClick={() => { setSearchQuery(""); setMinPrice(""); setMaxPrice(""); setBrandFilter(""); setDeliveryFilter(""); }}
              style={{ ...selectStyle, cursor: "pointer", color: "var(--text-muted)" }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 0" }}>Loading listings…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardStyle, padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            {listings.length === 0 ? (
              <>
                No listings yet.{" "}
                <Link href="/refurbished/sell" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Be the first to list one.
                </Link>
              </>
            ) : (
              "No listings match your search."
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px 14px" }}>
            {filtered.map((l) => (
              <Link
                key={l.id}
                href={`/refurbished/${l.id}`}
                style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Photo — near-square crop, no overlay, matching FB Marketplace search results */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 0.95", background: "var(--surface-2)", borderRadius: 8, overflow: "hidden" }}>
                  {l.images?.[0] ? (
                    <img
                      src={l.images[0]}
                      alt={`${l.brand} ${l.model}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, opacity: 0.15 }}>▭</div>
                  )}
                  {l.status === "sold" && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: "var(--text)", fontWeight: 800, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", border: "1.5px solid var(--text)", padding: "4px 10px", borderRadius: 4 }}>Sold</span>
                    </div>
                  )}
                </div>

                {/* Info — price bold, then a 2-line title, then location; matches FB Marketplace card order */}
                <div style={{ padding: "8px 2px 0", display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                    {fmt(l.price)}
                  </div>
                  <div style={{
                    fontSize: 13, color: "var(--text)", lineHeight: 1.3,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {l.brand} {l.model}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                    {l.location || (l.delivery_method === "shipping" ? "Ships" : "Local pickup")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}