"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CAD_TO_USD = 0.73;

const FEATURES = [
  { title: "Track prices", desc: "Monitor laptop prices over time. See when a listing actually drops." },
  { title: "Deal scanner", desc: "Find discounted listings from Apple, Lenovo, Dell, ASUS and more." },
  { title: "Best picks", desc: "Recommendations for students, home users, and business use." },
  { title: "Compare specs", desc: "Browse the catalog and compare specs and prices side by side." },
  { title: "Price history", desc: "Charts showing how a laptop's price has moved over time." },
  { title: "CAD and USD", desc: "Switch currency anywhere on the site." },
];

const BRANDS = ["Apple", "Lenovo", "Dell", "HP", "ASUS", "Acer", "Microsoft", "Samsung"];

export default function LandingPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");

  // These now point at the same CSS variables your theme picker (in the
  // tracker's Settings panel) writes to <html> — so whatever theme is
  // active there (Frost, Noir, Candy, etc.) is what renders here too.
  const bg = "var(--bg)";
  const surface = "var(--surface)";
  const text = "var(--text)";
  const textMuted = "var(--text-muted)";
  const border = "var(--border)";
  const accent = "var(--accent)";

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
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Inter, sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${border}`, padding: "0 32px", background: surface }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div onClick={() => router.push("/")} style={{ fontWeight: 700, fontSize: 16, cursor: "pointer", color: text, letterSpacing: "-0.01em" }}>
            LaptopCore
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
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
                  style={{ fontSize: 12, fontWeight: 600, padding: "6px 13px", border: "none", cursor: "pointer", background: currency === c ? accent : "transparent", color: currency === c ? "#fff" : textMuted }}
                >{c}</button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "110px 32px 80px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: accent, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 18 }}>
          Built for Canadian shoppers
        </p>

        <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.4rem)", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 22, color: text }}>
          Track laptop prices.<br />Buy at the right time.
        </h1>

        <p style={{ fontSize: 17, color: textMuted, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 40px" }}>
          Monitor prices across Apple, Lenovo, Dell, HP and more. Compare deals in CAD or USD before you buy.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => router.push("/tracker")}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "13px 30px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >Browse Laptops</button>

          <button onClick={() => router.push("/deals")}
            style={{ background: surface, color: text, border: `1px solid ${border}`, borderRadius: 8, padding: "13px 26px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >View Deals</button>
        </div>
      </section>

      {/* Live price preview */}
      <section style={{ maxWidth: 640, margin: "0 auto 100px", padding: "0 32px" }}>
        <div style={{ border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden", background: surface, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "14px 22px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: textMuted, fontWeight: 600, letterSpacing: "0.02em" }}>SAMPLE PRICES</span>
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
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: i < samplePrices.length - 1 ? `1px solid ${border}` : "none" }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 3, color: text }}>{p.model}</div>
                <div style={{ fontSize: 12.5, color: textMuted }}>{p.store}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: text }}>{displayPrice(p.cad)}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12.5, color: textMuted, marginTop: 14 }}>Sample data — live prices are on the tracker page</p>
      </section>

      {/* Brands */}
      <section style={{ maxWidth: 1040, margin: "0 auto 100px", padding: "0 32px", textAlign: "center" }}>
        <p style={{ fontSize: 12.5, color: textMuted, marginBottom: 22, fontWeight: 600, letterSpacing: "0.02em" }}>TRACKING LAPTOPS FROM</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {BRANDS.map((brand) => (
            <div key={brand}
              style={{ border: `1px solid ${border}`, borderRadius: 20, padding: "7px 18px", fontSize: 13.5, color: textMuted, background: surface, fontWeight: 500 }}
            >{brand}</div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1040, margin: "0 auto 100px", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10, color: text, letterSpacing: "-0.02em" }}>What LaptopCore does</h2>
          <p style={{ fontSize: 14.5, color: textMuted }}>Built for people who want to shop smarter, not harder.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "26px 26px" }}>
              <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: text }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: textMuted, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ maxWidth: 640, margin: "0 auto 100px", padding: "0 32px", textAlign: "center" }}>
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: "56px 40px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: text, letterSpacing: "-0.02em" }}>Ready to find your next laptop?</h2>
          <p style={{ fontSize: 14.5, color: textMuted, marginBottom: 30 }}>Browse tracked laptops with price history, specs, and deals.</p>
          <button onClick={() => router.push("/tracker")}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "13px 34px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >Start Tracking</button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: "32px", background: surface }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: textMuted }}>© 2026 LaptopCore</span>
          <span style={{ fontSize: 13, color: textMuted }}>Prices may not reflect current store listings.</span>
        </div>
      </footer>
    </div>
  );
}