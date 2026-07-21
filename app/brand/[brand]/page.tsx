"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops } from "@/lib/supabase";
import PageTransition from "@/components/PageTransition";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const KNOWN_BRANDS = ["Apple", "Lenovo", "Dell", "HP", "ASUS", "Acer", "Microsoft", "Samsung"];

function slugToBrand(slug: string): string | null {
  const decoded = decodeURIComponent(slug).toLowerCase();
  return KNOWN_BRANDS.find((b) => b.toLowerCase() === decoded) ?? null;
}

export default function BrandPage() {
  const router = useRouter();
  const params = useParams();
  const rawSlug = Array.isArray(params.brand) ? params.brand[0] : (params.brand as string);
  const brand = slugToBrand(rawSlug ?? "");

  const [allLaptops, setAllLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "newest">("newest");

  useEffect(() => {
    fetchLaptops().then((data) => {
      setAllLaptops(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Loading...
      </div>
    );
  }

  if (!brand) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--text-muted)", fontSize: 13 }}>
        <div>Unknown brand.</div>
        <button onClick={() => router.push("/tracker")} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>
          ← Back to Tracker
        </button>
      </div>
    );
  }

  const brandLaptops = allLaptops.filter((l) => l.brand === brand);

  const prices = brandLaptops.map((l) => l.current_price ?? l.retail_price ?? 0).filter((p) => p > 0);
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const dealCount = brandLaptops.filter((l) => (l.retail_price ?? 0) > (l.current_price ?? 0)).length;

  const sorted = [...brandLaptops].sort((a, b) => {
    const aPrice = a.current_price ?? a.retail_price ?? 0;
    const bPrice = b.current_price ?? b.retail_price ?? 0;
    if (sortBy === "price-asc") return aPrice - bPrice;
    if (sortBy === "price-desc") return bPrice - aPrice;
    return b.id - a.id;
  });

  const statCard = (label: string, value: string) => (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );

  const sortBtn = (key: typeof sortBy, label: string) => (
    <button
      onClick={() => setSortBy(key)}
      style={{
        fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 9, cursor: "pointer",
        border: `1px solid ${sortBy === key ? "var(--accent)" : "var(--border)"}`,
        background: sortBy === key ? "rgba(139,179,245,0.1)" : "var(--surface-2)",
        color: sortBy === key ? "var(--accent)" : "var(--text-muted)",
        transition: "all 0.15s",
      }}
    >{label}</button>
  );

  return (
    <PageTransition>
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "Inter, sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 80px" }}>

          <button
            onClick={() => router.push("/tracker")}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            ← All laptops
          </button>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 6 }}>
              Brand
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{brand}</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>
              {brandLaptops.length} laptop{brandLaptops.length === 1 ? "" : "s"} tracked
              {dealCount > 0 && <> · <span style={{ color: "var(--accent-3)", fontWeight: 600 }}>{dealCount} on sale</span></>}
            </p>
          </div>

          {brandLaptops.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
              {statCard("Avg Price", fmt(avgPrice))}
              {statCard("Cheapest", fmt(minPrice))}
              {statCard("Most Expensive", fmt(maxPrice))}
              {statCard("On Sale", String(dealCount))}
            </div>
          )}

          {brandLaptops.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {sortBtn("newest", "Newest")}
              {sortBtn("price-asc", "Price: Low to High")}
              {sortBtn("price-desc", "Price: High to Low")}
            </div>
          )}

          {brandLaptops.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)", fontSize: 13, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💻</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No {brand} laptops tracked yet</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {sorted.map((l) => {
                const price = l.current_price ?? l.retail_price ?? 0;
                const retail = l.retail_price ?? price;
                const hasDiscount = retail > price && price > 0;
                const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;

                return (
                  <div
                    key={l.id}
                    onClick={() => router.push(`/laptop/${l.id}`)}
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-radius, 16px)", padding: 18, cursor: "pointer", transition: "border-color 0.15s, transform 0.15s", display: "flex", flexDirection: "column", position: "relative" }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(139,179,245,0.4)"; el.style.transform = "translateY(-3px)"; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.transform = "translateY(0)"; }}
                  >
                    {hasDiscount && (
                      <div style={{ position: "absolute", top: 12, right: 12, background: "var(--accent-3)", color: "#08130e", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>
                        -{discountPct}%
                      </div>
                    )}
                    <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, background: "var(--surface-2)", borderRadius: 10 }}>
                      {l.image_url ? (
                        <img src={l.image_url} alt={l.model} style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                      ) : (
                        <span style={{ fontSize: 32, opacity: 0.25 }}>💻</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, flex: 1 }}>{l.model}</div>
                    {l.specs && (
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                        {l.specs}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "var(--accent-3)" }}>{fmt(price)}</span>
                      {hasDiscount && <span style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(retail)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 48, paddingTop: 28, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 14 }}>
              Browse other brands
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {KNOWN_BRANDS.filter((b) => b !== brand).map((b) => (
                <button
                  key={b}
                  onClick={() => router.push(`/brand/${encodeURIComponent(b.toLowerCase())}`)}
                  style={{ fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                >{b}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
