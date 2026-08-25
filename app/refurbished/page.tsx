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
  "New - Open Box": "#2e7d32",
  "Used - Like New": "#2e7d32",
  "Used - Good": "#1877f2",
  "Used - Fair": "#a374e0",
  "For Parts": "#b71c1c",
};

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

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
    borderRadius: "var(--card-radius, 10px)", overflow: "hidden",
    display: "flex", flexDirection: "column", transition: "transform 0.15s, box-shadow 0.15s",
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {filtered.map((l) => {
              const color = CONDITION_COLOR[l.condition] ?? "var(--accent)";
              return (
                <Link
                  key={l.id}
                  href={`/refurbished/${l.id}`}
                  style={{ ...cardStyle, textDecoration: "none", color: "inherit" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Photo — square, condition badge overlaid like FB Marketplace/eBay */}
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "var(--surface-2)" }}>
                    {l.images?.[0] ? (
                      <img
                        src={l.images[0]}
                        alt={`${l.brand} ${l.model}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, opacity: 0.15 }}>▭</div>
                    )}
                    <span style={{
                      position: "absolute", top: 8, left: 8, fontSize: 10.5, fontWeight: 700, color: "#fff",
                      background: color, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.02em",
                    }}>
                      {l.condition.replace(/^(New|Used)\s*-\s*/, "")}
                    </span>
                    {l.status === "sold" && (
                      <div style={{
                        position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: "0.05em", textTransform: "uppercase" }}>Sold</span>
                      </div>
                    )}
                  </div>

                  {/* Info — price first and boldest, then title, then meta, matching FB/eBay card order */}
                  <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>
                      {fmt(l.price)}
                    </div>
                    <div style={{
                      fontSize: 13.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", fontWeight: 500,
                    }}>
                      {l.brand} {l.model}
                    </div>
                    {l.specs && (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.specs}
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                      <span>{l.location || (l.delivery_method === "shipping" ? "Ships" : "Local pickup")}</span>
                      <span>{timeAgo(l.created_at)}</span>
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