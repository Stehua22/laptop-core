"use client";
import { useState } from "react";
import type { Laptop, PriceEntry } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

function formatPrice(price: number, currency: "CAD" | "USD", rate = 0.73) {
  const value = currency === "USD" ? price * rate : price;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default function AdminPriceHistoryModal({ laptop, currency, cadToUsd = 0.73, onClose, onUpdated }: {
  laptop: Laptop; currency: "CAD" | "USD"; cadToUsd?: number; onClose: () => void; onUpdated: (updatedLaptop: Laptop) => void;
}) {
  const [entries, setEntries] = useState<PriceEntry[]>([...(laptop.price_history ?? [])].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const startEdit = (entry: PriceEntry) => { setEditingId(entry.id); setEditPrice(String(entry.price)); setEditDate(entry.recorded_at); };
  const cancelEdit = () => { setEditingId(null); setEditPrice(""); setEditDate(""); };

  const saveEdit = async (entryId: number) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) { showToast("❌ Invalid price"); return; }
    if (!editDate) { showToast("❌ Invalid date"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("price_history").update({ price, recorded_at: editDate }).eq("id", entryId);
      if (error) throw error;
      const updated = entries.map((e) => e.id === entryId ? { ...e, price, recorded_at: editDate } : e).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      setEntries(updated); setEditingId(null);
      const newCurrent = updated[updated.length - 1]?.price ?? laptop.retail_price;
      onUpdated({ ...laptop, price_history: updated, current_price: newCurrent });
      showToast("✅ Entry updated");
    } catch { showToast("❌ Failed to update"); } finally { setSaving(false); }
  };

  const deleteEntry = async (entryId: number) => {
    if (!confirm("Delete this price entry?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("price_history").delete().eq("id", entryId);
      if (error) throw error;
      const updated = entries.filter((e) => e.id !== entryId).sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      setEntries(updated);
      const newCurrent = updated[updated.length - 1]?.price ?? laptop.retail_price;
      onUpdated({ ...laptop, price_history: updated, current_price: newCurrent });
      showToast("🗑️ Entry deleted");
    } catch { showToast("❌ Failed to delete"); } finally { setSaving(false); }
  };

  const clearAllHistory = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("price_history").delete().eq("laptop_id", laptop.id);
      if (error) throw error;
      setEntries([]);
      onUpdated({ ...laptop, price_history: [], current_price: laptop.retail_price });
      setConfirmClear(false);
      showToast("🗑️ All history cleared");
    } catch { showToast("❌ Failed to clear history"); } finally { setSaving(false); }
  };

  const addEntry = async () => {
    const priceStr = prompt("New price (CAD $):"); if (!priceStr) return;
    const price = parseFloat(priceStr); if (isNaN(price) || price < 0) { showToast("❌ Invalid price"); return; }
    const dateStr = prompt("Date (YYYY-MM-DD):", new Date().toISOString().split("T")[0]); if (!dateStr) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("price_history").insert({ laptop_id: laptop.id, price, recorded_at: dateStr }).select().single();
      if (error) throw error;
      const updated = [...entries, data].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      setEntries(updated);
      const newCurrent = updated[updated.length - 1]?.price ?? laptop.retail_price;
      onUpdated({ ...laptop, price_history: updated, current_price: newCurrent });
      showToast("✅ Entry added");
    } catch { showToast("❌ Failed to add entry"); } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = { padding: "6px 10px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "inherit", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 580, maxHeight: "88vh", margin: "1rem", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, #f76a6a, var(--accent))", flexShrink: 0 }} />
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "#f76a6a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>⚙️ Admin · Price History</p>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{laptop.brand} {laptop.model}</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{entries.length} {entries.length === 1 ? "entry" : "entries"} · prices in {currency}</p>
            </div>
            <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 16 }}>
            <button onClick={addEntry} disabled={saving} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Entry</button>
            <button onClick={() => setConfirmClear(true)} disabled={saving || entries.length === 0}
              style={{ background: "rgba(247,106,106,0.1)", color: "#f76a6a", border: "1px solid rgba(247,106,106,0.35)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: entries.length === 0 ? "not-allowed" : "pointer", opacity: entries.length === 0 ? 0.5 : 1 }}>
              🗑️ Clear All
            </button>
          </div>
          {confirmClear && (
            <div style={{ background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13 }}>
              <p style={{ color: "#f76a6a", fontWeight: 600, marginBottom: 8 }}>⚠️ Permanently delete ALL {entries.length} entries?</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={clearAllHistory} disabled={saving} style={{ background: "#f76a6a", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Yes, clear all</button>
                <button onClick={() => setConfirmClear(false)} style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
          {entries.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 72px", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
              {["Date", `Price (${currency})`, "CAD Base", ""].map((h) => (
                <span key={h} style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: h === `Price (${currency})` || h === "CAD Base" ? "right" : "left" }}>{h}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ overflowY: "auto", padding: "8px 24px 20px", flex: 1 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: 14 }}>No price history yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {entries.map((entry, i) => {
                const isLatest = i === entries.length - 1;
                const isEditing = editingId === entry.id;
                return (
                  <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 72px", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: isLatest ? "rgba(139,179,245,0.06)" : "var(--surface-2)", border: isLatest ? "1px solid rgba(139,179,245,0.2)" : "1px solid transparent" }}>
                    {isEditing ? (
                      <>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                        <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="CAD price" style={{ ...inputStyle, textAlign: "right" }} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>{formatPrice(parseFloat(editPrice) || 0, "CAD", 1)}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => saveEdit(entry.id)} disabled={saving} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✓</button>
                          <button onClick={cancelEdit} style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13 }}>{new Date(entry.recorded_at + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</span>
                          {isLatest && <span style={{ fontSize: 9, background: "var(--accent)", color: "#fff", borderRadius: 4, padding: "2px 6px", fontWeight: 700, textTransform: "uppercase" }}>current</span>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: isLatest ? "var(--accent)" : "var(--text)" }}>{formatPrice(entry.price, currency, cadToUsd)}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>{currency === "USD" ? formatPrice(entry.price, "CAD", 1) : ""}</span>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button onClick={() => startEdit(entry)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>✏️</button>
                          <button onClick={() => deleteEntry(entry.id)} style={{ background: "rgba(247,106,106,0.08)", border: "1px solid rgba(247,106,106,0.25)", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer", color: "#f76a6a" }}>🗑️</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-lg)", zIndex: 10000 }}>{toast}</div>
      )}
    </div>
  );
}
