"use client";
import PageTransition from "@/components/PageTransition";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, supabase } from "@/lib/supabase";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const ADMIN_PASSWORD = "admin2026.123";

// Deal rating based on price vs history
function getDealRating(laptop: Laptop): { label: string; emoji: string; color: string; score: number } {
  const history = laptop.price_history ?? [];
  const current = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? current;

  if (history.length < 2) {
    // fallback: use retail vs current
    const discount = retail > 0 ? ((retail - current) / retail) * 100 : 0;
    if (discount >= 20) return { label: "Hot Deal", emoji: "🔥", color: "#f7c26a", score: 95 };
    if (discount >= 10) return { label: "Good Deal", emoji: "👍", color: "#6af7b4", score: 75 };
    if (discount >= 3)  return { label: "Fair Price", emoji: "😐", color: "#8bb3f5", score: 50 };
    return { label: "Overpriced", emoji: "💀", color: "#f76a6a", score: 20 };
  }

  const prices = history.map(h => h.price);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;

  // Score: 0–100 based on where current price sits in history
  const score = range > 0 ? Math.round(((max - current) / range) * 100) : 50;

  if (score >= 80) return { label: "Hot Deal",   emoji: "🔥", color: "#f7c26a", score };
  if (score >= 55) return { label: "Good Deal",  emoji: "👍", color: "#6af7b4", score };
  if (score >= 30) return { label: "Fair Price", emoji: "😐", color: "#8bb3f5", score };
  return              { label: "Overpriced",  emoji: "💀", color: "#f76a6a", score };
}

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
  const [imgLoaded, setImgLoaded] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    fetchLaptops().then((laptops) => {
      const found = laptops.find((l) => l.id === Number(params.id));
      setLaptop(found ?? null);
      setLoading(false);
    });
  }, [params.id]);

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) { setUnlocked(true); setShowAuth(false); setAuthInput(""); setAuthError(""); }
    else setAuthError("Incorrect password.");
  };

  const savePros = async () => {
    if (!laptop) return;
    setSaving(true);
    const pros = prosInput.split("\n").map(s => s.trim()).filter(Boolean);
    await supabase.from("laptops").update({ pros }).eq("id", laptop.id);
    setLaptop({ ...laptop, pros }); setEditingPros(false); setSaving(false);
  };

  const saveCons = async () => {
    if (!laptop) return;
    setSaving(true);
    const cons = consInput.split("\n").map(s => s.trim()).filter(Boolean);
    await supabase.from("laptops").update({ cons }).eq("id", laptop.id);
    setLaptop({ ...laptop, cons }); setEditingCons(false); setSaving(false);
  };

  const saveSpecs = async () => {
    if (!laptop) return;
    setSavingSpecs(true);
    await supabase.from("laptops").update({ specs: specsInput }).eq("id", laptop.id);
    setLaptop({ ...laptop, specs: specsInput }); setEditingSpecs(false); setSavingSpecs(false);
  };

  const generateAI = async () => {
    if (!laptop) return;
    setGeneratingAI(true);
    setAiError("");
    try {
      const res = await fetch("/api/generate-pros-cons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: laptop.brand,
          model: laptop.model,
          specs: laptop.specs ?? "",
          price: laptop.current_price ?? 0,
          store: laptop.store ?? "",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Save to Supabase
      await supabase.from("laptops").update({ pros: data.pros, cons: data.cons }).eq("id", laptop.id);
      setLaptop({ ...laptop, pros: data.pros, cons: data.cons });
    } catch (e) {
      setAiError("Failed to generate. Try again.");
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
  );
  if (!laptop) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>Laptop not found.</div>
  );

  const price = laptop.current_price ?? 0;
  const retail = laptop.retail_price ?? price;
  const hasDiscount = retail > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((retail - price) / retail) * 100) : 0;
  const savings = hasDiscount ? retail - price : 0;
  const specLines = laptop.specs?.split(/[,·\n]/).map(s => s.trim()).filter(Boolean) ?? [];
  const goodForTags = laptop.good_for ? laptop.good_for.split(",").map(s => s.trim()).filter(Boolean) : [];
  const dealRating = getDealRating(laptop);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: 13,
    border: "1px solid var(--border)", borderRadius: 8,
    background: "var(--surface-2)", color: "inherit",
    fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", resize: "vertical" as const,
  };

  const specIcons: Record<string, string> = {
    "intel": "🔵", "amd": "🔴", "apple": "🍎", "ryzen": "🔴",
    "ram": "🧠", "gb ram": "🧠", "ssd": "💾", "tb ssd": "💾", "gb ssd": "💾",
    "rtx": "🎮", "gtx": "🎮", "radeon": "🎮",
    "display": "🖥", "inch": "🖥", '"': "🖥",
    "battery": "🔋", "windows": "🪟", "macos": "🍎",
    "wi-fi": "📶", "wifi": "📶",
  };

  const getSpecIcon = (spec: string) => {
    const lower = spec.toLowerCase();
    for (const [key, icon] of Object.entries(specIcons)) {
      if (lower.includes(key)) return icon;
    }
    return "▸";
  };

  return (
    <PageTransition>
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>

        {/* Top nav */}
        <div style={{ borderBottom: "1px solid var(--border)", background: "rgba(var(--bg-rgb, 10,12,18),0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => router.push("/")} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Deal rating badge in nav */}
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "4px 10px", background: `${dealRating.color}18`, border: `1px solid ${dealRating.color}40`, color: dealRating.color }}>
                {dealRating.emoji} {dealRating.label}
              </span>
              {hasDiscount && (
                <span style={{ background: "linear-gradient(135deg,#f7c26a,#f4a830)", color: "#1a1200", fontSize: 10, fontWeight: 900, borderRadius: 6, padding: "3px 10px", letterSpacing: "0.06em" }}>
                  -{discountPct}% OFF
                </span>
              )}
              <button
                onClick={() => unlocked ? null : setShowAuth(true)}
                style={{ background: "transparent", border: `1px solid ${unlocked ? "var(--accent-3)" : "var(--border)"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: unlocked ? "var(--accent-3)" : "var(--text-muted)", fontSize: 12 }}
              >{unlocked ? "✏ Admin Mode" : "🔒 Admin"}</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>

          {/* Hero */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 32, alignItems: "start", marginBottom: 48 }}>

            {/* Image */}
            <div style={{ background: "linear-gradient(135deg, rgba(139,179,245,0.07) 0%, rgba(106,247,184,0.04) 100%)", border: "1px solid var(--border)", borderRadius: 20, padding: "48px 40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 340, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(139,179,245,0.08)", filter: "blur(60px)", pointerEvents: "none" }} />
              {laptop.image_url && !imgError ? (
                <img src={laptop.image_url} alt={laptop.model} onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.4s", position: "relative", zIndex: 1 }} />
              ) : (
                <div style={{ fontSize: 80, opacity: 0.2 }}>💻</div>
              )}
            </div>

            {/* Purchase panel */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 10 }}>{laptop.brand}</div>
              <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 6, lineHeight: 1.15 }}>{laptop.model}</h1>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}>
                {laptop.store && <span>{laptop.store}</span>}
                {laptop.store && (laptop.release_year || laptop.date_added) && <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>}
                {(laptop.release_year ?? laptop.date_added?.slice(0, 4)) && <span>{laptop.release_year ?? laptop.date_added?.slice(0, 4)}</span>}
              </div>

              {/* Deal rating card */}
              <div style={{ background: `${dealRating.color}10`, border: `1px solid ${dealRating.color}30`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{dealRating.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: dealRating.color }}>{dealRating.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Based on {(laptop.price_history?.length ?? 0) > 1 ? "price history" : "retail vs current price"}
                  </div>
                </div>
                {/* Score bar */}
                <div style={{ width: 60 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", marginBottom: 4 }}>{dealRating.score}/100</div>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${dealRating.score}%`, background: dealRating.color, borderRadius: 99, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              </div>

              {/* Good-for tags */}
              {goodForTags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {goodForTags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, background: "rgba(139,179,245,0.1)", border: "1px solid rgba(139,179,245,0.2)", borderRadius: 6, padding: "3px 10px" }}>{tag}</span>
                  ))}
                  {laptop.screen_size && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px" }}>{laptop.screen_size}" display</span>}
                  {laptop.weight_kg && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px" }}>{laptop.weight_kg} kg</span>}
                </div>
              )}

              {/* Price */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Current Price</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--accent-3)", lineHeight: 1 }}>{fmt(price)}</span>
                  {hasDiscount && <span style={{ fontSize: 16, color: "var(--text-dim)", textDecoration: "line-through", opacity: 0.6 }}>{fmt(retail)}</span>}
                </div>
                {hasDiscount && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#f7c26a", fontWeight: 700 }}>You save {fmt(savings)}</span>
                    <span style={{ fontSize: 10, background: "rgba(247,194,106,0.15)", color: "#f7c26a", borderRadius: 5, padding: "2px 7px", fontWeight: 700 }}>-{discountPct}%</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowWarning(true)}
                style={{ background: "linear-gradient(135deg, var(--accent), #6ab4f5)", color: "#fff", border: "none", borderRadius: 12, padding: "15px 32px", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%", marginBottom: 10, boxShadow: "0 6px 24px rgba(139,179,245,0.3)", transition: "opacity 0.15s, transform 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
              >🛒 Buy Now</button>

              <button
                onClick={() => router.push(`/?history=${laptop.id}`)}
                style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 32px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", transition: "all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "var(--accent)"; el.style.color = "var(--accent)"; el.style.background = "rgba(139,179,245,0.06)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; el.style.background = "transparent"; }}
              >📈 View Price History</button>
            </div>
          </div>

          {/* Pros & Cons */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Pros & Cons</h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {aiError && <span style={{ fontSize: 11, color: "#f76a6a" }}>{aiError}</span>}
                {unlocked && (
                  <button
                    onClick={generateAI}
                    disabled={generatingAI}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(139,179,245,0.3)", background: "rgba(139,179,245,0.08)", color: "var(--accent)", cursor: generatingAI ? "not-allowed" : "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, opacity: generatingAI ? 0.6 : 1 }}
                  >
                    {generatingAI ? (
                      <>
                        <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Generating...
                      </>
                    ) : "✨ Generate with AI"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Pros */}
              <div style={{ background: "linear-gradient(135deg, rgba(106,247,184,0.05) 0%, transparent 100%)", border: "1px solid rgba(106,247,184,0.15)", borderRadius: 16, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(106,247,184,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</span>
                    Pros
                  </h3>
                  {unlocked && (
                    <button onClick={() => { setEditingPros(!editingPros); setProsInput((laptop.pros ?? []).join("\n")); }}
                      style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
                      {editingPros ? "Cancel" : "✏ Edit"}
                    </button>
                  )}
                </div>
                {generatingAI ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>✨ AI is thinking...</span>
                  </div>
                ) : editingPros ? (
                  <>
                    <textarea value={prosInput} onChange={e => setProsInput(e.target.value)} placeholder="One pro per line..." rows={5} style={inputStyle} />
                    <button onClick={savePros} disabled={saving} style={{ marginTop: 10, fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent-3)", color: "#000", cursor: "pointer", fontWeight: 700 }}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : laptop.pros && laptop.pros.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {laptop.pros.map((pro, i) => (
                      <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, alignItems: "flex-start" }}>
                        <span style={{ color: "var(--accent-3)", flexShrink: 0, fontWeight: 700, marginTop: 1 }}>+</span>{pro}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
                    {unlocked ? 'Click "Generate with AI" or Edit to add pros.' : "No pros added yet."}
                  </p>
                )}
              </div>

              {/* Cons */}
              <div style={{ background: "linear-gradient(135deg, rgba(247,106,106,0.05) 0%, transparent 100%)", border: "1px solid rgba(247,106,106,0.15)", borderRadius: 16, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(247,106,106,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</span>
                    Cons
                  </h3>
                  {unlocked && (
                    <button onClick={() => { setEditingCons(!editingCons); setConsInput((laptop.cons ?? []).join("\n")); }}
                      style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
                      {editingCons ? "Cancel" : "✏ Edit"}
                    </button>
                  )}
                </div>
                {generatingAI ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>✨ AI is thinking...</div>
                ) : editingCons ? (
                  <>
                    <textarea value={consInput} onChange={e => setConsInput(e.target.value)} placeholder="One con per line..." rows={5} style={inputStyle} />
                    <button onClick={saveCons} disabled={saving} style={{ marginTop: 10, fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "#f76a6a", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : laptop.cons && laptop.cons.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {laptop.cons.map((con, i) => (
                      <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, alignItems: "flex-start" }}>
                        <span style={{ color: "#f76a6a", flexShrink: 0, fontWeight: 700, marginTop: 1 }}>−</span>{con}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
                    {unlocked ? 'Click "Generate with AI" or Edit to add cons.' : "No cons added yet."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Specs */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Specifications</h2>
              {unlocked && (
                <button onClick={() => { setEditingSpecs(!editingSpecs); setSpecsInput(laptop.specs ?? ""); }}
                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
                  {editingSpecs ? "Cancel" : "✏ Edit"}
                </button>
              )}
            </div>
            {editingSpecs ? (
              <>
                <textarea value={specsInput} onChange={e => setSpecsInput(e.target.value)} placeholder="e.g. Intel i7, 16GB RAM, 512GB SSD" rows={4} style={inputStyle} />
                <button onClick={saveSpecs} disabled={savingSpecs} style={{ marginTop: 10, fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                  {savingSpecs ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {specLines.map((spec, i) => (
                  <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 10, transition: "border-color 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,179,245,0.3)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{getSpecIcon(spec)}</span>
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details table */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em" }}>Details</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              {[
                ["Brand", laptop.brand],
                ["Model", laptop.model],
                ["Store", laptop.store || "—"],
                ["Release Year", String(laptop.release_year ?? "—")],
                ...(laptop.screen_size ? [["Screen Size", `${laptop.screen_size}"`]] : []),
                ...(laptop.weight_kg ? [["Weight", `${laptop.weight_kg} kg`]] : []),
                ["Current Price", fmt(price)],
                ["Retail Price", fmt(retail)],
                ...(hasDiscount ? [["Discount", `-${discountPct}% · Save ${fmt(savings)}`]] : []),
                ["Deal Rating", `${dealRating.emoji} ${dealRating.label} (${dealRating.score}/100)`],
              ].map(([label, value], i, arr) => (
                <div key={label} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", width: "38%", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: label === "Current Price" ? "var(--accent-3)" : label === "Discount" ? "#f7c26a" : label === "Deal Rating" ? dealRating.color : "var(--text)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Auth modal */}
        {showAuth && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={() => setShowAuth(false)}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.75rem", maxWidth: 380, width: "100%", margin: "1rem" }} onClick={e => e.stopPropagation()}>
              <div style={{ height: 3, background: "linear-gradient(90deg,var(--accent),var(--accent-3))", borderRadius: 99, marginBottom: 20, marginLeft: -28, marginRight: -28, marginTop: -28 }} />
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🔒 Admin access</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Enter password to edit content.</p>
              <input type="password" placeholder="Password…" value={authInput} onChange={e => { setAuthInput(e.target.value); setAuthError(""); }} onKeyDown={e => e.key === "Enter" && submitAuth()} autoFocus
                style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
              {authError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{authError}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={() => setShowAuth(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
                <button onClick={submitAuth} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Unlock</button>
              </div>
            </div>
          </div>
        )}

        {/* Price warning modal */}
        {showWarning && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={() => setShowWarning(false)}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", maxWidth: 360, margin: "1rem" }} onClick={e => e.stopPropagation()}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>⚠️ Price Warning</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>Prices may not be accurate. The price shown may differ from what's currently on the store website.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowWarning(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { window.open(laptop.url || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`, "_blank"); setShowWarning(false); }} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Continue →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
