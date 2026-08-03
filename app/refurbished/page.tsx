"use client";
import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import type { Laptop } from "@/lib/supabase";
import { fetchLaptops, addLaptop, deleteLaptop } from "@/lib/supabase";

const ADMIN_PASSWORD = "admin2026.123";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// Heuristic condition detection: scans store/specs/model text for these keywords.
// The add-listing form below tags new entries with one of these labels automatically.
const REFURB_PATTERNS: { key: string; label: string; color: string; test: RegExp }[] = [
  { key: "certified", label: "Certified Refurbished", color: "#4caf7d", test: /certified.{0,15}refurb/i },
  { key: "refurb", label: "Refurbished", color: "#5e8fe8", test: /refurb/i },
  { key: "renewed", label: "Renewed", color: "#a374e0", test: /renewed/i },
  { key: "openbox", label: "Open Box", color: "#e0a530", test: /open[\s-]?box/i },
  { key: "preowned", label: "Pre-Owned", color: "#ec6f9b", test: /pre[\s-]?owned/i },
];

const CONDITION_OPTIONS = REFURB_PATTERNS.map((p) => p.label);

function detectCondition(l: Laptop) {
  const haystack = `${l.store ?? ""} ${l.specs ?? ""} ${l.model ?? ""}`;
  for (const p of REFURB_PATTERNS) {
    if (p.test.test(haystack)) return p;
  }
  return null;
}

type SortKey = "discount" | "savings" | "price-low" | "price-high";

