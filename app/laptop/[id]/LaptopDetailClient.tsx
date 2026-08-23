"use client";
import PageTransition from "@/components/PageTransition";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, supabase } from "@/lib/supabase";
import { useUserTier } from "@/hooks/useUserTier";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const ADMIN_PASSWORD = "admin2026.123";

const SIMILAR_FREE_LIMIT = 4;
const SIMILAR_ULTRA_LIMIT = 12;

export default function LaptopPage() {
  const router = useRouter();
  const params = useParams();
  const { tier } = useUserTier();
  const isUltra = tier === "ultra";
  const [laptop, setLaptop] = useState<Laptop | null>(null);
  const [allLaptops, setAllLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [pendingStore, setPendingStore] = useState("");
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
      setAllLaptops(laptops);
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
  const links = laptop.links ?? [];

  const priceHistory = (laptop as any).price_history as { price: number; recorded_at: string }[] | undefined;
  const lowestEver = priceHistory && priceHistory.length > 0
    ? Math.min(...priceHistory.map(p => p.price), price)
    : null;
  const isAtLowest = lowestEver !== null && price <= lowestEver;

  const similarLimit = isUltra ? SIMILAR_ULTRA_LIMIT : SIMILAR_FREE_LIMIT;

  const similarLaptopsScored = allLaptops
    .filter((l) => l.id !== laptop.id)
    .map((l) => {
      let score = 0;
      if (l.brand === laptop.brand) score += 3;

      const lPrice = l.current_price ?? l.retail_price ?? 0;
      if (price > 0 && lPrice > 0) {
        const priceDiff = Math.abs(lPrice - price) / price;
        if (priceDiff <= 0.15) score += 3;
        else if (priceDiff <= 0.3) score += 2;
        else if (priceDiff <= 0.5) score += 1;
      }

      const lTags = l.good_for ? l.good_for.split(",").map(s => s.trim().toLowerCase()).filter(Boolean) : [];
      const overlap = goodForTags.filter(t => lTags.includes(t.toLowerCase())).length;
      score += overlap * 2;

      return { laptop: l, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const similarLaptops = similarLaptopsScored.slice(0, similarLimit).map((s) => s.laptop);
  const hasMoreSimilar = !isUltra && similarLaptopsScored.length > SIMILAR_FREE_LIMIT;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: 13,
    border: "1px solid var(--border)", borderRadius: 8,
    background: "var(--surface-2)", color: "inherit",
    fontFamily: "inherit", outline: "none",
    boxSizing: "border-box", resize: "vertical" as const,
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: 11, color: "var(--text-muted)", background: "var(--surface-2)",
    border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px",
  };

  const accentBadgeStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--surface-2)",
    border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px",
  };

  const editBtnStyle: React.CSSProperties = {
    fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)",
    background: "transparent", color: "var(--text-muted)", cursor: "pointer",
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
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", position: "relative", overflow: "hidden" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes lc-det-orb { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-24px) scale(1.12); } }
          @keyframes lc-det-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes lc-det-fade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes lc-det-shine { 0% { background-position: -150% 0; } 100% { background-position: 250% 0; } }
          .lc-det-orb { position: absolute; top: -180px; right: -140px; width: 480px; height: 480px; border-radius: 50%; background: radial-gradient(circle, var(--accent) 0%, transparent 70%); opacity: 0.14; filter: blur(60px); pointer-events: none; animation: lc-det-orb 13s ease-in-out infinite; z-index: 0; }
          .lc-det-image-wrap img { animation: lc-det-float 5s ease-in-out infinite; }
          .lc-det-fadein { animation: lc-det-fade 0.5s ease both; }
          .lc-det-buy-primary { position: relative; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; }
          .lc-det-buy-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,0.22); }
          .lc-det-buy-secondary { transition: transform 0.15s ease, border-color 0.15s ease; }
          .lc-det-buy-secondary:hover { transform: translateY(-2px); }
        `}} />
        <div className="lc-det-orb" />

        {/* Top nav */}
        <div style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100, opacity: 1 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => router.push("/")} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 16px", cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>← Back</button>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-dim)" }}>
                <Link href="/" style={{ color: "var(--text-dim)", textDecoration: "none" }}>Home</Link>
                <span>/</span>
                <Link href={`/brand/${encodeURIComponent(laptop.brand.toLowerCase())}`} style={{ color: "var(--text-dim)", textDecoration: "none" }}>{laptop.brand}</Link>
                <span>/</span>
                <span style={{ color: "var(--text-muted)" }}>{laptop.model}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {hasDiscount && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-2)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px" }}>
                  -{discountPct}% off
                </span>
              )}
              <button
                onClick={() => unlocked ? null : setShowAuth(true)}
                style={{ background: "transparent", border: `1px solid ${unlocked ? "var(--accent-3)" : "var(--border)"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: unlocked ? "var(--accent-3)" : "var(--text-muted)", fontSize: 12 }}
              >{unlocked ? "Admin mode" : "Admin"}</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", position: "relative", zIndex: 1 }}>

          {/* Hero */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 40, alignItems: "start", marginBottom: 64 }}>

            {/* Image */}
            <div className="lc-det-image-wrap lc-det-fadein" style={{ position: "relative", background: "var(--card-bg, var(--surface-2))", border: "1px solid var(--card-border, var(--border))", borderRadius: "var(--card-radius, 20px)", boxShadow: "var(--card-shadow, 0 12px 32px rgba(0,0,0,0.1))", backdropFilter: "blur(var(--card-blur, 0px))", padding: "56px 40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 420, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, var(--glow), transparent 65%)", pointerEvents: "none" }} />
              {hasDiscount && (
                <div style={{ position: "absolute", top: 18, left: 18, fontSize: 12, fontWeight: 800, color: "var(--accent-2)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 8px)", padding: "5px 12px", zIndex: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  -{discountPct}%
                </div>
              )}
              {laptop.image_url && !imgError ? (
                <img src={laptop.image_url} alt={laptop.model} onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} style={{ maxWidth: "100%", maxHeight: 340, objectFit: "contain", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.4s", position: "relative", zIndex: 1 }} />
              ) : (
                <div style={{ fontSize: 96, opacity: 0.15, position: "relative", zIndex: 1 }}>▭</div>
              )}
            </div>

            {/* Purchase panel — sticky so it stays visible while scrolling the rest of the page */}
            <div style={{ display: "flex", flexDirection: "column", position: "sticky", top: 88 }}>
              <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 10, fontFamily: "monospace" }}>// {laptop.brand}</div>
              <h1 style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.12 }}>{laptop.model}</h1>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 18 }}>
                {laptop.store && <span>{laptop.store}</span>}
                {laptop.store && (laptop.release_year || laptop.date_added) && <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>}
                {(laptop.release_year ?? laptop.date_added?.slice(0, 4)) && <span>{laptop.release_year ?? laptop.date_added?.slice(0, 4)}</span>}
              </div>

              {/* Good-for tags */}
              {goodForTags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                  {goodForTags.map(tag => <span key={tag} style={accentBadgeStyle}>{tag}</span>)}
                  {laptop.screen_size && <span style={badgeStyle}>{laptop.screen_size}" display</span>}
                  {laptop.weight_kg && <span style={badgeStyle}>{laptop.weight_kg} kg</span>}
                </div>
              )}

              {/* Price */}
              <div className="lc-det-fadein" style={{ position: "relative", background: "var(--card-bg, var(--surface))", border: "1px solid var(--card-border, var(--border))", borderRadius: "var(--card-radius, 16px)", boxShadow: "var(--card-shadow, 0 8px 24px rgba(0,0,0,0.1))", padding: "24px 24px 24px 27px", marginBottom: 16, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg, var(--accent), var(--accent-3))" }} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Current price</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "2.9rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text)", lineHeight: 1 }}>{fmt(price)}</span>
                  {hasDiscount && <span style={{ fontSize: 17, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(retail)}</span>}
                </div>
                {hasDiscount && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: "var(--accent-2)", fontWeight: 700 }}>You save {fmt(savings)}</span>
                    <span style={{ fontSize: 10, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--accent-2)", borderRadius: 5, padding: "2px 7px", fontWeight: 700 }}>-{discountPct}%</span>
                  </div>
                )}
                {lowestEver !== null && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Lowest ever tracked</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isAtLowest ? "var(--accent-3)" : "var(--text)" }}>
                      {fmt(lowestEver)}{isAtLowest && " · this is it!"}
                    </span>
                  </div>
                )}
              </div>

              {links.length > 1 ? (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    {links.length} places to buy
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {links.map((link, i) => (
                      <button
                        key={link.id}
                        className={i === 0 ? "lc-det-buy-primary" : "lc-det-buy-secondary"}
                        onClick={() => { setPendingUrl(link.url); setPendingStore(link.store); setShowWarning(true); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: i === 0 ? "linear-gradient(135deg, var(--accent), var(--accent-3))" : "var(--surface)",
                          color: i === 0 ? "#fff" : "var(--text)",
                          border: i === 0 ? "none" : "1px solid var(--border)",
                          borderRadius: "var(--btn-radius, 12px)", padding: "13px 18px",
                          fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%",
                        }}
                      >
                        <span>{link.store}</span>
                        <span>{link.price != null ? fmt(link.price) : "Visit"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  className="lc-det-buy-primary"
                  onClick={() => { setPendingUrl(links[0]?.url ?? laptop.url); setPendingStore(links[0]?.store ?? laptop.store); setShowWarning(true); }}
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-3))", color: "#fff", border: "none", borderRadius: "var(--btn-radius, 12px)", padding: "16px 32px", fontWeight: 700, fontSize: 15.5, cursor: "pointer", width: "100%", marginBottom: 10 }}
                >Buy now</button>
              )}

              <button
                onClick={() => router.push(`/?history=${laptop.id}`)}
                style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "var(--btn-radius, 12px)", padding: "13px 32px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", transition: "border-color 0.15s, color 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "var(--border-hover)"; el.style.color = "var(--text)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; }}
              >View price history</button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 1800);
                }}
                style={{ background: "transparent", color: linkCopied ? "var(--accent-3)" : "var(--text-dim)", border: "none", padding: "10px 0 0", fontWeight: 600, fontSize: 12.5, cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "color 0.15s" }}
                onMouseEnter={e => { if (!linkCopied) e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { if (!linkCopied) e.currentTarget.style.color = "var(--text-dim)"; }}
              >
                {linkCopied ? "✓ Link copied" : "🔗 Copy link to this laptop"}
              </button>
            </div>
          </div>

          {/* Pros & Cons */}
          <div style={{ marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>01</span>
                Pros & cons
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {aiError && <span style={{ fontSize: 11, color: "var(--accent-red)" }}>{aiError}</span>}
                {unlocked && (
                  <button
                    onClick={generateAI}
                    disabled={generatingAI}
                    style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--accent)", cursor: generatingAI ? "not-allowed" : "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, opacity: generatingAI ? 0.6 : 1 }}
                  >
                    {generatingAI ? (
                      <>
                        <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Generating...
                      </>
                    ) : "Generate with AI"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ background: "var(--card-bg, var(--surface))", border: "1px solid var(--card-border, var(--border))", borderRadius: "var(--card-radius, 16px)", boxShadow: "var(--card-shadow, none)", display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
              {/* Pros */}
              <div style={{ padding: "22px 24px", borderRight: "1px solid var(--card-border, var(--border))" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8, margin: 0, color: "var(--accent-3)" }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</span>
                    Pros
                  </h3>
                  {unlocked && (
                    <button onClick={() => { setEditingPros(!editingPros); setProsInput((laptop.pros ?? []).join("\n")); }} style={editBtnStyle}>
                      {editingPros ? "Cancel" : "Edit"}
                    </button>
                  )}
                </div>
                {generatingAI ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>AI is thinking...</div>
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
                      <li key={i} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, alignItems: "flex-start" }}>
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
              <div style={{ padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8, margin: 0, color: "var(--accent-red)" }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✕</span>
                    Cons
                  </h3>
                  {unlocked && (
                    <button onClick={() => { setEditingCons(!editingCons); setConsInput((laptop.cons ?? []).join("\n")); }} style={editBtnStyle}>
                      {editingCons ? "Cancel" : "Edit"}
                    </button>
                  )}
                </div>
                {generatingAI ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>AI is thinking...</div>
                ) : editingCons ? (
                  <>
                    <textarea value={consInput} onChange={e => setConsInput(e.target.value)} placeholder="One con per line..." rows={5} style={inputStyle} />
                    <button onClick={saveCons} disabled={saving} style={{ marginTop: 10, fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--accent-red)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : laptop.cons && laptop.cons.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {laptop.cons.map((con, i) => (
                      <li key={i} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, alignItems: "flex-start" }}>
                        <span style={{ color: "var(--accent-red)", flexShrink: 0, fontWeight: 700, marginTop: 1 }}>−</span>{con}
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
          <div style={{ marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>02</span>
                Specifications
              </h2>
              {unlocked && (
                <button onClick={() => { setEditingSpecs(!editingSpecs); setSpecsInput(laptop.specs ?? ""); }} style={editBtnStyle}>
                  {editingSpecs ? "Cancel" : "Edit"}
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
                  <div key={i} style={{ background: "var(--card-bg, var(--surface))", border: "1px solid var(--card-border, var(--border))", borderRadius: "var(--card-radius, 12px)", padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 10, transition: "border-color 0.15s, transform 0.15s" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-hover)"; el.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--card-border, var(--border))"; el.style.transform = "translateY(0)"; }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{getSpecIcon(spec)}</span>
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details table */}
          <div style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: 22, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>03</span>
              Details
            </h2>
            <div style={{ background: "var(--card-bg, var(--surface))", border: "1px solid var(--card-border, var(--border))", borderRadius: "var(--card-radius, 16px)", boxShadow: "var(--card-shadow, none)", overflow: "hidden" }}>
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
              ].map(([label, value], i, arr) => (
                <div key={label} style={{ display: "flex", alignItems: "center", padding: "15px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 1 ? "var(--surface-2)" : "transparent" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", width: "38%", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: label === "Discount" ? "var(--accent-2)" : "var(--text)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Laptops */}
          {similarLaptops.length > 0 && (
            <div style={{ marginBottom: 56 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px" }}>04</span>
                  Similar laptops
                </h2>
                {!isUltra && (
                  <Link href="/premium" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                    Unlock {SIMILAR_ULTRA_LIMIT} matches with Ultra →
                  </Link>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {similarLaptops.map((l) => {
                  const lPrice = l.current_price ?? l.retail_price ?? 0;
                  const lRetail = l.retail_price ?? lPrice;
                  const lHasDiscount = lRetail > lPrice && lPrice > 0;
                  return (
                    <div key={l.id} onClick={() => router.push(`/laptop/${l.id}`)}
                      style={{ background: "var(--card-bg, var(--surface))", border: "1px solid var(--card-border, var(--border))", borderRadius: "var(--card-radius, 14px)", boxShadow: "var(--card-shadow, none)", padding: 16, cursor: "pointer", transition: "border-color 0.15s, transform 0.2s ease, box-shadow 0.2s ease", display: "flex", flexDirection: "column" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border-hover)"; el.style.transform = `translateY(var(--card-hover-y, -2px))`; el.style.boxShadow = "var(--card-hover-shadow)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--card-border, var(--border))"; el.style.transform = "translateY(0)"; el.style.boxShadow = "var(--card-shadow, none)"; }}
                    >
                      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, background: "var(--surface-2)", borderRadius: 10 }}>
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.model} style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                        ) : (
                          <span style={{ fontSize: 32, opacity: 0.2 }}>▭</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: 4 }}>{l.brand}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, flex: 1 }}>{l.model}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{fmt(lPrice)}</span>
                        {lHasDiscount && <span style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(lRetail)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMoreSimilar && (
                <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 12 }}>
                  Showing {SIMILAR_FREE_LIMIT} of {Math.min(similarLaptopsScored.length, SIMILAR_ULTRA_LIMIT)} matches. Ultra members see the full list.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Auth modal */}
        {showAuth && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }} onClick={() => setShowAuth(false)}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 16px)", padding: "1.75rem", maxWidth: 380, width: "100%", margin: "1rem" }} onClick={e => e.stopPropagation()}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Admin access</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Enter password to edit content.</p>
              <input type="password" placeholder="Password…" value={authInput} onChange={e => { setAuthInput(e.target.value); setAuthError(""); }} onKeyDown={e => e.key === "Enter" && submitAuth()} autoFocus
                style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", outline: "none", marginBottom: 6, boxSizing: "border-box" }} />
              {authError && <p style={{ fontSize: 12, color: "var(--accent-red)", marginBottom: 8 }}>{authError}</p>}
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
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 16px)", padding: "1.5rem", maxWidth: 360, margin: "1rem" }} onClick={e => e.stopPropagation()}>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{pendingStore ? `Continue to ${pendingStore}` : "Price notice"}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>Prices may not be accurate. The price shown may differ from what's currently on the store website.</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowWarning(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { window.open(pendingUrl || `https://www.google.com/search?q=${encodeURIComponent(laptop.brand + " " + laptop.model)}`, "_blank"); setShowWarning(false); }} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Continue</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}