"use client";
import type { Laptop } from "@/lib/supabase";

type Props = {
  laptops: Laptop[];
  onClose: () => void;
  onRemove: (id: number) => void;
  currency?: "CAD" | "USD";
  cadToUsd?: number;
};

function fmt(n: number, currency: "CAD" | "USD" = "CAD", rate = 0.73) {
  const value = currency === "USD" ? n * rate : n;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function parseSpecs(specs: string): Record<string, string> {
  const parts = specs.split(",").map(s => s.trim()).filter(Boolean);
  const result: Record<string, string> = {};
  parts.forEach(part => {
    const lower = part.toLowerCase();
    if (lower.includes("ram") || lower.includes("memory")) result["RAM"] = part;
    else if (lower.includes("ssd") || lower.includes("storage") || lower.includes("hdd")) result["Storage"] = part;
    else if (lower.includes("rtx") || lower.includes("gtx") || lower.includes("radeon") || lower.includes("graphics") || lower.includes("gpu")) result["GPU"] = part;
    else if (lower.includes("intel") || lower.includes("amd") || lower.includes("apple m") || lower.includes("ryzen") || lower.includes("core") || lower.includes("processor")) result["CPU"] = part;
    else if (lower.includes("display") || lower.includes("screen") || lower.includes("fhd") || lower.includes("uhd") || lower.includes("oled")) result["Display"] = part;
    else if (lower.includes("battery")) result["Battery"] = part;
    else if (lower.includes("windows") || lower.includes("macos") || lower.includes("os")) result["OS"] = part;
  });
  return result;
}

const COMPARE_ROWS: { key: string; label: string; getValue: (l: Laptop, currency: "CAD" | "USD", rate: number) => string | null }[] = [
  { key: "price",       label: "Price",        getValue: (l, c, r) => fmt(l.current_price ?? 0, c, r) },
  { key: "retail",      label: "Retail Price", getValue: (l, c, r) => l.retail_price ? fmt(l.retail_price, c, r) : null },
  { key: "discount",    label: "Discount",     getValue: (l) => { const p = l.current_price ?? 0; const r = l.retail_price ?? p; return r > p ? `-${Math.round(((r-p)/r)*100)}% (Save $${Math.round(r-p).toLocaleString()})` : null; } },
  { key: "brand",       label: "Brand",        getValue: (l) => l.brand },
  { key: "store",       label: "Store",        getValue: (l) => l.store || null },
  { key: "year",        label: "Year",         getValue: (l) => l.release_year ? String(l.release_year) : null },
  { key: "screen_size", label: "Screen Size",  getValue: (l) => l.screen_size ? `${l.screen_size}"` : null },
  { key: "weight",      label: "Weight",       getValue: (l) => l.weight_kg ? `${l.weight_kg} kg` : null },
  { key: "cpu",         label: "CPU",          getValue: (l) => l.specs ? parseSpecs(l.specs)["CPU"] ?? null : null },
  { key: "ram",         label: "RAM",          getValue: (l) => l.specs ? parseSpecs(l.specs)["RAM"] ?? null : null },
  { key: "storage",     label: "Storage",      getValue: (l) => l.specs ? parseSpecs(l.specs)["Storage"] ?? null : null },
  { key: "gpu",         label: "GPU",          getValue: (l) => l.specs ? parseSpecs(l.specs)["GPU"] ?? null : null },
  { key: "display",     label: "Display",      getValue: (l) => l.specs ? parseSpecs(l.specs)["Display"] ?? null : null },
  { key: "good_for",    label: "Good For",     getValue: (l) => l.good_for || null },
];

function getBestPrice(laptops: Laptop[]) {
  const prices = laptops.map(l => l.current_price ?? 0);
  return Math.min(...prices);
}

export default function CompareModal({ laptops, onClose, onRemove, currency = "CAD", cadToUsd = 0.73 }: Props) {
  const bestPrice = getBestPrice(laptops);
  const cols = laptops.length;

  // Only show rows where at least one laptop has data
  const visibleRows = COMPARE_ROWS.filter(row =>
    laptops.some(l => row.getValue(l, currency, cadToUsd) !== null)
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", padding: "20px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, marginBottom: 4 }}>Compare</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Side-by-Side Comparison</h2>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>✕ Close</button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Laptop header cards */}
          <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${cols}, 1fr)`, borderBottom: "1px solid var(--border)" }}>
            <div style={{ padding: "20px 16px", borderRight: "1px solid var(--border)" }} />
            {laptops.map(l => {
              const price = l.current_price ?? 0;
              const isBest = price === bestPrice;
              return (
                <div key={l.id} style={{ padding: "20px 16px", borderRight: "1px solid var(--border)", background: isBest ? "rgba(139,179,245,0.04)" : "transparent", position: "relative" }}>
                  {isBest && cols > 1 && (
                    <div style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 800, background: "rgba(106,247,184,0.15)", color: "var(--accent-3)", border: "1px solid rgba(106,247,184,0.3)", borderRadius: 5, padding: "2px 7px", letterSpacing: "0.06em" }}>BEST PRICE</div>
                  )}
                  {/* Image */}
                  <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    {(l as any).image_url ? (
                      <img src={(l as any).image_url} alt={l.model} style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ fontSize: 36, opacity: 0.2 }}>💻</div>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 4 }}>{l.brand}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.3, marginBottom: 8 }}>{l.model}</div>
                  <button
                    onClick={() => onRemove(l.id)}
                    style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(247,106,106,0.3)", background: "rgba(247,106,106,0.08)", color: "#f76a6a", cursor: "pointer" }}
                  >✕ Remove</button>
                </div>
              );
            })}
          </div>

          {/* Comparison rows */}
          {visibleRows.map((row, ri) => {
            const values = laptops.map(l => row.getValue(l, currency, cadToUsd));
            // For price row, highlight the lowest
            const isPrice = row.key === "price";
            const priceValues = isPrice ? laptops.map(l => l.current_price ?? 0) : [];
            const minPriceVal = isPrice ? Math.min(...priceValues) : Infinity;

            return (
              <div key={row.key} style={{ display: "grid", gridTemplateColumns: `180px repeat(${cols}, 1fr)`, borderBottom: "1px solid var(--border)", background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                {/* Row label */}
                <div style={{ padding: "14px 16px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{row.label}</span>
                </div>
                {/* Values */}
                {values.map((val, vi) => {
                  const l = laptops[vi];
                  const isBestPriceCol = isPrice && (l.current_price ?? 0) === minPriceVal && cols > 1;
                  return (
                    <div key={vi} style={{ padding: "14px 16px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", background: isBestPriceCol ? "rgba(106,247,184,0.04)" : "transparent" }}>
                      {val ? (
                        <span style={{
                          fontSize: 13,
                          fontWeight: row.key === "price" ? 800 : 400,
                          color: row.key === "price"
                            ? (isBestPriceCol ? "var(--accent-3)" : "var(--text)")
                            : row.key === "discount" ? "#f7c26a"
                            : "var(--text-muted)",
                        }}>{val}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-dim)", opacity: 0.4 }}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Action row */}
          <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${cols}, 1fr)` }}>
            <div style={{ padding: "16px", borderRight: "1px solid var(--border)" }} />
            {laptops.map(l => (
              <div key={l.id} style={{ padding: "16px", borderRight: "1px solid var(--border)" }}>
                <button
                  onClick={() => window.location.href = `/laptop/${l.id}`}
                  style={{ width: "100%", background: "linear-gradient(135deg, var(--accent), #6ab4f5)", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, padding: "9px 12px", cursor: "pointer" }}
                >View Details →</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