export default function RefurbishedPage() {
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("discount");
  const [brandFilter, setBrandFilter] = useState<string>("");

  const [unlocked, setUnlocked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({
    brand: "", model: "", condition: CONDITION_OPTIONS[1], specs: "",
    store: "", url: "", retail_price: "", current_price: "",
  });

  useEffect(() => {
    fetchLaptops().then((data) => {
      setLaptops(data);
      setLoading(false);
    });
  }, []);

  const refurbished = useMemo(() => {
    return laptops
      .map((l) => ({ laptop: l, condition: detectCondition(l) }))
      .filter((x): x is { laptop: Laptop; condition: NonNullable<ReturnType<typeof detectCondition>> } => x.condition !== null);
  }, [laptops]);

  const brands = useMemo(
    () => Array.from(new Set(refurbished.map((x) => x.laptop.brand))).sort(),
    [refurbished]
  );

  const filtered = useMemo(() => {
    let list = brandFilter ? refurbished.filter((x) => x.laptop.brand === brandFilter) : refurbished;
    return [...list].sort((a, b) => {
      const ap = a.laptop.current_price ?? a.laptop.retail_price;
      const bp = b.laptop.current_price ?? b.laptop.retail_price;
      const aSave = a.laptop.retail_price - ap;
      const bSave = b.laptop.retail_price - bp;
      if (sortBy === "discount") {
        const ad = a.laptop.retail_price ? aSave / a.laptop.retail_price : 0;
        const bd = b.laptop.retail_price ? bSave / b.laptop.retail_price : 0;
        return bd - ad;
      }
      if (sortBy === "savings") return bSave - aSave;
      if (sortBy === "price-low") return ap - bp;
      return bp - ap;
    });
  }, [refurbished, brandFilter, sortBy]);

  const submitAuth = () => {
    if (authInput === ADMIN_PASSWORD) {
      setUnlocked(true);
      setShowAuth(false);
      setShowAddForm(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect password.");
    }
  };

  const requireAuth = (action: () => void) => {
    if (unlocked) action();
    else setShowAuth(true);
  };

  const handleAdd = async () => {
    if (!form.brand || !form.model || !form.retail_price || !form.current_price) return;
    setAddLoading(true);
    try {
      const taggedSpecs = form.specs
        ? `${form.condition} · ${form.specs}`
        : form.condition;
      await addLaptop(
        {
          brand: form.brand,
          model: form.model,
          specs: taggedSpecs,
          store: form.store,
          url: form.url,
          retail_price: parseFloat(form.retail_price),
          release_year: null,
          date_added: new Date().toISOString().split("T")[0],
        },
        parseFloat(form.current_price)
      );
      const updated = await fetchLaptops();
      setLaptops(updated);
      setForm({ brand: "", model: "", condition: CONDITION_OPTIONS[1], specs: "", store: "", url: "", retail_price: "", current_price: "" });
      setShowAddForm(false);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this listing?")) return;
    await deleteLaptop(id);
    setLaptops((prev) => prev.filter((l) => l.id !== id));
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--card-bg, var(--surface))",
    border: "1px solid var(--border)",
    borderRadius: "var(--modal-radius, 16px)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const selectStyle: React.CSSProperties = {
    fontSize: 13,
    padding: "9px 14px",
    borderRadius: "var(--btn-radius, 10px)",
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontFamily: "inherit",
    cursor: "pointer",
    outline: "none",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 13,
    border: "1px solid var(--border)",
    borderRadius: "var(--btn-radius, 10px)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="refurbished" />
      <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--accent)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: 10,
              fontWeight: 600,
              opacity: 0.8,
            }}
          >
            // second life, first-rate prices
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em", color: "var(--text)", margin: 0 }}>
                Refurbished Market<span style={{ color: "var(--accent)", opacity: 0.9 }}>.</span>
              </h1>
              <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
                Certified, renewed, and open-box laptops · {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => requireAuth(() => setShowAddForm(true))}
              style={{
                background: "var(--accent)", color: "#fff", border: "none",
                borderRadius: "var(--btn-radius, 10px)", padding: "11px 22px",
                fontWeight: 700, cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 4px 16px var(--glow)",
              }}
            >
              {unlocked ? "+ Add Listing" : "🔒 Add Listing"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} style={selectStyle}>
            <option value="discount">Sort: Biggest Discount</option>
            <option value="savings">Sort: Biggest Savings ($)</option>
            <option value="price-low">Sort: Price (Low to High)</option>
            <option value="price-high">Sort: Price (High to Low)</option>
          </select>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={selectStyle}>
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 0" }}>Loading refurbished listings…</div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No refurbished listings yet. Click "Add Listing" above to add one.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
            {filtered.map(({ laptop: l, condition }) => {
              const price = l.current_price ?? l.retail_price;
              const discountPct = l.retail_price ? Math.round(((l.retail_price - price) / l.retail_price) * 100) : 0;
              return (
                <div key={l.id} style={{ ...cardStyle, position: "relative" }}>
                  {unlocked && (
                    <button
                      onClick={() => handleDelete(l.id)}
                      title="Remove listing"
                      style={{
                        position: "absolute", top: 8, right: 8, zIndex: 2,
                        width: 26, height: 26, borderRadius: "50%",
                        background: "rgba(0,0,0,0.55)", border: "none",
                        color: "#fff", cursor: "pointer", fontSize: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  )}
                  <a
                    href={l.url || `/laptop/${l.id}`}
                    target={l.url ? "_blank" : undefined}
                    rel={l.url ? "noopener noreferrer" : undefined}
                    style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", flex: 1 }}
                  >
                    <div style={{ height: 3, background: `linear-gradient(90deg, ${condition.color}, ${condition.color}60)` }} />
                    {l.image_url ? (
                      <div style={{ height: 150, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={l.image_url} alt={`${l.brand} ${l.model}`} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                      </div>
                    ) : null}
                    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      <span
                        style={{
                          alignSelf: "flex-start",
                          fontSize: 11,
                          fontWeight: 700,
                          color: condition.color,
                          background: `${condition.color}18`,
                          padding: "3px 9px",
                          borderRadius: 999,
                        }}
                      >
                        {condition.label}
                      </span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                        {l.brand} {l.model}
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{l.specs}</div>
                      <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 8, paddingTop: 8 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{fmt(price)}</span>
                        {discountPct > 0 && (
                          <>
                            <span style={{ fontSize: 12.5, color: "var(--text-muted)", textDecoration: "line-through" }}>
                              {fmt(l.retail_price)}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#4caf7d" }}>-{discountPct}%</span>
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{l.store}</div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password gate */}
      {showAuth && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
          onClick={() => setShowAuth(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 18px)", width: "100%", maxWidth: 360, margin: "1rem", boxShadow: "var(--shadow-lg)", padding: 24 }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Admin Access</div>
            <input
              type="password"
              value={authInput}
              onChange={(e) => { setAuthInput(e.target.value); setAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submitAuth()}
              placeholder="Password"
              style={inputStyle}
              autoFocus
            />
            {authError && <div style={{ color: "#f76a6a", fontSize: 12, marginTop: 8 }}>{authError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAuth(false)}
                style={{ fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={submitAuth}
                style={{ fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add listing form */}
      {showAddForm && unlocked && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}
          onClick={() => setShowAddForm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--modal-radius, 18px)", width: "100%", maxWidth: 480, margin: "1rem", boxShadow: "var(--shadow-lg)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
          >
            <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3, var(--accent)))" }} />
            <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Add Refurbished Listing</div>
                <button onClick={() => setShowAddForm(false)} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>×</button>
              </div>

              <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={inputStyle} />
              <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={inputStyle} />

              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input placeholder="Specs (e.g. i7, 16GB RAM, 512GB SSD)" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} style={inputStyle} />
              <input placeholder="Store" value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} style={inputStyle} />
              <input placeholder="Listing URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} style={inputStyle} />
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="Retail price" type="number" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} style={inputStyle} />
                <input placeholder="Refurb price" type="number" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{ fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={addLoading}
                  style={{ fontSize: 13, padding: "9px 20px", borderRadius: "var(--btn-radius, 10px)", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", opacity: addLoading ? 0.6 : 1 }}
                >
                  {addLoading ? "Adding…" : "Add Listing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
