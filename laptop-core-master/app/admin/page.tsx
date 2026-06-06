"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, deleteLaptop, supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "admin2026.123";
const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const CATEGORY_GROUPS = [
  {
    label: "By Audience",
    categories: [
      { key: "student", label: "Students", icon: "🎓" },
      { key: "home", label: "Home", icon: "🏠" },
      { key: "business", label: "Business", icon: "💼" },
    ],
  },
  {
    label: "By Budget",
    categories: [
      { key: "budget", label: "Budget (Under $800)", icon: "$" },
      { key: "value", label: "Value ($800–$1,200)", icon: "$$" },
      { key: "premium", label: "Premium ($1,200–$1,700)", icon: "$$$" },
      { key: "unlimited", label: "Unlimited ($1,700+)", icon: "$$$$" },
    ],
  },
  {
    label: "By Use Case",
    categories: [
      { key: "basic", label: "Basic Use", icon: "🖥️" },
      { key: "school", label: "School", icon: "📚" },
      { key: "gaming", label: "Gaming", icon: "🎮" },
      { key: "programming", label: "Programming", icon: "💻" },
      { key: "engineering", label: "Engineering", icon: "⚙️" },
      { key: "video", label: "Video Editing", icon: "🎬" },
      { key: "trading", label: "Trading & Investing", icon: "📈" },
      { key: "data", label: "Data Science", icon: "🔬" },
      { key: "corporate", label: "Corporate Buyers", icon: "💼" },
    ],
  },
  {
    label: "By Portability",
    categories: [
      { key: "light", label: "Light & Portable", icon: "🪶" },
      { key: "medium", label: "Somewhat Portable", icon: "🎒" },
      { key: "performance", label: "Performance matters more", icon: "⚡" },
    ],
  },
];

const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.categories);

