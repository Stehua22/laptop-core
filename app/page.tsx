"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CAD_TO_USD = 0.73;

const FEATURES = [
  { icon: "📊", title: "Track Prices", desc: "Monitor laptop prices in real-time. Never overpay again." },
  { icon: "🔥", title: "Crazy Deals", desc: "Find the biggest discounts from Apple, Lenovo, Dell, ASUS and more." },
  { icon: "🎓", title: "Best Picks", desc: "Curated recommendations for Students, Home users, and Business pros." },
  { icon: "🛒", title: "Shop Laptops", desc: "Browse our full catalog and compare specs, prices and stores side by side." },
  { icon: "📈", title: "Price History", desc: "See how prices changed over time with detailed charts and data." },
  { icon: "🌎", title: "CAD & USD", desc: "Switch between Canadian and US dollar pricing instantly across the site." },
];

const BRANDS = ["Apple", "Lenovo", "Dell", "HP", "ASUS", "Acer", "Microsoft", "Samsung"];

const STATS = [
  { value: "30+", label: "Laptops Tracked" },
  { value: "8", label: "Brands" },
  { value: "Live", label: "Price Updates" },
  { value: "Free", label: "Always" },
];

export default function LandingPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const bg = isDark ? "#080b12" : "#f4f6ff";
  const surface = isDark ? "#0f1220" : "#ffffff";
  const surface2 = isDark ? "#171b2b" : "#eef1fb";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const text = isDark ? "#eef2ff" : "#18202e";
  const textMuted = isDark ? "#6e7a96" : "#52608a";
  const textDim = isDark ? "#3d4459" : "#8c99be";
  const accent = isDark ? "#8bb3f5" : "#5e8fe8";
  const accent2 = isDark ? "#f7c26a" : "#d9930e";
  const accent3 = isDark ? "#6af7b8" : "#1fb874";

  const samplePrices = [
    { model: "MacBook Air M3", cad: 1499, store: "Apple", change: -100 },
    { model: "ThinkPad X1 Carbon", cad: 2499, store: "Lenovo", change: -200 },
    { model: "ASUS Zenbook A14", cad: 1399, store: "ASUS", change: -50 },
  ];

  const displayPrice = (cad: number) => {
    const amount = currency === "USD" ? Math.round(cad * CAD_TO_USD) : cad;
    return `$${amount.toLocaleString()} ${currency}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Inter, sans-serif", overflowX: "hidden", transition: "background 0.35s ease, color 0.35s ease" }}>

      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${isDark ? "rgba(139,179,245,0.022)" : "rgba(94,143,232,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(139,179,245,0.022)" : "rgba(94,143,232,0.04)"} 1px, transparent 1px)`, backgroundSize: "72px 72px", pointerEvents: "none", zIndex: 0 }} />

      {/* Top glow — hidden in light mode to prevent the gradient blob bug */}
      <div style={{ position: "fixed", top: "-25vh", left: "50%", transform: "translateX(-50%)", width: "90vw", height: "70vh", background: `radial-gradient(ellipse at center, ${isDark ? "rgba(139,179,245,0.06)" : "rgba(94,143,232,0.04)"} 0%, transparent 65%)`, pointerEvents: "none", zIndex: 0, opacity: isDark ? 1 : 0, transition: "opacity 0.35s ease" }} />

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? (isDark ? "rgba(8,11,18,0.9)" : "rgba(244,246,255,0.9)") : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? `1px solid ${border}` : "none",
        transition: "all 0.35s ease",
        padding: "0 32px",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={() => router.push("/")} style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.04em", cursor: "pointer", color: text }}>
            LaptopCore<span style={{ color: accent }}>.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {[
              { label: "Home", href: "/" },
              { label: "Deals", href: "/deals" },
              { label: "Best Picks", href: "/best-picks" },
              { label: "Shop", href: "/tracker" },
            ].map(({ label, href }) => (
              <button key={label} onClick={() => router.push(href)}
                style={{ background: "transparent", border: "none", color: textMuted, fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "8px 14px", borderRadius: 8, transition: "all 0.15s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = text; el.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = textMuted; el.style.background = "transparent"; }}
              >{label}</button>
            ))}

            <div style={{ width: 1, height: 20, background: border, margin: "0 8px" }} />

            {/* Theme toggle */}
            <button onClick={() => setIsDark(!isDark)}
              style={{ marginLeft: 6, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", border: `1px solid ${border}`, borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >{isDark ? "☀️" : "🌙"}</button>

            {/* Currency toggle */}
            <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", border: `1px solid ${border}`, borderRadius: 99, padding: 3, gap: 2, marginLeft: 6 }}>
              {(["CAD", "USD"] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 99, border: "none", cursor: "pointer", background: currency === c ? accent : "transparent", color: currency === c ? (isDark ? "#0a0d14" : "#fff") : textMuted, transition: "all 0.2s", letterSpacing: "0.03em" }}
                >{c}</button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", padding: "190px 32px 110px", maxWidth: 1140, margin: "0 auto", textAlign: "center", zIndex: 1 }}>
        <div className="animate-fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: isDark ? "rgba(139,179,245,0.08)" : "rgba(94,143,232,0.1)", border: `1px solid ${isDark ? "rgba(139,179,245,0.18)" : "rgba(94,143,232,0.25)"}`, borderRadius: 99, padding: "6px 18px", fontSize: 12, color: accent, marginBottom: 36, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <span style={{ width: 6, height: 6, background: accent, borderRadius: "50%", display: "inline-block" }} />
          🇨🇦 Built for Canadian laptop shoppers
        </div>

        <h1 className="animate-fade-up" style={{ fontSize: "clamp(3.2rem, 8vw, 5.5rem)", fontWeight: 900, lineHeight: 1.03, letterSpacing: "-0.05em", marginBottom: 28, animationDelay: "0.05s", color: text }}>
          Track laptop prices.<br />
          <span style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent3} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>Never overpay again.</span>
        </h1>

        <p className="animate-fade-up" style={{ fontSize: 18, color: textMuted, lineHeight: 1.8, maxWidth: 500, margin: "0 auto 52px", animationDelay: "0.1s" }}>
          Monitor prices across Apple, Lenovo, Dell, HP and more. Get the best deals on laptops in Canada — in CAD or USD.
        </p>

        <div className="animate-fade-up" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animationDelay: "0.15s" }}>
          <button onClick={() => router.push("/tracker")}
            style={{ background: accent, color: isDark ? "#080b12" : "#fff", border: "none", borderRadius: 14, padding: "17px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 0 1px ${accent}40, 0 8px 32px ${accent}30`, transition: "all 0.2s", letterSpacing: "-0.01em" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = `0 0 0 1px ${accent}80, 0 16px 48px ${accent}45`; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = `0 0 0 1px ${accent}40, 0 8px 32px ${accent}30`; }}
          >Browse Laptops →</button>

          <button onClick={() => router.push("/deals")}
            style={{ background: isDark ? "rgba(247,194,106,0.08)" : "rgba(217,147,14,0.08)", color: accent2, border: `1px solid ${isDark ? "rgba(247,194,106,0.25)" : "rgba(217,147,14,0.3)"}`, borderRadius: 14, padding: "17px 30px", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = isDark ? "rgba(247,194,106,0.16)" : "rgba(217,147,14,0.14)"; el.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = isDark ? "rgba(247,194,106,0.08)" : "rgba(217,147,14,0.08)"; el.style.transform = "translateY(0)"; }}
          >🔥 Crazy Deals</button>

          <a href="https://discord.gg/GRBrr6CUa" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(88,101,242,0.08)", color: "#8b95f5", border: "1px solid rgba(88,101,242,0.25)", borderRadius: 14, padding: "17px 30px", fontSize: 15, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(88,101,242,0.18)"; el.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(88,101,242,0.08)"; el.style.transform = "translateY(0)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.909 19.909 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Join Discord
          </a>
        </div>
      </section>

      {/* Stats */}
      <section style={{ maxWidth: 900, margin: "0 auto 100px", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {STATS.map((s, i) => (
            <div key={s.label} className="animate-fade-up"
              style={{ background: surface, border: `1px solid ${border}`, borderRadius: 18, padding: "28px 20px", textAlign: "center", animationDelay: `${i * 0.06}s`, position: "relative", overflow: "hidden", transition: "all 0.25s" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.borderColor = isDark ? "rgba(139,179,245,0.25)" : "rgba(94,143,232,0.35)"; el.style.boxShadow = isDark ? "0 12px 32px rgba(0,0,0,0.3)" : "0 12px 32px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.borderColor = border; el.style.boxShadow = "none"; }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, ${accent3})`, opacity: 0.7 }} />
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: accent, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live price preview */}
      <section style={{ maxWidth: 680, margin: "0 auto 100px", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600, marginBottom: 14 }}>Live tracking</p>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 10, color: text }}>Watch prices update in real-time</h2>
          <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.7 }}>Toggle currency and watch numbers change instantly</p>
        </div>

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, overflow: "hidden", boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,179,245,0.05)" : "0 24px 64px rgba(0,0,0,0.1)", transition: "all 0.35s" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: "#f76a6a" }} />
            <div style={{ width: 10, height: 10, borderRadius: 99, background: "#f7c26a" }} />
            <div style={{ width: 10, height: 10, borderRadius: 99, background: "#6af7b8" }} />
            <div style={{ flex: 1, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1px solid ${border}`, borderRadius: 6, padding: "4px 12px", marginLeft: 8 }}>
              <span style={{ fontSize: 11, color: textDim, fontFamily: "monospace" }}>laptopcore.vercel.app/tracker</span>
            </div>
            <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${border}`, borderRadius: 99, padding: 2 }}>
              {(["CAD", "USD"] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)} style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: "none", cursor: "pointer", background: currency === c ? accent : "transparent", color: currency === c ? (isDark ? "#080b12" : "#fff") : textMuted, transition: "all 0.2s", letterSpacing: "0.03em" }}>{c}</button>
              ))}
            </div>
          </div>

          {samplePrices.map((p, i) => (
            <div key={i}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: i < samplePrices.length - 1 ? `1px solid ${border}` : "none", transition: "background 0.2s", cursor: "default" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: isDark ? "rgba(139,179,245,0.1)" : "rgba(94,143,232,0.1)", border: `1px solid ${isDark ? "rgba(139,179,245,0.15)" : "rgba(94,143,232,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💻</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: text }}>{p.model}</div>
                  <div style={{ fontSize: 11, color: textMuted }}>{p.store}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: accent3, letterSpacing: "-0.02em", transition: "all 0.3s" }}>{displayPrice(p.cad)}</div>
                <div style={{ fontSize: 11, color: accent3, opacity: 0.6, marginTop: 2 }}>▼ {displayPrice(Math.abs(p.change))} off retail</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: textDim, marginTop: 12 }}>Sample data · Prices update live on the tracker</p>
      </section>

      {/* Brands */}
      <section style={{ maxWidth: 1140, margin: "0 auto 100px", padding: "0 32px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600, marginBottom: 24 }}>Tracking laptops from</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {BRANDS.map((brand) => (
            <div key={brand}
              style={{ background: surface, border: `1px solid ${border}`, borderRadius: 99, padding: "9px 22px", fontSize: 13, fontWeight: 600, color: textMuted, transition: "all 0.2s", cursor: "default" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = isDark ? "rgba(139,179,245,0.4)" : "rgba(94,143,232,0.45)"; el.style.color = accent; el.style.background = isDark ? "rgba(139,179,245,0.06)" : "rgba(94,143,232,0.08)"; el.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = border; el.style.color = textMuted; el.style.background = surface; el.style.transform = "translateY(0)"; }}
            >{brand}</div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1140, margin: "0 auto 120px", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600, marginBottom: 16 }}>Features</p>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 14, color: text }}>Everything you need to find the best deal</h2>
          <p style={{ fontSize: 15, color: textMuted, maxWidth: 420, margin: "0 auto" }}>Built for Canadians who want to shop smarter.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="animate-fade-up"
              style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: "30px 32px", animationDelay: `${i * 0.06}s`, transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)", position: "relative", overflow: "hidden", cursor: "default" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = isDark ? "rgba(139,179,245,0.3)" : "rgba(94,143,232,0.4)"; el.style.transform = "translateY(-5px)"; el.style.boxShadow = isDark ? "0 24px 56px rgba(0,0,0,0.25)" : "0 24px 56px rgba(0,0,0,0.1)"; el.style.background = surface2; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.borderColor = border; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; el.style.background = surface; }}
            >
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: `radial-gradient(circle, ${isDark ? "rgba(139,179,245,0.06)" : "rgba(94,143,232,0.08)"} 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ fontSize: 26, marginBottom: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, background: isDark ? "rgba(139,179,245,0.08)" : "rgba(94,143,232,0.1)", border: `1px solid ${isDark ? "rgba(139,179,245,0.14)" : "rgba(94,143,232,0.2)"}`, borderRadius: 14 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10, letterSpacing: "-0.02em", color: text }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: textMuted, lineHeight: 1.8 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Discord CTA */}
      <section style={{ maxWidth: 680, margin: "0 auto 100px", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div style={{ background: isDark ? "linear-gradient(135deg, rgba(88,101,242,0.1), rgba(139,179,245,0.05))" : "linear-gradient(135deg, rgba(88,101,242,0.08), rgba(94,143,232,0.04))", border: "1px solid rgba(88,101,242,0.2)", borderRadius: 24, padding: "56px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "radial-gradient(circle, rgba(88,101,242,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -50, left: -50, width: 200, height: 200, background: "radial-gradient(circle, rgba(139,179,245,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ width: 58, height: 58, background: "rgba(88,101,242,0.14)", border: "1px solid rgba(88,101,242,0.25)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#8b95f5"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.909 19.909 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            </div>
            <h2 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 12, color: text }}>Join the community</h2>
            <p style={{ fontSize: 14, color: textMuted, marginBottom: 32, lineHeight: 1.8, maxWidth: 380, margin: "0 auto 32px" }}>Get deal alerts, suggest laptops to track, and chat with other Canadian laptop hunters.</p>
            <a href="https://discord.gg/GRBrr6CUa" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#5865f2", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 24px rgba(88,101,242,0.35)", transition: "all 0.2s" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 32px rgba(88,101,242,0.5)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 24px rgba(88,101,242,0.35)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.909 19.909 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.030z"/></svg>
              Join Discord
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ maxWidth: 680, margin: "0 auto 120px", padding: "0 32px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ background: isDark ? "linear-gradient(135deg, rgba(139,179,245,0.08), rgba(106,247,184,0.04))" : "linear-gradient(135deg, rgba(94,143,232,0.08), rgba(31,184,116,0.05))", border: `1px solid ${border}`, borderRadius: 24, padding: "64px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${isDark ? "rgba(139,179,245,0.07)" : "rgba(94,143,232,0.09)"} 0%, transparent 60%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 14, color: text }}>Ready to find your next laptop?</h2>
            <p style={{ fontSize: 15, color: textMuted, marginBottom: 36, lineHeight: 1.75 }}>Browse 30+ tracked laptops with price history, specs, and deals.</p>
            <button onClick={() => router.push("/tracker")}
              style={{ background: accent, color: isDark ? "#080b12" : "#fff", border: "none", borderRadius: 14, padding: "17px 48px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 0 1px ${accent}40, 0 8px 32px ${accent}25`, transition: "all 0.2s", letterSpacing: "-0.01em" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = `0 0 0 1px ${accent}70, 0 16px 48px ${accent}40`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = `0 0 0 1px ${accent}40, 0 8px 32px ${accent}25`; }}
            >Start Tracking →</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: "44px 32px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.04em", marginBottom: 8, color: text }}>
                LaptopCore<span style={{ color: accent }}>.</span>
              </div>
              <p style={{ fontSize: 12, color: textDim, maxWidth: 220, lineHeight: 1.7 }}>The smartest way to track laptop prices in Canada.</p>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {[{ label: "Tracker", href: "/tracker" }, { label: "Deals", href: "/deals" }].map(({ label, href }) => (
                <button key={label} onClick={() => router.push(href)}
                  style={{ background: "transparent", border: "none", color: textMuted, fontSize: 13, cursor: "pointer", padding: "7px 14px", borderRadius: 8, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = text; el.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = textMuted; el.style.background = "transparent"; }}
                >{label}</button>
              ))}
              <a href="https://discord.gg/GRBrr6CUa" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(88,101,242,0.1)", color: "#8b95f5", border: "1px solid rgba(88,101,242,0.22)", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "all 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(88,101,242,0.2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(88,101,242,0.1)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.909 19.909 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Discord
              </a>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 12, color: textDim }}>© 2026 LaptopCore. Built for Canadians.</p>
            <p style={{ fontSize: 12, color: textDim }}>Prices may not reflect current store listings.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
