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
  const [expanded, setExpanded] = useState({ sort: false, price: true, brand: false, delivery: false });

  const toggle = (key: keyof typeof expanded) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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

  const pillStyle: React.CSSProperties = {
    fontSize: 13.5, padding: "9px 16px", borderRadius: 999,
    border: "none", background: "var(--surface-2)", color: "var(--text)",
    fontFamily: "inherit", cursor: "pointer", outline: "none", fontWeight: 500,
  };

  const pillInputStyle: React.CSSProperties = {
    fontSize: 13.5, padding: "9px 16px", borderRadius: 999,
    border: "none", background: "var(--surface-2)", color: "var(--text)",
    fontFamily: "inherit", outline: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--card-bg, var(--surface))", border: "none",
    borderRadius: "8px", overflow: "hidden",
    display: "flex", flexDirection: "column", transition: "box-shadow 0.15s",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", background: "none", border: "none", cursor: "pointer",
    padding: "12px 0", fontSize: 14, fontWeight: 700, color: "var(--text)",
    fontFamily: "inherit", textAlign: "left",
  };

  const optionRowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
    fontSize: 13.5, color: "var(--text-muted)", cursor: "pointer",
  };

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "32px 20px", display: "flex", gap: 32, alignItems: "flex-start" }}>
        {/* Left filter panel — mirrors FB Marketplace's "Search results" sidebar */}
        <aside style={{ width: 260, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Marketplace</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            Search results
          </h1>

          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-muted)", pointerEvents: "none" }}>
              🔍
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Marketplace"
              style={{ ...pillInputStyle, width: "100%", padding: "10px 14px 10px 36px", boxSizing: "border-box", fontSize: 13.5 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {loggedIn && (
              <Link href="/refurbished/my-listings" style={{
                fontSize: 13, fontWeight: 600, padding: "10px 14px", borderRadius: "var(--btn-radius, 10px)",
                border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none", textAlign: "center",
              }}>
                My Listings
              </Link>
            )}
            <Link href="/refurbished/sell" style={{
              background: "var(--accent)", color: "#fff", border: "none",
              borderRadius: "var(--btn-radius, 10px)", padding: "10px 14px",
              fontWeight: 700, fontSize: 13.5, textDecoration: "none", textAlign: "center",
            }}>
              + Create new listing
            </Link>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginTop: 12, marginBottom: 2 }}>Filters</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 4 }}>
              {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
            </div>

            {/* Sort by */}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <button style={sectionHeaderStyle} onClick={() => toggle("sort")}>
                Sort by <span style={{ opacity: 0.6 }}>{expanded.sort ? "▴" : "▾"}</span>
              </button>
              {expanded.sort && (
                <div style={{ paddingBottom: 8 }}>
                  {([
                    ["newest", "Newest"],
                    ["price-low", "Price: Low to High"],
                    ["price-high", "Price: High to Low"],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <label key={key} style={optionRowStyle}>
                      <input type="radio" checked={sortBy === key} onChange={() => setSortBy(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Price */}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <button style={sectionHeaderStyle} onClick={() => toggle("price")}>
                Price <span style={{ opacity: 0.6 }}>{expanded.price ? "▴" : "▾"}</span>
              </button>
              {expanded.price && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }}>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    style={{ ...pillInputStyle, width: "100%", padding: "8px 12px" }}
                  />
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>to</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    style={{ ...pillInputStyle, width: "100%", padding: "8px 12px" }}
                  />
                </div>
              )}
            </div>

            {/* Brand */}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <button style={sectionHeaderStyle} onClick={() => toggle("brand")}>
                Brand <span style={{ opacity: 0.6 }}>{expanded.brand ? "▴" : "▾"}</span>
              </button>
              {expanded.brand && (
                <div style={{ paddingBottom: 8 }}>
                  <label style={optionRowStyle}>
                    <input type="radio" checked={brandFilter === ""} onChange={() => setBrandFilter("")} />
                    All Brands
                  </label>
                  {brands.map((b) => (
                    <label key={b} style={optionRowStyle}>
                      <input type="radio" checked={brandFilter === b} onChange={() => setBrandFilter(b)} />
                      {b}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery */}
            <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <button style={sectionHeaderStyle} onClick={() => toggle("delivery")}>
                Delivery <span style={{ opacity: 0.6 }}>{expanded.delivery ? "▴" : "▾"}</span>
              </button>
              {expanded.delivery && (
                <div style={{ paddingBottom: 8 }}>
                  {[
                    ["", "Pickup or Shipping"],
                    ["pickup", "Local Pickup"],
                    ["shipping", "Shipping"],
                  ].map(([key, label]) => (
                    <label key={key} style={optionRowStyle}>
                      <input type="radio" checked={deliveryFilter === key} onChange={() => setDeliveryFilter(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {(searchQuery || minPrice || maxPrice || brandFilter || deliveryFilter) && (
              <button
                onClick={() => { setSearchQuery(""); setMinPrice(""); setMaxPrice(""); setBrandFilter(""); setDeliveryFilter(""); }}
                style={{ ...pillStyle, color: "var(--accent)", fontWeight: 600, marginTop: 12, width: "100%", textAlign: "center" }}
              >
                Clear filters
              </button>
            )}
          </div>
        </aside>

        {/* Right column — results grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", margin: 0 }}>
              Refurbished Market<span style={{ color: "var(--accent)", opacity: 0.9 }}>.</span>
            </h2>
            <p style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 13 }}>
              Laptops listed by other people
            </p>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px 10px" }}>
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
                  <div style={{ fontSize: 16.5, fontWeight: 800, color: "var(--text)" }}>
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
    </div>
  );
}