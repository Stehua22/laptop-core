"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Same bucket the admin panel's "Site Images" tab uploads to — whatever's
// uploaded there shows up here automatically, no code changes needed.
const SITE_IMAGES_BUCKET = "site-images";
// Cache-bust per page load so a browser that cached an old 404 (from before
// the bucket/policy existed) is forced to re-check instead of reusing it.
const IMG_CACHE_BUST = Date.now();
function siteImageUrl(path: string) {
  const { publicUrl } = supabaseBrowser.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(path).data;
  return `${publicUrl}?t=${IMG_CACHE_BUST}`;
}

const CAD_TO_USD = 0.73;

const FEATURES = [
  { icon: "📈", title: "Track prices", desc: "Monitor laptop prices over time. See when a listing actually drops." },
  { icon: "🔍", title: "Deal scanner", desc: "Find discounted listings from Apple, Lenovo, Dell, ASUS and more." },
  { icon: "🎯", title: "Best picks", desc: "Recommendations for students, home users, and business use." },
  { icon: "⚖️", title: "Compare specs", desc: "Browse the catalog and compare specs and prices side by side." },
  { icon: "📊", title: "Price history", desc: "Charts showing how a laptop's price has moved over time." },
  { icon: "💱", title: "CAD and USD", desc: "Switch currency anywhere on the site." },
];

const BRANDS = ["Apple", "Lenovo", "Dell", "HP", "ASUS", "Acer", "Microsoft", "Samsung"];

