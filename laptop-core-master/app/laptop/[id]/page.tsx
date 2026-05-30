"use client";
import PageTransition from "@/components/PageTransition";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, supabase } from "@/lib/supabase";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const ADMIN_PASSWORD = "admin2026.123";

export default function LaptopPage() {
  const router = useRouter();
  const params = useParams();
  const [laptop, setLaptop] = useState<Laptop | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const [unlocked, setUnlocked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [editingPros, setEditingPros] = useState(false);
  const [editingCons, setEditingCons] = useState(false);
  const [prosInput, setProsInput] = useState("");
  const [consInput, setConsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [specsInput, setSpecsInput] = useState("");
  const [savingSpecs, setSavingSpecs] = useState(false);

  useEffect(() => {
    fetchLaptops().then((laptops) => {
      const found = laptops.find((l) => l.id === Number(params.id));
      setLaptop(found ?? null);
      setLoading(false);
    });
  }, [params.id]);

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) {
      setUnlocked(true);
      setShowAuth(false);
      setAuthInput("");
      setAuthError("");
    } else {
      setAuthError("Incorrect password.");
    }
  };

  const savePros = async () => {
    if (!laptop) return;
    setSaving(true);
    const pros = prosInput.split("\n").map(s => s.trim()).filter(Boolean);
    await supabase.from("laptops").update({ pros }).eq("id", laptop.id);
    setLaptop({ ...laptop, pros });
    setEditingPros(false);
    setSaving(false);
  };

  const saveCons = async () => {
    if (!laptop) return;
    setSaving(true);
    const cons = consInput.split("\n").map(s => s.trim()).filter(Boolean);
    await supabase.from("laptops").update({ cons }).eq("id", laptop.id);
    setLaptop({ ...laptop, cons });
    setEditingCons(false);
    setSaving(false);
  };

  const saveSpecs = async () => {
    if (!laptop) return;
    setSavingSpecs(true);
    await supabase.from("laptops").update({ specs: specsInput }).eq("id", laptop.id);
    setLaptop({ ...laptop, specs: specsInput });
    setEditingSpecs(false);
    setSavingSpecs(false);
  };

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
  const specLines = laptop.specs?.split(/[,·\n]/).map(s => s.trim()).filter(Boolean) ?? [];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: 13,
    border: "1px solid var(--border)", borderRadius: 8,
    background: "var(--surface-2)", color: "inherit",
    fontFamily: "'DM Mono', monospace", outline: "none",
    boxSizing: "border-box", resize: "vertical" as const,
  };

  return (
    <PageTransition>
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Syne', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>

          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <button onClick={() => router.push("/")} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
              ← Back
            </button>
            <button
              onClick={() => unlocked ? null : setShowAuth(true)}
              style={{ background: "transparent", border: `1px solid ${unlocked ? "var(--accent-3)" : "var(--border)"}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: unlocked ? "var(--accent-3)" : "var(--text-muted)", fontSize: 12, fontFamily: "'DM Mono', monospace" }}
            >
              {unlocked ? "✏ Admin Mode" : "🔒 Admin"}
            </button>
          </div>

          {/* Main content */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
              {laptop.image_url && !imgError ? (
                <img src={laptop.image_url} alt={laptop.model} onError={() => setImgError(true)} style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }} />
              ) : (
                <div style={{ fontSize: 80 }}>💻</div>
              )}
            </div>

            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 }}>{laptop.brand}</div>
              <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>{laptop.model}</h1>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
                {laptop.store} · {laptop.release_year ?? laptop.date_added?.slice(0, 4) ?? "—"}
              </div>
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
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text-muted)", marginBottom: 28 }}>Starts from {fmt(price)}</p>
              <button onClick={() => setShowWarning(true)} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>
                🛒 Buy Now
              </button>
              <button onClick={() => router.push(`/?history=${laptop.id}`)} style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 32px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", fontFamily: "'Syne', sans-serif" }}>
                📈 View Price History
              </button>
            </div>
          </div>

          {/* Pros & Cons */}
          <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Pros */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>✅ Pros</h2>
                {unlocked && (
                  <button onClick={() => { setEditingPros(!editingPros); setProsInput((laptop.pros ?? []).join("\n")); }}
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
                    {editingPros ? "Cancel" : "✏ Edit"}
                  </button>
                )}
              </div>
              {editingPros ? (
                <>
                  <textarea value={prosInput} onChange={(e) => setProsInput(e.target.value)} placeholder="One pro per line..." rows={6} style={inputStyle} />
                  <button onClick={savePros} disabled={saving} style={{ marginTop: 10, fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent-3)", color: "#000", cursor: "pointer", fontWeight: 600 }}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : laptop.pros && laptop.pros.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {laptop.pros.map((pro, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      <span style={{ color: "var(--accent-3)", flexShrink: 0 }}>+</span>{pro}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}>{unlocked ? "Click Edit to add pros." : "No pros added yet."}</p>
              )}
            </div>

            {/* Cons */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>❌ Cons</h2>
                {unlocked && (
                  <button onClick={() => { setEditingCons(!editingCons); setConsInput((laptop.cons ?? []).join("\n")); }}
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
                    {editingCons ? "Cancel" : "✏ Edit"}
                  </button>
                )}
              </div>
              {editingCons ? (
                <>
                  <textarea value={consInput} onChange={(e) => setConsInput(e.target.value)} placeholder="One con per line..." rows={6} style={inputStyle} />
                  <button onClick={saveCons} disabled={saving} style={{ marginTop: 10, fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent-red, #f76a6a)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : laptop.cons && laptop.cons.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {laptop.cons.map((con, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      <span style={{ color: "var(--accent-red, #f76a6a)", flexShrink: 0 }}>−</span>{con}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "'DM Mono', monospace" }}>{unlocked ? "Click Edit to add cons." : "No cons added yet."}</p>
              )}
            </div>
          </div>

          {/* Specs */}
          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Specifications</h2>
              {unlocked && (
                <button onClick={() => { setEditingSpecs(!editingSpecs); setSpecsInput(laptop.specs ?? ""); }}
                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
                  {editingSpecs ? "Cancel" : "✏ Edit"}
                </button>
              )}
            </div>
            {editingSpecs ? (
              <>
                <textarea value={specsInput} onChange={(e) => setSpecsInput(e.target.value)} placeholder="e.g. Intel i7, 16GB RAM, 512GB SSD" rows={4} style={inputStyle} />
                <button onClick={saveSpecs} disabled={savingSpecs} style={{ marginTop: 10, fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  {savingSpecs ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {specLines.map((spec, i) => (
                  <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--accent)", fontSize: 16 }}>▸</span>{spec}
                  </div>
                ))}
              </div>
            )}
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

        {/* Auth modal */}
        {showAuth && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAuth(false)}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem", maxWidth: 380, width: "100%", margin: "1rem" }} onClick={(e) => e.stopPropagation()}>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>🔒 Admin access</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Enter password to edit pros & cons.</p>
              <input type="password" placeholder="Password…" value={authInput} onChange={(e) => { setAuthInput(e.target.value); setAuthError(""); }} onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoFocus
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
              {authError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{authError}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                <button onClick={() => setShowAuth(false)} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
                <button onClick={submitAuth} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Unlock</button>
              </div>
            </div>
          </div>
        )}

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
    </PageTransition>
  );
}
