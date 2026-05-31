"use client";
import { useState, useEffect } from "react";
import type { Laptop } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import AdminPriceHistoryModal from "./AdminPriceHistoryModal";

const CATEGORIES = [
  { key: "student", label: "Students", icon: "🎓" },
  { key: "home", label: "Home", icon: "🏠" },
  { key: "business", label: "Business", icon: "💼" },
];

export default function AdminPanel({ laptops, currency, cadToUsd = 0.73, onClose, onLaptopUpdated }: {
  laptops: Laptop[]; currency: "CAD" | "USD"; cadToUsd?: number; onClose: () => void; onLaptopUpdated: (updated: Laptop) => void;
}) {
  const [tab, setTab] = useState<"laptops" | "picks">("laptops");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("All Brands");
  const [editingLaptop, setEditingLaptop] = useState<Laptop | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Best Picks state
  const [picksCategory, setPicksCategory] = useState("student");
  const [recommendationIds, setRecommendationIds] = useState<Record<string, number[]>>({});
  const [picksSaving, setPicksSaving] = useState(false);
  const [picksMsg, setPicksMsg] = useState("");
  const [picksSearch, setPicksSearch] = useState("");

  useEffect(() => {
    async function loadRecs() {
      const { data } = await supabase.from("recommendations").select("*");
      if (data) {
        const ids: Record<string, number[]> = {};
        data.forEach((row: { category: string; laptop_ids: number[] }) => {
          ids[row.category] = row.laptop_ids;
        });
        setRecommendationIds(ids);
      }
    }
    loadRecs();
  }, []);

  const brands = Array.from(new Set(laptops.map((l) => l.brand))).sort();
  const filtered = laptops.filter((l) => {
    const t = search.toLowerCase();
    const matchSearch = l.brand.toLowerCase().includes(t) || l.model.toLowerCase().includes(t);
    const matchBrand = brandFilter === "All Brands" || l.brand === brandFilter;
    return matchSearch && matchBrand;
  });

  const picksFiltered = laptops.filter((l) => {
    const t = picksSearch.toLowerCase();
    return l.brand.toLowerCase().includes(t) || l.model.toLowerCase().includes(t);
  });

  function fmtPrice(price: number) {
    const value = currency === "USD" ? price * cadToUsd : price;
    return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  }

  function togglePick(laptopId: number) {
    const current = recommendationIds[picksCategory] ?? [];
    const next = current.includes(laptopId)
      ? current.filter((id) => id !== laptopId)
      : [...current, laptopId];
    setRecommendationIds((prev) => ({ ...prev, [picksCategory]: next }));
  }

  async function savePicks() {
    setPicksSaving(true);
    setPicksMsg("");
    try {
      await supabase
        .from("recommendations")
        .upsert({ category: picksCategory, laptop_ids: recommendationIds[picksCategory] ?? [] }, { onConflict: "category" });
      setPicksMsg("✅ Saved!");
    } catch {
      setPicksMsg("❌ Failed to save");
    } finally {
      setPicksSaving(false);
      setTimeout(() => setPicksMsg(""), 3000);
    }
  }

  const currentPickIds = recommendationIds[picksCategory] ?? [];
  const selectedLaptops = laptops.filter((l) => currentPickIds.includes(l.id));

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 720, maxHeight: "90vh", margin: "1rem", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))", flexShrink: 0 }} />

          {/* Header */}
          <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>⚙️ Admin Panel</p>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                  {tab === "laptops" ? "Price History Editor" : "Best Picks Editor"}
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {tab === "laptops" ? "Select a laptop to view, edit, or clear its price history." : "Choose which laptops appear in Best Picks for each category."}
                </p>
              </div>
              <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[
                { key: "laptops", label: "💻 All Laptops" },
                { key: "picks", label: "🎓 Best Picks" },
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 99, border: "none", cursor: "pointer", background: tab === t.key ? "var(--accent)" : "var(--surface-2)", color: tab === t.key ? (typeof window !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? "#fff" : "#0a0d14") : "var(--text-muted)", transition: "all 0.15s" }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* ── LAPTOPS TAB ── */}
          {tab === "laptops" && (
            <>
              <div style={{ padding: "0 24px", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>🔍</span>
                    <input type="text" placeholder="Search brand or model..." value={search} onChange={(e) => setSearch(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
                    style={{ padding: "9px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
                    <option>All Brands</option>
                    {brands.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 90px", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                  {["Laptop", "Entries", "Price", ""].map((h) => (
                    <span key={h} style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: h === "Price" ? "right" : "left" }}>{h}</span>
                  ))}
                </div>
              </div>
              <div style={{ overflowY: "auto", padding: "8px 24px 20px", flex: 1 }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 14 }}>No laptops found.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {filtered.map((laptop) => (
                      <div key={laptop.id}
                        style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px 90px", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid transparent", transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "transparent"; }}
                      >
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{laptop.brand} {laptop.model}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>ID #{laptop.id}</p>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{laptop.price_history?.length ?? 0}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textAlign: "right" }}>{fmtPrice(laptop.current_price ?? laptop.retail_price ?? 0)}</span>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button onClick={() => setEditingLaptop(laptop)}
                            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
                          >✏️ Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── BEST PICKS TAB ── */}
          {tab === "picks" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", padding: "0 24px" }}>
              {/* Category selector */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexShrink: 0 }}>
                {CATEGORIES.map((c) => (
                  <button key={c.key} onClick={() => setPicksCategory(c.key)}
                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${picksCategory === c.key ? "var(--accent)" : "var(--border)"}`, background: picksCategory === c.key ? "rgba(139,179,245,0.12)" : "var(--surface-2)", color: picksCategory === c.key ? "var(--accent)" : "var(--text-muted)", fontWeight: picksCategory === c.key ? 700 : 400, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}
                  >{c.icon} {c.label}</button>
                ))}
              </div>

              {/* Selected count + save */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {currentPickIds.length} laptop{currentPickIds.length !== 1 ? "s" : ""} selected for <span style={{ color: "var(--accent)", fontWeight: 600 }}>{CATEGORIES.find(c => c.key === picksCategory)?.label}</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {picksMsg && <span style={{ fontSize: 12, color: picksMsg.startsWith("✅") ? "var(--accent-3)" : "#f76a6a" }}>{picksMsg}</span>}
                  <button onClick={savePicks} disabled={picksSaving}
                    style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: picksSaving ? "not-allowed" : "pointer", opacity: picksSaving ? 0.6 : 1 }}>
                    {picksSaving ? "Saving…" : "💾 Save"}
                  </button>
                </div>
              </div>

              {/* Selected preview chips */}
              {selectedLaptops.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, flexShrink: 0 }}>
                  {selectedLaptops.map((l) => (
                    <div key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(139,179,245,0.12)", border: "1px solid rgba(139,179,245,0.3)", borderRadius: 99, padding: "4px 10px", fontSize: 11, color: "var(--accent)" }}>
                      {l.model}
                      <button onClick={() => togglePick(l.id)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div style={{ position: "relative", marginBottom: 10, flexShrink: 0 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>🔍</span>
                <input type="text" placeholder="Search laptops to add..." value={picksSearch} onChange={(e) => setPicksSearch(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Laptop list */}
              <div style={{ overflowY: "auto", flex: 1, paddingBottom: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {picksFiltered.map((laptop) => {
                    const selected = currentPickIds.includes(laptop.id);
                    return (
                      <div key={laptop.id} onClick={() => togglePick(laptop.id)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: `1px solid ${selected ? "var(--accent)" : "transparent"}`, background: selected ? "rgba(139,179,245,0.08)" : "var(--surface-2)", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                        onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                      >
                        {/* Checkbox */}
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                          {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                        </div>
                        {/* Image */}
                        {(laptop as any).image_url ? (
                          <img src={(laptop as any).image_url} alt={laptop.model} style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💻</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: selected ? "var(--accent)" : "var(--text)" }}>{laptop.brand} {laptop.model}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, marginTop: 2 }}>#{laptop.id} · {fmtPrice(laptop.current_price ?? 0)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingLaptop && (
        <AdminPriceHistoryModal laptop={editingLaptop} currency={currency} cadToUsd={cadToUsd} onClose={() => setEditingLaptop(null)}
          onUpdated={(updated) => { setEditingLaptop(updated); onLaptopUpdated(updated); }} />
      )}
    </>
  );
}
