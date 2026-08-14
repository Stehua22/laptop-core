"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Scroll-triggered reveal: returns a ref + whether the element has entered
// the viewport yet (fires once, then stops observing).
function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

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

const TUTORIAL_STEPS = [
  {
    label: "Search & Filter",
    title: "Find laptops that fit your needs",
    desc: "Filter by brand, price range, screen size, weight, or what you'll actually use it for — student, home, or business.",
    mock: "filter" as const,
  },
  {
    label: "Track Prices",
    title: "See where the price has actually been",
    desc: "Every laptop has a price history chart, so you can tell if today's price is a real deal or just marketing.",
    mock: "chart" as const,
  },
  {
    label: "Compare",
    title: "Put laptops side by side",
    desc: "Select a few laptops and compare specs and prices in one view before you decide.",
    mock: "compare" as const,
  },
  {
    label: "Spot Deals",
    title: "Catch the real price drops",
    desc: "The Deal Scanner flags genuine discounts across stores, so you don't have to go hunting for them yourself.",
    mock: "deals" as const,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [heroLeftOk, setHeroLeftOk] = useState(true);
  const [heroRightOk, setHeroRightOk] = useState(true);

  // Scroll-triggered sections — these were animating on page load (often
  // finished before the user scrolls that far), now they play when the
  // section actually enters view.
  const brandsView = useInView<HTMLDivElement>();
  const featuresView = useInView<HTMLDivElement>();
  const ctaView = useInView<HTMLDivElement>();
  const tutorialView = useInView<HTMLDivElement>();
  const [activeTutorial, setActiveTutorial] = useState(0);

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

  // Auto-advance the tutorial tabs, but only once they've scrolled into view.
  useEffect(() => {
    if (!tutorialView.inView) return;
    const id = setInterval(() => {
      setActiveTutorial((i) => (i + 1) % TUTORIAL_STEPS.length);
    }, 4500);
    return () => clearInterval(id);
  }, [tutorialView.inView]);

  function TutorialMock({ type }: { type: typeof TUTORIAL_STEPS[number]["mock"] }) {
    const chip = (label: string) => (
      <span style={{ fontSize: 10.5, fontWeight: 600, color: textMuted, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: "4px 9px" }}>{label}</span>
    );

    if (type === "filter") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ opacity: 0.5, fontSize: 12 }}>🔍</span>
            <span style={{ fontSize: 12, color: textMuted }}>thinkpad x1 carbon</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {chip("Lenovo ✕")}{chip("Under $2,500")}{chip("14\"")}{chip("Business")}
          </div>
          {[1, 2].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", opacity: i === 1 ? 1 : 0.55 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: text }}>ThinkPad X1 Carbon Gen {12 + i}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: accent3 }}>{i === 1 ? "$2,199" : "$2,449"}</span>
            </div>
          ))}
        </div>
      );
    }

    if (type === "chart") {
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: text }}>MacBook Air 13 M5</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent3 }}>▼ 12% since June</span>
          </div>
          <svg viewBox="0 0 260 90" style={{ width: "100%", height: 90, display: "block" }}>
            <polyline points="0,20 40,26 80,22 120,40 160,36 200,58 240,50 260,66" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="0,20 40,26 80,22 120,40 160,36 200,58 240,50 260,66 260,90 0,90" fill={`url(#lc-chart-grad)`} opacity="0.18" stroke="none" />
            <defs>
              <linearGradient id="lc-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="260" cy="66" r="4" fill={accent3} />
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: textMuted, marginTop: 4 }}>
            <span>90 days ago</span><span>Today</span>
          </div>
        </div>
      );
    }

    if (type === "compare") {
      const rows = ["CPU", "RAM", "Price"];
      const cols = [
        { name: "Air M5", vals: ["M5", "16GB", "$1,499"] },
        { name: "Zenbook A14", vals: ["Ultra 7", "32GB", "$1,399"] },
      ];
      return (
        <div style={{ display: "grid", gridTemplateColumns: `90px repeat(${cols.length}, 1fr)`, gap: 6, fontSize: 11 }}>
          <div />
          {cols.map((c) => (
            <div key={c.name} style={{ fontWeight: 700, color: text, textAlign: "center", paddingBottom: 6, borderBottom: `2px solid ${accent}` }}>{c.name}</div>
          ))}
          {rows.map((r, ri) => (
            <Fragment key={r}>
              <div style={{ color: textMuted, fontWeight: 600, display: "flex", alignItems: "center" }}>{r}</div>
              {cols.map((c) => (
                <div key={c.name + r} style={{ textAlign: "center", color: text, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: "6px 4px", fontWeight: ri === 2 ? 700 : 500 }}>{c.vals[ri]}</div>
              ))}
            </Fragment>
          ))}
        </div>
      );
    }

    // deals
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { m: "IdeaPad Pro 5i", pct: 34 },
          { m: "ZenBook 14 OLED", pct: 22 },
          { m: "Surface Laptop 6", pct: 41 },
        ].map((d) => (
          <div key={d.m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{d.m}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1200", background: "linear-gradient(135deg, #f7c26a, #f4a830)", borderRadius: 6, padding: "2px 8px" }}>-{d.pct}%</span>
          </div>
        ))}
      </div>
    );
  }

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
              <button key={label} onClick={() => router.push(href)} className="lc-nav-link"
                style={{ background: "none", border: "none", color: textMuted, fontSize: 14, cursor: "pointer", padding: "4px 0", fontWeight: 500, position: "relative" }}
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

          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", marginTop: 44, animation: "lc-rise 0.6s ease 0.35s both" }}>
            {[
              { n: "100%", l: "Free to use" },
              { n: "CAD/USD", l: "Live currency toggle" },
              { n: "9+", l: "Brands tracked" },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: text, letterSpacing: "-0.01em" }}>{s.n}</div>
                <div style={{ fontSize: 11.5, color: textMuted, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
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
      <section
        ref={brandsView.ref}
        style={{
          position: "relative", zIndex: 1, margin: "0 auto 100px", textAlign: "center",
          opacity: brandsView.inView ? 1 : 0,
          animation: brandsView.inView ? "lc-rise 0.6s ease both" : "none",
        }}
      >
        <p style={{ fontSize: 12.5, color: textMuted, marginBottom: 22, fontWeight: 600, letterSpacing: "0.02em" }}>TRACKING LAPTOPS FROM</p>
        <div style={{ overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)" }}>
          <div style={{ display: "flex", gap: 10, width: "max-content", animation: "lc-marquee 18s linear infinite" }}>
            {[...BRANDS, ...BRANDS].map((brand, i) => (
              <div
                key={brand + i}
                className="lc-brand-pill"
                style={{
                  border: `1px solid ${border}`, borderRadius: 20, padding: "8px 20px", fontSize: 13.5,
                  color: textMuted, background: surface, fontWeight: 500, whiteSpace: "nowrap",
                  transition: "transform 0.2s, border-color 0.2s, color 0.2s",
                }}
              >{brand}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorial — interactive walkthrough of the core features */}
      <section
        ref={tutorialView.ref}
        style={{
          position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto 100px", padding: "0 32px",
          opacity: tutorialView.inView ? 1 : 0,
          animation: tutorialView.inView ? "lc-rise 0.5s ease both" : "none",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: 27, fontWeight: 800, marginBottom: 10, color: text, letterSpacing: "-0.02em" }}>See how it works</h2>
          <p style={{ fontSize: 14.5, color: textMuted }}>A quick walkthrough of the tools you'll actually use.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
          {TUTORIAL_STEPS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActiveTutorial(i)}
              style={{
                fontSize: 12.5, fontWeight: 700, padding: "9px 16px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${i === activeTutorial ? accent : border}`,
                background: i === activeTutorial ? accent : surface,
                color: i === activeTutorial ? "#fff" : textMuted,
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ opacity: 0.7, marginRight: 6 }}>{i + 1}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="lc-tutorial-panel" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
          border: `1px solid ${border}`, borderRadius: 18, overflow: "hidden", background: surface,
          boxShadow: "var(--shadow, 0 1px 3px rgba(0,0,0,0.04))",
        }}>
          <div key={`text-${activeTutorial}`} style={{ padding: "36px 32px", display: "flex", flexDirection: "column", justifyContent: "center", animation: "lc-tutorial-in 0.35s ease both" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
              Step {activeTutorial + 1} of {TUTORIAL_STEPS.length}
            </span>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: text, marginBottom: 10, letterSpacing: "-0.01em" }}>{TUTORIAL_STEPS[activeTutorial].title}</h3>
            <p style={{ fontSize: 13.5, color: textMuted, lineHeight: 1.7 }}>{TUTORIAL_STEPS[activeTutorial].desc}</p>
            <div style={{ display: "flex", gap: 5, marginTop: 22 }}>
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} style={{ height: 3, borderRadius: 2, flex: 1, background: i === activeTutorial ? accent : border, transition: "background 0.2s" }} />
              ))}
            </div>
          </div>
          <div
            key={`mock-${activeTutorial}`}
            style={{
              padding: "28px", background: bg, borderLeft: `1px solid ${border}`,
              display: "flex", alignItems: "center", animation: "lc-tutorial-in 0.35s ease 0.05s both",
            }}
          >
            <div style={{ width: "100%", background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f76a6a" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f7c26a" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6af7a8" }} />
              </div>
              <TutorialMock type={TUTORIAL_STEPS[activeTutorial].mock} />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresView.ref} style={{ position: "relative", zIndex: 1, maxWidth: 1040, margin: "0 auto 100px", padding: "0 32px" }}>
        <div
          style={{
            textAlign: "center", marginBottom: 40,
            opacity: featuresView.inView ? 1 : 0,
            animation: featuresView.inView ? "lc-rise 0.5s ease both" : "none",
          }}
        >
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
                opacity: featuresView.inView ? 1 : 0,
                animation: featuresView.inView ? `lc-rise 0.5s ease ${0.1 + i * 0.07}s both` : "none",
              }}
            >
              <div style={{
                fontSize: 22, marginBottom: 10, display: "inline-block",
                transform: hoveredCard === f.title ? "scale(1.25) rotate(-6deg)" : "scale(1) rotate(0deg)",
                transition: "transform 0.2s",
                animation: hoveredCard === f.title ? "none" : "lc-icon-bob 3s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: text }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: textMuted, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section
        ref={ctaView.ref}
        style={{
          position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto 100px", padding: "0 32px", textAlign: "center",
          opacity: ctaView.inView ? 1 : 0,
          animation: ctaView.inView ? "lc-cta-in 0.6s cubic-bezier(0.16,1,0.3,1) both" : "none",
        }}
      >
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
      <footer style={{ position: "relative", zIndex: 1, borderTop: `1px solid ${border}`, padding: "48px 32px 28px", background: surface }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between", marginBottom: 32 }}>
            <div style={{ maxWidth: 280 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: text, marginBottom: 8, letterSpacing: "-0.01em" }}>LaptopCore</div>
              <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.6 }}>Tracking Canadian laptop prices so you know a real deal when you see one.</p>
            </div>
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              {[
                { heading: "Product", links: [{ label: "Browse laptops", href: "/tracker" }, { label: "Deals", href: "/deals" }, { label: "Best Picks", href: "/best-picks" }] },
                { heading: "More", links: [{ label: "Articles", href: "/articles" }, { label: "Home", href: "/" }] },
              ].map((col) => (
                <div key={col.heading}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{col.heading}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {col.links.map((l) => (
                      <button key={l.label} onClick={() => router.push(l.href)} className="lc-footer-link"
                        style={{ background: "none", border: "none", color: textMuted, fontSize: 13, cursor: "pointer", padding: 0, textAlign: "left" }}
                      >{l.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12.5, color: textMuted }}>© 2026 LaptopCore</span>
            <span style={{ fontSize: 12.5, color: textMuted }}>Prices may not reflect current store listings.</span>
          </div>
        </div>
      </footer>

      <style>{`
        .lc-footer-link:hover { color: ${text} !important; }
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
        @keyframes lc-icon-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes lc-cta-in {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lc-tutorial-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lc-float-a { animation: lc-float-a 5s ease-in-out infinite; }
        .lc-float-b { animation: lc-float-b 5.5s ease-in-out infinite; }
        .lc-cta-pulse { animation: lc-cta-glow 2.4s ease-in-out infinite; }
        .lc-brand-pill:hover { transform: translateY(-2px) scale(1.06); border-color: ${accent}; color: ${text}; }
        .lc-nav-link::after {
          content: ""; position: absolute; left: 0; right: 100%; bottom: -2px; height: 2px;
          background: ${accent}; transition: right 0.2s ease;
        }
        .lc-nav-link:hover { color: ${text}; }
        .lc-nav-link:hover::after { right: 0; }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        @media (max-width: 900px) {
          .lc-hero-side-img { display: none; }
        }
        @media (max-width: 700px) {
          .lc-tutorial-panel { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}