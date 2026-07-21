"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops } from "@/lib/supabase";
import PageTransition from "@/components/PageTransition";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const KNOWN_BRANDS = ["Apple", "Lenovo", "Dell", "HP", "ASUS", "Acer", "Microsoft", "Samsung"];

const BRAND_ICONS: Record<string, string> = {
  Apple: "🍎",
  Lenovo: "💻",
  Dell: "🖥️",
  HP: "🖨️",
  ASUS: "⚡",
  Acer: "🎯",
  Microsoft: "🪟",
  Samsung: "📱",
};

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
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [imgLoaded, setImgLoaded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchLaptops().then((data) => {
      setAllLaptops(data);
      setLoading(false);
    });
  }, []);

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>
          Loading laptops…
        </span>
      </div>
    );
  }

  /* ─── Unknown brand ─── */
  if (!brand) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}>
        <div style={{ fontSize: 56, opacity: 0.3 }}>🔍</div>
        <div style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 600 }}>
          Brand not found
        </div>
        <button
          onClick={() => router.push("/tracker")}
          style={{
            fontSize: 13, fontWeight: 600, padding: "10px 24px",
            borderRadius: "var(--btn-radius, 10px)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
            (e.currentTarget as HTMLElement).style.background = "rgba(139,179,245,0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.background = "var(--surface)";
          }}
        >
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

  const brandIcon = BRAND_ICONS[brand] ?? "💻";

  const stats = [
    { label: "Average Price", value: fmt(avgPrice), icon: "📊", color: "var(--accent)" },
    { label: "Lowest Price", value: fmt(minPrice), icon: "🏷️", color: "var(--accent-3)" },
    { label: "Highest Price", value: fmt(maxPrice), icon: "💎", color: "var(--accent-2)" },
    { label: "On Sale", value: String(dealCount), icon: "🔥", color: "var(--accent-red, #f76a6a)" },
  ];

  const sortOptions: { key: typeof sortBy; label: string; icon: string }[] = [
    { key: "newest", label: "Newest", icon: "🕐" },
    { key: "price-asc", label: "Price: Low → High", icon: "📉" },
    { key: "price-desc", label: "Price: High → Low", icon: "📈" },
  ];

  return (
    <PageTransition>
      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 80px" }}>

          {/* ─── Back button ─── */}
          <button
            onClick={() => router.push("/tracker")}
            style={{
              background: "none", border: "none", color: "var(--text-muted)",
              fontSize: 13, cursor: "pointer", marginBottom: 28, padding: "6px 0",
              display: "flex", alignItems: "center", gap: 8,
              fontWeight: 500, transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          >
            <span style={{ fontSize: 16 }}>←</span> All laptops
          </button>

          {/* ═══════════════════════════════════
              Hero Header
              ═══════════════════════════════════ */}
          <div style={{
            background: "var(--card-bg, var(--surface))",
            border: "1px solid var(--card-border, var(--border))",
            borderRadius: "var(--card-radius, 18px)",
            overflow: "hidden",
            marginBottom: 28,
            boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
            backdropFilter: "blur(var(--card-blur, 0px))",
            position: "relative",
          }}>
            {/* Accent gradient bar at the top */}
            <div style={{
              height: 4,
              background: "linear-gradient(90deg, var(--accent), var(--accent-3), var(--accent-2))",
              backgroundSize: "200% 100%",
              animation: "gradientMesh 6s ease infinite",
            }} />

            {/* Decorative glow */}
            <div style={{
              position: "absolute",
              top: -60, right: -60,
              width: 200, height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--glow) 0%, transparent 70%)",
              pointerEvents: "none",
              opacity: 0.6,
            }} />

            <div style={{ padding: "32px 36px 28px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                {/* Brand icon */}
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(139,179,245,0.12), rgba(106,247,184,0.08))",
                  border: "1px solid rgba(139,179,245,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 30, flexShrink: 0,
                }}>
                  {brandIcon}
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{
                    fontSize: 10, color: "var(--accent)", textTransform: "uppercase",
                    letterSpacing: "0.14em", fontWeight: 700, marginBottom: 6,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    Brand
                    {dealCount > 0 && (
                      <span style={{
                        background: "rgba(106,247,184,0.12)",
                        border: "1px solid rgba(106,247,184,0.25)",
                        color: "var(--accent-3)",
                        fontSize: 9, fontWeight: 800,
                        padding: "2px 8px", borderRadius: 20,
                        animation: "fadeIn 0.5s ease both",
                        animationDelay: "0.3s",
                      }}>
                        {dealCount} ON SALE
                      </span>
                    )}
                  </div>
                  <h1 style={{
                    fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    margin: 0,
                    lineHeight: 1.1,
                    background: "linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                    {brand}
                  </h1>
                  <p style={{
                    fontSize: 14, color: "var(--text-muted)", marginTop: 10,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(139,179,245,0.1)",
                      border: "1px solid rgba(139,179,245,0.2)",
                      borderRadius: 8, padding: "3px 10px",
                      fontSize: 13, fontWeight: 700, color: "var(--accent)",
                    }}>
                      {brandLaptops.length}
                    </span>
                    laptop{brandLaptops.length === 1 ? "" : "s"} tracked
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════
              Stat Cards
              ═══════════════════════════════════ */}
          {brandLaptops.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }} className="stagger">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className="stats-card animate-fade-up"
                  style={{
                    background: "var(--card-bg, var(--surface))",
                    border: "1px solid var(--card-border, var(--border))",
                    borderRadius: "var(--card-radius, 18px)",
                    padding: "20px 22px",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "default",
                    boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
                    backdropFilter: "blur(var(--card-blur, 0px))",
                    animationDelay: `${i * 0.06}s`,
                  }}
                >
                  {/* Subtle colored glow */}
                  <div style={{
                    position: "absolute",
                    top: -30, right: -30,
                    width: 80, height: 80,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${s.color}15 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, position: "relative" }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <span style={{
                      fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase",
                      letterSpacing: "0.1em", fontWeight: 700,
                    }}>
                      {s.label}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em",
                    color: s.color, position: "relative",
                  }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════
              Sort Controls
              ═══════════════════════════════════ */}
          {brandLaptops.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 24, flexWrap: "wrap",
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: "var(--text-dim)",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                Sort by
              </span>
              {sortOptions.map(({ key, label, icon }) => {
                const isActive = sortBy === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "8px 16px",
                      borderRadius: "var(--btn-radius, 10px)",
                      cursor: "pointer",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                      background: isActive ? "rgba(139,179,245,0.12)" : "var(--card-bg, var(--surface))",
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                      transition: "all 0.2s ease",
                      display: "flex", alignItems: "center", gap: 6,
                      boxShadow: isActive ? "0 0 12px var(--glow)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                      }
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════
              Laptop Grid / Empty State
              ═══════════════════════════════════ */}
          {brandLaptops.length === 0 ? (
            <div className="animate-fade-up" style={{
              textAlign: "center", padding: "80px 20px",
              background: "var(--card-bg, var(--surface))",
              borderRadius: "var(--card-radius, 18px)",
              border: "1px solid var(--card-border, var(--border))",
              boxShadow: "var(--card-shadow)",
              backdropFilter: "blur(var(--card-blur, 0px))",
            }}>
              <div style={{ fontSize: 52, marginBottom: 16, opacity: 0.3 }}>💻</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                No {brand} laptops tracked yet
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360, margin: "0 auto" }}>
                We haven&apos;t added any {brand} laptops to our tracker. Check back soon or browse other brands below.
              </div>
            </div>
          ) : (
            <div
              className="stagger"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 18,
              }}
            >
              {sorted.map((l) => {
                const price = l.current_price ?? l.retail_price ?? 0;
                const retail = l.retail_price ?? price;
                const hasDiscount = retail > price && price > 0;
                const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
                const hasImage = l.image_url && !imgErrors.has(l.id);
                const loaded = imgLoaded.has(l.id);

                return (
                  <div
                    key={l.id}
                    className="laptop-card animate-fade-up"
                    onClick={() => router.push(`/laptop/${l.id}`)}
                    style={{
                      background: "var(--card-bg, var(--surface))",
                      border: "1px solid var(--card-border, var(--border))",
                      borderRadius: "var(--card-radius, 18px)",
                      overflow: "hidden",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
                      backdropFilter: "blur(var(--card-blur, 0px))",
                    }}
                  >
                    {/* Discount badge */}
                    {hasDiscount && (
                      <div style={{
                        position: "absolute", top: 12, right: 12, zIndex: 2,
                        background: "linear-gradient(135deg, #f7c26a, #f4a830)",
                        color: "#1a1200",
                        fontSize: 10, fontWeight: 900,
                        padding: "4px 10px", borderRadius: "var(--btn-radius, 10px)",
                        letterSpacing: "0.02em",
                        boxShadow: "0 2px 8px rgba(244,168,48,0.3)",
                      }}>
                        -{discountPct}%
                      </div>
                    )}

                    {/* Image area */}
                    <div style={{
                      height: 150,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "linear-gradient(135deg, rgba(139,179,245,0.05) 0%, rgba(106,247,184,0.03) 100%)",
                      borderBottom: "1px solid var(--card-border, var(--border))",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      {hasImage ? (
                        <img
                          src={l.image_url}
                          alt={l.model}
                          onLoad={() => setImgLoaded(prev => new Set(prev).add(l.id))}
                          onError={() => setImgErrors(prev => new Set(prev).add(l.id))}
                          style={{
                            maxWidth: "75%", maxHeight: "80%", objectFit: "contain",
                            opacity: loaded ? 1 : 0,
                            transition: "opacity 0.4s ease, transform 0.3s ease",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 40, opacity: 0.12 }}>💻</span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Brand + Year */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                          textTransform: "uppercase", color: "var(--accent)",
                          background: "rgba(139,179,245,0.1)",
                          border: "1px solid rgba(139,179,245,0.2)",
                          borderRadius: "var(--btn-radius, 10px)",
                          padding: "2px 8px",
                        }}>
                          {l.brand}
                        </span>
                        {l.release_year && (
                          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{l.release_year}</span>
                        )}
                      </div>

                      {/* Model name */}
                      <div style={{
                        fontSize: 15, fontWeight: 800, marginBottom: 8,
                        lineHeight: 1.3, flex: 1, letterSpacing: "-0.01em",
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                      }}>
                        {l.model}
                      </div>

                      {/* Specs */}
                      {l.specs && (
                        <div style={{
                          fontSize: 11, color: "var(--text-muted)", marginBottom: 12,
                          lineHeight: 1.5,
                          overflow: "hidden", textOverflow: "ellipsis",
                          display: "-webkit-box", WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                        }}>
                          {l.specs}
                        </div>
                      )}

                      {/* Price row */}
                      <div style={{
                        display: "flex", alignItems: "baseline", gap: 8,
                        paddingTop: 12,
                        borderTop: "1px solid var(--card-border, var(--border))",
                        marginTop: "auto",
                      }}>
                        <span style={{
                          fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em",
                          color: hasDiscount ? "var(--accent-3)" : "var(--text)",
                        }}>
                          {fmt(price)}
                        </span>
                        {hasDiscount && (
                          <span style={{
                            fontSize: 12, color: "var(--text-dim)",
                            textDecoration: "line-through", opacity: 0.6,
                          }}>
                            {fmt(retail)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════
              Browse Other Brands
              ═══════════════════════════════════ */}
          <div style={{
            marginTop: 56, paddingTop: 32,
            borderTop: "1px solid var(--border)",
          }}>
            <div style={{
              fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase",
              letterSpacing: "0.1em", fontWeight: 700, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>🔀</span>
              Browse other brands
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {KNOWN_BRANDS.filter((b) => b !== brand).map((b) => (
                <button
                  key={b}
                  onClick={() => router.push(`/brand/${encodeURIComponent(b.toLowerCase())}`)}
                  style={{
                    fontSize: 13, fontWeight: 600, padding: "10px 20px",
                    borderRadius: "var(--btn-radius, 10px)",
                    border: "1px solid var(--border)",
                    background: "var(--card-bg, var(--surface))",
                    color: "var(--text)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", gap: 8,
                    boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))",
                    backdropFilter: "blur(var(--card-blur, 0px))",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--accent)";
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(139,179,245,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border)";
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.15))";
                  }}
                >
                  <span style={{ fontSize: 16 }}>{BRAND_ICONS[b] ?? "💻"}</span>
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
