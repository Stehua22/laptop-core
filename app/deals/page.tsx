"use client";
import { useState, useEffect } from "react";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, addLaptop, deleteLaptop } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const ADMIN_PASSWORD = "admin2026.123";
const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function DealsPage() {
  const router = useRouter();
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", specs: "", store: "", url: "", retail_price: "", current_price: "" });
  const [sortBy, setSortBy] = useState("discount");

  useEffect(() => {
    fetchLaptops().then((data) => { setLaptops(data); setLoading(false); });
  }, []);

  const deals = laptops
    .filter(l => (l as any).is_deal || (l.retail_price && l.current_price && l.retail_price > l.current_price))
    .sort((a, b) => {
      if (sortBy === "discount") return ((b.retail_price! - b.current_price!) / b.retail_price!) - ((a.retail_price! - a.current_price!) / a.retail_price!);
      if (sortBy === "savings") return (b.retail_price! - b.current_price!) - (a.retail_price! - a.current_price!);
      return (a.current_price ?? 0) - (b.current_price ?? 0);
    });

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) { setUnlocked(true); setShowAuth(false); setShowAddForm(true); }
    else setAuthError("Incorrect password.");
  };

  const handleAdd = async () => {
    if (!form.brand || !form.model || !form.retail_price || !form.current_price) return;
    setAddLoading(true);
    try {
      await addLaptop({
        brand: form.brand, model: form.model, specs: form.specs,
        store: form.store, url: form.url,
        retail_price: parseFloat(form.retail_price),
        release_year: null,
        date_added: new Date().toISOString().split("T")[0],
      }, parseFloat(form.current_price));
      const updated = await fetchLaptops();
      setLaptops(updated);
      setForm({ brand: "", model: "", specs: "", store: "", url: "", retail_price: "", current_price: "" });
      setShowAddForm(false);
    } finally { setAddLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this deal?")) return;
    await deleteLaptop(id);
    setLaptops(prev => prev.filter(l => l.id !== id));
  };

  const topDeal = deals[0];
  const restDeals = deals.slice(1);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e8edf8", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .deal-row {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          transition: all 0.2s;
        }
        .deal-row:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); transform: translateX(4px); }
        .visit-btn {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(59,130,246,0.3);
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .visit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.45); }
        .back-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 7px 14px;
          cursor: pointer;
          color: #4a5568;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
          margin-bottom: 20px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .back-btn:hover { color: #e8edf8; border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }
        .sort-select {
          font-size: 13px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #7a85a0;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          outline: none;
          transition: all 0.15s;
        }
        .sort-select:hover { border-color: rgba(255,255,255,0.15); }
        .add-btn {
          background: rgba(251,146,60,0.1);
          color: #fb923c;
          border: 1px solid rgba(251,146,60,0.2);
          border-radius: 8px;
          padding: 8px 18px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
        }
        .add-btn:hover { background: rgba(251,146,60,0.18); border-color: rgba(251,146,60,0.35); }
        .rank-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #2a3248;
          width: 28px;
          text-align: center;
          flex-shrink: 0;
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; opacity: 0; }
        .glow-orb { position: fixed; border-radius: 50%; pointer-events: none; filter: blur(80px); z-index: 0; }
      `}</style>

      <div className="glow-orb" style={{ width: 500, height: 500, background: "rgba(251,146,60,0.04)", top: -100, right: "10%" }} />
      <div className="glow-orb" style={{ width: 400, height: 400, background: "rgba(59,130,246,0.04)", bottom: "20%", left: "5%" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}>

        {/* Header */}
        <button className="back-btn fade-up" onClick={() => router.push("/")}>← Back</button>

        <div className="fade-up" style={{ animationDelay: "0.05s", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fb923c", marginBottom: 10, opacity: 0.8 }}>// crazy deals</div>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: "#f0f4ff" }}>
              🔥 Best Deals
            </h1>
            <p className="mono" style={{ fontSize: 12, color: "#2a3248", marginTop: 10 }}>
              {deals.length} laptops · biggest price drops
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="discount">Biggest % Off</option>
              <option value="savings">Most Savings</option>
              <option value="price">Lowest Price</option>
            </select>
            <button className="add-btn" onClick={() => unlocked ? setShowAddForm(!showAddForm) : setShowAuth(true)}>
              {unlocked ? "+ Add Deal" : "🔒 Add Deal"}
            </button>
          </div>
        </div>

        {/* Top deal hero card */}
        {!loading && topDeal && (
          <div className="fade-up" style={{ animationDelay: "0.1s", background: "linear-gradient(135deg, rgba(251,146,60,0.08), rgba(239,68,68,0.04))", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 18, padding: "28px 32px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: "radial-gradient(circle at top right, rgba(251,146,60,0.1), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fb923c", fontFamily: "'JetBrains Mono', monospace" }}>#1 BEST DEAL</div>
              <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{topDeal.brand}</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "clamp(1.2rem, 3vw, 1.6rem)", color: "#f0f4ff", marginBottom: 6, letterSpacing: "-0.02em" }}>{topDeal.model}</div>
                <div className="mono" style={{ fontSize: 12, color: "#3a4258", maxWidth: 400 }}>{topDeal.specs}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 900, fontSize: "2rem", color: "#10b981", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em" }}>{fmt(topDeal.current_price!)}</span>
                    <span style={{ fontSize: 14, color: "#2a3248", textDecoration: "line-through", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(topDeal.retail_price!)}</span>
                  </div>
                  <div style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", display: "inline-block" }}>
                    -{Math.round(((topDeal.retail_price! - topDeal.current_price!) / topDeal.retail_price!) * 100)}% · Save {fmt(topDeal.retail_price! - topDeal.current_price!)}
                  </div>
                </div>
                {topDeal.url && (
                  <a href={topDeal.url} target="_blank" rel="noopener noreferrer" className="visit-btn" style={{ padding: "12px 24px", fontSize: 14 }}>Visit Store →</a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add form */}
        {showAddForm && unlocked && (
          <div className="fade-up" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 14, padding: "1.5rem", marginBottom: 20 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#e8edf8" }}>Add a new deal</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
              {[{ key: "brand", placeholder: "Brand" }, { key: "model", placeholder: "Model" }, { key: "store", placeholder: "Store" }, { key: "retail_price", placeholder: "Retail Price ($)" }, { key: "current_price", placeholder: "Deal Price ($)" }].map(({ key, placeholder }) => (
                <input key={key} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ padding: "8px 12px", fontSize: 13, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: "#e8edf8", fontFamily: "inherit", outline: "none" }} />
              ))}
            </div>
            <input placeholder="Specs" value={form.specs} onChange={(e) => setForm(prev => ({ ...prev, specs: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: "#e8edf8", fontFamily: "inherit", outline: "none", marginBottom: 10, boxSizing: "border-box" as const }} />
            <input placeholder="Store URL" value={form.url} onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: "#e8edf8", fontFamily: "inherit", outline: "none", marginBottom: 14, boxSizing: "border-box" as const }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddForm(false)} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#7a85a0", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAdd} disabled={addLoading} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "#fb923c", color: "#000", cursor: "pointer", fontWeight: 700 }}>
                {addLoading ? "Adding..." : "Add Deal"}
              </button>
            </div>
          </div>
        )}

        {/* Auth modal */}
        {showAuth && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }} onClick={() => setShowAuth(false)}>
            <div style={{ background: "#0f1420", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.75rem", maxWidth: 380, width: "100%", margin: "1rem", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ height: 3, background: "linear-gradient(90deg, #3b82f6, #10b981)", borderRadius: 99, marginBottom: 20, marginLeft: -28, marginRight: -28, marginTop: -28 }} />
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#e8edf8" }}>🔒 Admin access</p>
              <p className="mono" style={{ fontSize: 12, color: "#3a4258", marginBottom: 16 }}>Enter the password to add deals.</p>
              <input type="password" placeholder="Password…" value={authInput} onChange={(e) => setAuthInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoFocus
                style={{ width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, background: "rgba(255,255,255,0.04)", color: "#e8edf8", fontFamily: "inherit", outline: "none", marginBottom: 6, boxSizing: "border-box" as const }} />
              {authError && <p className="mono" style={{ fontSize: 11, color: "#ef4444", marginBottom: 8 }}>{authError}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={() => setShowAuth(false)} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#7a85a0", cursor: "pointer" }}>Cancel</button>
                <button onClick={submitAuth} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Unlock</button>
              </div>
            </div>
          </div>
        )}

        {/* Deals list */}
        {loading ? (
          <div className="mono" style={{ textAlign: "center", color: "#2a3248", fontSize: 13, padding: "4rem" }}>Loading deals...</div>
        ) : deals.length === 0 ? (
          <div className="mono" style={{ textAlign: "center", color: "#2a3248", fontSize: 13, padding: "4rem" }}>No deals available right now.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {restDeals.map((l, i) => {
              const savings = l.retail_price! - l.current_price!;
              const pct = Math.round((savings / l.retail_price!) * 100);
              return (
                <div key={l.id} className="deal-row fade-up" style={{ animationDelay: `${0.15 + i * 0.04}s` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 200 }}>
                    <span className="rank-num">#{i + 2}</span>
                    <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
                    <div>
                      <div className="mono" style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l.brand}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#e8edf8", marginBottom: 3, letterSpacing: "-0.01em" }}>{l.model}</div>
                      <div className="mono" style={{ fontSize: 11, color: "#2a3248" }}>{l.specs}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 7, justifyContent: "flex-end", marginBottom: 5 }}>
                        <span style={{ fontWeight: 800, fontSize: 20, color: "#10b981", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(l.current_price!)}</span>
                        <span className="mono" style={{ fontSize: 12, color: "#2a3248", textDecoration: "line-through" }}>{fmt(l.retail_price!)}</span>
                      </div>
                      <div style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c", borderRadius: 5, padding: "3px 9px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", display: "inline-block" }}>
                        -{pct}% · {fmt(savings)} off
                      </div>
                    </div>
                    {l.url && (
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="visit-btn">Visit →</a>
                    )}
                    {unlocked && (
                      <button onClick={() => handleDelete(l.id)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, padding: "7px 10px", cursor: "pointer", color: "#3a4258", fontSize: 13, transition: "all 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#3a4258"; }}
                      >🗑</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
