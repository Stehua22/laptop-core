"use client";
import { useState } from "react";
import type { Laptop } from "@/lib/supabase";
import AdminPriceHistoryModal from "./AdminPriceHistoryModal";

export default function AdminPanel({ laptops, currency, cadToUsd = 0.73, onClose, onLaptopUpdated }: {
  laptops: Laptop[]; currency: "CAD" | "USD"; cadToUsd?: number; onClose: () => void; onLaptopUpdated: (updated: Laptop) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingLaptop, setEditingLaptop] = useState<Laptop | null>(null);
  const filtered = laptops.filter((l) => { const t = search.toLowerCase(); return l.brand.toLowerCase().includes(t) || l.model.toLowerCase().includes(t); });

  function fmtPrice(price: number) {
    const value = currency === "USD" ? price * cadToUsd : price;
    return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 620, maxHeight: "88vh", margin: "1rem", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-3))", flexShrink: 0 }} />
          <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>⚙️ Admin Panel</p>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Price History Editor</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Select a laptop to view, edit, or clear its price history.</p>
              </div>
              <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>🔍</span>
              <input type="text" placeholder="Search laptops…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 110px", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
              {["Laptop", "Entries", "Current Price", ""].map((h) => (
                <span key={h} style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: h === "Current Price" ? "right" : "left" }}>{h}</span>
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
                    style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 110px", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid transparent", transition: "border-color 0.15s" }}
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
        </div>
      </div>
      {editingLaptop && (
        <AdminPriceHistoryModal laptop={editingLaptop} currency={currency} cadToUsd={cadToUsd} onClose={() => setEditingLaptop(null)}
          onUpdated={(updated) => { setEditingLaptop(updated); onLaptopUpdated(updated); }} />
      )}
    </>
  );
}