export default function LandingPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [heroLeftOk, setHeroLeftOk] = useState(true);
  const [heroRightOk, setHeroRightOk] = useState(true);

  // These point at the same CSS variables your theme picker (in the
  // tracker's Settings panel) writes to <html> — so whatever theme is
  // active there (Frost, Noir, Candy, etc.) is what renders here too.
  const bg = "var(--bg)";
  const surface = "var(--surface)";
  const text = "var(--text)";
  const textMuted = "var(--text-muted)";
  const border = "var(--border)";
  const accent = "var(--accent)";
  const accent2 = "var(--accent-2, var(--accent))";
  const accent3 = "var(--accent-3, var(--accent))";
  const glow = "var(--glow)";
  const cardRadius = "var(--card-radius, 14px)";
  const btnRadius = "var(--btn-radius, 8px)";

  const samplePrices = [
    { model: "MacBook Air M5", cad: 1499, store: "Apple" },
    { model: "ThinkPad X1 Carbon Gen 13", cad: 2499, store: "Lenovo" },
    { model: "ASUS Zenbook A14", cad: 1399, store: "ASUS" },
  ];

  const displayPrice = (cad: number) => {
    const amount = currency === "USD" ? Math.round(cad * CAD_TO_USD) : cad;
    return `$${amount.toLocaleString()} ${currency}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Inter, sans-serif", overflowX: "hidden", position: "relative" }}>

      {/* Nav — TopNav (logo, login, theme toggle) is sticky and sits above this automatically, no padding needed */}
      <nav style={{ borderBottom: `1px solid ${border}`, padding: "0 32px", background: surface, position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={() => router.push("/")} style={{ fontWeight: 700, fontSize: 16, cursor: "pointer", color: text, letterSpacing: "-0.01em" }}>
            LaptopCore
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {[
              { label: "Home", href: "/" },
              { label: "Deals", href: "/deals" },
              { label: "Best Picks", href: "/best-picks" },
              { label: "Shop", href: "/tracker" },
            ].map(({ label, href }) => (
              <button key={label} onClick={() => router.push(href)}
                style={{ background: "none", border: "none", color: textMuted, fontSize: 14, cursor: "pointer", padding: 0, fontWeight: 500 }}
              >{label}</button>
            ))}

            <div style={{ display: "flex", border: `1px solid ${border}`, borderRadius: 7, overflow: "hidden" }}>
              {(["CAD", "USD"] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  style={{ fontSize: 12, fontWeight: 600, padding: "6px 13px", border: "none", cursor: "pointer", background: currency === c ? accent : "transparent", color: currency === c ? "#fff" : textMuted, transition: "background 0.15s" }}
                >{c}</button>
              ))}
            </div>

          </div>
        </div>
      </nav>

      {/* Hero — animated multi-color blobs drifting behind everything */}
      <section style={{ position: "relative", padding: "120px 32px 90px", maxWidth: 1180, margin: "0 auto", textAlign: "center", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: "-120px -200px", zIndex: 0, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", top: "10%", left: "20%", width: 340, height: 340, borderRadius: "50%",
            background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
            opacity: 0.35, filter: "blur(40px)", animation: "lc-drift-a 9s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: "5%", right: "15%", width: 300, height: 300, borderRadius: "50%",
            background: `radial-gradient(circle, ${accent2} 0%, transparent 70%)`,
            opacity: 0.3, filter: "blur(40px)", animation: "lc-drift-b 11s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "0%", left: "40%", width: 260, height: 260, borderRadius: "50%",
            background: `radial-gradient(circle, ${accent3} 0%, transparent 70%)`,
            opacity: 0.3, filter: "blur(40px)", animation: "lc-drift-c 8s ease-in-out infinite",
          }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, animation: "lc-rise 0.6s ease both" }}>
          <p style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: accent, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 18,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: accent,
              boxShadow: `0 0 0 4px ${glow}`, animation: "lc-pulse 1.6s ease-in-out infinite",
            }} />
            Built for Canadian shoppers
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 56, marginBottom: 22 }}>
            {/* Uploaded from Admin Panel → Site Images → "Hero — left image" */}
            {heroLeftOk && (
              <img
                src={siteImageUrl("hero-left.png")}
                alt=""
                className="lc-hero-side-img lc-float-a"
                style={{ width: 140, height: 140, objectFit: "contain", flexShrink: 0 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  setHeroLeftOk(false);
                }}
              />
            )}

            <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 3.8rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: text, margin: 0 }}>
              Track laptop prices.<br />
              <span style={{
                background: `linear-gradient(90deg, ${accent}, ${accent2}, ${accent3}, ${accent})`,
                backgroundSize: "300% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "lc-gradient-move 5s linear infinite",
              }}>
                Buy at the right time.
              </span>
            </h1>

            {/* Uploaded from Admin Panel → Site Images → "Hero — right image" */}
            {heroRightOk && (
              <img
                src={siteImageUrl("hero-right.png")}
                alt=""
                className="lc-hero-side-img lc-float-b"
                style={{ width: 140, height: 140, objectFit: "contain", flexShrink: 0 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  setHeroRightOk(false);
                }}
              />
            )}
          </div>

          <p style={{ fontSize: 17, color: textMuted, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 40px" }}>
            Monitor prices across Apple, Lenovo, Dell, HP and more. Compare deals in CAD or USD before you buy.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/tracker")}
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent2})`, color: "#fff", border: "none", borderRadius: btnRadius,
                padding: "14px 32px", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
                boxShadow: `0 8px 26px ${glow}`, transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px) scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; }}
            >Browse Laptops</button>

            <button
              onClick={() => router.push("/deals")}
              style={{
                background: surface, color: text, border: `1px solid ${border}`, borderRadius: btnRadius,
                padding: "14px 28px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >View Deals</button>
          </div>
        </div>
      </section>

      {/* Live price preview */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto 100px", padding: "0 32px", animation: "lc-rise 0.6s ease 0.1s both" }}>
        <div style={{ border: `1px solid ${border}`, borderRadius: cardRadius, overflow: "hidden", background: surface, boxShadow: "var(--shadow, 0 1px 3px rgba(0,0,0,0.04))" }}>
          <div style={{ padding: "14px 22px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: textMuted, fontWeight: 600, letterSpacing: "0.02em" }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: accent3,
                animation: "lc-pulse 1.6s ease-in-out infinite",
              }} />
              SAMPLE PRICES
            </span>
            <div style={{ display: "flex", border: `1px solid ${border}`, borderRadius: 6, overflow: "hidden" }}>
              {(["CAD", "USD"] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", border: "none", cursor: "pointer", background: currency === c ? accent : "transparent", color: currency === c ? "#fff" : textMuted }}
                >{c}</button>
              ))}
            </div>
          </div>

          {samplePrices.map((p, i) => (
            <div key={i}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px",
                borderBottom: i < samplePrices.length - 1 ? `1px solid ${border}` : "none",
                animation: `lc-rise 0.45s ease ${0.3 + i * 0.1}s both`,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 3, color: text }}>{p.model}</div>
                <div style={{ fontSize: 12.5, color: textMuted }}>{p.store}</div>
              </div>
              <div key={`${currency}-${i}`} style={{ fontWeight: 700, fontSize: 17, color: text, animation: "lc-price-flip 0.3s ease" }}>{displayPrice(p.cad)}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12.5, color: textMuted, marginTop: 14 }}>Sample data — live prices are on the tracker page</p>
      </section>

      {/* Brands — scrolling marquee instead of a static row */}
      <section style={{ position: "relative", zIndex: 1, margin: "0 auto 100px", textAlign: "center" }}>
        <p style={{ fontSize: 12.5, color: textMuted, marginBottom: 22, fontWeight: 600, letterSpacing: "0.02em" }}>TRACKING LAPTOPS FROM</p>
        <div style={{ overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)" }}>
          <div style={{ display: "flex", gap: 10, width: "max-content", animation: "lc-marquee 18s linear infinite" }}>
            {[...BRANDS, ...BRANDS].map((brand, i) => (
              <div
                key={brand + i}
                style={{
                  border: `1px solid ${border}`, borderRadius: 20, padding: "8px 20px", fontSize: 13.5,
                  color: textMuted, background: surface, fontWeight: 500, whiteSpace: "nowrap",
                }}
              >{brand}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 1040, margin: "0 auto 100px", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 27, fontWeight: 800, marginBottom: 10, color: text, letterSpacing: "-0.02em" }}>What LaptopCore does</h2>
          <p style={{ fontSize: 14.5, color: textMuted }}>Built for people who want to shop smarter, not harder.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              onMouseEnter={() => setHoveredCard(f.title)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: surface, border: `1px solid ${hoveredCard === f.title ? accent : border}`, borderRadius: cardRadius, padding: "26px",
                transform: hoveredCard === f.title ? "translateY(-5px) scale(1.02)" : "translateY(0) scale(1)",
                boxShadow: hoveredCard === f.title ? `var(--card-hover-shadow, 0 14px 32px ${glow})` : "none",
                transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
                animation: `lc-rise 0.5s ease ${0.15 + i * 0.06}s both`,
              }}
            >
              <div style={{
                fontSize: 22, marginBottom: 10, display: "inline-block",
                transform: hoveredCard === f.title ? "scale(1.25) rotate(-6deg)" : "scale(1) rotate(0deg)",
                transition: "transform 0.2s",
              }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: text }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: textMuted, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto 100px", padding: "0 32px", textAlign: "center" }}>
        <div style={{
          position: "relative", overflow: "hidden",
          background: `linear-gradient(135deg, ${surface}, ${surface})`,
          border: `1px solid ${border}`, borderRadius: 18, padding: "56px 40px",
        }}>
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              background: `radial-gradient(circle at 30% 0%, ${glow} 0%, transparent 55%), radial-gradient(circle at 80% 100%, ${accent2} 0%, transparent 45%)`,
              opacity: 0.5,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: 25, fontWeight: 800, marginBottom: 12, color: text, letterSpacing: "-0.02em" }}>Ready to find your next laptop?</h2>
            <p style={{ fontSize: 14.5, color: textMuted, marginBottom: 30 }}>Browse tracked laptops with price history, specs, and deals.</p>
            <button
              onClick={() => router.push("/tracker")}
              className="lc-cta-pulse"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})`, color: "#fff", border: "none", borderRadius: btnRadius, padding: "14px 36px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", transition: "transform 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px) scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}
            >Start Tracking</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${border}`, padding: "32px", background: surface }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: textMuted }}>© 2026 LaptopCore</span>
          <span style={{ fontSize: 13, color: textMuted }}>Prices may not reflect current store listings.</span>
        </div>
      </footer>

      <style>{`
        @keyframes lc-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
        @keyframes lc-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-gradient-move {
          to { background-position: 300% center; }
        }
        @keyframes lc-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes lc-drift-a {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(40px, 30px); }
        }
        @keyframes lc-drift-b {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 40px); }
        }
        @keyframes lc-drift-c {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes lc-float-a {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(-3deg); }
        }
        @keyframes lc-float-b {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(3deg); }
        }
        @keyframes lc-price-flip {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lc-cta-glow {
          0%, 100% { box-shadow: 0 8px 26px ${glow}; }
          50% { box-shadow: 0 8px 40px ${glow}, 0 0 0 6px ${glow}; }
        }
        .lc-float-a { animation: lc-float-a 5s ease-in-out infinite; }
        .lc-float-b { animation: lc-float-b 5.5s ease-in-out infinite; }
        .lc-cta-pulse { animation: lc-cta-glow 2.4s ease-in-out infinite; }
        @media (max-width: 900px) {
          .lc-hero-side-img { display: none; }
        }
      `}</style>
    </div>
  );
}