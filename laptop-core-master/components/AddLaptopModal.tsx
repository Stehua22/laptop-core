"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onSubmit: (data: {
    brand: string; model: string; specs: string;
    store: string; url: string; retail_price: number;
    release_year: number | null; image_url: string;
  }) => void;
  loading: boolean;
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--text)",
  fontFamily: "'DM Mono', monospace",
  fontSize: 13,
  outline: "none",
  width: "100%",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 11,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  display: "block",
  marginBottom: 6,
};

export default function AddLaptopModal({ onClose, onSubmit, loading }: Props) {
  const [form, setForm] = useState({
    brand: "", model: "", specs: "", store: "", url: "",
    retail_price: "", release_year: "", image_url: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.brand || !form.model || !form.retail_price) return;
    onSubmit({
      brand: form.brand.trim(),
      model: form.model.trim(),
      specs: form.specs.trim(),
      store: form.store.trim(),
      url: form.url.trim(),
      retail_price: parseFloat(form.retail_price),
      release_year: form.release_year ? parseInt(form.release_year) : null,
      image_url: form.image_url.trim(),
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1002,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      }} />
      <div style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border-hover)",
        borderRadius: 16,
        width: "100%",
        maxWidth: 500,
        maxHeight: "90vh",
        overflowY: "auto",
        animation: "fadeUp 0.3s ease",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>New Entry</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "var(--text)" }}>Add Laptop</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>×</button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Brand *</label>
              <input style={inputStyle} placeholder="e.g. Apple" value={form.brand} onChange={set("brand")}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
            <div>
              <label style={labelStyle}>Model *</label>
              <input style={inputStyle} placeholder="e.g. MacBook Air M3" value={form.model} onChange={set("model")}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Specs</label>
            <input style={inputStyle} placeholder="e.g. M3, 16GB RAM, 512GB SSD" value={form.specs} onChange={set("specs")}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Price ($) *</label>
              <input style={inputStyle} type="number" placeholder="1299" value={form.retail_price} onChange={set("retail_price")}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
            <div>
              <label style={labelStyle}>Release Year</label>
              <input style={inputStyle} type="number" placeholder="2025" value={form.release_year} onChange={set("release_year")}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Store</label>
            <input style={inputStyle} placeholder="e.g. Apple, BestBuy" value={form.store} onChange={set("store")}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
          </div>

          <div>
            <label style={labelStyle}>Product URL</label>
            <input style={inputStyle} placeholder="https://..." value={form.url} onChange={set("url")}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
          </div>

          <div>
            <label style={labelStyle}>Image URL</label>
            <input style={inputStyle} placeholder="https://... (paste image link)" value={form.image_url} onChange={set("image_url")}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }} />
            {form.image_url && (
              <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>
                <img src={form.image_url} alt="Preview" style={{ maxHeight: 110, maxWidth: "100%", objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
              Tip: right-click any product image → "Copy image address"
            </p>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
            color: "var(--text-muted)", fontFamily: "'DM Mono', monospace", fontSize: 12,
            padding: "10px 20px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em",
          }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.brand || !form.model || !form.retail_price}
            style={{
              background: "var(--accent)", border: "none", borderRadius: 8,
              color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: 12,
              padding: "10px 24px", cursor: "pointer", textTransform: "uppercase",
              letterSpacing: "0.06em", opacity: loading ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Adding..." : "Add Laptop"}
          </button>
        </div>
      </div>
    </div>
  );
}
