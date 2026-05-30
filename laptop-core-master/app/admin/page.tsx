"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, deleteLaptop, supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "admin2026.123";

const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type EditForm = {
  brand: string;
  model: string;
  specs: string;
  store: string;
  url: string;
  image_url: string;
  retail_price: string;
  current_price: string;
  release_year: string;
  is_deal: boolean;
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
  const [tab, setTab] = useState<"laptops" | "add">("laptops");
  const [addForm, setAddForm] = useState({ brand: "", model: "", specs: "", store: "", url: "", image_url: "", retail_price: "", current_price: "", release_year: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchLaptops().then((data) => { setLaptops(data); setLoading(false); });
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
    setEditForm({
      brand: l.brand ?? "",
      model: l.model ?? "",
      specs: l.specs ?? "",
      store: l.store ?? "",
      url: l.url ?? "",
      image_url: (l as any).image_url ?? "",
      retail_price: String(l.retail_price ?? ""),
      current_price: String(l.current_price ?? ""),
      release_year: String(l.release_year ?? ""),
      is_deal: (l as any).is_deal ?? false,
    });
    setSaveMsg("");
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); setSaveMsg(""); };

  const saveEdit = async (id: number) => {
    if (!editForm) return;
    setSaving(true);
    try {
      const retailPrice = parseFloat(editForm.retail_price);
      const currentPrice = parseFloat(editForm.current_price);

      await supabase.from("laptops").update({
        brand: editForm.brand,
        model: editForm.model,
        specs: editForm.specs,
        store: editForm.store,
        url: editForm.url,
        image_url: editForm.image_url,
        retail_price: isNaN(retailPrice) ? null : retailPrice,
        release_year: editForm.release_year ? parseInt(editForm.release_year) : null,
        is_deal: editForm.is_deal,
      }).eq("id", id);

      // Update price history if current price changed
      if (!isNaN(currentPrice)) {
        await supabase.from("price_history").insert({
          laptop_id: id,
          price: currentPrice,
          recorded_at: new Date().toISOString().split("T")[0],
        });
      }

      const updated = await fetchLaptops();
      setLaptops(updated);
      setSaveMsg("✅ Saved!");
      setTimeout(() => { setEditingId(null); setEditForm(null); setSaveMsg(""); }, 1000);
    } catch {
      setSaveMsg("❌ Failed to save");
    } finally {
      setSaving(false);
    }
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
      const { data } = await supabase.from("laptops").insert({
        brand: addForm.brand, model: addForm.model, specs: addForm.specs,
        store: addForm.store, url: addForm.url, image_url: addForm.image_url,
        retail_price: parseFloat(addForm.retail_price),
        release_year: addForm.release_year ? parseInt(addForm.release_year) : null,
        date_added: new Date().toISOString().split("T")[0],
      }).select().single();

      if (data) {
        await supabase.from("price_history").insert({
          laptop_id: data.id,
          price: parseFloat(addForm.current_price || addForm.retail_price),
          recorded_at: new Date().toISOString().split("T")[0],
        });
      }

      const updated = await fetchLaptops();
      setLaptops(updated);
      setAddForm({ brand: "", model: "", specs: "", store: "", url: "", image_url: "", retail_price: "", current_price: "", release_year: "" });
      setTab("laptops");
    } finally {
      setAdding(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", fontSize: 12,
    border: "1px solid var(--border)", borderRadius: 7,
    background: "var(--surface-2)", color: "inherit",
    fontFamily: "inherit", outline: "none",
    width: "100%", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.1em",
    fontWeight: 600, display: "block", marginBottom: 4,
  };

  if (!unlocked) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "2.5rem", width: "100%", maxWidth: 400, margin: "1rem", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))", borderRadius: 99, marginBottom: 24, marginLeft: -40, marginRight: -40, marginTop: -40 }} />
        <button onClick={() => router.push("/")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0 }}>← Back</button>
        <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8, fontWeight: 600 }}>Admin Panel</div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>🔒 Access Required</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Enter your admin password to continue.</p>
        <input
          type="password" placeholder="Password…" value={authInput}
          onChange={(e) => { setAuthInput(e.target.value); setAuthError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submitAuth()} autoFocus
          style={{ ...inputStyle, padding: "10px 12px", fontSize: 14, marginBottom: 8 }}
        />
        {authError && <p style={{ fontSize: 12, color: "#f76a6a", marginBottom: 8 }}>{authError}</p>}
        <button onClick={submitAuth} style={{ width: "100%", padding: "11px", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10, background: "var(--accent)", color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(139,179,245,0.3)" }}>
          Unlock
        </button>
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
          <div style={{ display: "flex", gap: 8 }}>
            {(["laptops", "add"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                fontSize: 13, padding: "8px 18px", borderRadius: 99,
                border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`,
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "#fff" : "var(--text-muted)", cursor: "pointer", fontWeight: 600,
              }}>
                {t === "laptops" ? "📋 All Laptops" : "+ Add New"}
              </button>
            ))}
          </div>
        </div>

        {/* Add tab */}
        {tab === "add" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Add New Laptop</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
              {[
                { key: "brand", label: "Brand *" },
                { key: "model", label: "Model *" },
                { key: "store", label: "Store" },
                { key: "retail_price", label: "Retail Price ($) *" },
                { key: "current_price", label: "Current Price ($)" },
                { key: "release_year", label: "Release Year" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    value={addForm[key as keyof typeof addForm]}
                    onChange={(e) => setAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={inputStyle}
                    type={key.includes("price") || key === "release_year" ? "number" : "text"}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Specs</label>
              <textarea value={addForm.specs} onChange={(e) => setAddForm(prev => ({ ...prev, specs: e.target.value }))}
                rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Store URL</label>
                <input value={addForm.url} onChange={(e) => setAddForm(prev => ({ ...prev, url: e.target.value }))} style={inputStyle} placeholder="https://..." />
              </div>
              <div>
                <label style={labelStyle}>Image URL</label>
                <input value={addForm.image_url} onChange={(e) => setAddForm(prev => ({ ...prev, image_url: e.target.value }))} style={inputStyle} placeholder="https://..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setTab("laptops")} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAdd} disabled={adding} style={{ fontSize: 13, padding: "8px 20px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                {adding ? "Adding..." : "+ Add Laptop"}
              </button>
            </div>
          </div>
        )}

        {/* Laptops tab */}
        {tab === "laptops" && (
          <>
            {/* Filters */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 20 }}>
              <input
                placeholder="🔍 Search brand or model..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, padding: "10px 14px", fontSize: 13 }}
              />
              <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: 140, padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
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
                    <div key={l.id} style={{
                      background: "var(--surface)",
                      border: `1px solid ${isEditing ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 14, overflow: "hidden",
                      boxShadow: isEditing ? "0 0 0 2px rgba(139,179,245,0.15)" : "none",
                    }}>
                      {/* Row header */}
                      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 200 }}>
                          {(l as any).image_url && (
                            <img src={(l as any).image_url} alt={l.model} style={{ width: 48, height: 36, objectFit: "contain", borderRadius: 6, background: "var(--surface-2)", padding: 4 }} />
                          )}
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
                            {l.retail_price && l.retail_price !== l.current_price && (
                              <div style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "line-through" }}>{fmt(l.retail_price)}</div>
                            )}
                          </div>
                          <button onClick={() => isEditing ? cancelEdit() : startEdit(l)}
                            style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: `1px solid ${isEditing ? "var(--accent)" : "var(--border)"}`, background: isEditing ? "rgba(139,179,245,0.1)" : "transparent", color: isEditing ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>
                            {isEditing ? "✕ Cancel" : "✏ Edit"}
                          </button>
                          <button onClick={() => handleDelete(l.id, l.model)} disabled={deleting === l.id}
                            style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(247,106,106,0.3)", background: "rgba(247,106,106,0.08)", color: "var(--accent-red)", cursor: "pointer", opacity: deleting === l.id ? 0.5 : 1 }}>
                            {deleting === l.id ? "…" : "🗑"}
                          </button>
                        </div>
                      </div>

                      {/* Edit form */}
                      {isEditing && editForm && (
                        <div style={{ borderTop: "1px solid var(--border)", padding: "20px", background: "var(--surface-2)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
                            {[
                              { key: "brand", label: "Brand" },
                              { key: "model", label: "Model" },
                              { key: "store", label: "Store" },
                              { key: "retail_price", label: "Retail Price ($)" },
                              { key: "current_price", label: "Current Price ($)" },
                              { key: "release_year", label: "Release Year" },
                            ].map(({ key, label }) => (
                              <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input
                                  value={editForm[key as keyof EditForm] as string}
                                  onChange={(e) => setEditForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                                  style={inputStyle}
                                  type={key.includes("price") || key === "release_year" ? "number" : "text"}
                                />
                              </div>
                            ))}
                          </div>

                          <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>Specs</label>
                            <textarea value={editForm.specs}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, specs: e.target.value } : prev)}
                              rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div>
                              <label style={labelStyle}>Store URL</label>
                              <input value={editForm.url} onChange={(e) => setEditForm(prev => prev ? { ...prev, url: e.target.value } : prev)} style={inputStyle} placeholder="https://..." />
                            </div>
                            <div>
                              <label style={labelStyle}>Image URL</label>
                              <input value={editForm.image_url} onChange={(e) => setEditForm(prev => prev ? { ...prev, image_url: e.target.value } : prev)} style={inputStyle} placeholder="https://..." />
                            </div>
                          </div>

                          {/* Image preview */}
                          {editForm.image_url && (
                            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                              <img src={editForm.image_url} alt="preview" style={{ height: 60, maxWidth: 100, objectFit: "contain", borderRadius: 8, background: "var(--surface)", padding: 6 }} />
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Image preview</span>
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                              <input type="checkbox" checked={editForm.is_deal}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, is_deal: e.target.checked } : prev)}
                                style={{ width: 16, height: 16, cursor: "pointer" }} />
                              🔥 Mark as Crazy Deal
                            </label>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => saveEdit(l.id)} disabled={saving}
                              style={{ fontSize: 13, padding: "8px 22px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 12px rgba(139,179,245,0.3)" }}>
                              {saving ? "Saving..." : "✓ Save Changes"}
                            </button>
                            <button onClick={cancelEdit}
                              style={{ fontSize: 13, padding: "8px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "inherit", cursor: "pointer" }}>
                              Cancel
                            </button>
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