type EditForm = {
  brand: string; model: string; specs: string; store: string;
  url: string; image_url: string; retail_price: string;
  current_price: string; release_year: string; is_deal: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [tab, setTab] = useState<"laptops" | "add" | "picks">("laptops");
  const [addForm, setAddForm] = useState({ brand: "", model: "", specs: "", store: "", url: "", image_url: "", retail_price: "", current_price: "", release_year: "" });
  const [adding, setAdding] = useState(false);

  // Best Picks state
  const [picksCategory, setPicksCategory] = useState("student");
  const [recommendationIds, setRecommendationIds] = useState<Record<string, number[]>>({});
  const [picksSaving, setPicksSaving] = useState(false);
  const [picksMsg, setPicksMsg] = useState("");
  const [picksSearch, setPicksSearch] = useState("");

  useEffect(() => {
    fetchLaptops().then((data) => { setLaptops(data); setLoading(false); });
  }, []);

  useEffect(() => {
    async function loadRecs() {
      const { data } = await supabase.from("recommendations").select("*");
      if (data) {
        const ids: Record<string, number[]> = {};
        data.forEach((row: { category: string; laptop_ids: number[] }) => { ids[row.category] = row.laptop_ids; });
        setRecommendationIds(ids);
      }
    }
    loadRecs();
  }, []);

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) { setUnlocked(true); setAuthError(""); }
    else setAuthError("Incorrect password.");
  };

  const brands = Array.from(new Set(laptops.map(l => l.brand))).sort();
  const filtered = laptops.filter(l => {
    const matchSearch = l.brand.toLowerCase().includes(search.toLowerCase()) || l.model.toLowerCase().includes(search.toLowerCase());
    const matchBrand = !brandFilter || l.brand === brandFilter;
    return matchSearch && matchBrand;
  });

  const startEdit = (l: Laptop) => {
    setEditingId(l.id);
    setEditForm({ brand: l.brand ?? "", model: l.model ?? "", specs: l.specs ?? "", store: l.store ?? "", url: l.url ?? "", image_url: (l as any).image_url ?? "", retail_price: String(l.retail_price ?? ""), current_price: String(l.current_price ?? ""), release_year: String(l.release_year ?? ""), is_deal: (l as any).is_deal ?? false });
    setSaveMsg("");
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); setSaveMsg(""); };

  const saveEdit = async (id: number) => {
    if (!editForm) return;
    setSaving(true);
    try {
      const retailPrice = parseFloat(editForm.retail_price);
      const currentPrice = parseFloat(editForm.current_price);
      await supabase.from("laptops").update({ brand: editForm.brand, model: editForm.model, specs: editForm.specs, store: editForm.store, url: editForm.url, image_url: editForm.image_url, retail_price: isNaN(retailPrice) ? null : retailPrice, release_year: editForm.release_year ? parseInt(editForm.release_year) : null, is_deal: editForm.is_deal }).eq("id", id);
      if (!isNaN(currentPrice)) {
        await supabase.from("price_history").insert({ laptop_id: id, price: currentPrice, recorded_at: new Date().toISOString().split("T")[0] });
      }
      const updated = await fetchLaptops();
      setLaptops(updated);
      setSaveMsg("✅ Saved!");
      setTimeout(() => { setEditingId(null); setEditForm(null); setSaveMsg(""); }, 1000);
    } catch { setSaveMsg("❌ Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number, model: string) => {
    if (!confirm(`Remove "${model}"?`)) return;
    setDeleting(id);
    await deleteLaptop(id);
    setLaptops(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
    if (editingId === id) cancelEdit();
  };

  const handleAdd = async () => {
    if (!addForm.brand || !addForm.model || !addForm.retail_price) return;
    setAdding(true);
    try {
      const { data } = await supabase.from("laptops").insert({ brand: addForm.brand, model: addForm.model, specs: addForm.specs, store: addForm.store, url: addForm.url, image_url: addForm.image_url, retail_price: parseFloat(addForm.retail_price), release_year: addForm.release_year ? parseInt(addForm.release_year) : null, date_added: new Date().toISOString().split("T")[0] }).select().single();
      if (data) {
        await supabase.from("price_history").insert({ laptop_id: data.id, price: parseFloat(addForm.current_price || addForm.retail_price), recorded_at: new Date().toISOString().split("T")[0] });
      }
      const updated = await fetchLaptops();
      setLaptops(updated);
      setAddForm({ brand: "", model: "", specs: "", store: "", url: "", image_url: "", retail_price: "", current_price: "", release_year: "" });
      setTab("laptops");
    } finally { setAdding(false); }
  };

  const togglePick = (laptopId: number) => {
    const current = recommendationIds[picksCategory] ?? [];
    const next = current.includes(laptopId) ? current.filter(id => id !== laptopId) : [...current, laptopId];
    setRecommendationIds(prev => ({ ...prev, [picksCategory]: next }));
  };

  const savePicks = async () => {
    setPicksSaving(true);
    setPicksMsg("");
    try {
      await supabase.from("recommendations").upsert({ category: picksCategory, laptop_ids: recommendationIds[picksCategory] ?? [] }, { onConflict: "category" });
      setPicksMsg("✅ Saved!");
    } catch { setPicksMsg("❌ Failed to save"); }
    finally { setPicksSaving(false); setTimeout(() => setPicksMsg(""), 3000); }
  };

  const currentPickIds = recommendationIds[picksCategory] ?? [];
  const picksFiltered = laptops.filter(l => {
    const t = picksSearch.toLowerCase();
    return l.brand.toLowerCase().includes(t) || l.model.toLowerCase().includes(t);
  });

  const inputStyle: React.CSSProperties = { padding: "7px 10px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 7, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, display: "block", marginBottom: 4 };

  if (!unlocked) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "2.5rem", width: "100%", maxWidth: 400, margin: "1rem", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))", borderRadius: 99, marginBottom: 24, marginLeft: -40, marginRight: -40, marginTop: -40 }} />
        <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back</button>
        <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8, fontWeight: 600 }}>Admin Panel</div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>🔒 Access Required</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Enter your admin password to continue.</p>
        <input type="password" placeholder="Password…" value={authInput} onChange={(e) => { setAuthInput(e.target.value); setAuthError(""); }} onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoFocus style={{ ...inputStyle, padding: "10px 12px", fontSize: 14, marginBottom: 8 }} />
        {authError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{authError}</p>}
        <button onClick={submitAuth} style={{ width: "100%", padding: "11px", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10, background: "var(--accent)", color: "#fff", cursor: "pointer" }}>Unlock</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <button onClick={() => router.push("/")} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>← Back</button>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>⚙️ Admin Panel</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{laptops.length} laptops · {laptops.filter((l: any) => l.is_deal).length} deals</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["laptops", "picks", "add"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 99, border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`, background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#fff" : "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>
                {t === "laptops" ? "📋 All Laptops" : t === "picks" ? "🎓 Best Picks" : "+ Add New"}
              </button>
            ))}
          </div>
        </div>

        {/* ── BEST PICKS TAB ── */}
        {tab === "picks" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 24 }}>Best Picks Editor</h2>

            {/* Category groups */}
            {CATEGORY_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 8 }}>{group.label}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {group.categories.map(c => (
                    <button key={c.key} onClick={() => setPicksCategory(c.key)}
                      style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${picksCategory === c.key ? "var(--accent)" : "var(--border)"}`, background: picksCategory === c.key ? "rgba(139,179,245,0.12)" : "var(--surface-2)", color: picksCategory === c.key ? "var(--accent)" : "var(--text-muted)", fontWeight: picksCategory === c.key ? 700 : 400, fontSize: 12, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Selected count + save */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>{currentPickIds.length}</span> laptop{currentPickIds.length !== 1 ? "s" : ""} selected for <span style={{ color: "var(--accent)", fontWeight: 600 }}>{ALL_CATEGORIES.find(c => c.key === picksCategory)?.label}</span>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {picksMsg && <span style={{ fontSize: 12, color: picksMsg.startsWith("✅") ? "var(--accent-3)" : "#f76a6a" }}>{picksMsg}</span>}
                <button onClick={savePicks} disabled={picksSaving} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: picksSaving ? "not-allowed" : "pointer", opacity: picksSaving ? 0.6 : 1 }}>
                  {picksSaving ? "Saving…" : "💾 Save Picks"}
                </button>
              </div>
            </div>

            {/* Selected chips */}
            {currentPickIds.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {laptops.filter(l => currentPickIds.includes(l.id)).map(l => (
                  <div key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(139,179,245,0.12)", border: "1px solid rgba(139,179,245,0.3)", borderRadius: 99, padding: "4px 10px", fontSize: 11, color: "var(--accent)" }}>
                    {l.model}
                    <button onClick={() => togglePick(l.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <input placeholder="🔍 Search laptops to add..." value={picksSearch} onChange={e => setPicksSearch(e.target.value)}
              style={{ ...inputStyle, padding: "10px 14px", fontSize: 13, marginBottom: 12 }} />

            {/* Laptop list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 480, overflowY: "auto" }}>
              {picksFiltered.map(l => {
                const selected = currentPickIds.includes(l.id);
                return (
                  <div key={l.id} onClick={() => togglePick(l.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: `1px solid ${selected ? "var(--accent)" : "transparent"}`, background: selected ? "rgba(139,179,245,0.08)" : "var(--surface-2)", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </div>
                    {(l as any).image_url ? (
                      <img src={(l as any).image_url} alt={l.model} style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💻</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: selected ? "var(--accent)" : "var(--text)" }}>{l.brand} {l.model}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>#{l.id} · {fmt(l.current_price ?? 0)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ADD TAB ── */}
        {tab === "add" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Add New Laptop</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
              {[{ key: "brand", label: "Brand *" }, { key: "model", label: "Model *" }, { key: "store", label: "Store" }, { key: "retail_price", label: "Retail Price ($) *" }, { key: "current_price", label: "Current Price ($)" }, { key: "release_year", label: "Release Year" }].map(({ key, label }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input value={addForm[key as keyof typeof addForm]} onChange={(e) => setAddForm(prev => ({ ...prev, [key]: e.target.value }))} style={inputStyle} type={key.includes("price") || key === "release_year" ? "number" : "text"} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Specs</label>
              <textarea value={addForm.specs} onChange={(e) => setAddForm(prev => ({ ...prev, specs: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div><label style={labelStyle}>Store URL</label><input value={addForm.url} onChange={(e) => setAddForm(prev => ({ ...prev, url: e.target.value }))} style={inputStyle} placeholder="https://..." /></div>
              <div><label style={labelStyle}>Image URL</label><input value={addForm.image_url} onChange={(e) => setAddForm(prev => ({ ...prev, image_url: e.target.value }))} style={inputStyle} placeholder="https://..." /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setTab("laptops")} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAdd} disabled={adding} style={{ fontSize: 13, padding: "8px 20px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>{adding ? "Adding..." : "+ Add Laptop"}</button>
            </div>
          </div>
        )}

        {/* ── LAPTOPS TAB ── */}
        {tab === "laptops" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 20 }}>
              <input placeholder="🔍 Search brand or model..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }} />
              <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 140, padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
                <option value="">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "3rem" }}>Loading...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map((l) => {
                  const isEditing = editingId === l.id;
                  return (
                    <div key={l.id} style={{ background: "var(--surface)", border: `1px solid ${isEditing ? "var(--accent)" : "var(--border)"}`, borderRadius: 14, overflow: "hidden", boxShadow: isEditing ? "0 0 0 2px rgba(139,179,245,0.15)" : "none" }}>
                      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 200 }}>
                          {(l as any).image_url && (<img src={(l as any).image_url} alt={l.model} style={{ width: 48, height: 36, objectFit: "contain", borderRadius: 6, background: "var(--surface-2)", padding: 4 }} />)}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{l.brand}</span>
                              {(l as any).is_deal && <span style={{ fontSize: 9, background: "rgba(247,194,106,0.15)", color: "var(--accent-2)", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>DEAL</span>}
                              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>#{l.id}</span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{l.model}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{l.specs?.slice(0, 70)}{(l.specs?.length ?? 0) > 70 ? "…" : ""}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--accent-3)" }}>{fmt(l.current_price ?? 0)}</div>
                            {l.retail_price && l.retail_price !== l.current_price && (<div style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(l.retail_price)}</div>)}
                          </div>
                          <button onClick={() => isEditing ? cancelEdit() : startEdit(l)} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: `1px solid ${isEditing ? "var(--accent)" : "var(--border)"}`, background: isEditing ? "rgba(139,179,245,0.1)" : "transparent", color: isEditing ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>
                            {isEditing ? "✕ Cancel" : "✏ Edit"}
                          </button>
                          <button onClick={() => handleDelete(l.id, l.model)} disabled={deleting === l.id} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(247,106,106,0.3)", background: "rgba(247,106,106,0.08)", color: "var(--accent-red)", cursor: "pointer", opacity: deleting === l.id ? 0.5 : 1 }}>
                            {deleting === l.id ? "…" : "🗑"}
                          </button>
                        </div>
                      </div>

                      {isEditing && editForm && (
                        <div style={{ borderTop: "1px solid var(--border)", padding: "20px", background: "var(--surface-2)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
                            {[{ key: "brand", label: "Brand" }, { key: "model", label: "Model" }, { key: "store", label: "Store" }, { key: "retail_price", label: "Retail Price ($)" }, { key: "current_price", label: "Current Price ($)" }, { key: "release_year", label: "Release Year" }].map(({ key, label }) => (
                              <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input value={editForm[key as keyof EditForm] as string} onChange={(e) => setEditForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)} style={inputStyle} type={key.includes("price") || key === "release_year" ? "number" : "text"} />
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>Specs</label>
                            <textarea value={editForm.specs} onChange={(e) => setEditForm(prev => prev ? { ...prev, specs: e.target.value } : prev)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div><label style={labelStyle}>Store URL</label><input value={editForm.url} onChange={(e) => setEditForm(prev => prev ? { ...prev, url: e.target.value } : prev)} style={inputStyle} placeholder="https://..." /></div>
                            <div><label style={labelStyle}>Image URL</label><input value={editForm.image_url} onChange={(e) => setEditForm(prev => prev ? { ...prev, image_url: e.target.value } : prev)} style={inputStyle} placeholder="https://..." /></div>
                          </div>
                          {editForm.image_url && (
                            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                              <img src={editForm.image_url} alt="preview" style={{ height: 60, maxWidth: 100, objectFit: "contain", borderRadius: 8, background: "var(--surface)", padding: 6 }} />
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Image preview</span>
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                              <input type="checkbox" checked={editForm.is_deal} onChange={(e) => setEditForm(prev => prev ? { ...prev, is_deal: e.target.checked } : prev)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                              🔥 Mark as Crazy Deal
                            </label>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => saveEdit(l.id)} disabled={saving} style={{ fontSize: 13, padding: "8px 22px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>{saving ? "Saving..." : "✓ Save Changes"}</button>
                            <button onClick={cancelEdit} style={{ fontSize: 13, padding: "8px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
                            {saveMsg && <span style={{ fontSize: 13, color: saveMsg.includes("✅") ? "var(--accent-3)" : "var(--accent-red)" }}>{saveMsg}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
