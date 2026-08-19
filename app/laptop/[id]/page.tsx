"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops } from "@/lib/supabase";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function LaptopPage() {
  const router = useRouter();
  const params = useParams();
  const [laptop, setLaptop] = useState<Laptop | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    fetchLaptops().then((laptops) => {
      const found = laptops.find((l) => l.id === Number(params.id));
      setLaptop(found ?? null);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
      Loading...
    </div>
  );

  if (!laptop) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
      Laptop not found.
    </div>
  );

  const price = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
  const savings = hasDiscount ? retail - price : 0;

  // Parse specs into individual lines
  const specLines = laptop.specs?.split(/[,·\n]/).map(s => s.trim()).filter(Boolean) ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>

        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, marginBottom: 32, fontFamily: "'DM Mono', monospace" }}
        >
          ← Back
        </button>

        {/* Main content */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>

          {/* Left — Image */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
            {laptop.image_url && !imgError ? (
              <img
                src={laptop.image_url}
                alt={laptop.model}
                onError={() => setImgError(true)}
                style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }}
              />
            ) : (
              <div style={{ fontSize: 80 }}>💻</div>
            )}
          </div>

          {/* Right — Info */}
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 }}>
              {laptop.brand}
            </div>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>
              {laptop.model}
            </h1>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
              {laptop.store} · {laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? "—"}
            </div>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "2rem", color: "var(--accent-3)" }}>{fmt(price)}</span>
              {hasDiscount && (
                <>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(retail)}</span>
                  <span style={{ background: "rgba(247,194,106,0.15)", color: "var(--accent-2)", borderRadius: 6, padding: "3px 10px", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                    -{discountPct}% · Save {fmt(savings)}
                  </span>
                </>
              )}
            </div>

            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text-muted)", marginBottom: 28 }}>
              Starts from {fmt(price)}
            </p>

            {/* Buy button */}
            <button
              onClick={() => setShowWarning(true)}
              style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", marginBottom: 12, fontFamily: "'Syne', sans-serif" }}
            >
              🛒 Buy Now
            </button>
            <button
              onClick={() => router.push("/")}
              style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 32px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", fontFamily: "'Syne', sans-serif" }}
            >
              📈 View Price History
            </button>
          </div>
        </div>

        {/* Specs section */}
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" }}>Specifications</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {specLines.map((spec, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--accent)", fontSize: 16 }}>▸</span>
                {spec}
              </div>
            ))}
          </div>
        </div>

        {/* Details table */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" }}>Details</h2>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            {[
              ["Brand", laptop.brand],
              ["Model", laptop.model],
              ["Store", laptop.store],
              ["Release Year", String(laptop.release_year ?? "—")],
              ["Current Price", fmt(price)],
              ["Retail Price", fmt(retail)],
              ...(hasDiscount ? [["Discount", `-${discountPct}% off · Save ${fmt(savings)}`]] : []),
            ].map(([label, value], i, arr) => (
              <div key={label} style={{ display: "flex", padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", width: "40%", flexShrink: 0 }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: label === "Current Price" ? "var(--accent-3)" : "var(--text)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Price warning modal */}
      {showWarning && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowWarning(false)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem", maxWidth: 360, margin: "1rem" }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>⚠️ Price Warning</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
              NOTE: Prices may not be accurate. The price shown may differ from what's currently on the store website.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowWarning(false)} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { window.open(laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`, "_blank"); setShowWarning(false); }} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer" }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
